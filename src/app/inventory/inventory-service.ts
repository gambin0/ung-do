import { Service, computed, signal } from '@angular/core';
import {
  DocumentData,
  QueryDocumentSnapshot,
  Timestamp,
  deleteDoc,
  doc,
  getDocs,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { db, inventoryRef, todosRef } from '../firestore';
import { InventoryGroup, InventoryItem } from './inventory-item';
import { RESTOCK_THRESHOLD, RestockAction, restockAction, restockTodoTitle } from './restock';

export interface ItemDraft {
  name: string;
  quantity: number;
  category: string | null;
}

function fromDoc(snap: QueryDocumentSnapshot<DocumentData>): InventoryItem {
  const data = snap.data();
  return {
    id: snap.id,
    name: String(data['name'] ?? ''),
    quantity: typeof data['quantity'] === 'number' ? data['quantity'] : 0,
    category: typeof data['category'] === 'string' && data['category'] ? data['category'] : null,
    restockTodoId: typeof data['restockTodoId'] === 'string' ? data['restockTodoId'] : null,
  };
}

/** Trims text fields and clamps quantity to a non-negative whole number. */
function normalize(draft: ItemDraft): ItemDraft {
  return {
    name: draft.name.trim(),
    quantity: Math.max(0, Math.trunc(draft.quantity) || 0),
    category: draft.category?.trim() || null,
  };
}

function errorMessage(e: unknown, fallback: string): string {
  return e instanceof Error && e.message ? e.message : fallback;
}

const byName = (a: InventoryItem, b: InventoryItem) => a.name.localeCompare(b.name);

@Service({ autoProvided: true })
export class InventoryService {
  readonly items = signal<InventoryItem[]>([]);
  readonly loading = signal(false);
  readonly adding = signal(false);
  /** IDs of items with a blocking write (edit or delete) in flight. */
  readonly pendingIds = signal<ReadonlySet<string>>(new Set());
  readonly error = signal<string | null>(null);

  /** Categories A–Z, then uncategorized items last; items A–Z within each. */
  readonly groups = computed<InventoryGroup[]>(() => {
    const byCategory = new Map<string | null, InventoryItem[]>();
    for (const item of this.items()) {
      const list = byCategory.get(item.category) ?? [];
      list.push(item);
      byCategory.set(item.category, list);
    }
    return [...byCategory.entries()]
      .sort(([a], [b]) => (a === null ? 1 : b === null ? -1 : a.localeCompare(b)))
      .map(([category, items]) => ({ category, items: items.sort(byName) }));
  });

  readonly categories = computed(() =>
    this.groups()
      .map((g) => g.category)
      .filter((c) => c !== null),
  );

  readonly lowCount = computed(
    () => this.items().filter((i) => i.quantity <= RESTOCK_THRESHOLD).length,
  );

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const snapshot = await getDocs(inventoryRef);
      this.items.set(snapshot.docs.map(fromDoc));
    } catch (e) {
      this.error.set(errorMessage(e, 'Failed to load inventory'));
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Adds an item. Starting at or below the restock threshold creates its
   * restock to-do in the same batch. Returns what happened, or null on failure.
   */
  async add(draft: ItemDraft): Promise<{ restock: RestockAction } | null> {
    const item = normalize(draft);
    if (!item.name || this.adding()) return null;
    this.adding.set(true);
    try {
      const ref = doc(inventoryRef);
      const batch = writeBatch(db);
      const action = restockAction(item.quantity, false);
      const restockTodoId =
        action === 'create' ? this.queueRestockTodo(batch, ref.id, item.name) : null;
      batch.set(ref, { ...item, restockTodoId });
      await batch.commit();
      await this.load();
      return { restock: action };
    } catch (e) {
      this.error.set(errorMessage(e, 'Failed to add item'));
      return null;
    } finally {
      this.adding.set(false);
    }
  }

  /**
   * Sets an item's quantity immediately (no spinner, so the +/- buttons stay
   * responsive) and saves it, creating or completing the restock to-do when
   * the item crosses the threshold. Returns the restock action, or null if
   * nothing changed or the save failed.
   */
  async setQuantity(id: string, quantity: number): Promise<RestockAction | null> {
    const item = this.items().find((i) => i.id === id);
    if (!item || this.pendingIds().has(id)) return null;
    return this.save(item, { ...item, quantity }, { optimistic: true });
  }

  /** Saves an edited name, category and quantity, showing a spinner on the row. */
  async update(id: string, draft: ItemDraft): Promise<RestockAction | null> {
    const item = this.items().find((i) => i.id === id);
    if (!item || this.pendingIds().has(id)) return null;
    this.setPending(id, true);
    try {
      return await this.save(item, draft, { optimistic: false });
    } finally {
      this.setPending(id, false);
    }
  }

  /** Deletes an item. Its restock to-do, if any, is left on the to-do list. */
  async remove(id: string): Promise<boolean> {
    if (this.pendingIds().has(id)) return false;
    this.setPending(id, true);
    try {
      await deleteDoc(doc(inventoryRef, id));
      this.items.update((items) => items.filter((i) => i.id !== id));
      return true;
    } catch (e) {
      this.error.set(errorMessage(e, 'Failed to delete item'));
      return false;
    } finally {
      this.setPending(id, false);
    }
  }

  /** Forgets all loaded data, e.g. after signing out. */
  clear(): void {
    this.items.set([]);
    this.error.set(null);
  }

  private async save(
    item: InventoryItem,
    draft: ItemDraft,
    { optimistic }: { optimistic: boolean },
  ): Promise<RestockAction | null> {
    const next = normalize(draft);
    if (!next.name) return null;
    if (
      next.name === item.name &&
      next.category === item.category &&
      next.quantity === item.quantity
    ) {
      return null;
    }

    const action = restockAction(next.quantity, item.restockTodoId !== null);
    const batch = writeBatch(db);
    let restockTodoId = item.restockTodoId;
    if (action === 'create') restockTodoId = this.queueRestockTodo(batch, item.id, next.name);
    if (action === 'complete') restockTodoId = null;
    batch.update(doc(inventoryRef, item.id), { ...next, restockTodoId });

    const updated: InventoryItem = { ...item, ...next, restockTodoId };
    // Update local state before awaiting so rapid +/- clicks see the latest
    // quantity and restock link, and never create duplicate to-dos.
    if (optimistic) this.replace(updated);
    try {
      await batch.commit();
      if (!optimistic) this.replace(updated);
    } catch (e) {
      // Reload to undo the optimistic change, then report (load() clears errors).
      await this.load();
      this.error.set(errorMessage(e, 'Failed to save item'));
      return null;
    }

    if (action === 'complete' && item.restockTodoId) {
      try {
        await updateDoc(doc(todosRef, item.restockTodoId), { completed: true });
      } catch {
        // The to-do was already deleted; nothing left to complete.
      }
    }
    return action;
  }

  /** Adds a "Restock …" to-do to the batch and returns its new ID. */
  private queueRestockTodo(
    batch: ReturnType<typeof writeBatch>,
    itemId: string,
    itemName: string,
  ): string {
    const ref = doc(todosRef);
    batch.set(ref, {
      title: restockTodoTitle(itemName),
      completed: false,
      createdAt: Timestamp.now(),
      dueAt: null,
      inventoryItemId: itemId,
    });
    return ref.id;
  }

  private replace(item: InventoryItem): void {
    this.items.update((items) => items.map((i) => (i.id === item.id ? item : i)));
  }

  private setPending(id: string, pending: boolean): void {
    this.pendingIds.update((current) => {
      const next = new Set(current);
      if (pending) next.add(id);
      else next.delete(id);
      return next;
    });
  }
}

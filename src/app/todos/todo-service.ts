import { Service, computed, signal } from '@angular/core';
import {
  DocumentData,
  QueryDocumentSnapshot,
  Timestamp,
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  getFirestore,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { Filter, Todo } from './todo';
import { firebaseApp } from '../firebase';

const db = getFirestore(firebaseApp);
const todosRef = collection(db, 'todos');

/** Firestore timestamps (or legacy epoch-millis numbers) to ISO strings. */
function toIso(value: unknown): string | null {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (typeof value === 'number') return new Date(value).toISOString();
  return null;
}

function fromDoc(snap: QueryDocumentSnapshot<DocumentData>): Todo {
  const data = snap.data();
  return {
    id: snap.id,
    title: String(data['title'] ?? ''),
    completed: data['completed'] === true,
    createdAt: toIso(data['createdAt']) ?? new Date(0).toISOString(),
    dueAt: toIso(data['dueAt']),
    order: typeof data['order'] === 'number' ? data['order'] : undefined,
  };
}

/**
 * Manually ordered to-dos first (by `order`), then never-reordered ones,
 * newest first. New to-dos get an `order` below the current minimum so they
 * land at the top.
 */
function compareTodos(a: Todo, b: Todo): number {
  if (a.order !== undefined && b.order !== undefined) return a.order - b.order;
  if (a.order !== undefined) return 1;
  if (b.order !== undefined) return -1;
  return b.createdAt.localeCompare(a.createdAt);
}

function errorMessage(e: unknown, fallback: string): string {
  return e instanceof Error && e.message ? e.message : fallback;
}

@Service({ autoProvided: true })
export class TodoService {
  readonly allTodos = signal<Todo[]>([]);
  readonly loading = signal(false);
  /** True while a new to-do is being written. */
  readonly adding = signal(false);
  /** IDs of to-dos with a write in flight. */
  readonly pendingIds = signal<ReadonlySet<string>>(new Set());
  readonly error = signal<string | null>(null);
  readonly filter = signal<Filter>('all');

  readonly todos = computed(() => {
    const f = this.filter();
    const all = this.allTodos();
    if (f === 'active') return all.filter((t) => !t.completed);
    if (f === 'completed') return all.filter((t) => t.completed);
    return all;
  });

  readonly counts = computed(() => {
    const all = this.allTodos();
    const completed = all.filter((t) => t.completed).length;
    return { all: all.length, active: all.length - completed, completed };
  });

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const snapshot = await getDocs(todosRef);
      this.allTodos.set(snapshot.docs.map(fromDoc).sort(compareTodos));
    } catch (e) {
      this.error.set(errorMessage(e, 'Failed to load to-dos'));
    } finally {
      this.loading.set(false);
    }
  }

  /** Adds a to-do and returns it, or null if the write failed. */
  async add(title: string, dueAt: string | null = null): Promise<Todo | null> {
    const orders = this.allTodos()
      .map((t) => t.order)
      .filter((o) => o !== undefined);
    const order = orders.length ? Math.min(...orders) - 1 : undefined;
    if (this.adding()) return null;
    this.adding.set(true);
    const result = await this.mutate('Failed to add to-do', async () => {
      const ref = await addDoc(todosRef, {
        title,
        completed: false,
        createdAt: Timestamp.now(),
        dueAt: dueAt ? Timestamp.fromDate(new Date(dueAt)) : null,
        ...(order !== undefined && { order }),
      });
      return ref.id;
    });
    this.adding.set(false);
    if (!result) return null;
    return this.allTodos().find((t) => t.id === result.value) ?? null;
  }

  async update(
    id: string,
    patch: { title?: string; completed?: boolean; dueAt?: string | null },
  ): Promise<boolean> {
    const data: Record<string, unknown> = {};
    if (patch.title !== undefined) data['title'] = patch.title;
    if (patch.completed !== undefined) data['completed'] = patch.completed;
    if (patch.dueAt !== undefined) {
      data['dueAt'] = patch.dueAt ? Timestamp.fromDate(new Date(patch.dueAt)) : null;
    }
    const result = await this.mutate(
      'Failed to update to-do',
      () => updateDoc(doc(todosRef, id), data),
      [id],
    );
    return result !== null;
  }

  async remove(id: string): Promise<boolean> {
    const result = await this.mutate('Failed to delete to-do', () => deleteDoc(doc(todosRef, id)), [
      id,
    ]);
    return result !== null;
  }

  /** Deletes several to-dos in one atomic batch. */
  async removeMany(ids: readonly string[]): Promise<boolean> {
    if (ids.length === 0) return true;
    const result = await this.mutate(
      'Failed to delete to-dos',
      () => {
        const batch = writeBatch(db);
        for (const id of ids) batch.delete(doc(todosRef, id));
        return batch.commit();
      },
      ids,
    );
    return result !== null;
  }

  /** Forgets all loaded data, e.g. after signing out. */
  clear(): void {
    this.allTodos.set([]);
    this.error.set(null);
    this.filter.set('all');
  }

  setFilter(filter: Filter): void {
    this.filter.set(filter);
  }

  /** Optimistically applies a new full order and persists it in one batch. */
  async reorder(newFullOrder: Todo[]): Promise<void> {
    const previous = this.allTodos();
    const reordered = newFullOrder.map((t, order) => ({ ...t, order }));
    this.allTodos.set(reordered);
    try {
      const batch = writeBatch(db);
      for (const t of reordered) batch.update(doc(todosRef, t.id), { order: t.order });
      await batch.commit();
    } catch (e) {
      this.allTodos.set(previous);
      this.error.set(errorMessage(e, 'Failed to save order'));
    }
  }

  /**
   * Runs a write, reloads the list on success, and records failures in
   * `error` instead of throwing. `ids` are marked pending until it settles;
   * a write touching an already-pending to-do is skipped. Returns the write's
   * result, or null on failure or skip.
   */
  private async mutate<T>(
    fallback: string,
    write: () => Promise<T>,
    ids: readonly string[] = [],
  ): Promise<{ value: T } | null> {
    const pending = this.pendingIds();
    if (ids.some((id) => pending.has(id))) return null;
    this.setPending(ids, true);
    try {
      const value = await write();
      await this.load();
      return { value };
    } catch (e) {
      this.error.set(errorMessage(e, fallback));
      return null;
    } finally {
      this.setPending(ids, false);
    }
  }

  private setPending(ids: readonly string[], pending: boolean): void {
    if (ids.length === 0) return;
    this.pendingIds.update((current) => {
      const next = new Set(current);
      for (const id of ids) {
        if (pending) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  }
}

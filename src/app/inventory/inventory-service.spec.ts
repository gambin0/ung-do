import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeState, resetFakeFirestore, store } from '../../testing/fake-firestore';
import { InventoryService } from './inventory-service';

vi.mock('firebase/app', () => ({ initializeApp: () => ({}) }));
vi.mock('firebase/firestore', () => import('../../testing/fake-firestore'));

const todos = () => [...(store.get('todos')?.values() ?? [])];

function seedItem(id: string, name: string, quantity: number, category: string | null = null) {
  if (!store.has('inventory')) store.set('inventory', new Map());
  store.get('inventory')!.set(id, { name, quantity, category, restockTodoId: null });
}

async function loaded(): Promise<InventoryService> {
  const svc = new InventoryService();
  await svc.load();
  return svc;
}

beforeEach(() => {
  resetFakeFirestore();
  seedItem('coffee', 'Coffee', 3, 'Pantry');
  seedItem('aa', 'AA batteries', 4, 'Garage');
  seedItem('tape', 'Tape', 5);
});

describe('InventoryService', () => {
  it('groups by category A–Z with uncategorized last', async () => {
    const svc = await loaded();
    expect(svc.groups().map((g) => g.category)).toEqual(['Garage', 'Pantry', null]);
    expect(svc.categories()).toEqual(['Garage', 'Pantry']);
  });

  it('creates one restock to-do when an item reaches 1, and none more at 0', async () => {
    const svc = await loaded();

    expect(await svc.setQuantity('coffee', 2)).toBe('none');
    expect(todos()).toEqual([]);

    expect(await svc.setQuantity('coffee', 1)).toBe('create');
    expect(todos()).toEqual([
      expect.objectContaining({
        title: 'Restock Coffee',
        completed: false,
        inventoryItemId: 'coffee',
      }),
    ]);

    expect(await svc.setQuantity('coffee', 0)).toBe('none');
    expect(todos().length).toBe(1);
    expect(svc.lowCount()).toBe(1);
  });

  it('links the to-do to the item and checks it off when restocked', async () => {
    const svc = await loaded();
    await svc.setQuantity('coffee', 1);
    const todoId = svc.items().find((i) => i.id === 'coffee')!.restockTodoId!;
    expect(store.get('inventory')!.get('coffee')!['restockTodoId']).toBe(todoId);

    expect(await svc.setQuantity('coffee', 6)).toBe('complete');

    expect(store.get('todos')!.get(todoId)!['completed']).toBe(true);
    expect(svc.items().find((i) => i.id === 'coffee')!.restockTodoId).toBeNull();
  });

  it('handles rapid clicks without duplicate to-dos', async () => {
    const svc = await loaded();
    // Not awaited between clicks, like fast tapping on the minus button.
    await Promise.all([
      svc.setQuantity('coffee', 2),
      svc.setQuantity('coffee', 1),
      svc.setQuantity('coffee', 0),
    ]);
    expect(todos().length).toBe(1);
    expect(store.get('inventory')!.get('coffee')!['quantity']).toBe(0);
  });

  it('creates a restock to-do for an item added with 0 or 1 in stock', async () => {
    const svc = await loaded();
    expect(await svc.add({ name: '  Milk ', quantity: 0, category: ' Fridge ' })).toEqual({
      restock: 'create',
    });
    const milk = svc.items().find((i) => i.name === 'Milk')!;
    expect(milk.category).toBe('Fridge');
    expect(milk.restockTodoId).not.toBeNull();
    expect(todos().map((t) => t['title'])).toEqual(['Restock Milk']);
  });

  it('does not complete anything if the restock to-do was already deleted', async () => {
    const svc = await loaded();
    await svc.setQuantity('coffee', 1);
    store.get('todos')!.clear();

    expect(await svc.setQuantity('coffee', 5)).toBe('complete');
    expect(svc.error()).toBeNull();
  });

  it('shows a row spinner only for edits, and applies restock rules to edited quantities', async () => {
    const svc = await loaded();
    const write = svc.update('tape', { name: 'Duct tape', quantity: 1, category: 'Garage' });
    expect([...svc.pendingIds()]).toEqual(['tape']);

    expect(await write).toBe('create');
    expect(svc.pendingIds().size).toBe(0);
    expect(svc.items().find((i) => i.id === 'tape')).toEqual(
      expect.objectContaining({ name: 'Duct tape', quantity: 1, category: 'Garage' }),
    );
    expect(todos().map((t) => t['title'])).toEqual(['Restock Duct tape']);
  });

  it('reverts by reloading and reports the error when a save fails', async () => {
    const svc = await loaded();
    fakeState.failCommit = true;

    expect(await svc.setQuantity('coffee', 1)).toBeNull();

    expect(svc.error()).toBe('commit failed');
    expect(svc.items().find((i) => i.id === 'coffee')!.quantity).toBe(3);
    expect(todos()).toEqual([]);
  });

  it('never goes below zero', async () => {
    const svc = await loaded();
    await svc.setQuantity('coffee', -4);
    expect(svc.items().find((i) => i.id === 'coffee')!.quantity).toBe(0);
  });
});

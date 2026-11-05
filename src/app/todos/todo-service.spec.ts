import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Timestamp, fakeState, resetFakeFirestore, store } from '../../testing/fake-firestore';
import { TodoService } from './todo-service';

vi.mock('firebase/app', () => ({ initializeApp: () => ({}) }));
vi.mock('firebase/firestore', () => import('../../testing/fake-firestore'));

function seed(id: string, title: string, completed: boolean, createdMs: number) {
  if (!store.has('todos')) store.set('todos', new Map());
  store
    .get('todos')!
    .set(id, { title, completed, createdAt: new Timestamp(createdMs), dueAt: null });
}

beforeEach(() => {
  resetFakeFirestore();
  seed('a', 'a', false, 3000);
  seed('b', 'b', true, 2000);
  seed('c', 'c', false, 1000);
});

const ids = (svc: TodoService) => svc.todos().map((t) => t.id);

describe('TodoService', () => {
  it('loads newest first and derives each filter', async () => {
    const svc = new TodoService();
    await svc.load();

    expect(svc.counts()).toEqual({ all: 3, active: 2, completed: 1 });
    expect(ids(svc)).toEqual(['a', 'b', 'c']);
    svc.setFilter('active');
    expect(ids(svc)).toEqual(['a', 'c']);
    svc.setFilter('completed');
    expect(ids(svc)).toEqual(['b']);
  });

  it('maps Firestore timestamps to ISO strings', async () => {
    const svc = new TodoService();
    await svc.load();
    expect(svc.allTodos()[0].createdAt).toBe(new Date(3000).toISOString());
  });

  it('persists a reorder and keeps it across reloads', async () => {
    const svc = new TodoService();
    await svc.load();
    const [a, b, c] = svc.allTodos();

    await svc.reorder([c, a, b]);
    expect(ids(svc)).toEqual(['c', 'a', 'b']);
    expect(svc.error()).toBeNull();

    await svc.load();
    expect(ids(svc)).toEqual(['c', 'a', 'b']);
  });

  it('reverts the order and sets the error signal when saving fails', async () => {
    const svc = new TodoService();
    await svc.load();
    const [a, b, c] = svc.allTodos();
    fakeState.failCommit = true;

    await svc.reorder([c, a, b]);

    expect(ids(svc)).toEqual(['a', 'b', 'c']);
    expect(svc.error()).toBe('commit failed');
  });

  it('adds new to-dos at the top of a reordered list and returns them', async () => {
    const svc = new TodoService();
    await svc.load();
    const [a, b, c] = svc.allTodos();
    await svc.reorder([c, a, b]);

    const added = await svc.add('new', null);

    expect(added?.title).toBe('new');
    expect(ids(svc)).toEqual([added!.id, 'c', 'a', 'b']);
  });

  it('removes several to-dos in one batch', async () => {
    const svc = new TodoService();
    await svc.load();
    expect(await svc.removeMany(['a', 'b'])).toBe(true);
    expect(ids(svc)).toEqual(['c']);
  });

  it('records write failures in the error signal instead of throwing', async () => {
    const svc = new TodoService();
    await svc.load();
    fakeState.failCommit = true;
    expect(await svc.removeMany(['a'])).toBe(false);
    expect(svc.error()).toBe('commit failed');
    expect(svc.pendingIds().size).toBe(0);
  });

  it('marks only the affected to-do as pending while it saves', async () => {
    const svc = new TodoService();
    await svc.load();

    const write = svc.update('a', { completed: true });
    expect([...svc.pendingIds()]).toEqual(['a']);
    expect(svc.adding()).toBe(false);

    // A second write to the same to-do while the first is in flight is skipped.
    expect(await svc.remove('a')).toBe(false);

    expect(await write).toBe(true);
    expect(svc.pendingIds().size).toBe(0);
    expect(ids(svc)).toContain('a');
  });

  it('flags adding (not any row) while a new to-do saves', async () => {
    const svc = new TodoService();
    await svc.load();

    const write = svc.add('new');
    expect(svc.adding()).toBe(true);
    expect(svc.pendingIds().size).toBe(0);

    await write;
    expect(svc.adding()).toBe(false);
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TodoService } from './todo-service';

/** A tiny in-memory stand-in for the parts of Firestore the service uses. */
const fake = vi.hoisted(() => {
  class Timestamp {
    constructor(private readonly ms: number) {}
    static now() {
      return new Timestamp(Date.now());
    }
    static fromDate(d: Date) {
      return new Timestamp(d.getTime());
    }
    toDate() {
      return new Date(this.ms);
    }
  }
  const docs = new Map<string, Record<string, unknown>>();
  const state = { nextId: 1, failCommit: false };
  const snap = (id: string) => ({ id, data: () => docs.get(id)! });
  return { Timestamp, docs, state, snap };
});

vi.mock('firebase/app', () => ({ initializeApp: () => ({}) }));
vi.mock('firebase/firestore', () => ({
  Timestamp: fake.Timestamp,
  getFirestore: () => ({}),
  collection: () => ({}),
  doc: (_ref: unknown, id: string) => ({ id }),
  getDocs: async () => ({ docs: [...fake.docs.keys()].map(fake.snap) }),
  addDoc: async (_ref: unknown, data: Record<string, unknown>) => {
    const id = `new-${fake.state.nextId++}`;
    fake.docs.set(id, data);
    return { id };
  },
  updateDoc: async (ref: { id: string }, data: Record<string, unknown>) => {
    fake.docs.set(ref.id, { ...fake.docs.get(ref.id), ...data });
  },
  deleteDoc: async (ref: { id: string }) => {
    fake.docs.delete(ref.id);
  },
  writeBatch: () => {
    const ops: (() => void)[] = [];
    return {
      update: (ref: { id: string }, data: Record<string, unknown>) =>
        ops.push(() => fake.docs.set(ref.id, { ...fake.docs.get(ref.id), ...data })),
      delete: (ref: { id: string }) => ops.push(() => fake.docs.delete(ref.id)),
      commit: async () => {
        if (fake.state.failCommit) throw new Error('bad order');
        ops.forEach((op) => op());
      },
    };
  },
}));

function seed(id: string, title: string, completed: boolean, createdMs: number) {
  fake.docs.set(id, { title, completed, createdAt: new fake.Timestamp(createdMs), dueAt: null });
}

beforeEach(() => {
  fake.docs.clear();
  fake.state.nextId = 1;
  fake.state.failCommit = false;
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
    fake.state.failCommit = true;

    await svc.reorder([c, a, b]);

    expect(ids(svc)).toEqual(['a', 'b', 'c']);
    expect(svc.error()).toBe('bad order');
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
    fake.state.failCommit = true;
    expect(await svc.removeMany(['a'])).toBe(false);
    expect(svc.error()).toBe('bad order');
    expect(svc.saving()).toBe(false);
  });
});

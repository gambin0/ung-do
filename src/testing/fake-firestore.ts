/**
 * An in-memory stand-in for the parts of `firebase/firestore` this app uses.
 * Use it from a spec with:
 *
 *   vi.mock('firebase/firestore', () => import('../../testing/fake-firestore'));
 *
 * and reset between tests with `resetFakeFirestore()`.
 */

type Data = Record<string, unknown>;
interface CollectionRef {
  path: string;
}
interface DocRef {
  path: string;
  id: string;
}

export class Timestamp {
  constructor(private readonly ms: number) {}
  static now(): Timestamp {
    return new Timestamp(Date.now());
  }
  static fromDate(d: Date): Timestamp {
    return new Timestamp(d.getTime());
  }
  toDate(): Date {
    return new Date(this.ms);
  }
}

/** Collection path → document id → data. Read and seed it directly in tests. */
export const store = new Map<string, Map<string, Data>>();
export const fakeState = { nextId: 1, failCommit: false };

export function resetFakeFirestore(): void {
  store.clear();
  fakeState.nextId = 1;
  fakeState.failCommit = false;
}

function docsOf(path: string): Map<string, Data> {
  let docs = store.get(path);
  if (!docs) store.set(path, (docs = new Map()));
  return docs;
}

function patch(ref: DocRef, data: Data): void {
  const docs = docsOf(ref.path);
  if (!docs.has(ref.id)) throw new Error(`No document to update: ${ref.path}/${ref.id}`);
  docs.set(ref.id, { ...docs.get(ref.id), ...data });
}

export const getFirestore = () => ({});
export const collection = (_db: unknown, path: string): CollectionRef => ({ path });
export const doc = (ref: CollectionRef, id?: string): DocRef => ({
  path: ref.path,
  id: id ?? `auto-${fakeState.nextId++}`,
});

export async function getDocs(ref: CollectionRef) {
  return {
    docs: [...docsOf(ref.path).entries()].map(([id, data]) => ({ id, data: () => data })),
  };
}

export async function addDoc(ref: CollectionRef, data: Data): Promise<DocRef> {
  const created = doc(ref);
  docsOf(ref.path).set(created.id, data);
  return created;
}

export async function updateDoc(ref: DocRef, data: Data): Promise<void> {
  patch(ref, data);
}

export async function deleteDoc(ref: DocRef): Promise<void> {
  docsOf(ref.path).delete(ref.id);
}

export function writeBatch() {
  const ops: (() => void)[] = [];
  const batch = {
    set: (ref: DocRef, data: Data) => (ops.push(() => docsOf(ref.path).set(ref.id, data)), batch),
    update: (ref: DocRef, data: Data) => (ops.push(() => patch(ref, data)), batch),
    delete: (ref: DocRef) => (ops.push(() => docsOf(ref.path).delete(ref.id)), batch),
    commit: async () => {
      if (fakeState.failCommit) throw new Error('commit failed');
      ops.forEach((op) => op());
    },
  };
  return batch;
}

import { Injectable, computed, signal } from '@angular/core';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, addDoc, updateDoc, deleteDoc, doc, orderBy, query } from 'firebase/firestore';
import { Filter, Todo } from './todo';
import { firebaseConfig } from '../firebase.config';

let app = initializeApp(firebaseConfig);
let db = getFirestore(app);

@Injectable({ providedIn: 'root' })
export class TodoService {
  readonly allTodos = signal<Todo[]>([]);
  readonly loading = signal(false);
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
    return {
      all: all.length,
      active: all.filter((t) => !t.completed).length,
      completed: all.filter((t) => t.completed).length,
    };
  });

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const todosRef = collection(db, 'todos');
      const q = query(todosRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const todos: Todo[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        todos.push({
          id: parseInt(docSnap.id),
          title: data['title'],
          completed: data['completed'] || false,
          createdAt: data['createdAt']?.toMillis ? data['createdAt'].toMillis() : Date.now(),
          dueAt: data['dueAt']?.toMillis ? data['dueAt'].toMillis() : null,
        });
      });
      this.allTodos.set(todos);
    } catch (e) {
      this.error.set((e as Error).message || 'failed to load to-dos');
    } finally {
      this.loading.set(false);
    }
  }

  async add(title: string, dueAt?: string | null): Promise<void> {
    try {
      const todosRef = collection(db, 'todos');
      await addDoc(todosRef, {
        title,
        completed: false,
        createdAt: Date.now(),
        dueAt: dueAt ? new Date(dueAt) : null,
      });
      await this.load();
    } catch (e) {
      throw new Error((e as Error).message || 'failed to add todo');
    }
  }

  async update(id: number, patch: { title?: string; completed?: boolean; dueAt?: string | null }): Promise<void> {
    try {
      const todoRef = doc(db, 'todos', id.toString());
      const updateData: any = {};
      if (patch.title !== undefined) updateData.title = patch.title;
      if (patch.completed !== undefined) updateData.completed = patch.completed;
      if (patch.dueAt !== undefined) updateData.dueAt = patch.dueAt ? new Date(patch.dueAt) : null;
      await updateDoc(todoRef, updateData);
      await this.load();
    } catch (e) {
      throw new Error((e as Error).message || 'failed to update todo');
    }
  }

  async toggle(id: number, completed: boolean): Promise<void> {
    await this.update(id, { completed });
  }

  async remove(id: number): Promise<void> {
    try {
      const todoRef = doc(db, 'todos', id.toString());
      await deleteDoc(todoRef);
      await this.load();
    } catch (e) {
      throw new Error((e as Error).message || 'failed to delete todo');
    }
  }

  setFilter(filter: Filter): void {
    this.filter.set(filter);
  }

  async reorder(newFullOrder: Todo[]): Promise<void> {
    const previous = this.allTodos();
    this.allTodos.set(newFullOrder);
    try {
      for (let i = 0; i < newFullOrder.length; i++) {
        const todoRef = doc(db, 'todos', newFullOrder[i].id.toString());
        await updateDoc(todoRef, { order: i });
      }
    } catch (e) {
      this.allTodos.set(previous);
      this.error.set((e as Error).message || 'failed to save order');
    }
  }
}

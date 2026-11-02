import { Injectable, computed, signal } from '@angular/core';
import { Filter, Todo } from './todo';

/**
 * Talks to the local to-do API (same-origin `/api`, proxied by the dev server).
 * Uses plain `fetch` — no HttpClient dependency. Keeps the full list and derives
 * the filtered view + counts client-side so filtering is instant.
 */
@Injectable({ providedIn: 'root' })
export class TodoService {
  private readonly api = '/api/todos';

  /** Full list from the server (always newest-first, unfiltered). */
  readonly allTodos = signal<Todo[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly filter = signal<Filter>('all');

  /** The list for the current filter. */
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

  /** Fetch the full list from the server. */
  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const res = await fetch(`${this.api}?status=all`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { todos: Todo[] };
      this.allTodos.set(data.todos);
    } catch (e) {
      this.error.set((e as Error).message || 'failed to load to-dos');
    } finally {
      this.loading.set(false);
    }
  }

  private async request(method: string, path: string, body?: unknown): Promise<Todo | null> {
    const res = await fetch(`${this.api}${path}`, {
      method,
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      throw new Error(data?.error ?? `HTTP ${res.status}`);
    }
    if (res.status === 204) return null;
    const data = (await res.json()) as { todo: Todo };
    return data.todo;
  }

  async add(title: string, dueAt?: string | null): Promise<void> {
    await this.request('POST', '', { title, dueAt });
    await this.load();
  }

  async update(id: number, patch: { title?: string; completed?: boolean; dueAt?: string | null }): Promise<void> {
    await this.request('PATCH', `/${id}`, patch);
    await this.load();
  }

  async toggle(id: number, completed: boolean): Promise<void> {
    await this.update(id, { completed });
  }

  async remove(id: number): Promise<void> {
    await this.request('DELETE', `/${id}`);
    await this.load();
  }

  /** Change the active filter (view-only, no round-trip needed). */
  setFilter(filter: Filter): void {
    this.filter.set(filter);
  }

  /**
   * Reorder the full list (top first). Optimistically applies the new order,
   * then persists it via `PUT /api/todos/order`. On failure the previous order
   * is restored and the error signal is set.
   */
  async reorder(newFullOrder: Todo[]): Promise<void> {
    const previous = this.allTodos();
    this.allTodos.set(newFullOrder);
    try {
      const res = await fetch(`${this.api}/order`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: newFullOrder.map((t) => t.id) }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? `HTTP ${res.status}`);
      }
    } catch (e) {
      this.allTodos.set(previous);
      this.error.set((e as Error).message || 'failed to save order');
    }
  }
}

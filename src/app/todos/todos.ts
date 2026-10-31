import { Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { TodoItem } from './todo-item';
import { TodoService } from './todo-service';
import { Filter } from './todo';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'completed', label: 'Completed' },
];

/**
 * The to-do screen: an input to add to-dos, an All/Active/Completed filter,
 * the list of items, plus empty-state and backend-unavailable states.
 */
@Component({
  selector: 'app-todos',
  standalone: true,
  imports: [FormsModule, MatCheckboxModule, MatIconModule, MatInputModule, TodoItem],
  template: `
    <div class="mx-auto flex min-h-screen w-full max-w-xl flex-col gap-6 px-4 py-10">
      <header class="flex items-baseline justify-between">
        <h1 class="text-3xl font-semibold tracking-tight text-neutral-900">ung-do</h1>
        <span class="text-sm text-neutral-500">{{ counts().active }} open</span>
      </header>

      @if (error(); as err) {
        <div
          class="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          role="alert"
        >
          <span class="flex items-center gap-2">
            <mat-icon class="text-red-500">cloud_off</mat-icon>
            Backend unavailable ({{ err }}). Is <code>npm run api</code> running?
          </span>
          <button
            type="button"
            class="rounded-md border border-red-300 px-3 py-1 font-medium transition hover:bg-red-100"
            (click)="load()"
          >
            Retry
          </button>
        </div>
      }

      <form class="flex gap-2" (ngSubmit)="add()">
        <input
          name="new-title"
          placeholder="What needs doing?"
          aria-label="New to-do title"
          [ngModel]="draft()"
          (ngModelChange)="draft.set($event)"
          class="flex-1 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
        />
        <button
          type="submit"
          [disabled]="busy() || !draft().trim()"
          class="rounded-xl bg-blue-600 px-5 py-3 font-medium text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Add
        </button>
      </form>

      <nav class="flex gap-2" aria-label="Filter to-dos">
        @for (f of FILTERS; track f.key) {
          <button
            type="button"
            [class]="
              'rounded-full px-4 py-1.5 text-sm font-medium transition ' +
              (service.filter() === f.key
                ? 'bg-neutral-900 text-white'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200')
            "
            [aria-pressed]="service.filter() === f.key"
            (click)="service.setFilter(f.key)"
          >
            {{ f.label }} ({{ countFor(f.key) }})
          </button>
        }
      </nav>

      @if (error()) {
        <p class="text-sm text-neutral-500">Showing last loaded list — retry above to refresh.</p>
      } @else if (todos().length === 0) {
        <div class="flex flex-col items-center gap-2 rounded-xl border border-dashed border-neutral-300 py-12 text-center">
          <mat-icon class="text-4xl text-neutral-300">check_circle</mat-icon>
          <p class="text-neutral-500">{{ emptyMessage() }}</p>
        </div>
      } @else {
        <ul class="flex flex-col gap-2">
          @for (t of todos(); track t.id) {
            <app-todo-item
              [todo]="t"
              (toggle)="toggle(t.id, $event)"
              (update)="updateTitle(t.id, $event)"
              (remove)="remove(t.id)"
            />
          }
        </ul>
      }
    </div>
  `,
  styleUrl: './todos.scss',
})
export class Todos implements OnInit {
  protected readonly FILTERS = FILTERS;

  protected readonly draft = signal('');
  protected readonly busy = signal(false);

  protected readonly todos = computed(() => this.service.todos());
  protected readonly counts = computed(() => this.service.counts());
  protected readonly error = computed(() => this.service.error());

  constructor(protected readonly service: TodoService) {}

  ngOnInit(): void {
    this.service.load();
  }

  protected emptyMessage(): string {
    const f = this.service.filter();
    if (f === 'active') return 'Nothing open — nice work!';
    if (f === 'completed') return 'Nothing completed yet.';
    return 'No to-dos yet. Add one above to get started.';
  }

  protected countFor(key: Filter): number {
    return this.counts()[key];
  }

  protected async load(): Promise<void> {
    this.busy.set(true);
    try {
      await this.service.load();
    } finally {
      this.busy.set(false);
    }
  }

  protected async add(): Promise<void> {
    const title = this.draft().trim();
    if (!title) return; // blank/whitespace-only input is rejected
    this.busy.set(true);
    try {
      await this.service.add(title);
      this.draft.set('');
    } finally {
      this.busy.set(false);
    }
  }

  protected async toggle(id: number, completed: boolean): Promise<void> {
    this.busy.set(true);
    try {
      await this.service.toggle(id, completed);
    } finally {
      this.busy.set(false);
    }
  }

  protected async updateTitle(id: number, title: string): Promise<void> {
    this.busy.set(true);
    try {
      await this.service.update(id, { title });
    } finally {
      this.busy.set(false);
    }
  }

  protected async remove(id: number): Promise<void> {
    this.busy.set(true);
    try {
      await this.service.remove(id);
    } finally {
      this.busy.set(false);
    }
  }
}

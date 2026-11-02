import { Component, OnInit, OnDestroy, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { TodoItem } from './todo-item';
import { TodoService } from './todo-service';
import { NotificationService } from './notification-service';
import { applyVisibleOrder } from './order';
import { Filter, Todo } from './todo';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'completed', label: 'Done' },
];

/**
 * The to-do screen: a gradient header, an "add" composer, a progress bar,
 * a segmented All/Active/Done filter, and the list of items — plus empty-state
 * and backend-unavailable states.
 */
@Component({
  selector: 'app-todos',
  standalone: true,
  imports: [FormsModule, MatIconModule, TodoItem],
  template: `
    <div class="page">
      <div class="shell">
        <header class="masthead">
          <div class="brand">
            <span class="brand-mark">
              <mat-icon>format_list_bulleted</mat-icon>
            </span>
            <div class="brand-text">
              <h1 class="brand-name">ung-do</h1>
              <p class="brand-date">{{ dateLabel() }}</p>
            </div>
          </div>
          @if (counts().all > 0) {
            <div class="stat">
              <span class="stat-num">{{ counts().active }}</span>
              <span class="stat-cap">open</span>
            </div>
          }
        </header>

        <section class="card">
          @if (error(); as err) {
            <div class="alert" role="alert">
              <mat-icon>cloud_off</mat-icon>
              <div class="alert-body">
                <strong>Backend unavailable</strong>
                <span>{{ err }} — is <code>npm run api</code> running?</span>
              </div>
              <button type="button" class="btn btn-ghost" (click)="load()">Retry</button>
            </div>
          }

          <form class="composer" (ngSubmit)="add()">
            <mat-icon class="composer-plus">add</mat-icon>
            <input
              name="new-title"
              class="composer-input"
              placeholder="Add a task…"
              aria-label="New to-do title"
              [ngModel]="draft()"
              (ngModelChange)="draft.set($event)"
            />
            <input
              type="datetime-local"
              name="new-due"
              class="composer-due"
              aria-label="Due date and time (optional)"
              [ngModel]="dueDate()"
              (ngModelChange)="dueDate.set($event)"
            />
            <button
              type="submit"
              class="btn btn-primary"
              [disabled]="busy() || !draft().trim()"
            >
              <span>Add</span>
              <mat-icon>arrow_forward</mat-icon>
            </button>
          </form>

          @if (counts().all > 0) {
            <div class="progress">
              <div class="progress-track">
                <div class="progress-fill" [style.width.%]="pct()"></div>
              </div>
              <span class="progress-label">{{ pct() }}% done</span>
            </div>
          }

          <div class="toolbar">
            <div class="segmented" role="tablist" aria-label="Filter to-dos">
              @for (f of FILTERS; track f.key) {
                <button
                  type="button"
                  role="tab"
                  class="segment"
                  [class.is-active]="service.filter() === f.key"
                  [aria-selected]="service.filter() === f.key"
                  (click)="service.setFilter(f.key)"
                >
                  {{ f.label }}
                  <span class="segment-count">{{ countFor(f.key) }}</span>
                </button>
              }
            </div>
            @if (counts().completed > 0 && service.filter() === 'all') {
              <button
                type="button"
                class="btn btn-text"
                (click)="clearCompleted()"
              >
                <mat-icon>cleaning_services</mat-icon>
                Clear done
              </button>
            }
          </div>

          <div class="list-area">
            @if (error()) {
              <p class="muted">Showing last loaded list — retry above to refresh.</p>
            } @else if (todos().length === 0) {
              <div class="empty">
                <div class="empty-glyph">
                  <mat-icon>{{ emptyGlyph() }}</mat-icon>
                </div>
                <p class="empty-title">{{ emptyTitle() }}</p>
                <p class="empty-sub">{{ emptySub() }}</p>
              </div>
            } @else {
              <ul class="list">
                @for (t of todos(); track t.id; let i = $index) {
                  <li class="row-wrap" [style.--i]="i">
                    <app-todo-item
                      [todo]="t"
                      (toggle)="toggle(t.id, $event)"
                      (update)="updateTitle(t.id, $event)"
                      (remove)="remove(t.id)"
                      (dragStart)="onDragStart(t)"
                      (dragEnd)="onDragEnd()"
                      (move)="onKeyMove(t, $event)"
                      [dropSide]="dropSideFor(t.id)"
                      (dragover)="onDragOver($event, t)"
                      (drop)="onDrop($event)"
                    />
                  </li>
                }
              </ul>
            }
            <p class="visually-hidden" aria-live="polite">{{ announce() }}</p>
          </div>
        </section>

        <footer class="footnote">
          <span>Stored locally in SQLite on this machine</span>
          <span class="dot">•</span>
          <span>no cloud, no sign-in</span>
        </footer>
      </div>
    </div>
  `,
  styleUrl: './todos.scss',
})
export class Todos implements OnInit {
  protected readonly FILTERS = FILTERS;

  protected readonly draft = signal('');
  protected readonly busy = signal(false);
  protected readonly dueDate = signal('');

  protected readonly todos = computed(() => this.service.todos());
  protected readonly counts = computed(() => this.service.counts());
  protected readonly error = computed(() => this.service.error());

  /** The to-do id currently being dragged, or null. */
  protected readonly draggedId = signal<number | null>(null);
  /** Where the drop indicator currently points, or null. */
  protected readonly dropTarget = signal<{ id: number; side: 'before' | 'after' } | null>(null);
  /** Screen-reader announcement for keyboard reordering. */
  protected readonly announce = signal('');

  protected readonly pct = computed(() => {
    const c = this.counts();
    return c.all === 0 ? 0 : Math.round((c.completed / c.all) * 100);
  });

  protected readonly dateLabel = signal('');

  private checkInterval: ReturnType<typeof setInterval> | null = null;

  constructor(
    protected readonly service: TodoService,
    private readonly notifications: NotificationService,
  ) {}

  ngOnInit(): void {
    this.dateLabel.set(
      new Date().toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      }),
    );
    this.service.load();
    this.startPeriodicChecks();
  }

  ngOnDestroy(): void {
    this.stopPeriodicChecks();
  }

  private startPeriodicChecks(): void {
    this.checkInterval = setInterval(() => {
      this.notifications.checkDueTodos(this.service.allTodos());
    }, 60000); // every 60 seconds
  }

  private stopPeriodicChecks(): void {
    if (this.checkInterval !== null) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  protected emptyGlyph(): string {
    const f = this.service.filter();
    if (f === 'active') return 'check_circle';
    if (f === 'completed') return 'task_alt';
    return 'inbox';
  }

  protected emptyTitle(): string {
    const f = this.service.filter();
    if (f === 'active') return 'All clear';
    if (f === 'completed') return 'Nothing done yet';
    return 'Nothing here yet';
  }

  protected emptySub(): string {
    const f = this.service.filter();
    if (f === 'active') return 'Every task is complete. Nice work.';
    if (f === 'completed') return 'Check something off and it will land here.';
    return 'Add a task above to get started.';
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
      const dueAt = this.dueDate().trim() ? this.dueDate().trim() : null;
      if (dueAt) {
        await this.notifications.requestPermission();
      }
      await this.service.add(title, dueAt);
      this.draft.set('');
      this.dueDate.set('');
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

  protected async clearCompleted(): Promise<void> {
    const completed = this.todos()
      .filter((t) => t.completed)
      .map((t) => t.id);
    this.busy.set(true);
    try {
      for (const id of completed) {
        await this.service.remove(id);
      }
    } finally {
      this.busy.set(false);
    }
  }

  // ---- Drag-to-reorder ----------------------------------------------------

  /** Which indicator side (if any) to draw on a given row. */
  protected dropSideFor(id: number): 'before' | 'after' | null {
    const t = this.dropTarget();
    if (!t || t.id !== id) return null;
    return t.side;
  }

  protected onDragStart(todo: Todo): void {
    this.draggedId.set(todo.id);
    this.dropTarget.set(null);
  }

  protected onDragOver(event: DragEvent, hovered: Todo): void {
    const dragged = this.draggedId();
    if (dragged === null || dragged === hovered.id) return;
    // preventDefault is what makes this row a valid drop target.
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const side: 'before' | 'after' = event.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
    const cur = this.dropTarget();
    if (!cur || cur.id !== hovered.id || cur.side !== side) {
      this.dropTarget.set({ id: hovered.id, side });
    }
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    const dragged = this.draggedId();
    const target = this.dropTarget();
    this.draggedId.set(null);
    this.dropTarget.set(null);
    if (dragged === null || !target) return;

    const visible = this.todos();
    const draggedTodo = visible.find((t) => t.id === dragged);
    if (!draggedTodo) return;

    const without = visible.filter((t) => t.id !== dragged);
    const hoveredIndex = without.findIndex((t) => t.id === target.id);
    if (hoveredIndex === -1) return; // dropped over the dragged row itself
    const insertAt = target.side === 'before' ? hoveredIndex : hoveredIndex + 1;
    const newVisible = [
      ...without.slice(0, insertAt),
      draggedTodo,
      ...without.slice(insertAt),
    ];

    // A drop back onto the same slot is a no-op: no round-trip, no announcement.
    if (newVisible.every((t, i) => visible[i]?.id === t.id)) return;

    const newFull = applyVisibleOrder(this.service.allTodos(), visible, newVisible);
    void this.service.reorder(newFull);
  }

  protected onDragEnd(): void {
    this.draggedId.set(null);
    this.dropTarget.set(null);
  }

  /** Alt+ArrowUp/ArrowDown on a row's handle: move it one visible slot. */
  protected onKeyMove(todo: Todo, dir: number): void {
    const step = dir < 0 ? -1 : 1;
    const visible = this.todos();
    const from = visible.findIndex((t) => t.id === todo.id);
    const to = from + step;
    if (from === -1 || to < 0 || to >= visible.length) {
      this.announce.set(`${todo.title} cannot move ${step === -1 ? 'up' : 'down'} further`);
      return;
    }
    const newVisible = [...visible];
    [newVisible[from], newVisible[to]] = [newVisible[to], newVisible[from]];
    const newFull = applyVisibleOrder(this.service.allTodos(), visible, newVisible);
    void this.service.reorder(newFull);
    this.announce.set(`${todo.title} moved to position ${to + 1} of ${visible.length}`);
  }
}

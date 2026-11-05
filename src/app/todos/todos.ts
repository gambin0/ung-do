import { Component, ElementRef, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { AuthService } from '../auth/auth-service';
import { TodoItem } from './todo-item';
import { TodoService } from './todo-service';
import { NotificationService } from './notification-service';
import { applyVisibleOrder } from './order';
import { isUpcoming } from './time-utils';
import { Filter, Todo } from './todo';

const FILTERS: readonly { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'completed', label: 'Done' },
];

const EMPTY_STATES: Record<Filter, { glyph: string; title: string; sub: string }> = {
  all: { glyph: 'inbox', title: 'Nothing here yet', sub: 'Add a task above to get started.' },
  active: { glyph: 'check_circle', title: 'All clear', sub: 'Every task is complete. Nice work.' },
  completed: {
    glyph: 'task_alt',
    title: 'Nothing done yet',
    sub: 'Check something off and it will land here.',
  },
};

const DUE_CHECK_INTERVAL_MS = 60_000;

type DropTarget = { id: string; side: 'before' | 'after' };

/**
 * The to-do screen: a gradient header, an "add" composer, a progress bar,
 * a segmented All/Active/Done filter, and the list of items — plus empty and
 * error states.
 */
@Component({
  selector: 'app-todos',
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

        <section class="card" [attr.aria-busy]="loading()">
          @if (error(); as err) {
            <div class="alert" role="alert">
              <mat-icon>cloud_off</mat-icon>
              <div class="alert-body">
                <strong>Backend unavailable</strong>
                <span>{{ err }}</span>
              </div>
              <button type="button" class="btn btn-ghost" (click)="load()">Retry</button>
            </div>
          }

          <form class="composer" (ngSubmit)="add()" [attr.aria-busy]="adding()">
            @if (adding()) {
              <div class="busy-overlay" aria-hidden="true"><mat-icon>sync</mat-icon></div>
            }
            <mat-icon class="composer-plus">add</mat-icon>
            <input
              name="new-title"
              class="composer-input"
              placeholder="Add a task…"
              aria-label="New to-do title"
              [ngModel]="draft()"
              (ngModelChange)="draft.set($event)"
            />
            <button
              type="button"
              class="composer-due-btn"
              aria-label="Set due date and time (optional)"
              (click)="dueInput.showPicker()"
            >
              <mat-icon>event</mat-icon>
            </button>
            <input
              #dueInput
              type="datetime-local"
              name="new-due"
              class="composer-due"
              aria-label="Due date and time (optional)"
              [ngModel]="dueDate()"
              (ngModelChange)="dueDate.set($event)"
            />
            <button type="submit" class="btn btn-primary" [disabled]="!draft().trim()">
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
            <div class="segmented" role="group" aria-label="Filter to-dos">
              @for (f of FILTERS; track f.key) {
                <button
                  type="button"
                  class="segment"
                  [class.is-active]="filter() === f.key"
                  [aria-pressed]="filter() === f.key"
                  (click)="service.setFilter(f.key)"
                >
                  {{ f.label }}
                  <span class="segment-count">{{ counts()[f.key] }}</span>
                </button>
              }
            </div>
            @if (counts().completed > 0 && filter() === 'all') {
              <button type="button" class="btn btn-text" (click)="clearCompleted()">
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
                  <mat-icon>{{ empty().glyph }}</mat-icon>
                </div>
                <p class="empty-title">{{ empty().title }}</p>
                <p class="empty-sub">{{ empty().sub }}</p>
              </div>
            } @else {
              <ul class="list">
                @for (t of todos(); track t.id; let i = $index) {
                  <li class="row-wrap" [style.--i]="i">
                    <app-todo-item
                      [todo]="t"
                      [busy]="pendingIds().has(t.id)"
                      (toggle)="toggle(t.id, $event)"
                      (update)="updateTitle(t.id, $event)"
                      (updateDue)="updateDue(t.id, $event)"
                      (remove)="remove(t.id)"
                      (dragStart)="onDragStart($event)"
                      (dragEnd)="onDragEnd()"
                      (move)="onKeyMove(t, $event)"
                      [dropSide]="dropSideFor(t.id)"
                      (dragOver)="onDragOver($event)"
                      (dropped)="onDrop($event)"
                    />
                  </li>
                }
              </ul>
            }
            <p class="visually-hidden" aria-live="polite">{{ announce() }}</p>
          </div>
        </section>

        <footer class="footnote">
          <span>Stored in Firebase Firestore</span>
          <span class="dot">•</span>
          <span>syncs across your devices</span>
          <span class="dot">•</span>
          <button type="button" class="link-btn" (click)="signOut()">Sign out</button>
        </footer>
      </div>
    </div>
  `,
  styleUrl: './todos.scss',
})
export class Todos implements OnInit, OnDestroy {
  protected readonly service = inject(TodoService);
  private readonly notifications = inject(NotificationService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly FILTERS = FILTERS;

  protected readonly todos = this.service.todos;
  protected readonly counts = this.service.counts;
  protected readonly error = this.service.error;
  protected readonly filter = this.service.filter;
  protected readonly loading = this.service.loading;
  protected readonly adding = this.service.adding;
  protected readonly pendingIds = this.service.pendingIds;

  protected readonly draft = signal('');
  protected readonly dueDate = signal('');
  protected readonly dateLabel = signal('');

  protected readonly pct = computed(() => {
    const c = this.counts();
    return c.all === 0 ? 0 : Math.round((c.completed / c.all) * 100);
  });

  protected readonly empty = computed(() => EMPTY_STATES[this.filter()]);

  /** The to-do id currently being dragged, or null. */
  private readonly draggedId = signal<string | null>(null);
  /** Where the drop indicator currently points, or null. */
  private readonly dropTarget = signal<DropTarget | null>(null);
  /** Screen-reader announcement for keyboard reordering. */
  protected readonly announce = signal('');

  private checkInterval: ReturnType<typeof setInterval> | undefined;

  ngOnInit(): void {
    this.dateLabel.set(
      new Date().toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      }),
    );
    void this.service.load();
    this.checkInterval = setInterval(
      () => this.notifications.checkDueTodos(this.service.allTodos()),
      DUE_CHECK_INTERVAL_MS,
    );
  }

  ngOnDestroy(): void {
    clearInterval(this.checkInterval);
  }

  protected async signOut(): Promise<void> {
    await this.auth.signOut();
    this.service.clear();
    await this.router.navigateByUrl('/sign-in');
  }

  protected load(): Promise<void> {
    return this.service.load();
  }

  protected async add(): Promise<void> {
    const title = this.draft().trim();
    if (!title || this.adding()) return;
    const dueAt = this.dueDate().trim() || null;
    if (dueAt) await this.notifications.requestPermission();

    const todo = await this.service.add(title, dueAt);
    if (!todo) return; // keep the draft so the user can retry
    if (todo.dueAt) await this.notifications.scheduleTodoNotification(todo);
    this.draft.set('');
    this.dueDate.set('');
  }

  protected async toggle(id: string, completed: boolean): Promise<void> {
    if (!(await this.service.update(id, { completed }))) return;
    const todo = this.findTodo(id);
    if (!todo) return;
    if (completed) {
      await this.notifications.cancelTodoNotification(todo);
    } else if (isUpcoming(todo)) {
      await this.notifications.scheduleTodoNotification(todo);
    }
  }

  protected async updateTitle(id: string, title: string): Promise<void> {
    if (!(await this.service.update(id, { title }))) return;
    // Refresh a pending reminder so it shows the new title.
    const todo = this.findTodo(id);
    if (todo && isUpcoming(todo)) await this.notifications.scheduleTodoNotification(todo);
  }

  protected async updateDue(id: string, dueAt: string | null): Promise<void> {
    if (!(await this.service.update(id, { dueAt }))) return;
    const todo = this.findTodo(id);
    if (!todo) return;
    if (dueAt) {
      await this.notifications.requestPermission();
      await this.notifications.scheduleTodoNotification(todo);
    } else {
      await this.notifications.cancelTodoNotification(todo);
    }
  }

  protected async remove(id: string): Promise<void> {
    const todo = this.findTodo(id);
    if (!todo || !(await this.service.remove(id))) return;
    await this.notifications.cancelTodoNotification(todo);
  }

  protected async clearCompleted(): Promise<void> {
    const completed = this.service.allTodos().filter((t) => t.completed);
    if (!(await this.service.removeMany(completed.map((t) => t.id)))) return;
    await Promise.all(completed.map((t) => this.notifications.cancelTodoNotification(t)));
  }

  private findTodo(id: string): Todo | undefined {
    return this.service.allTodos().find((t) => t.id === id);
  }

  // ---- Drag-to-reorder (pointer events for mobile + desktop) -------------

  /** Which indicator side (if any) to draw on a given row. */
  protected dropSideFor(id: string): DropTarget['side'] | null {
    const t = this.dropTarget();
    return t?.id === id ? t.side : null;
  }

  protected onDragStart(event: { id: string }): void {
    this.draggedId.set(event.id);
    this.dropTarget.set(null);
  }

  protected onDragOver(event: { y: number }): void {
    const dragged = this.draggedId();
    if (dragged === null) return;
    const target = this.findDropTarget(event.y, dragged);
    const cur = this.dropTarget();
    if (cur?.id !== target?.id || cur?.side !== target?.side) {
      this.dropTarget.set(target);
    }
  }

  protected onDrop(event: { y: number }): void {
    const dragged = this.draggedId();
    this.onDragEnd();
    if (dragged === null) return;

    const target = this.findDropTarget(event.y, dragged);
    if (!target) return;
    const visible = this.todos();
    const draggedTodo = visible.find((t) => t.id === dragged);
    if (!draggedTodo) return;

    const without = visible.filter((t) => t.id !== dragged);
    const hoveredIndex = without.findIndex((t) => t.id === target.id);
    if (hoveredIndex === -1) return;
    const insertAt = target.side === 'before' ? hoveredIndex : hoveredIndex + 1;
    const newVisible = [...without.slice(0, insertAt), draggedTodo, ...without.slice(insertAt)];

    // A drop back onto the same slot is a no-op.
    if (newVisible.every((t, i) => visible[i].id === t.id)) return;

    void this.service.reorder(applyVisibleOrder(this.service.allTodos(), visible, newVisible));
  }

  protected onDragEnd(): void {
    this.draggedId.set(null);
    this.dropTarget.set(null);
  }

  /**
   * Find the row (other than the dragged one) whose midpoint is nearest the
   * pointer, and which side of it the pointer is on. Pointers above or below
   * the list resolve to the first/last row.
   */
  private findDropTarget(y: number, draggedId: string): DropTarget | null {
    let best: DropTarget | null = null;
    let bestDist = Infinity;

    for (const row of this.host.nativeElement.querySelectorAll<HTMLElement>('.item')) {
      const id = row.dataset['id'];
      if (!id || id === draggedId) continue;

      const rect = row.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      const dist = Math.abs(y - midY);
      if (dist < bestDist) {
        bestDist = dist;
        best = { id, side: y < midY ? 'before' : 'after' };
      }
    }
    return best;
  }

  /** Alt+ArrowUp/ArrowDown on a row's handle: move it one visible slot. */
  protected onKeyMove(todo: Todo, step: -1 | 1): void {
    const visible = this.todos();
    const from = visible.findIndex((t) => t.id === todo.id);
    const to = from + step;
    if (from === -1 || to < 0 || to >= visible.length) {
      this.announce.set(`${todo.title} cannot move ${step === -1 ? 'up' : 'down'} further`);
      return;
    }
    const newVisible = [...visible];
    [newVisible[from], newVisible[to]] = [newVisible[to], newVisible[from]];
    void this.service.reorder(applyVisibleOrder(this.service.allTodos(), visible, newVisible));
    this.announce.set(`${todo.title} moved to position ${to + 1} of ${visible.length}`);
  }
}

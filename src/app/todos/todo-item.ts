import { Component, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Todo } from './todo';
import { isOverdue, isUpcoming, formatDueDate, formatAgo } from './time-utils';

/** Convert ISO-8601 to datetime-local input format (YYYY-MM-DDTHH:mm). */
function toDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** A single to-do row: drag handle, animated completion toggle, title (inline-editable), delete. */
@Component({
  selector: 'app-todo-item',
  standalone: true,
  imports: [FormsModule, MatIconModule],
  template: `
    <div
      class="item"
      [class.is-completed]="todo().completed"
      [class.is-dragging]="dragging()"
      [class.drop-before]="dropSide() === 'before'"
      [class.drop-after]="dropSide() === 'after'"
      [attr.draggable]="armed() || null"
      (dragstart)="onDragStart($event)"
      (dragend)="onDragEnd($event)"
      (dragover)="dragOver.emit($event)"
      (drop)="dropped.emit($event)"
      role="listitem"
    >
      <button
        type="button"
        class="handle"
        (mousedown)="arm()"
        (keydown.alt.arrowup)="move.emit(-1)"
        (keydown.alt.arrowdown)="move.emit(1)"
        [aria-label]="'Reorder ' + todo().title + '. Press Alt and the arrow keys to move.'"
      >
        <mat-icon>drag_indicator</mat-icon>
      </button>

      <button
        type="button"
        class="check"
        [class.checked]="todo().completed"
        (click)="toggle.emit(!todo().completed)"
        [aria-pressed]="todo().completed"
        [aria-label]="'Mark ' + todo().title + ' ' + (todo().completed ? 'not done' : 'complete')"
      >
        <mat-icon>check</mat-icon>
      </button>

      @if (editing()) {
        <form class="editor" (ngSubmit)="save()">
          <input
            #edit
            name="edit-title"
            class="editor-input"
            [ngModel]="draft()"
            (ngModelChange)="draft.set($event)"
            aria-label="Edit title"
          />
          <button
            type="button"
            class="editor-due-btn"
            (click)="editDueInput.focus()"
            [class.has-due]="dueDraft()"
            aria-label="Set or clear due date"
          >
            <mat-icon>{{ dueDraft() ? 'event' : 'event' }}</mat-icon>
          </button>
          <input
            #editDueInput
            type="datetime-local"
            name="edit-due"
            class="editor-due-input"
            [ngModel]="dueDraft()"
            (ngModelChange)="dueDraft.set($event)"
            aria-label="Edit due date and time"
          />
          <button type="submit" class="editor-btn">Save</button>
        </form>
      } @else {
        <button
          type="button"
          class="title"
          [class.is-overdue]="isOverdue(todo())"
          (click)="startEdit()"
          [title]="'Edit ' + todo().title"
        >
          {{ todo().title }}
        </button>
      }

      @if (todo().dueAt) {
        <span
          class="due-badge"
          [class.is-overdue]="isOverdue(todo())"
          [class.is-upcoming]="isUpcoming(todo())"
          [title]="todo().dueAt"
        >
          <mat-icon>{{ isOverdue(todo()) ? 'warning' : 'schedule' }}</mat-icon>
          {{ isOverdue(todo()) ? formatAgo(todo().dueAt!) : formatDueDate(todo().dueAt!) }}
        </span>
      }

      <button
        type="button"
        class="action delete"
        (click)="remove.emit()"
        [aria-label]="'Delete ' + todo().title"
      >
        <mat-icon>delete</mat-icon>
      </button>
    </div>
  `,
  styleUrl: './todo-item.scss',
})
export class TodoItem {
  /** The to-do to render. */
  readonly todo = input.required<Todo>();

  /** Fired when the user toggles completion (emits the NEW desired state). */
  readonly toggle = output<boolean>();
  /** Fired when the user saves an edited title (or nothing if unchanged). */
  readonly update = output<string>();
  /** Fired when the user changes the due date (null = cleared). */
  readonly updateDue = output<string | null>();
  /** Fired when the user deletes the row. */
  readonly remove = output<void>();
  /** Fired when a drag begins on this row. */
  readonly dragStart = output<DragEvent>();
  /** Fired when a drag started on this row ends (drop or cancel). */
  readonly dragEnd = output<DragEvent>();
  /** Fired by Alt+ArrowUp/ArrowDown on the handle: -1 = up, +1 = down. */
  readonly move = output<number>();
  /** Where the drop indicator sits relative to this row, or null. */
  readonly dropSide = input<'before' | 'after' | null>(null);
  /** Pointer is hovering this row with a drag in flight. */
  readonly dragOver = output<DragEvent>();
  /** The pointer was released over this row. */
  readonly dropped = output<DragEvent>();

  protected readonly editing = signal(false);
  protected readonly draft = signal('');
  protected readonly dueDraft = signal('');
  /** True once the user presses the handle, so only armed rows are draggable. */
  protected readonly armed = signal(false);
  protected readonly dragging = signal(false);

  /** Expose time-utils functions to the template. */
  protected isOverdue = isOverdue;
  protected isUpcoming = isUpcoming;
  protected formatDueDate = formatDueDate;
  protected formatAgo = formatAgo;

  protected arm(): void {
    this.armed.set(true);
  }

  protected clearDue(): void {
    this.dueDraft.set('');
  }

  protected onDragStart(event: DragEvent): void {
    if (!this.armed()) {
      // The row was not armed via the handle: cancel the drag.
      event.preventDefault();
      return;
    }
    this.dragging.set(true);
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', String(this.todo().id));
    }
    this.dragStart.emit(event);
  }

  protected onDragEnd(event: DragEvent): void {
    this.dragging.set(false);
    this.armed.set(false);
    this.dragEnd.emit(event);
  }

  protected startEdit(): void {
    this.draft.set(this.todo().title);
    const due = this.todo().dueAt;
    this.dueDraft.set(due ? toDatetimeLocal(due) : '');
    this.editing.set(true);
  }

  protected save(): void {
    if (!this.editing()) return;
    const trimmed = this.draft().trim();
    const due = this.todo().dueAt;
    const originalDueStr = due ? toDatetimeLocal(due) : '';
    const dueChanged = this.dueDraft().trim() !== originalDueStr;
    this.editing.set(false);
    if (trimmed && trimmed !== this.todo().title) {
      this.update.emit(trimmed);
    }
    if (dueChanged) {
      this.updateDue.emit(this.dueDraft().trim() || null);
    }
  }
}

import {
  Component,
  ElementRef,
  computed,
  effect,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
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

/** A single to-do row: drag handle, completion toggle, inline-editable title and due date, delete. */
@Component({
  selector: 'app-todo-item',
  imports: [FormsModule, MatIconModule],
  template: `
    <div
      class="item"
      [attr.data-id]="todo().id"
      [class.is-completed]="todo().completed"
      [class.is-dragging]="dragging()"
      [class.drop-before]="dropSide() === 'before'"
      [class.drop-after]="dropSide() === 'after'"
      [class.is-overdue]="isOverdue(todo())"
      [attr.aria-busy]="busy()"
    >
      @if (busy()) {
        <div class="busy-overlay" aria-hidden="true"><mat-icon>sync</mat-icon></div>
      }
      <div class="item-main">
        <button
          type="button"
          class="handle"
          (pointerdown)="onPointerDown($event)"
          (pointermove)="onPointerMove($event)"
          (pointerup)="onPointerUp($event)"
          (pointercancel)="onPointerCancel()"
          (keydown.alt.arrowup)="move.emit(-1)"
          (keydown.alt.arrowdown)="move.emit(1)"
          [aria-label]="'Reorder ' + todo().title + '. Press Alt and the arrow keys to move.'"
        >
          <mat-icon>drag_indicator</mat-icon>
        </button>

        <input
          type="checkbox"
          class="check"
          [checked]="todo().completed"
          (change)="toggle.emit(!todo().completed)"
          [aria-label]="'Mark ' + todo().title + ' as done'"
        />

        @if (editing()) {
          <form class="editor" (ngSubmit)="save()" (keydown.escape)="closeEditor()">
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
              (click)="editDueInput.showPicker()"
              [class.has-due]="dueDraft()"
              aria-label="Set or clear due date"
            >
              <mat-icon>event</mat-icon>
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
            @if (hasChanges()) {
              <button type="submit" class="editor-btn">Save</button>
            } @else {
              <button type="button" class="editor-btn" (click)="closeEditor()">Cancel</button>
            }
          </form>
        } @else {
          <button
            #titleButton
            type="button"
            class="title"
            (click)="startEdit()"
            [title]="'Edit ' + todo().title"
          >
            {{ todo().title }}
          </button>
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

      @if (todo().dueAt; as dueAt) {
        <div class="item-footer">
          <span
            class="due-badge"
            [class.is-overdue]="isOverdue(todo())"
            [class.is-upcoming]="isUpcoming(todo())"
            [title]="dueAt"
          >
            <mat-icon>{{ isOverdue(todo()) ? 'warning' : 'schedule' }}</mat-icon>
            {{ isOverdue(todo()) ? formatAgo(dueAt) : formatDueDate(dueAt) }}
          </span>
        </div>
      }
    </div>
  `,
  styleUrl: './todo-item.scss',
})
export class TodoItem {
  /** The to-do to render. */
  readonly todo = input.required<Todo>();
  /** Where the drop indicator sits relative to this row, or null. */
  readonly dropSide = input<'before' | 'after' | null>(null);
  /** Shows a spinner over just this row while its change is being saved. */
  readonly busy = input(false);

  /** Fired when the user toggles completion (emits the NEW desired state). */
  readonly toggle = output<boolean>();
  /** Fired when the user saves a changed, non-empty title. */
  readonly update = output<string>();
  /** Fired when the user changes the due date (null = cleared). */
  readonly updateDue = output<string | null>();
  /** Fired when the user deletes the row. */
  readonly remove = output<void>();
  /** Fired when a drag begins on this row. */
  readonly dragStart = output<{ id: string }>();
  /** Fired when a drag is cancelled by the browser (e.g. a scroll gesture takes over). */
  readonly dragEnd = output<void>();
  /** Fired by Alt+ArrowUp/ArrowDown on the handle: -1 = up, +1 = down. */
  readonly move = output<-1 | 1>();
  /** Pointer is moving with a drag in flight. */
  readonly dragOver = output<{ id: string; y: number }>();
  /** The pointer was released, ending the drag. */
  readonly dropped = output<{ id: string; y: number }>();

  protected readonly editing = signal(false);
  protected readonly draft = signal('');
  protected readonly dueDraft = signal('');
  protected readonly dragging = signal(false);

  private readonly editInput = viewChild<ElementRef<HTMLInputElement>>('edit');
  private readonly titleButton = viewChild<ElementRef<HTMLButtonElement>>('titleButton');
  /** Set when the editor closes so focus returns to the title instead of being lost. */
  private restoreFocus = false;

  /** The current due date in datetime-local format ('' when unset). */
  private readonly originalDue = computed(() => {
    const due = this.todo().dueAt;
    return due ? toDatetimeLocal(due) : '';
  });
  private readonly titleChanged = computed(() => {
    const trimmed = this.draft().trim();
    return trimmed !== '' && trimmed !== this.todo().title;
  });
  private readonly dueChanged = computed(() => this.dueDraft().trim() !== this.originalDue());
  protected readonly hasChanges = computed(() => this.titleChanged() || this.dueChanged());

  protected readonly isOverdue = isOverdue;
  protected readonly isUpcoming = isUpcoming;
  protected readonly formatDueDate = formatDueDate;
  protected readonly formatAgo = formatAgo;

  constructor() {
    // Move focus into the editor when it opens, and back to the title when it closes.
    effect(() => this.editInput()?.nativeElement.focus());
    effect(() => {
      const button = this.titleButton();
      if (button && this.restoreFocus) {
        this.restoreFocus = false;
        button.nativeElement.focus();
      }
    });
  }

  protected onPointerDown(event: PointerEvent): void {
    event.preventDefault();
    // Capture so move/up events keep coming to the handle while dragging.
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    this.dragging.set(true);
    this.dragStart.emit({ id: this.todo().id });
  }

  protected onPointerMove(event: PointerEvent): void {
    if (!this.dragging()) return;
    this.dragOver.emit({ id: this.todo().id, y: event.clientY });
  }

  protected onPointerUp(event: PointerEvent): void {
    if (!this.dragging()) return;
    this.dragging.set(false);
    this.dropped.emit({ id: this.todo().id, y: event.clientY });
  }

  protected onPointerCancel(): void {
    if (!this.dragging()) return;
    this.dragging.set(false);
    this.dragEnd.emit();
  }

  protected startEdit(): void {
    this.draft.set(this.todo().title);
    this.dueDraft.set(this.originalDue());
    this.editing.set(true);
  }

  protected save(): void {
    if (!this.editing()) return;
    const titleChanged = this.titleChanged();
    const dueChanged = this.dueChanged();
    this.closeEditor();
    if (titleChanged) this.update.emit(this.draft().trim());
    if (dueChanged) this.updateDue.emit(this.dueDraft().trim() || null);
  }

  protected closeEditor(): void {
    this.restoreFocus = true;
    this.editing.set(false);
  }
}

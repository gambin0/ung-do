import { Component, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Todo } from './todo';

/** A single to-do row: animated completion toggle, title (inline-editable), delete. */
@Component({
  selector: 'app-todo-item',
  standalone: true,
  imports: [FormsModule, MatIconModule],
  template: `
    <div
      class="item"
      [class.is-completed]="todo().completed"
      role="listitem"
    >
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
            (blur)="save()"
            aria-label="Edit title"
          />
          <button type="submit" class="editor-btn">Save</button>
        </form>
      } @else {
        <button
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
  `,
  styleUrl: './todo-item.scss',
})
export class TodoItem {
  /** The to-do to render. */
  readonly todo = input.required<Todo>();

  /** Fired when the user toggles completion (emits the NEW desired state). */
  readonly toggle = output<boolean>();
  /** Fired when the user saves an edited (non-blank) title. */
  readonly update = output<string>();
  /** Fired when the user deletes the row. */
  readonly remove = output<void>();

  protected readonly editing = signal(false);
  protected readonly draft = signal('');

  protected startEdit(): void {
    this.draft.set(this.todo().title);
    this.editing.set(true);
  }

  protected save(): void {
    if (!this.editing()) return;
    const trimmed = this.draft().trim();
    this.editing.set(false);
    if (trimmed && trimmed !== this.todo().title) {
      // Blank edits are rejected: the row keeps its previous title.
      this.update.emit(trimmed);
    }
  }
}

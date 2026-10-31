import { Component, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { Todo } from './todo';

/** A single to-do row: completion toggle, title (inline-editable), delete. */
@Component({
  selector: 'app-todo-item',
  standalone: true,
  imports: [FormsModule, MatCheckboxModule, MatIconModule],
  template: `
    <li
      class="group flex items-center gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3 shadow-sm transition hover:shadow"
      [class.opacity-60]="todo().completed"
    >
      <mat-checkbox
        [checked]="todo().completed"
        (change)="toggle.emit(!todo().completed)"
        [aria-label]="'Mark ' + todo().title + ' complete'"
      />

      @if (editing()) {
        <form class="flex-1" (ngSubmit)="save()">
          <input
            #edit
            name="edit-title"
            class="w-full rounded-md border border-neutral-300 px-2 py-1 text-neutral-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            [ngModel]="draft()"
            (ngModelChange)="draft.set($event)"
            aria-label="Edit title"
          />
        </form>
      } @else {
        <button
          type="button"
          class="flex-1 truncate text-left text-neutral-900"
          [class.line-through]="todo().completed"
          (click)="startEdit()"
          [title]="'Edit ' + todo().title"
        >
          {{ todo().title }}
        </button>
      }

      <button
        type="button"
        class="text-neutral-400 transition hover:text-red-500"
        (click)="remove.emit()"
        [aria-label]="'Delete ' + todo().title"
      >
        <mat-icon>close</mat-icon>
      </button>
    </li>
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
    const trimmed = this.draft().trim();
    this.editing.set(false);
    if (trimmed && trimmed !== this.todo().title) {
      // Blank edits are rejected: the row keeps its previous title.
      this.update.emit(trimmed);
    }
  }
}

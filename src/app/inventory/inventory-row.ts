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
import { FormField, FormRoot, form, min, required } from '@angular/forms/signals';
import { MatIconModule } from '@angular/material/icon';
import { InventoryItem } from './inventory-item';
import { ItemDraft } from './inventory-service';
import { RESTOCK_THRESHOLD } from './restock';

/** ID of the shared <datalist> of existing categories rendered by the inventory screen. */
export const CATEGORY_LIST_ID = 'inventory-categories';

/** One inventory item: name, stock status, +/- stepper, inline editor, delete. */
@Component({
  selector: 'app-inventory-row',
  imports: [FormField, FormRoot, MatIconModule],
  template: `
    <div
      class="row"
      [class.is-low]="low()"
      [class.is-out]="item().quantity === 0"
      [attr.aria-busy]="busy()"
    >
      @if (busy()) {
        <div class="busy-overlay" aria-hidden="true"><mat-icon>sync</mat-icon></div>
      }

      @if (editing()) {
        <form class="editor" [formRoot]="editForm" (keydown.escape)="closeEditor()">
          <input
            #nameInput
            class="field field-name"
            aria-label="Item name"
            [formField]="editForm.name"
          />
          <input
            class="field field-category"
            placeholder="Category"
            aria-label="Category (optional)"
            [attr.list]="categoryListId"
            [formField]="editForm.category"
          />
          <input
            type="number"
            inputmode="numeric"
            class="field field-qty"
            aria-label="Quantity"
            [formField]="editForm.quantity"
          />
          <button type="submit" class="btn btn-primary btn-small">Save</button>
          <button type="button" class="btn btn-text btn-small" (click)="closeEditor()">
            Cancel
          </button>
        </form>
      } @else {
        <div class="info">
          <button
            #nameButton
            type="button"
            class="name"
            (click)="startEdit()"
            [title]="'Edit ' + item().name"
          >
            {{ item().name }}
          </button>
          @if (low() || item().restockTodoId) {
            <div class="badges">
              @if (item().quantity === 0) {
                <span class="badge badge-out">Out of stock</span>
              } @else if (low()) {
                <span class="badge badge-low">Running low</span>
              }
              @if (item().restockTodoId) {
                <span class="badge badge-todo">
                  <mat-icon>add_task</mat-icon>
                  On your to-do list
                </span>
              }
            </div>
          }
        </div>

        <div class="stepper" role="group" [attr.aria-label]="'Quantity of ' + item().name">
          <button
            type="button"
            class="step"
            [attr.aria-disabled]="item().quantity === 0"
            [aria-label]="'Decrease ' + item().name"
            (click)="step(-1)"
          >
            <mat-icon>remove</mat-icon>
          </button>
          <output class="qty" [attr.aria-label]="item().quantity + ' ' + item().name">
            {{ item().quantity }}
          </output>
          <button
            type="button"
            class="step"
            [aria-label]="'Increase ' + item().name"
            (click)="step(1)"
          >
            <mat-icon>add</mat-icon>
          </button>
        </div>

        <button
          type="button"
          class="delete"
          [aria-label]="'Delete ' + item().name"
          (click)="remove.emit()"
        >
          <mat-icon>delete</mat-icon>
        </button>
      }
    </div>
  `,
  styleUrl: './inventory-row.scss',
})
export class InventoryRow {
  readonly item = input.required<InventoryItem>();
  /** Shows a spinner over just this row while an edit or delete is saving. */
  readonly busy = input(false);

  /** Emits the new quantity from the +/- buttons. */
  readonly quantityChange = output<number>();
  /** Emits the edited fields when the inline editor is saved. */
  readonly save = output<ItemDraft>();
  readonly remove = output<void>();

  protected readonly categoryListId = CATEGORY_LIST_ID;
  protected readonly editing = signal(false);
  protected readonly low = computed(() => this.item().quantity <= RESTOCK_THRESHOLD);

  private readonly draft = signal({ name: '', category: '', quantity: 0 });
  protected readonly editForm = form(
    this.draft,
    (path) => {
      required(path.name);
      min(path.quantity, 0);
    },
    {
      submission: {
        action: async (fields) => {
          const { name, category, quantity } = fields().value();
          this.closeEditor();
          this.save.emit({ name, category: category || null, quantity });
          return undefined;
        },
      },
    },
  );

  private readonly nameInput = viewChild<ElementRef<HTMLInputElement>>('nameInput');
  private readonly nameButton = viewChild<ElementRef<HTMLButtonElement>>('nameButton');
  /** Set when the editor closes so focus returns to the name instead of being lost. */
  private restoreFocus = false;

  constructor() {
    effect(() => this.nameInput()?.nativeElement.focus());
    effect(() => {
      const button = this.nameButton();
      if (button && this.restoreFocus) {
        this.restoreFocus = false;
        button.nativeElement.focus();
      }
    });
  }

  protected step(delta: -1 | 1): void {
    const next = this.item().quantity + delta;
    if (next >= 0) this.quantityChange.emit(next);
  }

  protected startEdit(): void {
    const { name, category, quantity } = this.item();
    this.editForm().reset({ name, category: category ?? '', quantity });
    this.editing.set(true);
  }

  protected closeEditor(): void {
    this.restoreFocus = true;
    this.editing.set(false);
  }
}

import { Component, OnInit, inject, signal } from '@angular/core';
import { FormField, FormRoot, form, min, required } from '@angular/forms/signals';
import { MatIconModule } from '@angular/material/icon';
import { MainNav } from '../main-nav';
import { InventoryItem } from './inventory-item';
import { CATEGORY_LIST_ID, InventoryRow } from './inventory-row';
import { InventoryService, ItemDraft } from './inventory-service';
import { RestockAction, restockTodoTitle } from './restock';

const EMPTY_DRAFT = { name: '', quantity: 1, category: '' };

/**
 * The inventory screen: add items with an optional category, adjust stock with
 * +/- buttons, and get a "Restock …" to-do automatically when an item runs low.
 */
@Component({
  selector: 'app-inventory',
  imports: [FormField, FormRoot, InventoryRow, MainNav, MatIconModule],
  template: `
    <div class="page">
      <div class="shell">
        <app-main-nav />

        <header class="masthead">
          <div class="brand">
            <span class="brand-mark"><mat-icon>inventory_2</mat-icon></span>
            <div class="brand-text">
              <h1 class="brand-name">Inventory</h1>
              <p class="brand-date">Restock to-dos are added when an item hits 1 or 0</p>
            </div>
          </div>
          @if (service.lowCount() > 0) {
            <div class="stat">
              <span class="stat-num">{{ service.lowCount() }}</span>
              <span class="stat-cap">low</span>
            </div>
          }
        </header>

        <section class="card" [attr.aria-busy]="service.loading()">
          @if (service.error(); as err) {
            <div class="alert" role="alert">
              <mat-icon>cloud_off</mat-icon>
              <div class="alert-body">
                <strong>Something went wrong</strong>
                <span>{{ err }}</span>
              </div>
              <button type="button" class="btn btn-ghost" (click)="service.load()">Retry</button>
            </div>
          }

          <form
            class="composer item-composer"
            [formRoot]="addForm"
            [attr.aria-busy]="service.adding()"
          >
            @if (service.adding()) {
              <div class="busy-overlay" aria-hidden="true"><mat-icon>sync</mat-icon></div>
            }
            <mat-icon class="composer-plus">add</mat-icon>
            <input
              class="composer-input"
              placeholder="Add an item…"
              aria-label="Item name"
              [formField]="addForm.name"
            />
            <input
              class="composer-field composer-category"
              placeholder="Category"
              aria-label="Category (optional)"
              [attr.list]="categoryListId"
              [formField]="addForm.category"
            />
            <input
              type="number"
              inputmode="numeric"
              class="composer-field composer-qty"
              aria-label="Quantity"
              [formField]="addForm.quantity"
            />
            <button type="submit" class="btn btn-primary">
              <span>Add</span>
              <mat-icon>arrow_forward</mat-icon>
            </button>
          </form>

          <datalist [id]="categoryListId">
            @for (category of service.categories(); track category) {
              <option [value]="category"></option>
            }
          </datalist>

          @if (service.items().length === 0) {
            @if (!service.loading()) {
              <div class="empty">
                <div class="empty-glyph"><mat-icon>inventory_2</mat-icon></div>
                <p class="empty-title">No items yet</p>
                <p class="empty-sub">Add something you keep in stock, like coffee or batteries.</p>
              </div>
            }
          } @else {
            @for (group of service.groups(); track group.category; let g = $index) {
              <section class="group" [attr.aria-labelledby]="'group-' + g">
                <h2 class="group-title" [id]="'group-' + g">
                  {{ group.category ?? 'Uncategorized' }}
                  <span class="group-count">{{ group.items.length }}</span>
                </h2>
                <ul class="list">
                  @for (item of group.items; track item.id) {
                    <li>
                      <app-inventory-row
                        [item]="item"
                        [busy]="service.pendingIds().has(item.id)"
                        (quantityChange)="setQuantity(item, $event)"
                        (save)="update(item, $event)"
                        (remove)="remove(item)"
                      />
                    </li>
                  }
                </ul>
              </section>
            }
          }
          <p class="visually-hidden" aria-live="polite">{{ announce() }}</p>
        </section>
      </div>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .item-composer {
      flex-wrap: wrap;
    }
    .composer-input {
      flex: 2 1 9rem;
    }
    .composer-field {
      min-width: 0;
      padding: 0.4rem 0.6rem;
      font: inherit;
      font-size: 0.9rem;
      color: var(--ink-900);
      border: 1px solid var(--ink-500);
      border-radius: 10px;
      background: #fff;
    }
    .composer-category {
      flex: 1 1 7rem;
    }
    .composer-qty {
      width: 4.5rem;
    }
    .group {
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
    }
    .group + .group {
      margin-top: 0.4rem;
    }
    .group-title {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin: 0;
      font-size: 0.8rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--ink-600);
    }
    .group-count {
      padding: 0 0.45rem;
      border-radius: 999px;
      background: rgba(100, 116, 139, 0.16);
      font-size: 0.7rem;
    }
  `,
})
export class Inventory implements OnInit {
  protected readonly service = inject(InventoryService);

  protected readonly categoryListId = CATEGORY_LIST_ID;
  /** Screen-reader (and test-visible) note about restock to-dos. */
  protected readonly announce = signal('');

  private readonly draft = signal({ ...EMPTY_DRAFT });
  protected readonly addForm = form(
    this.draft,
    (path) => {
      required(path.name);
      min(path.quantity, 0);
    },
    {
      submission: {
        action: async (fields) => {
          const { name, quantity, category } = fields().value();
          const result = await this.service.add({ name, quantity, category: category || null });
          if (result) {
            // Keep the category so several items can be added to the same group.
            fields().reset({ ...EMPTY_DRAFT, category });
            this.announceRestock(name.trim(), result.restock);
          }
          return undefined;
        },
      },
    },
  );

  ngOnInit(): void {
    void this.service.load();
  }

  protected async setQuantity(item: InventoryItem, quantity: number): Promise<void> {
    const action = await this.service.setQuantity(item.id, quantity);
    if (action) this.announceRestock(item.name, action);
  }

  protected async update(item: InventoryItem, draft: ItemDraft): Promise<void> {
    const action = await this.service.update(item.id, draft);
    if (action) this.announceRestock(draft.name.trim() || item.name, action);
  }

  protected async remove(item: InventoryItem): Promise<void> {
    if (await this.service.remove(item.id)) this.announce.set(`Deleted ${item.name}`);
  }

  private announceRestock(name: string, action: RestockAction): void {
    if (action === 'create') {
      this.announce.set(
        `${name} is running low. Added "${restockTodoTitle(name)}" to your to-dos.`,
      );
    } else if (action === 'complete') {
      this.announce.set(`${name} restocked. Checked off "${restockTodoTitle(name)}".`);
    }
  }
}

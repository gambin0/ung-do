import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { AuthService } from '../auth/auth-service';
import { Inventory } from './inventory';
import { InventoryItem } from './inventory-item';
import { InventoryService } from './inventory-service';

const ITEMS: InventoryItem[] = [
  { id: 'c', name: 'Coffee', quantity: 1, category: 'Pantry', restockTodoId: 't1' },
  { id: 'r', name: 'Rice', quantity: 0, category: 'Pantry', restockTodoId: null },
  { id: 'b', name: 'Batteries', quantity: 8, category: null, restockTodoId: null },
];

function mockService(items: InventoryItem[]) {
  const all = signal(items);
  return {
    items: all,
    loading: signal(false),
    adding: signal(false),
    pendingIds: signal<ReadonlySet<string>>(new Set()),
    error: signal<string | null>(null),
    groups: computed(() => [
      { category: 'Pantry', items: all().filter((i) => i.category === 'Pantry') },
      { category: null, items: all().filter((i) => i.category === null) },
    ]),
    categories: signal(['Pantry']),
    lowCount: computed(() => all().filter((i) => i.quantity <= 1).length),
    load: vi.fn(async () => {}),
    add: vi.fn(async () => ({ restock: 'none' as const })),
    setQuantity: vi.fn(async () => 'none' as const),
    update: vi.fn(async () => 'none' as const),
    remove: vi.fn(async () => true),
    clear: vi.fn(),
  };
}

async function render(service = mockService(ITEMS)) {
  await TestBed.configureTestingModule({
    imports: [Inventory],
    providers: [
      provideRouter([]),
      { provide: InventoryService, useValue: service },
      { provide: AuthService, useValue: { signOut: vi.fn() } },
    ],
  }).compileComponents();
  const fixture = TestBed.createComponent(Inventory);
  fixture.detectChanges();
  await fixture.whenStable();
  return { fixture, service, el: fixture.nativeElement as HTMLElement };
}

const rowFor = (el: HTMLElement, name: string) =>
  [...el.querySelectorAll<HTMLElement>('app-inventory-row')].find((r) =>
    r.querySelector('.name')?.textContent?.includes(name),
  )!;

describe('Inventory screen', () => {
  it('groups items under category headings with uncategorized last', async () => {
    const { el } = await render();
    const headings = [...el.querySelectorAll('.group-title')].map((h) => h.textContent?.trim());
    expect(headings).toEqual(['Pantry 2', 'Uncategorized 1']);
    expect(el.querySelector('.stat-num')?.textContent).toBe('2');
  });

  it('shows low, out-of-stock, and on-your-to-do-list badges', async () => {
    const { el } = await render();
    expect(rowFor(el, 'Coffee').textContent).toContain('Running low');
    expect(rowFor(el, 'Coffee').textContent).toContain('On your to-do list');
    expect(rowFor(el, 'Rice').textContent).toContain('Out of stock');
    expect(rowFor(el, 'Batteries').querySelector('.badge')).toBeNull();
  });

  it('steps quantity with the +/- buttons but never below zero', async () => {
    const { el, service } = await render();
    const [, plus] = rowFor(el, 'Batteries').querySelectorAll<HTMLButtonElement>('.step');
    plus.click();
    expect(service.setQuantity).toHaveBeenCalledWith('b', 9);

    const [minusAtZero] = rowFor(el, 'Rice').querySelectorAll<HTMLButtonElement>('.step');
    expect(minusAtZero.getAttribute('aria-disabled')).toBe('true');
    minusAtZero.click();
    expect(service.setQuantity).toHaveBeenCalledTimes(1);
  });

  it('announces when a restock to-do is created', async () => {
    const { el, fixture, service } = await render();
    service.setQuantity.mockResolvedValueOnce('create' as never);
    rowFor(el, 'Batteries').querySelector<HTMLButtonElement>('.step')!.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(el.querySelector('[aria-live="polite"]')?.textContent).toContain(
      'Added "Restock Batteries" to your to-dos',
    );
  });

  it('adds an item with its category and keeps the category for the next one', async () => {
    const { el, fixture, service } = await render(mockService([]));
    const [name, category, qty] = el.querySelectorAll<HTMLInputElement>('.composer input');
    for (const [input, value] of [
      [name, 'Milk'],
      [category, 'Fridge'],
      [qty, '0'],
    ] as const) {
      input.value = value;
      input.dispatchEvent(new Event('input'));
    }
    el.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(service.add).toHaveBeenCalledWith({ name: 'Milk', quantity: 0, category: 'Fridge' });
    expect(name.value).toBe('');
    expect(category.value).toBe('Fridge');
  });

  it('does not add an item without a name', async () => {
    const { el, fixture, service } = await render(mockService([]));
    el.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await fixture.whenStable();
    expect(service.add).not.toHaveBeenCalled();
  });

  it('shows a spinner only on the row being saved', async () => {
    const { el, fixture, service } = await render();
    service.pendingIds.set(new Set(['r']));
    fixture.detectChanges();
    expect(rowFor(el, 'Rice').querySelector('.busy-overlay')).not.toBeNull();
    expect(el.querySelectorAll('.busy-overlay').length).toBe(1);
  });

  it('edits name, category and quantity inline', async () => {
    const { el, fixture, service } = await render();
    rowFor(el, 'Batteries').querySelector<HTMLButtonElement>('.name')!.click();
    fixture.detectChanges();
    await fixture.whenStable();

    const row = el.querySelector<HTMLElement>('app-inventory-row .editor')!;
    const [name, category, qty] = row.querySelectorAll<HTMLInputElement>('input');
    expect(document.activeElement).toBe(name);
    category.value = 'Garage';
    category.dispatchEvent(new Event('input'));
    qty.value = '1';
    qty.dispatchEvent(new Event('input'));
    row.dispatchEvent(new Event('submit', { cancelable: true }));
    await fixture.whenStable();

    expect(service.update).toHaveBeenCalledWith('b', {
      name: 'Batteries',
      category: 'Garage',
      quantity: 1,
    });
  });
});

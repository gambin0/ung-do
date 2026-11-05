import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { AuthService } from '../auth/auth-service';
import { vi } from 'vitest';
import { TodoService } from './todo-service';
import { Todos } from './todos';
import { Filter, Todo } from './todo';

const SAMPLE: Todo[] = [
  { id: '1', title: 'a', completed: false, createdAt: '2026-01-01T00:00:00Z' },
  { id: '2', title: 'b', completed: true, createdAt: '2026-01-02T00:00:00Z' },
  { id: '3', title: 'c', completed: false, createdAt: '2026-01-03T00:00:00Z' },
];

function mockService(todos: Todo[], error: string | null = null) {
  const filter = signal<Filter>('all');
  const allTodos = signal(todos);
  return {
    allTodos,
    filter,
    error: signal(error),
    loading: signal(false),
    adding: signal(false),
    pendingIds: signal<ReadonlySet<string>>(new Set()),
    todos: computed(() => {
      const f = filter();
      if (f === 'active') return allTodos().filter((t) => !t.completed);
      if (f === 'completed') return allTodos().filter((t) => t.completed);
      return allTodos();
    }),
    counts: computed(() => {
      const completed = allTodos().filter((t) => t.completed).length;
      return { all: allTodos().length, active: allTodos().length - completed, completed };
    }),
    setFilter: (f: Filter) => filter.set(f),
    load: vi.fn(async () => {}),
    add: vi.fn(async () => null),
    update: vi.fn(async () => true),
    remove: vi.fn(async () => true),
    removeMany: vi.fn(async () => true),
    clear: vi.fn(),
    reorder: vi.fn(async () => {}),
  };
}

async function render(service: ReturnType<typeof mockService>) {
  await TestBed.configureTestingModule({
    imports: [Todos],
    providers: [
      provideRouter([]),
      { provide: TodoService, useValue: service },
      { provide: AuthService, useValue: { signOut: vi.fn(async () => {}) } },
    ],
  }).compileComponents();
  const fixture = TestBed.createComponent(Todos);
  fixture.detectChanges();
  await fixture.whenStable();
  return { fixture, el: fixture.nativeElement as HTMLElement };
}

describe('Todos component', () => {
  it('shows the empty state when there are no to-dos', async () => {
    const { el } = await render(mockService([]));
    expect(el.textContent).toContain('Nothing here yet');
  });

  it('renders a row with a reorder handle for each to-do', async () => {
    const { el } = await render(mockService(SAMPLE));
    expect(el.querySelectorAll('app-todo-item').length).toBe(3);
    const handles = el.querySelectorAll('app-todo-item .handle');
    expect(handles.length).toBe(3);
    expect(handles[0].querySelector('mat-icon')?.textContent).toContain('drag_indicator');
  });

  it('shows the error state when an error is set', async () => {
    const { el } = await render(mockService([], 'failed'));
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('failed');
  });

  it('marks the active filter with aria-pressed', async () => {
    const { el, fixture } = await render(mockService(SAMPLE));
    const segments = el.querySelectorAll<HTMLButtonElement>('.toolbar .segment');
    segments[1].click();
    fixture.detectChanges();
    expect(segments[0].getAttribute('aria-pressed')).toBe('false');
    expect(segments[1].getAttribute('aria-pressed')).toBe('true');
  });

  it('deletes via click so keyboard activation works', async () => {
    const service = mockService(SAMPLE);
    const { el } = await render(service);
    el.querySelector<HTMLButtonElement>('app-todo-item .delete')!.click();
    expect(service.remove).toHaveBeenCalledWith('1');
  });

  it('opens the editor on click and lets the user cancel without changes', async () => {
    const { el, fixture } = await render(mockService(SAMPLE));
    el.querySelector<HTMLButtonElement>('app-todo-item .title')!.click();
    fixture.detectChanges();
    await fixture.whenStable();

    const input = el.querySelector<HTMLInputElement>('app-todo-item .editor-input')!;
    expect(document.activeElement).toBe(input);
    const button = el.querySelector<HTMLButtonElement>('app-todo-item .editor-btn')!;
    expect(button.textContent?.trim()).toBe('Cancel');

    button.click();
    fixture.detectChanges();
    expect(el.querySelector('app-todo-item .editor')).toBeNull();
  });

  it('exposes a live region for keyboard reorder announcements', async () => {
    const { el } = await render(mockService(SAMPLE));
    expect(el.querySelector('.visually-hidden[aria-live="polite"]')).toBeTruthy();
  });
  it('signs out, clears loaded data, and returns to the sign-in page', async () => {
    const service = mockService(SAMPLE);
    const { el, fixture } = await render(service);
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    el.querySelector<HTMLButtonElement>('app-main-nav button')!.click();
    await fixture.whenStable();

    expect(TestBed.inject(AuthService).signOut).toHaveBeenCalled();
    expect(service.clear).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith('/sign-in');
  });

  it('shows a spinner only on the row being saved', async () => {
    const service = mockService(SAMPLE);
    const { el, fixture } = await render(service);
    service.pendingIds.set(new Set(['2']));
    fixture.detectChanges();

    const rows = [...el.querySelectorAll('app-todo-item .item')];
    expect(rows.map((r) => r.querySelector('.busy-overlay') !== null)).toEqual([
      false,
      true,
      false,
    ]);
    expect(rows[1].getAttribute('aria-busy')).toBe('true');
    expect(el.querySelector('.composer .busy-overlay')).toBeNull();
  });

  it('shows a spinner only on the composer while adding', async () => {
    const service = mockService(SAMPLE);
    const { el, fixture } = await render(service);
    service.adding.set(true);
    fixture.detectChanges();

    expect(el.querySelector('.composer .busy-overlay')).not.toBeNull();
    expect(el.querySelector('.composer')!.getAttribute('aria-busy')).toBe('true');
    expect(el.querySelectorAll('app-todo-item .busy-overlay').length).toBe(0);
  });
});

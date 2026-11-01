import { signal, computed } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { TodoService } from './todo-service';
import { Todos } from './todos';
import { Filter, Todo } from './todo';

const SAMPLE: Todo[] = [
  { id: 1, title: 'a', completed: false, createdAt: '2026-01-01T00:00:00Z' },
  { id: 2, title: 'b', completed: true, createdAt: '2026-01-02T00:00:00Z' },
  { id: 3, title: 'c', completed: false, createdAt: '2026-01-03T00:00:00Z' },
];

describe('TodoService filter logic', () => {
  it('derives the correct subset for each filter', () => {
    const svc = new TodoService();
    // Populate the private full list via a stubbed fetch.
    const fetchStub = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify({ todos: SAMPLE }), { status: 200 }),
      );

    return svc.load().then(() => {
      expect(svc.counts()).toEqual({ all: 3, active: 2, completed: 1 });

      svc.setFilter('all');
      expect(svc.todos().map((t) => t.id)).toEqual([1, 2, 3]);

      svc.setFilter('active');
      expect(svc.todos().map((t) => t.id)).toEqual([1, 3]);

      svc.setFilter('completed');
      expect(svc.todos().map((t) => t.id)).toEqual([2]);

      fetchStub.mockRestore();
    });
  });
});

function mockService(todos: Todo[], filter: Filter = 'all', error: string | null = null) {
  const filterSig = signal(filter);
  return {
    todos: computed(() => {
      const f = filterSig();
      if (f === 'active') return todos.filter((t) => !t.completed);
      if (f === 'completed') return todos.filter((t) => t.completed);
      return todos;
    }),
    counts: computed(() => ({
      all: todos.length,
      active: todos.filter((t) => !t.completed).length,
      completed: todos.filter((t) => t.completed).length,
    })),
    error: signal(error),
    filter: filterSig,
    setFilter: (f: Filter) => filterSig.set(f),
    load: vi.fn(async () => {}),
    add: vi.fn(async () => {}),
    toggle: vi.fn(async () => {}),
    update: vi.fn(async () => {}),
    remove: vi.fn(async () => {}),
  };
}

describe('Todos component rendering', () => {
  it('shows the empty state when there are no to-dos', async () => {
    await TestBed.configureTestingModule({
      imports: [Todos],
      providers: [{ provide: TodoService, useValue: mockService([]) }],
    }).compileComponents();

    const fixture = TestBed.createComponent(Todos);
    fixture.detectChanges();
    await fixture.whenStable();
    const html = (fixture.nativeElement as HTMLElement).innerHTML;
    expect(html).toContain('Nothing here yet');
  });

  it('renders a row for each to-do', async () => {
    await TestBed.configureTestingModule({
      imports: [Todos],
      providers: [{ provide: TodoService, useValue: mockService(SAMPLE) }],
    }).compileComponents();

    const fixture = TestBed.createComponent(Todos);
    fixture.detectChanges();
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelectorAll('app-todo-item').length).toBe(3);
  });

  it('shows the backend-unavailable state when an error is set', async () => {
    await TestBed.configureTestingModule({
      imports: [Todos],
      providers: [{ provide: TodoService, useValue: mockService([], 'all', 'failed') }],
    }).compileComponents();

    const fixture = TestBed.createComponent(Todos);
    fixture.detectChanges();
    await fixture.whenStable();
    const html = (fixture.nativeElement as HTMLElement).innerHTML;
    expect(html).toContain('Backend unavailable');
  });
});

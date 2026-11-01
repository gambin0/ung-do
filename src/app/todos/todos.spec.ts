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

describe('TodoService reorder', () => {
  it('applies the new order and persists it on success', async () => {
    const svc = new TodoService();
    const fetchStub = vi.spyOn(globalThis, 'fetch');
    fetchStub
      .mockResolvedValueOnce(new Response(JSON.stringify({ todos: SAMPLE }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));

    await svc.load();
    await svc.reorder([SAMPLE[2], SAMPLE[0], SAMPLE[1]]);

    expect(svc.allTodos().map((t) => t.id)).toEqual([3, 1, 2]);
    expect(svc.error()).toBeNull();
    const calls = fetchStub.mock.calls.filter((c) => String(c[0]).includes('/order'));
    expect(calls.length).toBe(1);
    expect(JSON.parse((calls[0][1] as RequestInit).body as string)).toEqual({ ids: [3, 1, 2] });
    fetchStub.mockRestore();
  });

  it('reverts to the previous order and sets the error signal on failure', async () => {
    const svc = new TodoService();
    const fetchStub = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (input: RequestInfo | URL) => {
        if (String(input).includes('/order')) {
          return new Response(JSON.stringify({ error: 'bad order' }), { status: 400 });
        }
        return new Response(JSON.stringify({ todos: SAMPLE }), { status: 200 });
      });

    await svc.load();
    await svc.reorder([SAMPLE[2], SAMPLE[0], SAMPLE[1]]);

    expect(svc.allTodos().map((t) => t.id)).toEqual([1, 2, 3]);
    expect(svc.error()).toBe('bad order');
    fetchStub.mockRestore();
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

  it('renders a reorder handle on each row', async () => {
    await TestBed.configureTestingModule({
      imports: [Todos],
      providers: [{ provide: TodoService, useValue: mockService(SAMPLE) }],
    }).compileComponents();

    const fixture = TestBed.createComponent(Todos);
    fixture.detectChanges();
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const handles = compiled.querySelectorAll('app-todo-item .handle');
    expect(handles.length).toBe(3);
    expect(handles[0].querySelector('mat-icon')?.textContent).toContain('drag_indicator');
  });

  it('does not make a row draggable until its handle is pressed', async () => {
    await TestBed.configureTestingModule({
      imports: [Todos],
      providers: [{ provide: TodoService, useValue: mockService(SAMPLE) }],
    }).compileComponents();

    const fixture = TestBed.createComponent(Todos);
    fixture.detectChanges();
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const item = compiled.querySelector('app-todo-item .item') as HTMLElement;
    expect(item.draggable).toBe(false); // attribute absent until armed

    const handle = compiled.querySelector('app-todo-item .handle') as HTMLButtonElement;
    handle.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    fixture.detectChanges();
    expect(item.draggable).toBe(true);
  });

  it('exposes a live region for keyboard reorder announcements', async () => {
    await TestBed.configureTestingModule({
      imports: [Todos],
      providers: [{ provide: TodoService, useValue: mockService(SAMPLE) }],
    }).compileComponents();

    const fixture = TestBed.createComponent(Todos);
    fixture.detectChanges();
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const live = compiled.querySelector('.visually-hidden[aria-live="polite"]');
    expect(live).toBeTruthy();
  });
});

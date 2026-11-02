import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotificationService } from './notification-service';
import { Todo } from './todo';

let callCount = 0;
let lastArgs: [string, NotificationOptions?] | null = null;
let mockPermission: 'default' | 'granted' | 'denied' = 'default';

function createMockNotification() {
  callCount = 0;
  lastArgs = null;
  mockPermission = 'default';

  const MockNotif = function (title: string, options?: NotificationOptions) {
    callCount++;
    lastArgs = [title, options];
    return { title, options, close: () => {} };
  } as any;

  Object.defineProperty(MockNotif, 'permission', {
    get: () => mockPermission,
    configurable: true,
  });

  MockNotif.requestPermission = async () => {
    mockPermission = 'granted';
    return 'granted';
  };

  return MockNotif;
}

let MockNotif: any;

beforeEach(() => {
  MockNotif = createMockNotification();
  vi.stubGlobal('Notification', MockNotif);
});

describe('NotificationService', () => {
  it('requests permission and stores the result', async () => {
    const svc = new NotificationService();
    const result = await svc.requestPermission();
    expect(result).toBe('granted');
    expect(svc.permission()).toBe('granted');
  });

  it('does not fire notifications without permission', () => {
    const svc = new NotificationService();
    const now = new Date();
    const dueTodo: Todo = {
      id: 1,
      title: 'Test',
      completed: false,
      createdAt: now.toISOString(),
      dueAt: new Date(now.getTime() - 60000).toISOString(),
    };
    svc.checkDueTodos([dueTodo]);
    expect(callCount).toBe(0);
  });

  it('fires notifications for due todos when permission is granted', async () => {
    const svc = new NotificationService();
    await svc.requestPermission();

    const now = new Date();
    const dueTodo: Todo = {
      id: 1,
      title: 'Test task',
      completed: false,
      createdAt: now.toISOString(),
      dueAt: new Date(now.getTime() - 60000).toISOString(),
    };

    svc.checkDueTodos([dueTodo]);
    expect(callCount).toBe(1);
    expect(lastArgs?.[0]).toBe('ung-do reminder');
    expect(lastArgs?.[1]?.body).toBe('Test task');
  });

  it('does not notify for completed todos', async () => {
    const svc = new NotificationService();
    await svc.requestPermission();

    const now = new Date();
    const completedTodo: Todo = {
      id: 1,
      title: 'Done task',
      completed: true,
      createdAt: now.toISOString(),
      dueAt: new Date(now.getTime() - 60000).toISOString(),
    };

    svc.checkDueTodos([completedTodo]);
    expect(callCount).toBe(0);
  });

  it('does not notify for future due dates', async () => {
    const svc = new NotificationService();
    await svc.requestPermission();

    const now = new Date();
    const futureTodo: Todo = {
      id: 1,
      title: 'Future task',
      completed: false,
      createdAt: now.toISOString(),
      dueAt: new Date(now.getTime() + 3600000).toISOString(),
    };

    svc.checkDueTodos([futureTodo]);
    expect(callCount).toBe(0);
  });

  it('does not duplicate notifications for the same todo', async () => {
    const svc = new NotificationService();
    await svc.requestPermission();

    const now = new Date();
    const dueTodo: Todo = {
      id: 1,
      title: 'Test',
      completed: false,
      createdAt: now.toISOString(),
      dueAt: new Date(now.getTime() - 60000).toISOString(),
    };

    svc.checkDueTodos([dueTodo]);
    svc.checkDueTodos([dueTodo]);
    expect(callCount).toBe(1);
  });

  it('notifies again after forget() is called', async () => {
    const svc = new NotificationService();
    await svc.requestPermission();

    const now = new Date();
    const dueTodo: Todo = {
      id: 1,
      title: 'Test',
      completed: false,
      createdAt: now.toISOString(),
      dueAt: new Date(now.getTime() - 60000).toISOString(),
    };

    svc.checkDueTodos([dueTodo]);
    expect(callCount).toBe(1);

    svc.forget(1);
    svc.checkDueTodos([dueTodo]);
    expect(callCount).toBe(2);
  });

  it('notifies for multiple due todos', async () => {
    const svc = new NotificationService();
    await svc.requestPermission();

    const now = new Date();
    const todos: Todo[] = [
      { id: 1, title: 'A', completed: false, createdAt: now.toISOString(), dueAt: new Date(now.getTime() - 60000).toISOString() },
      { id: 2, title: 'B', completed: false, createdAt: now.toISOString(), dueAt: new Date(now.getTime() - 60000).toISOString() },
    ];

    svc.checkDueTodos(todos);
    expect(callCount).toBe(2);
  });
});

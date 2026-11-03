import { Service, signal } from '@angular/core';
import { Todo } from './todo';
import { Capacitor } from '@capacitor/core';
import {
  LocalNotifications,
  ScheduleOptions,
} from '@capacitor/local-notifications';

/**
 * Generate a stable numeric notification ID from a todo ID string.
 * Uses a simple hash to avoid collisions.
 */
function todoIdToNotificationId(todoId: string): number {
  let hash = 0;
  for (let i = 0; i < todoId.length; i++) {
    const char = todoId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash) % 100000;
}

/**
 * Notification service for due-task reminders.
 * Uses Capacitor Local Notifications on Android/iOS (works in background).
 * Falls back to browser Notification API on web.
 */
@Service({ autoProvided: true })
export class NotificationService {
  /** Whether the user has granted notification permission. */
  readonly permission = signal<'default' | 'granted' | 'denied'>('default');

  /** IDs of todos we've already notified about (web fallback only). */
  private notifiedIds = new Set<string>();

  private platform = Capacitor.getPlatform();
  private isMobile = this.platform === 'android' || this.platform === 'ios';

  /**
   * Request notification permission.
   */
  async requestPermission(): Promise<'granted' | 'denied' | 'default'> {
    if (this.isMobile) {
      const status = await LocalNotifications.requestPermissions();
      const granted = status.display === 'granted';
      this.permission.set(granted ? 'granted' : 'denied');
      return granted ? 'granted' : 'denied';
    }

    // Web fallback
    if (typeof Notification === 'undefined') {
      this.permission.set('denied');
      return 'denied';
    }
    const result = await Notification.requestPermission();
    this.permission.set(result);
    return result;
  }

  /**
   * Schedule a notification for a todo's due date.
   * Call when a due date is set or changed.
   */
  async scheduleTodoNotification(todo: Todo): Promise<void> {
    if (!todo.dueAt) return;

    const dueDate = new Date(todo.dueAt);
    if (dueDate.getTime() <= Date.now()) {
      // Already past due — fire immediately
      await this.fireTodoNotification(todo);
      return;
    }

    if (this.isMobile) {
      const options: ScheduleOptions = {
        notifications: [
          {
            id: todoIdToNotificationId(todo.id),
            title: 'ung-do reminder',
            body: todo.title,
            schedule: { at: dueDate },
          },
        ],
      };
      try {
        await LocalNotifications.schedule(options);
        console.log('Scheduled notification for todo', todo.id, 'at', dueDate.toISOString());
      } catch (e) {
        console.error('Failed to schedule notification:', e);
      }
    }
  }

  /**
   * Cancel a scheduled notification for a todo.
   * Call when a todo is completed or its due date changes.
   */
  async cancelTodoNotification(todo: Todo): Promise<void> {
    if (this.isMobile) {
      const id = todoIdToNotificationId(todo.id);
      try {
        await LocalNotifications.cancel({ notifications: [{ id }] });
      } catch (e) {
        console.error('Failed to cancel notification:', e);
      }
    }
    this.notifiedIds.delete(todo.id);
  }

  /**
   * Check for due todos and fire notifications (web fallback only).
   * Call periodically when not on mobile.
   */
  checkDueTodos(todos: Todo[]): void {
    if (this.isMobile) return; // Mobile uses scheduled notifications
    if (typeof Notification === 'undefined') return;
    if (this.permission() !== 'granted') return;

    const now = Date.now();
    for (const todo of todos) {
      if (todo.completed) continue;
      if (!todo.dueAt) continue;
      if (this.notifiedIds.has(todo.id)) continue;

      const dueTime = new Date(todo.dueAt).getTime();
      if (dueTime <= now) {
        this.fireWebNotification(todo);
        this.notifiedIds.add(todo.id);
      }
    }
  }

  /**
   * Fire a notification immediately for a due todo (mobile).
   */
  private async fireTodoNotification(todo: Todo): Promise<void> {
    if (this.isMobile) {
      try {
        await LocalNotifications.schedule({
          notifications: [
            {
              id: todoIdToNotificationId(todo.id),
              title: 'ung-do reminder',
              body: todo.title,
            },
          ],
        });
      } catch (e) {
        console.error('Failed to fire notification:', e);
      }
    } else {
      this.fireWebNotification(todo);
    }
  }

  /**
   * Fire a browser notification for a due todo (web fallback).
   */
  private fireWebNotification(todo: Todo): void {
    try {
      const notification = new Notification('ung-do reminder', {
        body: todo.title,
        icon: '/favicon.ico',
        tag: `todo-${todo.id}`,
      });
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    } catch (e) {
      console.error('Failed to fire notification:', e);
    }
  }

  /**
   * Forget a todo's notification status (web fallback only).
   */
  forget(id: string): void {
    this.notifiedIds.delete(id);
  }

  /**
   * Reset all notified IDs (web fallback only).
   */
  reset(): void {
    this.notifiedIds.clear();
  }
}

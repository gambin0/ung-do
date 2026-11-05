import { Service, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Todo } from './todo';

const NOTIFICATION_TITLE = 'ung-do reminder';

/** Java-style 32-bit string hash. */
function hash32(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (Math.imul(31, hash) + value.charCodeAt(i)) | 0;
  }
  return hash;
}

/** Notification IDs below this are reserved for the legacy scheme. */
const LEGACY_ID_LIMIT = 100_000;
const MAX_INT32 = 0x7fffffff;

/**
 * Stable notification ID for a todo. Android needs a positive 32-bit int; using
 * the full range (rather than the old mod-100k) makes collisions negligible.
 */
export function notificationId(todoId: string): number {
  return LEGACY_ID_LIMIT + ((hash32(todoId) >>> 0) % (MAX_INT32 - LEGACY_ID_LIMIT));
}

/**
 * The ID older app versions used. Reminders scheduled by them are cancelled
 * whenever the todo's reminder is rescheduled or cancelled, so none are orphaned.
 */
export function legacyNotificationId(todoId: string): number {
  return Math.abs(hash32(todoId)) % LEGACY_ID_LIMIT;
}

/**
 * Notification service for due-task reminders.
 * Uses Capacitor Local Notifications on Android/iOS (works in background).
 * Falls back to browser Notification API on web.
 */
@Service({ autoProvided: true })
export class NotificationService {
  private readonly isMobile = ['android', 'ios'].includes(Capacitor.getPlatform());

  /**
   * Whether the user has granted notification permission. On web this starts
   * from the browser's remembered decision so reminders keep working after a reload.
   */
  readonly permission = signal<NotificationPermission>(
    !this.isMobile && typeof Notification !== 'undefined' ? Notification.permission : 'default',
  );

  /** IDs of todos we've already notified about (web fallback only). */
  private readonly notifiedIds = new Set<string>();

  /**
   * Request notification permission.
   */
  async requestPermission(): Promise<NotificationPermission> {
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
      await this.cancelMobile(todo.id, { legacyOnly: true });
      try {
        await LocalNotifications.schedule({
          notifications: [
            {
              id: notificationId(todo.id),
              title: NOTIFICATION_TITLE,
              body: todo.title,
              schedule: { at: dueDate },
            },
          ],
        });
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
    if (this.isMobile) await this.cancelMobile(todo.id);
    this.notifiedIds.delete(todo.id);
  }

  private async cancelMobile(todoId: string, { legacyOnly = false } = {}): Promise<void> {
    const ids = legacyOnly
      ? [legacyNotificationId(todoId)]
      : [notificationId(todoId), legacyNotificationId(todoId)];
    try {
      await LocalNotifications.cancel({ notifications: ids.map((id) => ({ id })) });
    } catch (e) {
      console.error('Failed to cancel notification:', e);
    }
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
      await this.cancelMobile(todo.id, { legacyOnly: true });
      try {
        await LocalNotifications.schedule({
          notifications: [
            {
              id: notificationId(todo.id),
              title: NOTIFICATION_TITLE,
              body: todo.title,
            },
          ],
        });
      } catch (e) {
        console.error('Failed to fire notification:', e);
      }
    } else if (this.permission() === 'granted' && !this.notifiedIds.has(todo.id)) {
      this.fireWebNotification(todo);
      this.notifiedIds.add(todo.id);
    }
  }

  /**
   * Fire a browser notification for a due todo (web fallback).
   */
  private fireWebNotification(todo: Todo): void {
    try {
      const notification = new Notification(NOTIFICATION_TITLE, {
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
}

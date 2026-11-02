import { Injectable, signal } from '@angular/core';
import { Todo } from './todo';

/**
 * Browser notification service for due-task reminders.
 * Uses the Notifications API — no service worker or push server needed.
 * Limitation: the browser tab must be open for notifications to fire.
 */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  /** Whether the user has granted notification permission. */
  readonly permission = signal<'default' | 'granted' | 'denied'>('default');

  /** IDs of todos we've already notified about (to avoid duplicates). */
  private notifiedIds = new Set<number>();

  /**
   * Request notification permission from the browser.
   * Should be called when the user first sets a due date.
   */
  async requestPermission(): Promise<'granted' | 'denied' | 'default'> {
    if (typeof Notification === 'undefined') {
      this.permission.set('denied');
      return 'denied';
    }
    const result = await Notification.requestPermission();
    this.permission.set(result);
    return result;
  }

  /**
   * Check for due todos and fire notifications. Call periodically (e.g., every 60s).
   * @param todos - The full list of todos to check
   */
  checkDueTodos(todos: Todo[]): void {
    if (typeof Notification === 'undefined') return;
    if (this.permission() !== 'granted') return;

    const now = Date.now();
    for (const todo of todos) {
      if (todo.completed) continue;
      if (!todo.dueAt) continue;
      if (this.notifiedIds.has(todo.id)) continue;

      const dueTime = new Date(todo.dueAt).getTime();
      if (dueTime <= now) {
        this.fireNotification(todo);
        this.notifiedIds.add(todo.id);
      }
    }
  }

  /**
   * Fire a browser notification for a due todo.
   */
  private fireNotification(todo: Todo): void {
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
   * Forget a todo's notification status (e.g., after it's completed or its
   * due date is changed), so it can notify again later.
   */
  forget(id: number): void {
    this.notifiedIds.delete(id);
  }

  /**
   * Reset all notified IDs (e.g., on page reload).
   */
  reset(): void {
    this.notifiedIds.clear();
  }
}

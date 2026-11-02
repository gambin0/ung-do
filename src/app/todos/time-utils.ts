/**
 * Time formatting utilities for due dates and overdue display.
 */

/**
 * Returns true if the todo is overdue (dueAt is in the past and not completed).
 */
export function isOverdue(todo: { dueAt?: string | null; completed: boolean }): boolean {
  if (!todo.dueAt || todo.completed) return false;
  return new Date(todo.dueAt).getTime() < Date.now();
}

/**
 * Returns true if the todo has a due date that hasn't passed yet.
 */
export function isUpcoming(todo: { dueAt?: string | null; completed: boolean }): boolean {
  if (!todo.dueAt || todo.completed) return false;
  return new Date(todo.dueAt).getTime() >= Date.now();
}

/**
 * Format a due date for display. Returns a localized string like "Today 3:00 PM"
 * or "Tomorrow 9:00 AM" or "Nov 5, 2:00 PM".
 */
export function formatDueDate(dueAt: string): string {
  const due = new Date(dueAt);
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  const isToday = due.toDateString() === now.toDateString();
  const isTomorrow = due.toDateString() === tomorrow.toDateString();

  const timeStr = due.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

  if (isToday) return `Today ${timeStr}`;
  if (isTomorrow) return `Tomorrow ${timeStr}`;

  return due.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' ' + timeStr;
}

/**
 * Format how long ago a due date passed. Returns strings like "5 min ago",
 * "2 hours ago", "3 days ago".
 */
export function formatAgo(dueAt: string): string {
  const due = new Date(dueAt).getTime();
  const now = Date.now();
  const diff = now - due;

  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.floor(diff / 3600000);
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;

  const days = Math.floor(diff / 86400000);
  if (days < 30) return `${days} day${days > 1 ? 's' : ''} ago`;

  const months = Math.floor(days / 30);
  return `${months} month${months > 1 ? 's' : ''} ago`;
}

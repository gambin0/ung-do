/** A single to-do as returned by the local API. */
export interface Todo {
  id: string;
  title: string;
  completed: boolean;
  /** ISO-8601 timestamp from the server. */
  createdAt: string;
  /** ISO-8601 timestamp for due date, or null. */
  dueAt?: string | null;
}

/** Display filters supported by both the UI and the API. */
export type Filter = 'all' | 'active' | 'completed';

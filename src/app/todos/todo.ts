/** A single to-do as stored in Firestore. */
export interface Todo {
  id: string;
  title: string;
  completed: boolean;
  /** ISO-8601 creation timestamp. */
  createdAt: string;
  /** ISO-8601 due timestamp, or null when no due date is set. */
  dueAt?: string | null;
  /** Manual sort position (ascending). Missing on to-dos never reordered. */
  order?: number;
}

/** Display filters supported by the UI. */
export type Filter = 'all' | 'active' | 'completed';

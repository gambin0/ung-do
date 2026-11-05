/** A stocked item as stored in Firestore. */
export interface InventoryItem {
  id: string;
  name: string;
  /** Whole units on hand, never negative. */
  quantity: number;
  /** Optional grouping, e.g. "Pantry". Null when uncategorized. */
  category: string | null;
  /**
   * The restock to-do generated when this item ran low, or null. Cleared once
   * the item is restocked, so each low spell creates at most one to-do.
   */
  restockTodoId: string | null;
}

/** Items grouped under one category heading. */
export interface InventoryGroup {
  /** Null for the "Uncategorized" group. */
  category: string | null;
  items: InventoryItem[];
}

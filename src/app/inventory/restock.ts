/** At or below this quantity an item counts as low and needs restocking. */
export const RESTOCK_THRESHOLD = 1;

export type RestockAction = 'create' | 'complete' | 'none';

/**
 * What to do with an item's restock to-do when its quantity becomes `quantity`:
 * - `create` when it is low and has no restock to-do yet,
 * - `complete` when it is back above the threshold and still has one,
 * - `none` otherwise (so dropping from 1 to 0 doesn't add a second to-do).
 */
export function restockAction(quantity: number, hasRestockTodo: boolean): RestockAction {
  const low = quantity <= RESTOCK_THRESHOLD;
  if (low && !hasRestockTodo) return 'create';
  if (!low && hasRestockTodo) return 'complete';
  return 'none';
}

export function restockTodoTitle(itemName: string): string {
  return `Restock ${itemName}`;
}

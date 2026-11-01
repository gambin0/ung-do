import { Todo } from './todo';

/**
 * Pure reorder helper for filtered views.
 *
 * `full` is the complete ordered list of to-dos (top first). `visible` is the
 * currently-shown subset for the active filter, in display order. `newVisible`
 * is the same subset in the order the user dragged it into.
 *
 * Returns a new full list where the visible items take the new visible order
 * and the hidden items keep their relative positions in the slots the visible
 * items vacate. No mutation of the inputs.
 */
export function applyVisibleOrder(
  full: readonly Todo[],
  visible: readonly Todo[],
  newVisible: readonly Todo[],
): Todo[] {
  const visibleIds = new Set(visible.map((t) => t.id));
  // Validate: newVisible must be a permutation of visible (same ids, same count).
  if (newVisible.length !== visible.length) return [...full];
  const newVisibleIds = new Set(newVisible.map((t) => t.id));
  for (const id of visibleIds) {
    if (!newVisibleIds.has(id)) return [...full];
  }

  const result: Todo[] = [];
  let next = 0;
  for (const item of full) {
    if (visibleIds.has(item.id)) {
      // Fill this visible slot with the next item in the user's new visible order.
      result.push(newVisible[next++]);
    } else {
      result.push(item); // hidden items stay put (relative order preserved)
    }
  }
  return result;
}

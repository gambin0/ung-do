import { applyVisibleOrder } from './order';
import { Todo } from './todo';

const t = (id: number, completed = false): Todo => ({
  id,
  title: `todo-${id}`,
  completed,
  createdAt: '2026-01-01T00:00:00Z',
});

const FULL: Todo[] = [t(1), t(2, true), t(3), t(4, true), t(5)];
const byId = (ids: number[]): Todo[] => ids.map((id) => FULL.find((x) => x.id === id)!);
const ids = (rows: Todo[]): number[] => rows.map((r) => r.id);

describe('applyVisibleOrder', () => {
  it('reorders a mid-list move in an unfiltered view', () => {
    const visible = FULL;
    const result = applyVisibleOrder(FULL, visible, [t(1), t(3), t(2), t(4), t(5)]);
    expect(ids(result)).toEqual([1, 3, 2, 4, 5]);
  });

  it('reorders across the boundary while hidden items stay put', () => {
    // Active filter: visible = [1, 3, 5]; user drags 5 to the front.
    const visible = byId([1, 3, 5]);
    const result = applyVisibleOrder(FULL, visible, byId([5, 1, 3]));
    // Hidden 2 and 4 keep their relative positions in the vacated slots.
    expect(ids(result)).toEqual([5, 2, 1, 4, 3]);
  });

  it('is a no-op when the visible order is unchanged', () => {
    const visible = byId([1, 3, 5]);
    const result = applyVisibleOrder(FULL, visible, byId([1, 3, 5]));
    expect(ids(result)).toEqual([1, 2, 3, 4, 5]);
  });

  it('keeps hidden items put when nothing moves', () => {
    const visible = byId([2, 4]); // completed filter
    const result = applyVisibleOrder(FULL, visible, byId([2, 4]));
    expect(ids(result)).toEqual([1, 2, 3, 4, 5]);
    // and the completed filter would now show them in the same relative order
    expect(ids(result.filter((x) => x.completed))).toEqual([2, 4]);
  });

  it('does not mutate its inputs', () => {
    const visible = byId([1, 3, 5]);
    const before = JSON.stringify({ full: FULL, visible });
    applyVisibleOrder(FULL, visible, byId([5, 1, 3]));
    expect(JSON.stringify({ full: FULL, visible })).toBe(before);
  });

  it('returns the full list unchanged for invalid newVisible input', () => {
    const visible = byId([1, 3, 5]);
    const bad = byId([1, 3]); // missing an id
    expect(ids(applyVisibleOrder(FULL, visible, bad))).toEqual([1, 2, 3, 4, 5]);
    const swapped = byId([1, 2, 5]); // wrong id (2 is hidden)
    expect(ids(applyVisibleOrder(FULL, visible, swapped))).toEqual([1, 2, 3, 4, 5]);
  });
});

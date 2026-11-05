import { restockAction } from './restock';

describe('restockAction', () => {
  it('creates a to-do when an item reaches 1 or 0 without one', () => {
    expect(restockAction(1, false)).toBe('create');
    expect(restockAction(0, false)).toBe('create');
  });

  it('does not create a second to-do while the item stays low', () => {
    expect(restockAction(1, true)).toBe('none');
    expect(restockAction(0, true)).toBe('none');
  });

  it('completes the to-do once the item is back above 1', () => {
    expect(restockAction(2, true)).toBe('complete');
  });

  it('does nothing for well-stocked items', () => {
    expect(restockAction(2, false)).toBe('none');
    expect(restockAction(50, false)).toBe('none');
  });
});

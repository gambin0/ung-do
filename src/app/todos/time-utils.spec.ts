import { describe, it, expect } from 'vitest';
import { isOverdue, isUpcoming, formatDueDate, formatAgo } from './time-utils';

describe('isOverdue', () => {
  it('returns false for todos without a due date', () => {
    expect(isOverdue({ completed: false })).toBe(false);
    expect(isOverdue({ dueAt: null, completed: false })).toBe(false);
  });

  it('returns false for completed todos even if past due', () => {
    expect(isOverdue({ dueAt: '2020-01-01T00:00:00Z', completed: true })).toBe(false);
  });

  it('returns true for incomplete todos past their due date', () => {
    expect(isOverdue({ dueAt: '2020-01-01T00:00:00Z', completed: false })).toBe(true);
  });

  it('returns false for incomplete todos with a future due date', () => {
    expect(isOverdue({ dueAt: '2099-12-31T23:59:59Z', completed: false })).toBe(false);
  });
});

describe('isUpcoming', () => {
  it('returns false for todos without a due date', () => {
    expect(isUpcoming({ completed: false })).toBe(false);
  });

  it('returns false for completed todos', () => {
    expect(isUpcoming({ dueAt: '2099-12-31T23:59:59Z', completed: true })).toBe(false);
  });

  it('returns true for incomplete todos with a future due date', () => {
    expect(isUpcoming({ dueAt: '2099-12-31T23:59:59Z', completed: false })).toBe(true);
  });

  it('returns false for incomplete todos past their due date', () => {
    expect(isUpcoming({ dueAt: '2020-01-01T00:00:00Z', completed: false })).toBe(false);
  });
});

describe('formatDueDate', () => {
  it('formats today\'s due date with "Today" prefix', () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 15, 30);
    const formatted = formatDueDate(today.toISOString());
    expect(formatted).toMatch(/^Today /);
  });

  it('formats tomorrow\'s due date with "Tomorrow" prefix', () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0);
    const formatted = formatDueDate(tomorrow.toISOString());
    expect(formatted).toMatch(/^Tomorrow /);
  });

  it('formats distant dates with month/day', () => {
    const future = new Date();
    future.setDate(future.getDate() + 10);
    future.setHours(14, 0);
    const formatted = formatDueDate(future.toISOString());
    expect(formatted).not.toMatch(/^Today /);
    expect(formatted).not.toMatch(/^Tomorrow /);
  });
});

describe('formatAgo', () => {
  it('formats recent overdue as minutes ago', () => {
    const recent = new Date();
    recent.setMinutes(recent.getMinutes() - 15);
    expect(formatAgo(recent.toISOString())).toBe('15 min ago');
  });

  it('formats older overdue as hours ago', () => {
    const older = new Date();
    older.setHours(older.getHours() - 3);
    expect(formatAgo(older.toISOString())).toBe('3 hours ago');
  });

  it('formats very old overdue as days ago', () => {
    const veryOld = new Date();
    veryOld.setDate(veryOld.getDate() - 5);
    expect(formatAgo(veryOld.toISOString())).toBe('5 days ago');
  });
});

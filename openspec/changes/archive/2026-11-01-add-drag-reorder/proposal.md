# Proposal

## Why

The list order is fixed to "newest first" — there is no way to arrange to-dos the way the
user wants. For a daily list, position is the most natural way to express priority, and
dragging is the expected interaction for changing it.

## What Changes

- To-dos gain a user-defined, persisted order: the list displays in that order and it
  survives reloads and app restarts. New to-dos still enter at the top.
- Each row gains a reorder handle (drag indicator) with native HTML5 drag and drop:
  drop-position indicator, drag-lift styling, no-op drop in place.
- Reordering works in any filter view (All / Active / Done); hidden to-dos keep their
  relative order.
- Order changes apply optimistically and persist in the background; a failed save reverts
  the list to the server's order so the user can retry.
- Keyboard reorder: with a row's reorder handle focused, Alt+ArrowUp / Alt+ArrowDown moves
  the row one slot in the current view (with an aria-live announcement).
- API gains `PUT /api/todos/order` (full ordered id list; renumbered atomically).
- SQLite schema gains a `pos` column with a non-destructive in-place migration for the
  existing database file.

## Capabilities

### New Capabilities
- `todo-ordering`: user-defined list order — display in user order, new to-dos at the top,
  drag and keyboard reordering in any filter view, optimistic persistence with rollback.

### Modified Capabilities
- `todo-management`: "List to-dos" requirement changes from "newest first" to
  "user-defined order, new to-dos at the top".
- `todo-persistence`: "Database schema for to-dos" gains a position column plus the
  in-place migration of existing files; "Data-access operations" gains an atomic reorder.

## Impact

- `server/db.mjs`: `pos` column, migration/backfill, `ORDER BY pos` in list, top-insert on
  create, atomic `reorder()`.
- `server/index.mjs`: new `PUT /api/todos/order` route with validation.
- `src/app/todos/`: `todo-service.ts` (order authority, optimistic reorder + rollback),
  `todo-item.ts` (handle, DnD events, keyboard move), `todos.ts` (drop handling,
  indicators, live region), SCSS for drag affordances.
- No new runtime dependencies (native HTML5 DnD). Dev proxy unchanged.

Assumptions (minor, recorded here): single global order (not per-filter); touch dragging is
out of scope (mouse + keyboard); toggling completion does not move a to-do.

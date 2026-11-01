# Design

## Context

See proposal.md for motivation. Current state: `todos` has `id, title, completed, created_at`;
every list query orders `id DESC` (newest first). The client (`TodoService.allTodos`) keeps the
full server list in memory and derives the filtered view; `todos.ts` renders the filtered list
with `@for` and hands each row to `todo-item.ts`. The API is a zero-dependency `node:http`
server whose only DB module is `db.mjs`. The live database file (`server/data/ung-do.db`)
already exists with user data and must keep working.

## Goals / Non-Goals

**Goals:**
- Persisted, user-defined order for the whole list; new to-dos on top.
- Reorder via drag (mouse) and via keyboard, in any filter view, with hidden to-dos
  untouched.
- Optimistic UI with revert-on-failure.
- In-place, idempotent migration of the existing database file.

**Non-Goals:**
- Touch/pointer dragging (mouse + keyboard only).
- Per-filter orderings (one global order).
- Animating rows between positions, undo, or multi-column boards.

## Decisions

### 1. Order stored as an integer `pos` column, renumbered on every reorder
`pos INTEGER NOT NULL`. List queries use `ORDER BY pos ASC`. Create inserts at
`pos = COALESCE(MIN(pos), 1) - 1` (always above the current top). A reorder renumbers all
rows to `1..n` in the received order.

- Why integers over fractional/string ordering: the list is small (dozens, not thousands);
  a full renumber per reorder is O(n) trivial and keeps the invariant `pos` is dense and
  unique, which makes list queries and the migration dead simple.
- Alternatives considered: ordering by `id DESC` + a separate "moved" flag (ambiguous for
  repeated moves); fractional positions (needs rebalancing, more code, no benefit at this
  scale); a separate `todo_order` join table (extra table for a single-column concern).

### 2. Migration: idempotent, in a single transaction
At `openDb`: if `PRAGMA table_info(todos)` has no `pos`, run one transaction:
`ALTER TABLE todos ADD COLUMN pos INTEGER NOT NULL DEFAULT 0`, then
`UPDATE todos SET pos = (SELECT COUNT(*) FROM todos t2 WHERE t2.id > todos.id) + 1`
(newest created → pos 1). A crash mid-transaction leaves the pre-migration state; a crash
between transactions is impossible because it's one transaction (SQLite 3.25+ allows DDL
inside transactions; node:sqlite ships a recent SQLite).

### 3. API: `PUT /api/todos/order` with the full ordered id list
Body `{ "ids": [3, 1, 2, ...] }`. Validation: JSON array of numbers, containing every
existing id exactly once — missing, unknown, or duplicate id → 400, no changes. On success,
a single transaction sets each id's `pos` to its 1-based index; returns `{ ok: true }`.

- Why full-list PUT over a `{fromId, toId}` PATCH: the client always holds the complete
  ordered list (it renders it), so sending it is free and makes the server's job a
  straight renumber with one consistency check. A from/to patch would require the server
  to reconstruct the list to validate, for no simplicity win at this scale.

### 4. Client: `TodoService` owns order + optimistic revert
- `allTodos` now holds the server's `pos` order (server change, not client change).
- New `reorder(newFullOrder: Todo[])`: snapshot the previous order, set `allTodos` to the
  new order immediately, `PUT /api/todos/order` with the ids; on failure restore the
  snapshot and set the existing `error` signal (the list area already renders it).
- `load()` remains the recovery path (used by add/update/remove).

### 5. Drag and drop: native HTML5 DnD, handle-armed, row-sized ghost
- The reorder handle (a new `drag_indicator` mat-icon button on each row) sets
  `dragEnabled` on mousedown; the row carries `[draggable]="dragEnabled"` and
  `(dragstart)`/`(dragend)`. The row is only draggable while a drag was armed from the
  handle — clicks, text editing, and checkbox toggles are unaffected, and the drag ghost is
  the whole row (better than a handle-sized ghost).
- `dragstart` (row): parent stores `dragId` and puts it in `dataTransfer` (required by
  Firefox). Each row's `(dragover)` calls `preventDefault` and reports the row index; the
  parent computes `dropIndex` (before/after by comparing pointer Y to the row midpoint) —
  the indicator is a thin gradient bar rendered before the target row (or after the last).
- `drop` (row): parent takes the *visible* order, removes the dragged item, inserts at
  `dropIndex`; if the position is unchanged → no-op (no save). Otherwise it maps the new
  visible order back to the full order (see §6) and calls `service.reorder(...)`.
- `dragend` (row): clears `dragId`/`dropIndex`/`dragEnabled` — always runs, so a cancelled
  drag (drop outside the list) cleans up.

- Why native DnD over a library: no new dependency (project constraint: zero-dep backend,
  lean frontend), and the interaction is a simple vertical reorder. Libraries like
  `@angular CDK` drag-drop exist, but CDK drag requires a separate import and a larger
  behavioral surface than this one affordance justifies.

### 6. Mapping a filtered-view move back to the global order
Pure helper `applyVisibleOrder(full: Todo[], visible: Todo[], newVisible: Todo[]): Todo[]`:
walk `full` in order; where the item is in `newVisible`, emit the next item of
`newVisible`; where it is hidden, emit it unchanged. Hidden items keep their relative
positions; only visible items move. This helper is exported so it is unit-testable without
a browser.

### 7. Keyboard reorder
Handle buttons are real `<button>`s (focusable). On the handle, `(keydown)`:
`Alt+ArrowUp` / `Alt+ArrowDown` moves the row one slot in the *current visible* list
(bounded at both ends), reuses the §6 mapping + `service.reorder(...)`, and updates a
visually-hidden `aria-live="polite"` region in `todos.ts` ("Moved <title> to position X of
Y"). `prefers-reduced-motion` already disables row transitions, so no extra work.

### 8. Visual states
- `dragEnabled`/dragging row: `.is-dragging` → 50% opacity, dashed brand outline.
- Drop indicator: 3px gradient bar (brand-400→600) full row width, shown only while
  `dragId` is set and `dropIndex` points at that row.
- Handle: `cursor: grab` / `grabbing`, low-contrast until row hover (mirrors the existing
  delete-button reveal pattern).

## Risks / Trade-offs

- [HTML5 DnD quirks (Firefox needs `dataTransfer` set; some browsers suppress `drop` on the
  container)] → set `dataTransfer` in `dragstart`, attach `drop` per row, and treat
  `dragend` as the cleanup path so cancelled drags never leave stale state.
- [Reorder PUT races a concurrent create/delete (single user, but the dev server and a
  second tab could both write)] → the server renumbers from the *received* list against
  what it has on disk and rejects if the id sets differ (400), which the client surfaces as
  the error state and reverts; a subsequent `load()` reconciles.
- [Optimistic update + revert flicker on flaky save] → single-user loopback API, so
  failures are rare; revert is the specified behavior, no debounce needed.
- [Migration touches a real user database] → transactional + idempotent (§2), and the
  backfill preserves the exact order the user sees today (`id DESC` → pos 1..n), so the
  first load after migration looks identical.
- [Keyboard reorder while filtered can move an item across hidden items' gaps] → by
  design (§6): hidden items are untouched, so a visible move is a move among visible
  slots; the announcement uses visible positions to match what the user sees.

## Migration Plan

1. Deploy code with the migration in `openDb`; first API start against the existing file
   runs ALTER+backfill in one transaction. No manual steps.
2. Rollback: previous code version works with a `pos`-bearing schema only if it ignores it —
   it doesn't (it orders by `id`), so a true rollback also needs the old binary *and* the
   column is simply unused; no data is lost either way because `pos` is additive. If a clean
   rollback is ever needed, dropping the column and restoring `id DESC` ordering loses the
   user's arrangement only.

## Open Questions

None — the remaining unknown (exact drop-indicator pixel feel) is a styling detail that
won't change specs, approach, or task breakdown.

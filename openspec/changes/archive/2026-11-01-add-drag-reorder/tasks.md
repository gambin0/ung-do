# Tasks

## 1. Data layer: order column and reorder (server/db.mjs)

- [x] 1.1 Add the idempotent `pos` migration to `openDb` (table_info check, ALTER + newest-first backfill in one transaction) and verify by running it against a copy of the existing `server/data/ung-do.db`: `pos` column exists, all rows have dense positions 1..n in `id DESC` order, and titles/completion flags are unchanged
- [x] 1.2 Change `list()` to `ORDER BY pos ASC` and `create()` to insert at the top (`pos = COALESCE(MIN(pos),1) - 1`), and verify with a node script against a temp DB: a created todo appears first and lists return position order
- [x] 1.3 Add `reorder(db, ids)` that renumbers all rows atomically (one transaction) and rejects missing/duplicate/unknown ids without changing anything, and verify with a node script against a temp DB: a valid reorder is visible in a subsequent `list()`, and each invalid input leaves the stored order unchanged

## 2. API: order endpoint (server/index.mjs)

- [x] 2.1 Add `PUT /api/todos/order` accepting `{ "ids": [...] }` with validation (JSON array of numbers, every existing id exactly once → 200 `{ ok: true }`; otherwise 400 and no changes), and verify with curl: happy path returns 200 and reorders, while non-array, missing-id, duplicate-id, and unknown-id bodies all return 400
- [x] 2.2 Restart the local API (loopback :3000) and verify the full surface: the pre-existing CRUD + status-filter cases still pass, the migration ran on the real database file (list order identical to before), and a new create lands at the top

## 3. Client: order helper and service (src/app/todos/)

- [x] 3.1 Add the pure `applyVisibleOrder(full, visible, newVisible)` helper (visible items take the new visible order; hidden items keep their relative positions) with unit tests covering a mid-list move, a move across the boundary, a no-op reorder, and hidden items staying put, and verify `npx ng test --watch=false` passes
- [x] 3.2 Add `TodoService.reorder(newFullOrder)` — optimistically set the list, `PUT /api/todos/order` with the ids, and on failure restore the previous order and set the error signal — with a unit test covering the success and the revert paths, and verify `npx ng test --watch=false` passes

## 4. UI: drag, drop indicator, keyboard reorder (src/app/todos/)

- [x] 4.1 Add the reorder handle to `todo-item.ts` (focusable `drag_indicator` button, grab cursor, arms the row's `draggable` on mousedown, `dragstart`/`dragend` outputs, and Alt+ArrowUp/ArrowDown `keydown` move output) with SCSS for the handle and the `.is-dragging` row state, and verify `npx ng build` succeeds
- [x] 4.2 Wire drag handling in `todos.ts` — dragover per row computes the drop index (before/after by pointer position), renders the gradient drop-position indicator, drop maps the new visible order through `applyVisibleOrder` and calls `service.reorder` (no-op when the position is unchanged), dragend clears all drag state — plus the visually-hidden aria-live region for keyboard announcements, with SCSS for the indicator, and verify `npx ng build` succeeds
- [x] 4.3 Add/adjust unit tests for the new template (handle present on each row, rows not draggable until armed) and run the suite, and verify `npx ng test --watch=false` passes with zero failures

## 5. Integration verification

- [x] 5.1 Verify the full flow in a real browser at http://100.107.141.28:4200/: drag a row to a new position (drop indicator appears mid-drag, order updates immediately), the order survives a page reload, a drop in place is a no-op, reordering under the Active filter keeps completed items' relative order, and a keyboard Alt+Arrow move works with the live-region announcement
- [x] 5.2 Final green run: `npx ng build`, `npx ng test --watch=false`, and `git status` clean of unintended files

## Workflow follow-up

- Commit the implementation and push to origin/main (gambin0/ung-do).
- Archive the change with `/openspec-archive-change` (promotes `todo-ordering`, folds the `todo-management` / `todo-persistence` deltas) and commit the archive.

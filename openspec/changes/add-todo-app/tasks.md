# Tasks

## 1. Backend data layer + API

- [x] 1.1 Create `server/` with `db.ts` (or `.mjs`) data layer: open `server/data/ung-do.db`
      (create dir + file on first run, `PRAGMA journal_mode=WAL`, create `todos` table per
      design), expose `list(status)`, `create(title)`, `update(id, {title?,completed?})`,
      `delete(id)`. Verify by running the module and asserting a row round-trips
      (insert → list → update → delete) against a temp DB.
- [x] 1.2 Add `server/index.mjs` (or `.ts`) HTTP server on `127.0.0.1:3000` with the four
      endpoints + `GET /api/todos?status=` filter, JSON body parsing, and 400/404 error
      responses per design §2. Verify with curl: POST a to-do (expect 201 + id), GET list
      (expect it back), PATCH completed (expect `completed:true`), DELETE (expect 204 then
      empty list), and blank title POST (expect 400).
- [x] 1.3 Add `npm run api` script and verify `npm run api` boots and serves `/api/todos`.

## 2. Dev workflow wiring

- [x] 2.1 Add the dev-server proxy in `angular.json` (dev `serve` only): `/api` →
      `http://localhost:3000`, and `concurrently` as a devDependency. Verify the proxy
      config is present and `ng serve` starts without schema errors.
- [x] 2.2 Add `npm run dev` = concurrently(api, ng serve) and verify one command brings up
      both; confirm the browser-facing origin reaches the API through the proxy
      (`curl http://localhost:4200/api/todos` returns the API JSON while only :4200 is open
      to the browser).
- [x] 2.3 Add `server/data/` to `.gitignore` and verify `git status` shows no SQLite file
      (`.db`, `-wal`, `-shm`) as untracked after running the API once.

## 3. Angular UI

- [x] 3.1 Add `src/app/todos/todo.ts` model + `TodoService` (injectable) using plain `fetch`
      against `/api/todos`, exposing `todos`/`filter` signals and `add/update/toggle/delete`
      methods that refresh the list after each mutation. Verify with an Angular unit test
      (or a manual fetch) that a create followed by a list returns the new to-do.
- [x] 3.2 Build `TodoItem` standalone component (row: completion toggle, title, inline edit
      with blank-title rejection, delete control), Tailwind-first styling. Verify in the
      browser: toggle persists, edit saves and blank edit keeps the old title, delete removes
      the row.
- [x] 3.3 Build `Todos` standalone component (input with empty-title guard, list, All/Active/
      Completed filter, empty-state message, and a "backend unavailable" error state on fetch
      failure), wire into the root route, and replace the default welcome template. Verify the
      full flow end-to-end in the browser via the tailnet URL: create → appears newest-first →
      filter toggles display only → delete is permanent → empty state shows when none remain.
- [x] 3.4 Update `src/app/app.spec.ts` / add a focused test for the filter logic and empty-state
      rendering, and run `ng test` (or the component test) to confirm it passes.

## 4. Integration + docs

- [x] 4.1 Run `npm run dev`, exercise the complete CRUD + filter flow through the tailnet
      URL (https://charles-ms-7e26.tail754593.ts.net/), and confirm the data file on disk
      reflects the actions (query it with a quick `node:sqlite` read).
- [x] 4.2 Add a short "Running the app" section to `README.md` (install, `npm run dev`,
      where the DB lives, how to reset). Verify the commands in the README run as written.

## Workflow follow-up

- Archive the change (`openspec archive add-todo-app`) once the project's review requirements
  are satisfied, then verify the specs were promoted into `openspec/specs/`.

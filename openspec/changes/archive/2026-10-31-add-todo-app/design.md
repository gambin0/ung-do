# Design

## Context

ung-do is a fresh Angular 22 scaffold (standalone components, signals, Tailwind v4, Angular
Material 22) with no feature yet. The user chose a small local API server backed by a SQLite
file on this PC (see proposal.md — Why). Node on this machine is v26.7.0, whose built-in
`node:sqlite` (`DatabaseSync`) was verified working with zero packages installed. See specs for
the required behavior.

## Goals / Non-Goals

**Goals:**
- A minimal, dependency-free local HTTP API for to-do CRUD + filtered list.
- A single SQLite file as the durable source of truth, auto-created on first run.
- A smooth dev loop: one command starts API + `ng serve`, browser talks to the API via the
  dev-server proxy (no CORS config in browser code).
- An Angular UI using signals + standalone components, Tailwind-first styling, Material for
  the heavier controls.

**Non-Goals:**
- No auth, multi-user, or concurrency concerns (single local user).
- No ORM, migrations framework, or database admin UI.
- No production deployment story beyond "run the two processes"; no SSR.
- No offline/sync behavior — the API is the backend.

## Decisions

### 1. Backend: Node + built-in `node:sqlite` + `node:http` (no framework, no deps)
- **Why:** The user wants "lightweight SQL on this PC." `node:sqlite` ships in Node ≥ 22.5
  (we run 26.7.0) and needs no native compilation. `node:http` plus a ~50-line router keeps the
  server tiny and auditable. Zero `package.json` additions for the backend.
- **Alternatives considered:**
  - *Express/Fastify* — familiar, but adds a dependency for a 5-endpoint server; rejected for
    weight.
  - *Angular SSR route handlers + SQLite* — single deployable, but requires enabling SSR
    (`server` entry, `ssr: true`) which the scaffold currently has off; more moving parts for
    a local tool. Rejected.
  - *Client-side WASM SQLite (sql.js) in IndexedDB* — no backend, but persistence lives in
    browser storage (per-browser, harder to inspect/backup) and WASM adds its own weight.
    Rejected per user choice.

### 2. API surface: REST-ish JSON, no version prefix
- `GET    /api/todos?status=all|active|completed` → `{ todos: [...] }`
- `POST   /api/todos`  body `{ "title": string }` → created to-do (201)
- `PATCH  /api/todos/:id` body `{ "title"?, "completed"? }` → updated to-do
- `DELETE /api/todos/:id` → 204
- To-do shape: `{ id, title, completed, createdAt }` (`id` integer, `createdAt` ISO-8601).
- **Why:** Matches the spec's list/create/update/complete/delete/filter verbs directly and is
  trivially testable with curl. No auth or CORS middleware needed in dev because the browser
  reaches the API through the dev-server proxy (same origin).
- **Validation errors** return 400 with `{ "error": string }` (e.g. blank title); unknown ids
  return 404.

### 3. Database: single file `server/data/ung-do.db`, schema-on-first-run
- Table `todos(id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, completed INTEGER
  NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')))`.
- `PRAGMA journal_mode = WAL` on open (better read/write overlap, standard for app DBs).
- The directory + file are created lazily by the server's data layer; the data layer is the
  only code that opens the DB.
- **Why a file in the repo tree (gitignored) over a system path:** predictable, easy to delete
  for a reset, easy to back up; matches "on this PC" without inventing an app-data convention.

### 4. Dev workflow: dev-server proxy, `concurrently` for one-command start
- Add `@angular/build:dev-server` proxy in `angular.json` (dev serve only): `/api` →
  `http://localhost:3000`. The Angular app calls same-origin `/api/...`.
- `npm run dev` = `concurrently "npm:api" "ng serve --host 0.0.0.0 --port 4200"`
  (`concurrently` is dev-only). `npm run api` starts the Node server on :3000.
- **Why proxy over CORS:** same-origin means no browser CORS config, no `Access-Control-*`
  handling in the tiny server, and it keeps the ts.net/LAN access path working unchanged
  (the dev server already binds 0.0.0.0; the proxy forwards to localhost:3000).
- **Alternative:** enable CORS on the API and call `http://100.107.141.28:3000` directly —
  works, but splits origins and complicates the tailnet story; proxy is simpler and the API
  port stays private to the host.

### 5. Frontend: signals + standalone components, Tailwind-first
- `TodoService` (injectable, no HttpClient needed — plain `fetch`) exposes signals:
  `todos()`, `filter()`, plus methods `add/update/toggle/delete/list` that refresh the signal
  after each mutation.
- Components under `src/app/todos/`: `Todos` (list + filter + input shell), `TodoItem`
  (row with toggle, inline edit, delete). Material used for the input/checkbox affordances
  where it earns its keep; layout/spacing in Tailwind per project convention.
- **Why signals over a store:** single small feature, no cross-cutting state; signals are the
  project convention and keep reactivity local and testable.

## Risks / Trade-offs

- [`node:sqlite` is still marked experimental in some Node docs] → It is stable enough for a
  local tool and verified working on Node 26.7.0 here; the data layer isolates all SQLite calls
  behind one module, so a future swap (e.g. to `better-sqlite3`) is contained.
- [WAL files (`*.db-wal`, `*.db-shm`) next to the data file] → Gitignore the whole
  `server/data/` directory, not just the `.db` file.
- [Two processes in dev can drift (API down while UI up)] → UI shows a friendly
  "backend unavailable" error state on fetch failure instead of a blank list; `npm run dev`
  keeps them together.
- [No auth on the API bound to a host] → API binds to `127.0.0.1` only (not 0.0.0.0), so it
  is not reachable over LAN/tailnet; only the Angular dev server (which already is) is exposed.
- [Dev-server proxy is dev-only] → Production builds would need a real proxy or same-process
  serving; explicitly out of scope (Non-Goals).

## Migration Plan

Additive only; no existing behavior to migrate.
1. Add `server/` + data layer + schema bootstrap; run `npm run api` to verify endpoints with curl.
2. Add proxy + `concurrently` script; verify `/api` through the dev server.
3. Build the UI on top; verify full CRUD + filter in the browser via the tailnet URL.
4. Archive the OpenSpec change to promote specs into `openspec/specs/`.
Rollback: remove `server/`, the proxy block, the scripts, and `src/app/todos/` — the scaffold
returns to its prior state.

## Open Questions

None — the user already chose the backend approach (local Node + SQLite file) and the
single-user scope is inherent to "on this PC."

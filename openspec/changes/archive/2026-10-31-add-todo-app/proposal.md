# Proposal

## Why

ung-do is currently an empty Angular 22 scaffold with no feature. We want a modern, single-user
to-do app that persists its data locally in a lightweight SQL database on this PC — no cloud
backend, no native build step, and a clean API the Angular UI can build on.

## What Changes

- Add a small local HTTP API server (Node + built-in `node:sqlite`, zero native deps) that owns
  a SQLite file on disk and exposes to-do CRUD endpoints.
- Add an Angular 22 standalone UI for managing to-dos: create, list, mark complete, edit,
  delete, and filter (all / active / completed). Styled with Tailwind + Angular Material.
- Add a SQLite schema and a thin data-access layer behind the API.
- Wire the dev workflow: an npm script (or `concurrently`) to run the API and `ng serve` together,
  and a dev-server proxy so the browser reaches the API without CORS friction.
- Add a `.gitignore` entry for the SQLite data file so local data is never committed.

## Capabilities

### New Capabilities
- `todo-management`: The to-do domain behavior — create, list, update, complete, and delete
  to-dos, plus filtering by status (all / active / completed), surfaced through the Angular UI
  and the local HTTP API.
- `todo-persistence`: Durable storage of to-dos in a SQLite database file on this PC — schema,
  data-access rules (insert/update/delete/query), and file lifecycle (created on first run,
  never committed to git).

### Modified Capabilities
<!-- None. Greenfield project with no existing specs. -->

## Impact

- **New code**: `server/` (API + DB), `src/app/todos/` (UI components/service), proxy config,
  npm scripts.
- **New dependencies**: none required (Node built-in `node:sqlite` + a tiny HTTP server via
  `node:http`); optional `concurrently` dev-only for running both processes.
- **Config**: `angular.json` dev-server proxy, `package.json` scripts, `.gitignore`.
- **Data**: a SQLite file at `server/data/ung-do.db` (gitignored).
- **No breaking changes** — this is additive to a fresh scaffold.

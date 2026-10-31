# UngDo

A modern single-user to-do app. Angular 22 frontend (Tailwind CSS v4 + Angular Material) backed
by a tiny local API server (Node + built-in `node:sqlite`) that stores to-dos in a SQLite file
on this machine. No cloud backend, no native build step.

Generated with [Angular CLI](https://github.com/angular/angular-cli) version 22.2.5.

## Running the app

Install dependencies (once):

```bash
npm install
```

Start everything with one command — this runs the API (port 3000) and the Angular dev server
(port 4200, with the `/api` proxy) together:

```bash
npm run dev
```

Then open <http://localhost:4200/> (or, from another tailnet device,
<http://100.107.141.28:4200/> / <https://charles-ms-7e26.tail754593.ts.net/>).

The individual pieces, if you want to run them separately:

```bash
npm run api      # just the to-do API on http://127.0.0.1:3000
npm start        # just ng serve (API must already be running)
```

### Where the data lives

To-dos are stored in **`server/data/ung-do.db`** (SQLite, WAL mode). The file and its
`-wal`/`-shm` sidecars are created automatically on first use and are gitignored — your local
to-dos never end up in git.

To **reset** the app's data, stop the app and delete the directory:

```bash
rm -rf server/data/
```

The next start recreates an empty database.

### How it fits together

```
browser ──> ng serve :4200 ──(dev-server proxy /api)──> node API :3000 ──> node:sqlite
                                                                              (server/data/ung-do.db)
```

- `server/db.mjs` — the only code that opens the database (schema + CRUD).
- `server/index.mjs` — a dependency-free `node:http` API (`GET/POST /api/todos`,
  `PATCH/DELETE /api/todos/:id`, `?status=all|active|completed`), bound to loopback only.
- `src/app/todos/` — the Angular UI (signals-based `TodoService` + standalone components).

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.

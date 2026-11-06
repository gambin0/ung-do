# Domain Capsule: Coding Conventions

`AGENTS.md` is the authoritative rule list; this capsule adds project-specific
detail. When they disagree, follow `AGENTS.md` and fix this file.

## TypeScript

- `strict: true` and `strictTemplates: true` (tsconfig.json)
- Prefer type inference when obvious; avoid `any`, use `unknown`
- Interfaces for entity shapes (`Todo`, `InventoryItem`), string unions for
  small enums (`Filter`, `RestockAction`)
- `readonly` on injected services, signals, and inputs

### Naming

- Classes: PascalCase without a `Component` suffix (`TodoItem`, `InventoryRow`);
  services keep the `Service` suffix (`TodoService`)
- Functions and signals: camelCase (`compareTodos`, `pendingIds`)
- Constants: UPPER_SNAKE_CASE (`RESTOCK_THRESHOLD`, `CATEGORY_LIST_ID`)
- Files: kebab-case (`todo-item.ts`, `inventory-service.ts`)

## Angular

- Standalone components; never set `standalone: true` or `OnPush` explicitly
- `input()`, `input.required()`, `output()`, `viewChild()`, `computed()`, `effect()`
- Native control flow (`@if`, `@for` with `track`, `@switch`)
- `class`/`style` bindings, never `ngClass`/`ngStyle`
- Host bindings in the decorator's `host` object, never `@HostBinding`/`@HostListener`
- Inline templates; inline `styles` for small components, `styleUrl` for larger
  ones (`todo-item.scss`, `inventory-row.scss`)
- Feature screens are lazy-loaded with `loadComponent` in `app.routes.ts` and
  protected with the functional guards in `auth/auth-guards.ts`

### Forms

- New forms use **Signal Forms** (`@angular/forms/signals`): `form()`, schema
  validators (`required`, `email`, `min`), `[formField]` on inputs, `[formRoot]`
  on the `<form>`, and a `submission.action`. Examples: `auth/sign-in.ts`,
  `inventory/inventory.ts`, `inventory/inventory-row.ts`.
- Reset after submit with `fields().reset(value)`.
- Gotcha: don't put `min`/`max`/`required` attributes on an input bound with
  `[formField]` — the compiler rejects it (NG8022). Use the schema validator,
  which sets the attribute for you.
- The older to-do screen (`todos.ts`, `todo-item.ts`) still uses `FormsModule`
  with `ngModel`; migrate it to Signal Forms when you next touch those forms.

## Services

- `@Service({ autoProvided: true })` singletons, `inject()` for dependencies
- Expose state as signals (`items`, `loading`, `adding`, `pendingIds`,
  `error`) and derived state as `computed()`
- Busy state is scoped: `adding` covers only the composer, `pendingIds` marks
  only the rows being saved. Never block the whole card.
- Write methods return a result (`boolean`, the created entity, or `null`)
  instead of throwing, and record failures in the `error` signal. Each service
  has a local `errorMessage(e, fallback)` helper for this.
- When a failed write triggers a reload, reload first and set `error` after,
  because `load()` clears `error`.
- Services expose `clear()`; sign-out (`main-nav.ts`) calls it on every
  data service so the next user never sees stale data.

## Styling

- Design tokens (`--brand-*`, `--ink-*`) are defined in `src/styles.scss`
- Shared screen chrome (page, shell, masthead, card, alert, buttons, composer,
  segmented control, list, empty state) lives in `src/styles/_screen.scss`;
  reuse those classes instead of restyling per feature
- Global helpers in `src/styles.scss`: `.visually-hidden`, `.busy-overlay`
- State modifiers use `is-*` classes (`.is-completed`, `.is-overdue`,
  `.is-low`, `.is-out`)
- Include a `prefers-reduced-motion` fallback for any transition or animation
- Text colours must reach 4.5:1 contrast; `--ink-500` is the lightest ink
  allowed for body-size text

## Accessibility

- Must pass axe and WCAG AA
- Use `aria-disabled` rather than `disabled` when the control should keep focus
  (e.g. the inventory "−" button at 0)
- Set `aria-busy` on the region that is saving
- Announce non-visual outcomes (reorders, restock to-dos, deletions) through a
  `.visually-hidden` `aria-live="polite"` region
- When an inline editor opens, focus its first field; when it closes, return
  focus to the element that opened it

## Testing

- Vitest via `@angular/build:unit-test`; run `npm test`
- Specs are colocated: `foo.ts` → `foo.spec.ts`
- Services are tested against a fake Firestore module, not a class:

```typescript
import { fakeState, resetFakeFirestore, store, Timestamp } from '../../testing/fake-firestore';

vi.mock('firebase/app', () => ({ initializeApp: () => ({}) }));
vi.mock('firebase/firestore', () => import('../../testing/fake-firestore'));

beforeEach(() => resetFakeFirestore());
```

- Seed data by writing to `store` (a `Map` of collection → `Map` of id → data)
- Set `fakeState.failCommit = true` to make writes fail
- Construct services directly (`new TodoService()`)
- Component tests use `TestBed` with the service replaced by a signal-based
  mock (`{ provide: TodoService, useValue: mock }`); see `todos/todos.spec.ts`.
  Scope DOM queries (e.g. `.toolbar .segment`) so they don't match `MainNav`.

## Git

- Commit messages: a plain, capitalised imperative summary with no type prefix,
  e.g. "Add inventory screen with categories and automatic restock to-dos"
- Branch names: short kebab-case descriptions, e.g. `code-audit-cleanup`
- Run `npx prettier --write` on changed files before committing

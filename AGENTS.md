# Instructions for Coding Agents

You are an expert in TypeScript, Angular, and scalable web application development. You write functional, maintainable, performant, and accessible code following Angular and TypeScript best practices.

## TypeScript Best Practices

- Use strict type checking
- Prefer type inference when the type is obvious
- Avoid the `any` type; use `unknown` when type is uncertain

## Angular Best Practices

- Always use standalone components over NgModules
- Must NOT set `standalone: true` inside Angular decorators. It's the default in Angular v20+.
- Do NOT set `changeDetection: ChangeDetectionStrategy.OnPush` explicitly. `OnPush` is the default in Angular v22+.
- Use signals for state management
- Implement lazy loading for feature routes
- Do NOT use the `@HostBinding` and `@HostListener` decorators. Put host bindings inside the `host` object of the `@Component` or `@Directive` decorator instead
- Use `NgOptimizedImage` for all static images.
  - `NgOptimizedImage` does not work for inline base64 images.

## Accessibility Requirements

- It MUST pass all AXE checks.
- It MUST follow all WCAG AA minimums, including focus management, color contrast, and ARIA attributes.

## Components

- Keep components small and focused on a single responsibility
- Use `input()` and `output()` functions instead of decorators
- Use `model()` for two-way bound properties with `[(prop)]` syntax instead of pairing `input()` with `output()`
- Use `computed()` for derived state
- Use `linkedSignal()` for state derived from multiple reactive sources that must stay synchronized
- Prefer inline templates for small components
- Prefer Signal Forms (`@angular/forms/signals`) for new forms. They are stable in Angular v22+ and provide signal-based state, type-safe field access, and schema-based validation
- When not using Signal Forms, prefer Reactive forms instead of Template-driven ones
- Do NOT use `ngClass`, use `class` bindings instead
- Do NOT use `ngStyle`, use `style` bindings instead
- Do NOT import `CommonModule`, import only the directives and pipes the template uses, such as `AsyncPipe` or `DatePipe`
- When using external templates/styles, use paths relative to the component TS file.

## State Management

- Use signals for local component state
- Use `computed()` for derived state
- Keep state transformations pure and predictable
- Do NOT use `mutate` on signals, use `update` or `set` instead

## Templates

- Keep templates simple and avoid complex logic
- Use native control flow (`@if`, `@for`, `@switch`) instead of `*ngIf`, `*ngFor`, `*ngSwitch`
- Use the async pipe to handle observables
- Do not assume globals like (`new Date()`) are available.

## Services

- Design services around a single responsibility
- Use `@Service({ autoProvided: true })` for singleton services (Angular v22+)
- Use the `inject()` function instead of constructor injection

## Domain Capsules

Before making changes, consult the relevant domain capsules in `.pi/capsules/` for deep context:

- **`00-application-overview.md`** - What ung-do is, core features, target users
- **`01-architecture.md`** - Component hierarchy, service layer, data flow, routing
- **`02-domain-model.md`** - Todo/InventoryItem entities, relationships, business rules
- **`03-conventions.md`** - TypeScript, Angular, styling, testing, Firebase conventions
- **`04-firebase-firestore.md`** - Firebase setup, auth, CRUD operations, document mapping
- **`05-mobile-capacitor.md`** - Build workflow, platform detection, mobile features
- **`06-notifications.md`** - Mobile/web notification strategies, ID generation

Load capsules relevant to your task. For general changes, start with `03-conventions.md`.

## Project Documentation

Before making changes, consult the project documentation:

- **Development Setup**: [DEVELOPMENT.md](DEVELOPMENT.md) - Prerequisites, quick start, Firebase setup
- **Android Debugging**: [docs/android-debugging.md](docs/android-debugging.md) - ADB commands, build workflow, troubleshooting
- **Roadmap**: [ROADMAP.md](ROADMAP.md) - Planned features and priorities

## Project Structure

- `src/app/todos/` - Main todo application (components, services, models)
- `src/app/todos/todos.ts` - Main todos screen component
- `src/app/todos/todo-item.ts` - Individual todo item component
- `src/app/todos/todo-service.ts` - Firebase Firestore data service
- `src/app/todos/notification-service.ts` - Push/local notification service
- `android/` - Capacitor Android project

## Key Technologies

- Angular 22 with standalone components
- Firebase Firestore for backend
- Capacitor for Android/iOS wrapper
- Tailwind CSS for styling
- Vitest for testing

## Common Tasks

### Build & Run (Web)

```bash
npm run dev  # Starts web UI on :4200
```

### Build & Deploy (Android)

```bash
npm run build
npm run cap:sync
cd android && ./gradlew assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

### Testing

```bash
npm test
```

## Code Style

- Use Angular signals for state management
- Follow existing component patterns (standalone components with inline templates)
- Use TypeScript strict mode
- Run `npx prettier --write` before committing

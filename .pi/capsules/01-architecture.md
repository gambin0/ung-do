# Domain Capsule: Architecture

## High-Level Architecture

```
┌─────────────────────────────────────────────┐
│              Angular Application            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │  Todos   │  │ Inventory│  │   Auth   │  │
│  │ Component│  │ Component│  │ Component│  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  │
│       │             │             │         │
│  ┌────▼─────────────▼─────────────▼─────┐  │
│  │         Service Layer                │  │
│  │  TodoService │ InventoryService │     │  │
│  │  AuthService │ NotificationService│   │  │
│  └──────────────┬──────────────────────┘  │
│                 │                         │
│  ┌──────────────▼──────────────────────┐  │
│  │       Firebase Integration          │  │
│  │   firestore.ts / firebase.ts        │  │
│  └──────────────────┬──────────────────┘  │
└─────────────────────┼─────────────────────┘
                      │
              ┌───────▼────────┐
              │   Firebase     │
              │   Firestore    │
              └────────────────┘
```

## Component Hierarchy

```
App (app.ts)
├── RouterOutlet
│   ├── SignIn (auth/sign-in.ts)
│   ├── Todos (todos/todos.ts)
│   │   ├── MainNav (main-nav.ts)
│   │   └── TodoItem[] (todos/todo-item.ts)
│   └── Inventory (inventory/inventory.ts)
│       ├── MainNav (main-nav.ts)
│       └── InventoryRow[] (inventory/inventory-row.ts)
```

## Key Architectural Decisions

### 1. Standalone Components

- No NgModules; all components are standalone
- Uses `imports` array for dependencies
- Follows Angular 22+ best practices

### 2. Signal-Based State Management

- All state uses Angular signals (`signal()`, `computed()`)
- No RxJS for state (only for Firebase observables if needed)
- `computed()` for derived state (filtered lists, counts)
- Services expose signals for components to subscribe to

### 3. Service Layer Pattern

- Services are singletons (`@Service({ autoProvided: true })`)
- Services own data fetching and state
- Components are presentational, delegating to services
- Services use `inject()` instead of constructor injection

### 4. Firebase Integration

- Single Firebase app instance (`firebase.ts`)
- Firestore collections defined in `firestore.ts`
- Services interact with Firestore directly
- Access is restricted to the owner's account by `firestore.rules`
- No ORM; manual document mapping

### 5. Optimistic UI Updates

- Inventory quantity changes are optimistic
- Saving spinners are scoped: the composer while adding, only the affected row while editing/deleting
- Todo reordering is optimistic with rollback on failure
- Pending IDs tracked to prevent duplicate writes

### 6. Error Handling Strategy

- Services catch errors and store in `error` signal
- Components display error banners
- Retry buttons reload data
- No thrown errors to UI layer

## Data Flow

```
User Action → Component Event Handler → Service Method → Firestore
                                                      ↓
Component Signal Update ← Service Signal Update ← Firestore Response
```

## Routing

- `/` - Todos (default, requires auth)
- `/inventory` - Inventory (requires auth)
- `/sign-in` - Sign in (redirects if already signed in)
- Guards: `signedInGuard`, `signedOutGuard`

## File Organization

```
src/app/
├── app.ts, app.routes.ts, app.config.ts  # App shell
├── auth/                                 # Authentication
│   ├── auth-service.ts
│   ├── auth-guards.ts
│   └── sign-in.ts                        # Signal Forms sign-in
├── todos/                                # To-do feature
│   ├── todos.ts                          # Main todos screen
│   ├── todo-item.ts                      # Individual todo
│   ├── todo-service.ts                   # Firestore CRUD
│   ├── notification-service.ts           # Reminders
│   ├── todo.ts                           # Todo interface
│   ├── order.ts                          # Reordering logic
│   └── time-utils.ts                     # Date formatting
├── inventory/                            # Inventory feature
│   ├── inventory.ts                      # Main inventory screen
│   ├── inventory-row.ts                  # Individual item
│   ├── inventory-service.ts              # Firestore CRUD
│   ├── inventory-item.ts                 # Item interface
│   └── restock.ts                        # Restock logic
├── main-nav.ts                           # Shared navigation
├── firebase.ts                           # Firebase app init
├── firestore.ts                          # Firestore collections
└── firebase.config.ts                    # Firebase config

src/styles.scss, src/styles/_screen.scss  # Tokens and shared screen styles
src/testing/fake-firestore.ts             # In-memory Firestore for tests
firestore.rules                           # Owner-only security rules
```

## Testing Architecture

- Vitest with Angular testing utilities
- Service specs replace the Firestore SDK with `src/testing/fake-firestore.ts` via `vi.mock`
- Component specs use `TestBed` with signal-based service mocks
- All tests in `*.spec.ts` files colocated with source

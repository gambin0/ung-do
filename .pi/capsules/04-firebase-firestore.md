# Domain Capsule: Firebase & Firestore

Uses the modular Firebase JS SDK directly (no `@angular/fire`).

## Where things live

| File                           | Purpose                                                  |
| ------------------------------ | -------------------------------------------------------- |
| `src/app/firebase.config.ts`   | Web app config (public identifiers, not secrets)         |
| `src/app/firebase.ts`          | `firebaseApp = initializeApp(firebaseConfig)`            |
| `src/app/firestore.ts`         | `db`, `todosRef` (`todos`), `inventoryRef` (`inventory`) |
| `src/app/auth/`                | `AuthService`, route guards, sign-in screen              |
| `firestore.rules`              | Security rules (owner-only access + field validation)    |
| `firebase.json`, `.firebaserc` | CLI config; default project `ung-do`                     |

Firestore is only imported by lazy-loaded feature code, so it stays out of the
initial bundle. Keep it that way.

## Authentication (`src/app/auth/auth-service.ts`)

- Email/password only. Accounts are created in the Firebase console; there is
  no sign-up screen.
- `initializeAuth` with `indexedDBLocalPersistence, browserLocalPersistence` so
  sessions survive restarts in the Capacitor WebView.
- `isSignedIn()` awaits `authStateReady()` before checking `currentUser`.
- `signedInGuard` / `signedOutGuard` (`auth-guards.ts`) call `inject()` before
  any `await`.
- `signInErrorMessage()` maps `FirebaseError` codes to friendly messages.

## Security model

- `firestore.rules` is checked in and deployed. Only one account may read or
  write: `isOwner()` compares `request.auth.uid` to the owner's UID. Being
  signed in is not enough, because anyone can create an email/password account
  through the Firebase API.
- Creates/updates are validated (`isValidTodo`, `isValidItem`); see
  `02-domain-model.md` for the limits. Everything else is denied by default.
- **Do not replace or loosen these rules.** If you add a collection or a
  required field, extend the rules and deploy them:
  `npx firebase-tools deploy --only firestore:rules`.
- Rule rejections surface as `permission-denied` errors in the service's
  `error` signal.

## Firestore patterns

Read the services for exact code: `src/app/todos/todo-service.ts` and
`src/app/inventory/inventory-service.ts`.

- **Reads**: `getDocs(collectionRef)` once on screen load, then a reload after
  each successful write. There are no realtime listeners (`onSnapshot`).
- **Mapping**: each service has a defensive `fromDoc()` that tolerates missing
  or mistyped fields, and a `toIso()` helper that converts `Timestamp` (or a
  legacy number) to an ISO string.
- **Writes**: `addDoc`, `updateDoc`, `deleteDoc`; use `writeBatch(db)` whenever
  more than one document must change together (reorder, clear completed, item +
  restock to-do). Pre-generate IDs with `doc(collectionRef)` when one document
  in a batch must reference another.
- **Timestamps**: write `Timestamp.now()` / `Timestamp.fromDate(...)`, never
  ISO strings.
- **Errors**: services catch, store the message in `error`, and return a
  failure value; components never see thrown Firestore errors.

## Offline behaviour

- Auth state persists offline (IndexedDB).
- Firestore offline persistence is not enabled; the app shows the last loaded
  data and writes fail with an error until the connection returns.

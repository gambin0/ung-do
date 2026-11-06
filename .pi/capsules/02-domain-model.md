# Domain Capsule: Domain Model

Source of truth: `src/app/todos/todo.ts`, `src/app/inventory/inventory-item.ts`,
`src/app/inventory/restock.ts`, and `firestore.rules`. Read those files for exact
code; this capsule explains the rules behind them.

## Core Entities

### Todo (`src/app/todos/todo.ts`)

| Field       | Type                    | Notes                                       |
| ----------- | ----------------------- | ------------------------------------------- |
| `id`        | `string`                | Firestore document ID                       |
| `title`     | `string`                | 1–1000 chars (enforced by security rules)   |
| `completed` | `boolean`               |                                             |
| `createdAt` | `string`                | ISO-8601, mapped from a Firestore Timestamp |
| `dueAt`     | `string \| null` (opt.) | ISO-8601; drives reminders                  |
| `order`     | `number` (optional)     | Manual sort position, ascending             |

**Business rules**

- Never-reordered to-dos (no `order`) sort first, newest first; to-dos with an
  `order` follow, ascending (`compareTodos` in `todo-service.ts`).
- Once the list has been reordered, new to-dos get an `order` one below the
  current minimum so they land at the top. Before any reorder, new to-dos have
  no `order` at all.
- Setting a due date schedules a reminder; completing or deleting cancels it
  (see `06-notifications.md`).
- Completed to-dos can be cleared in one batch (`removeMany`).

### Inventory Item (`src/app/inventory/inventory-item.ts`)

| Field           | Type             | Notes                                          |
| --------------- | ---------------- | ---------------------------------------------- |
| `id`            | `string`         | Firestore document ID                          |
| `name`          | `string`         | 1–200 chars                                    |
| `quantity`      | `number`         | Whole number, 0–1,000,000                      |
| `category`      | `string \| null` | Optional grouping (≤ 100 chars), e.g. "Pantry" |
| `restockTodoId` | `string \| null` | ID of the open auto-generated restock to-do    |

**Business rules**

- Groups are sorted by category A–Z with "Uncategorized" (null) last; items
  within a group are sorted by name.
- Quantity changes from the +/- stepper are optimistic; edits and deletes show
  a spinner on the affected row only.

## Restock Logic (`src/app/inventory/restock.ts`)

`RESTOCK_THRESHOLD = 1`. Every save of an item calls
`restockAction(quantity, hasRestockTodo)`:

| Quantity after save | Has restock to-do? | Action       | Effect                                                                                     |
| ------------------- | ------------------ | ------------ | ------------------------------------------------------------------------------------------ |
| ≤ 1                 | no                 | `'create'`   | In the same batch: create to-do "Restock &lt;name&gt;" and store its ID in `restockTodoId` |
| > 1                 | yes                | `'complete'` | Clear `restockTodoId`, then best-effort mark that to-do completed                          |
| ≤ 1                 | yes                | `'none'`     | Nothing; one restock to-do per low spell                                                   |
| > 1                 | no                 | `'none'`     | Nothing                                                                                    |

Adding a new item with quantity ≤ 1 creates its restock to-do immediately.

**The link is one-way.** Inventory drives the to-do, never the reverse:

- Checking off or deleting a restock to-do does **not** change the item's
  quantity or clear `restockTodoId`. The item keeps pointing at that to-do until
  its quantity goes above 1, so no replacement to-do is created in the meantime.
- Restock to-dos have no due date, so they never trigger notifications.

## Firestore Schema

### `todos` collection

```
title:           string              // required
completed:       boolean             // required
createdAt:       Timestamp
dueAt:           Timestamp | null
order:           number              // absent until the list has been reordered
inventoryItemId: string              // only on restock to-dos; absent otherwise
```

### `inventory` collection

```
name:          string                // required
quantity:      int                   // required, 0..1,000,000
category:      string | null
restockTodoId: string | null
```

`firestore.rules` validates the fields marked required/ranged above and only
lets the owner's account read or write. Writes that break validation fail with
`permission-denied`, so keep the rules in step with any schema change.

## Invariants

1. At most one open restock to-do per item, tracked by `restockTodoId`.
2. Quantities are whole numbers and never negative (UI blocks going below 0;
   rules reject it).
3. Timestamps are stored as Firestore `Timestamp`s and exposed to the UI as
   ISO-8601 strings.
4. Item and its new restock to-do are written in one `writeBatch`, so neither
   exists without the other.

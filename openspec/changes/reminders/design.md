# Design

## Context

The app currently stores todos in a local SQLite database via a Node.js HTTP API. Todos have id, title, completed, createdAt, and pos fields. There is no concept of due dates or reminders. The frontend is an Angular 22 standalone component app with signals.

## Goals / Non-Goals

**Goals:**
- Add due date/time field to todos
- Show overdue todos with visual indication
- Send browser push notifications when todos become due
- Request notification permission when user first sets a reminder

**Non-Goals:**
- Server-side scheduled notifications (app must be open)
- Recurring reminders (future feature)
- Sound or vibration (browser notification defaults only)
- Cross-device sync

## Decisions

### Due date storage
Store `dueAt` as an ISO 8601 timestamp string in the SQLite database. SQLite has no native datetime type; storing as text is the standard approach and makes it easy to parse in both JavaScript and the frontend.

### Notification mechanism
Use the browser Notifications API (`Notification.requestPermission()` and `new Notification()`). This is simpler than Web Push (no service worker, no push server, no VAPID keys). Trade-off: the browser tab must be open (or at least the page must be loaded) for notifications to fire.

### Periodic checking
Use `setInterval` in the Angular app to check for due todos every 60 seconds. Compare each incomplete todo's `dueAt` with the current time. If a todo is due and hasn't been notified yet, fire a notification and mark it as notified (using an in-memory Set of notified IDs to avoid duplicate notifications).

### Overdue detection
A todo is overdue if `dueAt` is in the past and the todo is not completed. Show this in the UI with red text and a "due X ago" label.

### Permission timing
Request notification permission when the user first sets a due date on a todo (not on app load). This gives context to the permission request.

## Risks / Trade-offs

[Notifications only when app is open] → Acceptable trade-off for simplicity; documented as a limitation. Users who need background notifications can use the browser's "keep alive" or pin the tab.

[Duplicate notification risk] → Mitigated by tracking notified IDs in memory. If the page reloads, a todo that just became due might notify again, but this is rare and acceptable.

[Timezone handling] → Store timestamps in UTC, display in local time. Use JavaScript's Date API for conversion.

## Migration Plan

1. Add `dueAt` column to todos table (nullable TEXT)
2. Update API to accept and return `dueAt`
3. Update frontend Todo interface
4. Add UI for setting due dates
5. Add notification logic
6. Add overdue styling

Rollback: Remove the column and revert code. Data in `dueAt` is lost but no other data is affected.

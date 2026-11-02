# Tasks

## 1. Database Migration

- [x] 1.1 Add `dueAt` column to todos table (nullable TEXT, ISO 8601 format)
- [x] 1.2 Verify migration runs successfully against existing database

## 2. Backend API

- [x] 2.1 Update `create` function in db.mjs to accept and store `dueAt`
- [x] 2.2 Update `update` function in db.mjs to accept and store `dueAt`
- [x] 2.3 Update `list` function in db.mjs to return `dueAt` field
- [x] 2.4 Update API routes to pass `dueAt` through request/response bodies
- [ ] 2.5 Test API endpoints with dueAt field

## 3. Frontend Data Model

- [x] 3.1 Update Todo interface to include optional `dueAt` field
- [x] 3.2 Update TodoService to handle `dueAt` in create/update/list operations

## 4. UI - Due Date Input

- [x] 4.1 Add due date/time picker to todo creation form
- [ ] 4.2 Add due date/time picker to todo edit form
- [ ] 4.3 Add UI to clear/remove a due date from a task

## 5. UI - Overdue Display

- [x] 5.1 Add overdue detection logic (compare dueAt with current time)
- [x] 5.2 Add overdue styling (red indicator) to overdue tasks
- [x] 5.3 Add "due X ago" time-elapsed display for overdue tasks

## 6. Browser Notifications

- [x] 6.1 Implement notification permission request logic
- [x] 6.2 Implement periodic due-task checking (setInterval every 60 seconds)
- [x] 6.3 Implement notification firing for due tasks
- [x] 6.4 Implement duplicate notification prevention (in-memory Set of notified IDs)

## 7. Testing

- [ ] 7.1 Write unit tests for overdue detection logic
- [ ] 7.2 Write unit tests for notification logic
- [ ] 7.3 Run full test suite and verify all tests pass

## 8. Documentation

- [ ] 8.1 Update README or docs to describe the reminders feature

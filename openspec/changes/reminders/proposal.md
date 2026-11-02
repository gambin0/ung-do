# Proposal

## Why

Users forget tasks over time and need proactive nudges. Time-based reminders with browser push notifications will help users stay on top of their tasks and build better habits through timely alerts.

## What Changes

- Add `dueAt` timestamp field to todos for scheduling reminders
- Add UI control to set reminder times when creating/editing todos
- Implement browser Notifications API integration for push notifications
- Add periodic check for due reminders and fire notifications
- Add overdue highlighting for past-due tasks

## Capabilities

### New Capabilities
- `todo-reminders`: Time-based task reminders with due date scheduling, overdue detection, and browser push notifications

### Modified Capabilities
- `todo-management`: Add dueAt field to todo object and UI for setting reminders
- `todo-persistence`: Add dueAt column to SQLite schema and API support

## Impact

- `server/db.mjs`: Add dueAt column to todos table
- `server/index.mjs`: Add dueAt to API response and accept it in create/update
- `src/app/todos/todo.ts`: Update Todo interface with dueAt field
- `src/app/todos/todo-item.ts`: Add reminder UI and overdue styling
- `src/app/todos/todos.ts`: Add reminder scheduling logic and notification integration
- `src/app/todos/todo-service.ts`: Add dueAt to API calls

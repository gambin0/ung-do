# Spec Delta

## Purpose

Time-based task reminders with due date scheduling, overdue detection, and browser push notifications to help users remember tasks and build better habits.

## ADDED Requirements

### Requirement: User can set a reminder time
The system SHALL allow users to set a specific due date and time for any task.

#### Scenario: Setting a reminder when creating a task
- **WHEN** user creates a task and sets a due date and time
- **THEN** the task is saved with that dueAt timestamp

#### Scenario: Setting a reminder when editing a task
- **WHEN** user edits an existing task and sets a due date and time
- **THEN** the task's dueAt timestamp is updated

#### Scenario: Removing a reminder
- **WHEN** user clears the due date on a task
- **THEN** the task no longer has a reminder

### Requirement: Browser push notifications for due reminders
When a task's due time arrives, the system SHALL send a browser push notification to the user.

#### Scenario: Notification fires at due time
- **WHEN** a task's dueAt time arrives and the task is not completed
- **THEN** the system sends a browser notification with the task title

#### Scenario: No notification for completed tasks
- **WHEN** a task's dueAt time arrives but the task is already completed
- **THEN** no notification is sent

#### Scenario: No notification for past-due tasks created without reminder
- **WHEN** a task is created with a dueAt time in the past
- **THEN** no notification is sent (task is simply marked overdue)

### Requirement: Overdue task highlighting
Tasks that are past their due time SHALL be visually highlighted as overdue.

#### Scenario: Overdue task display
- **WHEN** a task's dueAt time has passed and the task is not completed
- **THEN** the task is displayed with overdue styling (e.g., red indicator)

#### Scenario: Overdue task shows time elapsed
- **WHEN** viewing an overdue task
- **THEN** the UI shows how long ago the task was due (e.g., "2 hours ago")

### Requirement: Notification permission handling
The system SHALL request browser notification permission when the user first sets a reminder.

#### Scenario: Permission requested
- **WHEN** user sets a due date on a task and notification permission has not been granted
- **THEN** the system requests Notification permission from the browser

#### Scenario: Permission denied
- **WHEN** user denies notification permission
- **THEN** tasks still show as overdue but no push notifications are sent

### Requirement: Periodic reminder checking
The system SHALL periodically check for tasks that have become due.

#### Scenario: Due tasks detected
- **WHEN** the periodic check runs
- **THEN** any tasks whose dueAt time has arrived trigger notifications

#### Scenario: Check frequency
- **WHEN** the app is open and active
- **THEN** the system checks for due tasks at least every 60 seconds

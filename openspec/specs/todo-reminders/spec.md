# todo-reminders Specification

## Purpose
Defines time-based task reminders: scheduling notifications for due dates, handling
platform-specific notification delivery (Capacitor local notifications on mobile, browser
Notification API on web), and managing notification lifecycle (scheduling, canceling,
recurring checks).

## Requirements

### Requirement: Schedule a reminder for a due to-do
When a to-do has a due date set, the system SHALL schedule a notification to fire at that
time. On mobile platforms (Android/iOS via Capacitor), this uses the Capacitor Local
Notifications plugin for reliable background delivery. On web, the system uses the browser
Notification API with periodic polling.

#### Scenario: Schedule mobile notification
- **WHEN** a to-do with a future due date is created or updated on Android or iOS
- **THEN** a local notification is scheduled via Capacitor to fire at the due time with
  the to-do's title as the body

#### Scenario: Schedule web notification
- **WHEN** a to-do with a future due date is created or updated on web
- **THEN** the system records the due to-do for periodic checking and will fire a browser
  notification when the due time arrives

#### Scenario: Past-due to-do fires immediately
- **WHEN** a to-do is created or updated with a due date that has already passed
- **THEN** a notification is fired immediately rather than scheduled for the past

### Requirement: Request notification permission
Before scheduling any notification, the system SHALL request notification permission from
the user. On mobile, this uses Capacitor's permission API. On web, this uses the browser's
Notification.requestPermission(). The permission state MUST be tracked.

#### Scenario: Permission requested on first due date
- **WHEN** the user sets a due date on a to-do for the first time
- **THEN** notification permission is requested from the user

#### Scenario: Permission denied
- **WHEN** the user denies notification permission
- **THEN** the system records the denied state and does not repeatedly request permission

### Requirement: Cancel reminders when appropriate
The system SHALL cancel scheduled notifications when a to-do is completed, deleted, or its
due date is changed.

#### Scenario: Cancel on completion
- **WHEN** a to-do with a scheduled notification is marked complete
- **THEN** the scheduled notification for that to-do is canceled

#### Scenario: Cancel on deletion
- **WHEN** a to-do with a scheduled notification is deleted
- **THEN** the scheduled notification for that to-do is canceled

#### Scenario: Reschedule on due date change
- **WHEN** a to-do's due date is changed
- **THEN** the old notification is canceled and a new one is scheduled for the updated time

### Requirement: Periodic due-date checking on web
On web platforms, the system SHALL periodically check for to-dos that have become due and
fire browser notifications for them. This check MUST run at regular intervals (approximately
once per minute) and MUST not notify about the same to-do more than once.

#### Scenario: Web periodic check fires notification
- **WHEN** the periodic check runs and finds a to-do whose due time has arrived
- **THEN** a browser notification is fired for that to-do

#### Scenario: No duplicate web notifications
- **WHEN** the periodic check runs multiple times for a to-do that is already due
- **THEN** only the first check fires a notification; subsequent checks do not duplicate it

### Requirement: Notification content
All reminder notifications SHALL include the app name ("ung-do") in the title and the
to-do's title in the body, so the user knows which task is due.

#### Scenario: Notification shows to-do title
- **WHEN** a reminder notification fires
- **THEN** the notification title includes "ung-do" and the body shows the to-do's title
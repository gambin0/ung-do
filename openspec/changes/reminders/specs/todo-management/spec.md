# Spec Delta

## MODIFIED Requirements

### Requirement: Create a to-do
The system SHALL allow the user to create a new to-do by providing a title, an optional due date/time, and optionally marking it complete.

#### Scenario: Create a to-do with a title
- **WHEN** the user submits a new to-do with a title
- **THEN** the to-do appears in the list with that title, not completed, and no due date

#### Scenario: Create a to-do with a due date
- **WHEN** the user submits a new to-do with a title and a due date/time
- **THEN** the to-do appears in the list with that title and due date/time shown

#### Scenario: Create a to-do marked complete
- **WHEN** the user submits a new to-do and marks it complete
- **THEN** the to-do appears in the list with that title, completed, and no due date

### Requirement: List to-dos
The system SHALL display all to-dos in a list, showing each to-do's title and completion state, in the user-defined order (see the todo-ordering capability). Newly created to-dos MUST appear at the top of the list. To-dos with due dates SHALL display their due date/time, and overdue to-dos SHALL be visually indicated.

#### Scenario: To-dos appear after creation
- **WHEN** the user has created multiple to-dos
- **THEN** the list shows every to-do, newest created first, each with a visible completion indicator, in the user's current arrangement

#### Scenario: Empty list state
- **WHEN** no to-dos exist
- **THEN** the list area shows an empty-state message instead of a blank list

#### Scenario: Overdue to-do indicator
- **WHEN** a to-do has a due date/time in the past and is not completed
- **THEN** the to-do is displayed with an overdue indicator

### Requirement: Edit an existing to-do
The system SHALL allow the user to edit an existing to-do's title, completion state, and/or due date/time.

#### Scenario: Edit a to-do's title
- **WHEN** the user edits a to-do's title
- **THEN** the to-do's title is updated and the change is persisted

#### Scenario: Toggle a to-do's completion
- **WHEN** the user toggles a to-do's completion state
- **THEN** the to-do's completion state is updated and the change is persisted

#### Scenario: Edit a to-do's due date
- **WHEN** the user edits a to-do's due date/time
- **THEN** the to-do's due date/time is updated and the change is persisted

# todo-management Specification

## Purpose
Defines the to-do domain behavior users rely on: creating, viewing, editing, completing, and
deleting to-dos, and filtering the list by status — surfaced through the Angular UI and the
local API.

## Requirements

### Requirement: Create a to-do
The system SHALL let the user create a to-do by entering a title. A to-do MUST be created with
the title the user entered (trimmed of surrounding whitespace), start as not completed, and be
persisted immediately.

#### Scenario: User adds a new to-do
- **WHEN** the user types a non-empty title in the input and submits
- **THEN** a new to-do with that title appears in the list, marked as not completed
- **AND** the input is cleared

#### Scenario: Empty title is rejected
- **WHEN** the user submits the input with a blank or whitespace-only title
- **THEN** no to-do is created and the input keeps focus

### Requirement: List to-dos
The system SHALL display all to-dos in a list, showing each to-do's title and completion
state, with the most recently created to-do shown first.

#### Scenario: To-dos appear after creation
- **WHEN** the user has created multiple to-dos
- **THEN** the list shows every to-do, newest first, each with a visible completion indicator

#### Scenario: Empty list state
- **WHEN** no to-dos exist
- **THEN** the list area shows an empty-state message instead of a blank list

### Requirement: Complete and uncomplete a to-do
The system SHALL let the user toggle a to-do's completion state from the list. Toggling MUST
persist immediately and MUST NOT change the to-do's title or position rules other than
reflecting its new state.

#### Scenario: Mark a to-do complete
- **WHEN** the user toggles a not-completed to-do
- **THEN** the to-do shows as completed (e.g. struck through) and remains in the list

#### Scenario: Reopen a completed to-do
- **WHEN** the user toggles a completed to-do
- **THEN** the to-do shows as not completed

### Requirement: Edit a to-do title
The system SHALL let the user edit an existing to-do's title in place. Saving an edit MUST
persist the new title; a title reduced to blank or whitespace MUST be rejected.

#### Scenario: Save an edited title
- **WHEN** the user opens a to-do's edit mode, changes the title, and saves
- **THEN** the list shows the updated title, persisted

#### Scenario: Blank edit is rejected
- **WHEN** the user clears the title and saves
- **THEN** the to-do's original title is retained

### Requirement: Delete a to-do
The system SHALL let the user delete a to-do from the list. Deletion MUST be permanent and
persist immediately.

#### Scenario: Delete a to-do
- **WHEN** the user activates the delete control on a to-do
- **THEN** that to-do is removed from the list and no longer exists

### Requirement: Filter to-dos by status
The system SHALL let the user filter the list to show All, Active (not completed), or
Completed to-dos. The filter MUST apply only to display, not to persistence, and the default
view MUST be All.

#### Scenario: Show only active to-dos
- **WHEN** the user selects the Active filter
- **THEN** only not-completed to-dos are shown

#### Scenario: Show only completed to-dos
- **WHEN** the user selects the Completed filter
- **THEN** only completed to-dos are shown

#### Scenario: Filter is display-only
- **WHEN** the user selects the Active filter and then deletes an active to-do
- **THEN** the to-do is fully removed (not hidden), and the same to-do does not reappear under All

# todo-ordering Specification

## Purpose

Lets the user arrange to-dos in any order they choose and keep that arrangement — display in
user order, drag-and-drop and keyboard reordering in any filter view, and persistence across
sessions.

## Requirements

### Requirement: To-dos display in user-defined order
The list SHALL display to-dos in the order the user has arranged, and that order MUST be
preserved when the list is reloaded and when the app restarts.

#### Scenario: Custom order is shown
- **WHEN** the user has moved a to-do to a new position and the list re-renders
- **THEN** the to-do is shown in the position the user dropped it, not in creation order

#### Scenario: Order survives a reload
- **WHEN** the user reorders to-dos and then reloads the app or restarts it
- **THEN** the list is shown in the order the user left it

### Requirement: New to-dos enter at the top
A newly created to-do MUST appear at the top of the list, above every existing to-do.

#### Scenario: New to-do lands on top
- **WHEN** the user creates a to-do while the list already has entries
- **THEN** the new to-do is shown as the first item, and existing to-dos keep their
  relative order

### Requirement: Drag a to-do to a new position
The user SHALL be able to reorder the list by dragging a to-do's reorder handle and dropping
it at another position. While dragging, the list MUST show a drop-position indicator, and a
drop at the to-do's current position MUST change nothing. Reordering MUST work in every
filter view (All, Active, Done); to-dos hidden by the filter MUST keep their relative order.

#### Scenario: Drop at a new position
- **WHEN** the user drags a to-do's handle to a new position and releases
- **THEN** the to-do is shown in the new position and the other to-dos shift to fill the gap

#### Scenario: Drop indicator
- **WHEN** the user drags a to-do over another position in the list
- **THEN** the list shows an indicator of where the to-do will land if released there

#### Scenario: Drop in place is a no-op
- **WHEN** the user drags a to-do and releases it at its own current position
- **THEN** the order is unchanged and no save is attempted

#### Scenario: Reorder while filtered
- **WHEN** the Active filter is selected and the user drags an active to-do to a new
  position among the visible active to-dos
- **THEN** the visible active to-dos reorder as dropped, and completed to-dos keep their
  relative order (verified later when the All view is shown)

### Requirement: Reorder is applied optimistically and persisted
On a successful reorder the displayed order MUST update immediately, and the new order MUST
be persisted in the background. If persisting fails, the list MUST revert to the persisted
order and the user MUST be able to retry.

#### Scenario: Save succeeds silently
- **WHEN** the user drops a to-do in a new position and the background save succeeds
- **THEN** the list stays in the new order with no error shown

#### Scenario: Failed save reverts
- **WHEN** the user drops a to-do in a new position and the background save fails
- **THEN** the list reverts to the previously persisted order and the user can repeat the
  reorder

### Requirement: Move a to-do with the keyboard
When a to-do's reorder handle has keyboard focus, the user SHALL be able to move that to-do
one position up or down within the current filter view using Alt+ArrowUp and Alt+ArrowDown.
Each successful move MUST be announced to assistive technology.

#### Scenario: Keyboard move down
- **WHEN** the reorder handle of the first to-do is focused and the user presses Alt+ArrowDown
- **THEN** that to-do moves below the next to-do in the current view, the move is
  announced, and the new order is persisted

#### Scenario: Keyboard move at the boundary
- **WHEN** the reorder handle of the last to-do in the current view is focused and the user
  presses Alt+ArrowDown
- **THEN** the order is unchanged

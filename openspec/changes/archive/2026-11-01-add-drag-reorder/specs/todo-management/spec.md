# Spec Delta

## MODIFIED Requirements

### Requirement: List to-dos
The system SHALL display all to-dos in a list, showing each to-do's title and completion
state, in the user-defined order (see the todo-ordering capability). Newly created to-dos
MUST appear at the top of the list.

#### Scenario: To-dos appear after creation
- **WHEN** the user has created multiple to-dos
- **THEN** the list shows every to-do, newest created first, each with a visible completion
  indicator, in the user's current arrangement

#### Scenario: Empty list state
- **WHEN** no to-dos exist
- **THEN** the list area shows an empty-state message instead of a blank list

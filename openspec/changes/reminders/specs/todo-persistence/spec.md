# Spec Delta

## MODIFIED Requirements

### Requirement: Database schema for to-dos
The database SHALL store each to-do with a unique identifier, a non-empty title, a completion
flag, a creation timestamp, a position, and an optional due date/time. Identifiers MUST be
unique and auto-assigned by the database. An existing database file without the position or
due date columns MUST be migrated in place: every to-do receives a position, with existing
to-dos ordered by creation (newest first), and the migration MUST NOT drop or alter existing
data.

#### Scenario: To-do row shape
- **WHEN** a to-do is inserted
- **THEN** it is stored with a unique id, the title, a completion flag defaulting to not
  completed, a creation timestamp, a position, and a due date/time (null if not set)

#### Scenario: Title is required
- **WHEN** a to-do row is inserted
- **THEN** a blank or NULL title is not accepted

#### Scenario: Existing database is migrated
- **WHEN** the app starts against a database file that predates the position or due date columns
- **THEN** the columns are added and each existing to-do is given a position ordered
  newest created first, with all titles and completion flags unchanged

### Requirement: Data-access operations
The data layer SHALL support insert, read (list, with optional status filter, in position
order), update (title, completion, and/or due date/time), delete, and reorder for to-dos,
each operating against the persistent database. A reorder operation MUST accept a new
complete ordering and apply it atomically, so a failure cannot leave the stored order
half-updated.

#### Scenario: List with status filter
- **WHEN** a list query is made with a completion-state filter
- **THEN** only to-dos matching that state are returned, in position order

#### Scenario: Update completion
- **WHEN** a completion update is issued for an existing to-do
- **THEN** that to-do's stored completion flag changes and other fields are unchanged

#### Scenario: Update due date
- **WHEN** a due date/time update is issued for an existing to-do
- **THEN** that to-do's stored due date/time changes and other fields are unchanged

#### Scenario: Delete a to-do
- **WHEN** a delete is issued for an existing to-do
- **THEN** the to-do's row is removed from the database

#### Scenario: Reorder is atomic
- **WHEN** a reorder is issued with a new ordering of all to-dos
- **THEN** either every to-do's position is updated to match the new ordering or none are,
  and a later list query returns the new ordering

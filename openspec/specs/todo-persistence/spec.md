# todo-persistence Specification

## Purpose
Defines the durable storage of to-dos in a local SQLite database file on this PC — the schema,
the data-access operations the API relies on, and the file's lifecycle.

## Requirements

### Requirement: To-dos are stored in a local SQLite database
The system SHALL persist all to-do data in a SQLite database file on this PC. The file MUST be
created automatically on first use if it does not exist, and it MUST be the single source of
truth for to-do state across app restarts.

#### Scenario: First run creates the database
- **WHEN** the app starts and the database file does not yet exist
- **THEN** the database file and its schema are created and the app is usable

#### Scenario: Data survives a restart
- **WHEN** the user creates to-dos, stops the app, and starts it again
- **THEN** the previously created to-dos are still present and correct

### Requirement: Database schema for to-dos
The database SHALL store each to-do with a unique identifier, a non-empty title, a completion
flag, a creation timestamp, and a position. Identifiers MUST be unique and auto-assigned by
the database. An existing database file without the position column MUST be migrated in
place: every to-do receives a position, with existing to-dos ordered by creation (newest
first), and the migration MUST NOT drop or alter existing data.

#### Scenario: To-do row shape
- **WHEN** a to-do is inserted
- **THEN** it is stored with a unique id, the title, a completion flag defaulting to not
  completed, a creation timestamp, and a position

#### Scenario: Title is required
- **WHEN** a to-do row is inserted
- **THEN** a blank or NULL title is not accepted

#### Scenario: Existing database is migrated
- **WHEN** the app starts against a database file that predates the position column
- **THEN** the position column is added and each existing to-do is given a position ordered
  newest created first, with all titles and completion flags unchanged

### Requirement: Data-access operations
The data layer SHALL support insert, read (list, with optional status filter, in position
order), update (title and/or completion), delete, and reorder for to-dos, each operating
against the persistent database. A reorder operation MUST accept a new complete ordering and
apply it atomically, so a failure cannot leave the stored order half-updated.

#### Scenario: List with status filter
- **WHEN** a list query is made with a completion-state filter
- **THEN** only to-dos matching that state are returned, in position order

#### Scenario: Update completion
- **WHEN** a completion update is issued for an existing to-do
- **THEN** that to-do's stored completion flag changes and other fields are unchanged

#### Scenario: Delete a to-do
- **WHEN** a delete is issued for an existing to-do
- **THEN** the to-do's row is removed from the database

#### Scenario: Reorder is atomic
- **WHEN** a reorder is issued with a new ordering of all to-dos
- **THEN** either every to-do's position is updated to match the new ordering or none are,
  and a later list query returns the new ordering

### Requirement: Database file is not committed to version control
The SQLite data file SHALL be excluded from the git repository so that local data is never
committed.

#### Scenario: Data file is gitignored
- **WHEN** the repository is committed
- **THEN** the SQLite data file is not tracked by git

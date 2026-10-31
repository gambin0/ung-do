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
flag, and a creation timestamp. Identifiers MUST be unique and auto-assigned by the database.

#### Scenario: To-do row shape
- **WHEN** a to-do is inserted
- **THEN** it is stored with a unique id, the title, a completion flag defaulting to not
  completed, and a creation timestamp

#### Scenario: Title is required
- **WHEN** a to-do row is inserted
- **THEN** a blank or NULL title is not accepted

### Requirement: Data-access operations
The data layer SHALL support insert, read (list, with optional status filter), update (title
and/or completion), and delete for to-dos, each operating against the persistent database.

#### Scenario: List with status filter
- **WHEN** a list query is made with a completion-state filter
- **THEN** only to-dos matching that state are returned

#### Scenario: Update completion
- **WHEN** a completion update is issued for an existing to-do
- **THEN** that to-do's stored completion flag changes and other fields are unchanged

#### Scenario: Delete a to-do
- **WHEN** a delete is issued for an existing to-do
- **THEN** the to-do's row is removed from the database

### Requirement: Database file is not committed to version control
The SQLite data file SHALL be excluded from the git repository so that local data is never
committed.

#### Scenario: Data file is gitignored
- **WHEN** the repository is committed
- **THEN** the SQLite data file is not tracked by git

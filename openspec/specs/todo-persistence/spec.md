# todo-persistence Specification

## Purpose
Defines the durable storage of to-dos in Firebase Firestore — the document model, the
data-access operations the app relies on, and the cloud persistence guarantees.

## Requirements

### Requirement: To-dos are stored in Firebase Firestore
The system SHALL persist all to-do data in a Firebase Firestore collection named `todos`.
Firestore MUST be the single source of truth for to-do state across app restarts and
devices. The app MUST initialize Firestore with the project's Firebase configuration
before any data operations.

#### Scenario: App initializes Firestore
- **WHEN** the app starts
- **THEN** Firebase is initialized with the project configuration and Firestore is ready
  for data operations

#### Scenario: Data survives a restart
- **WHEN** the user creates to-dos, stops the app, and starts it again
- **THEN** the previously created to-dos are still present and correct, loaded from
  Firestore

### Requirement: Firestore document model for to-dos
Each to-do SHALL be stored as a Firestore document in the `todos` collection with the
following fields: `title` (string, non-empty), `completed` (boolean, defaults to false),
`createdAt` (timestamp), and `dueAt` (timestamp or null). Document IDs MUST be
auto-assigned by Firestore. The `order` field stores the user's custom sort position.

#### Scenario: To-do document shape
- **WHEN** a to-do is inserted
- **THEN** it is stored as a Firestore document with a unique auto-assigned id, the title,
  a completion flag defaulting to false, a creation timestamp, and an optional due date

#### Scenario: Title is required
- **WHEN** a to-do document is inserted
- **THEN** a blank or NULL title is not accepted

### Requirement: Data-access operations
The data layer SHALL support insert, read (list, with optional status filter), update
(title, completion, due date), delete, and reorder for to-dos, each operating against
Firestore. Reads MUST load all documents from the `todos` collection ordered by
`createdAt` descending.

#### Scenario: List all to-dos
- **WHEN** the app loads
- **THEN** all to-do documents are fetched from Firestore and displayed, newest created
  first

#### Scenario: List with status filter
- **WHEN** a list query is made with a completion-state filter
- **THEN** only to-dos matching that state are returned (filtering applied client-side)

#### Scenario: Update completion
- **WHEN** a completion update is issued for an existing to-do
- **THEN** that to-do's stored completion flag changes in Firestore and other fields are
  unchanged

#### Scenario: Update due date
- **WHEN** a due date update is issued for an existing to-do
- **THEN** that to-do's stored dueAt field changes in Firestore

#### Scenario: Delete a to-do
- **WHEN** a delete is issued for an existing to-do
- **THEN** the to-do's document is removed from Firestore

#### Scenario: Reorder persists
- **WHEN** a reorder is issued with a new ordering of all to-dos
- **THEN** each to-do's order field is updated in Firestore to match the new ordering

### Requirement: Error handling for Firestore operations
The data layer SHALL handle Firestore errors gracefully, exposing failure states to the
UI so the user knows when operations fail or the backend is unavailable.

#### Scenario: Firestore unavailable
- **WHEN** a Firestore operation fails due to network or auth issues
- **THEN** the error is captured and exposed to the UI for display
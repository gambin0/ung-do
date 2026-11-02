// Data layer for the ung-do to-do API.
// Owns the SQLite database file and exposes list/create/update/delete.
// This module is the ONLY code that opens the DB (see design.md).
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

/**
 * Open (and bootstrap) the todo database at filePath.
 * Creates the parent directory and schema on first use.
 */
export function openDb(filePath) {
  mkdirSync(dirname(filePath), { recursive: true });
  const db = new DatabaseSync(filePath);
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec(`
    CREATE TABLE IF NOT EXISTS todos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      pos INTEGER NOT NULL DEFAULT 0
    );
  `);
  migratePos(db);
  migrateDueAt(db);
  return db;
}

/**
 * Idempotent migration: databases created before `pos` existed get the column
 * added, and every existing to-do is backfilled with a dense position, newest
 * created first (pos 1) — exactly the order the old `id DESC` list showed.
 * One transaction, so a crash can never leave the table half-migrated.
 */
function migratePos(db) {
  const hasPos = db.prepare("SELECT COUNT(*) AS n FROM pragma_table_info('todos') WHERE name = 'pos'").get().n > 0;
  if (hasPos) return;
  db.exec('BEGIN');
  try {
    db.exec('ALTER TABLE todos ADD COLUMN pos INTEGER NOT NULL DEFAULT 0');
    db.prepare('UPDATE todos SET pos = (SELECT COUNT(*) FROM todos t2 WHERE t2.id > todos.id) + 1').run();
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

/**
 * Idempotent migration: databases created before `due_at` existed get the column
 * added (nullable TEXT, ISO 8601 timestamps). No backfill needed — existing todos
 * have no due date.
 */
function migrateDueAt(db) {
  const hasDueAt = db.prepare("SELECT COUNT(*) AS n FROM pragma_table_info('todos') WHERE name = 'due_at'").get().n > 0;
  if (hasDueAt) return;
  db.exec('BEGIN');
  try {
    db.exec('ALTER TABLE todos ADD COLUMN due_at TEXT');
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

function rowToTodo(row) {
  return {
    id: row.id,
    title: row.title,
    completed: !!row.completed,
    createdAt: row.created_at,
    dueAt: row.due_at,
  };
}

/** List todos. status: 'all' | 'active' | 'completed'. Position order (top first). */
export function list(db, status = 'all') {
  let rows;
  if (status === 'active') {
    rows = db.prepare('SELECT * FROM todos WHERE completed = 0 ORDER BY pos ASC').all();
  } else if (status === 'completed') {
    rows = db.prepare('SELECT * FROM todos WHERE completed = 1 ORDER BY pos ASC').all();
  } else {
    rows = db.prepare('SELECT * FROM todos ORDER BY pos ASC').all();
  }
  return rows.map(rowToTodo);
}

/** Create a todo from a trimmed title. Inserts at the top of the list. Returns null if the title is blank. */
export function create(db, title, dueAt = null) {
  const t = String(title ?? '').trim();
  if (!t) return null;
  const pos = (db.prepare('SELECT COALESCE(MIN(pos), 1) AS p FROM todos').get().p) - 1;
  const info = db.prepare('INSERT INTO todos (title, pos, due_at) VALUES (?, ?, ?)').run(t, pos, dueAt);
  const row = db.prepare('SELECT * FROM todos WHERE id = ?').get(info.lastInsertRowid);
  return rowToTodo(row);
}

/**
 * Update title, completed, and/or dueAt for an existing todo.
 * A blank title is rejected (existing title retained). Returns null if not found.
 */
export function update(db, id, { title, completed, dueAt } = {}) {
  const existing = db.prepare('SELECT * FROM todos WHERE id = ?').get(id);
  if (!existing) return null;

  let newTitle = existing.title;
  if (title !== undefined) {
    const trimmed = String(title).trim();
    if (trimmed) newTitle = trimmed; // blank -> keep existing
  }

  let newCompleted = existing.completed;
  if (completed !== undefined) newCompleted = completed ? 1 : 0;

  let newDueAt = existing.due_at;
  if (dueAt !== undefined) newDueAt = dueAt;

  db.prepare('UPDATE todos SET title = ?, completed = ?, due_at = ? WHERE id = ?').run(newTitle, newCompleted, newDueAt, id);
  const row = db.prepare('SELECT * FROM todos WHERE id = ?').get(id);
  return rowToTodo(row);
}

/**
 * Reorder: set every to-do's position to its 1-based index in `ids`, atomically.
 * `ids` must contain every existing to-do id exactly once; any missing, unknown,
 * or duplicated id leaves the stored order untouched. Returns the updated list.
 */
export function reorder(db, ids) {
  if (!Array.isArray(ids) || ids.length === 0) return null;
  const all = db.prepare('SELECT id FROM todos').all();
  const existing = new Set(all.map((r) => r.id));
  if (new Set(ids).size !== ids.length) return null; // duplicates
  if (ids.length !== existing.size) return null; // missing ids
  for (const id of ids) {
    if (typeof id !== 'number' || !Number.isInteger(id) || !existing.has(id)) return null; // unknown/bad ids
  }
  db.exec('BEGIN');
  try {
    const setPos = db.prepare('UPDATE todos SET pos = ? WHERE id = ?');
    ids.forEach((id, i) => setPos.run(i + 1, id));
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
  return list(db, 'all');
}

/** Delete a todo by id. Returns true if a row was removed. */
export function remove(db, id) {
  const info = db.prepare('DELETE FROM todos WHERE id = ?').run(id);
  return info.changes > 0;
}

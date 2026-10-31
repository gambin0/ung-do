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
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    );
  `);
  return db;
}

function rowToTodo(row) {
  return {
    id: row.id,
    title: row.title,
    completed: !!row.completed,
    createdAt: row.created_at,
  };
}

/** List todos. status: 'all' | 'active' | 'completed'. Newest first. */
export function list(db, status = 'all') {
  let rows;
  if (status === 'active') {
    rows = db.prepare('SELECT * FROM todos WHERE completed = 0 ORDER BY id DESC').all();
  } else if (status === 'completed') {
    rows = db.prepare('SELECT * FROM todos WHERE completed = 1 ORDER BY id DESC').all();
  } else {
    rows = db.prepare('SELECT * FROM todos ORDER BY id DESC').all();
  }
  return rows.map(rowToTodo);
}

/** Create a todo from a trimmed title. Returns null if the title is blank. */
export function create(db, title) {
  const t = String(title ?? '').trim();
  if (!t) return null;
  const info = db.prepare('INSERT INTO todos (title) VALUES (?)').run(t);
  const row = db.prepare('SELECT * FROM todos WHERE id = ?').get(info.lastInsertRowid);
  return rowToTodo(row);
}

/**
 * Update title and/or completed for an existing todo.
 * A blank title is rejected (existing title retained). Returns null if not found.
 */
export function update(db, id, { title, completed } = {}) {
  const existing = db.prepare('SELECT * FROM todos WHERE id = ?').get(id);
  if (!existing) return null;

  let newTitle = existing.title;
  if (title !== undefined) {
    const trimmed = String(title).trim();
    if (trimmed) newTitle = trimmed; // blank -> keep existing
  }

  let newCompleted = existing.completed;
  if (completed !== undefined) newCompleted = completed ? 1 : 0;

  db.prepare('UPDATE todos SET title = ?, completed = ? WHERE id = ?').run(newTitle, newCompleted, id);
  const row = db.prepare('SELECT * FROM todos WHERE id = ?').get(id);
  return rowToTodo(row);
}

/** Delete a todo by id. Returns true if a row was removed. */
export function remove(db, id) {
  const info = db.prepare('DELETE FROM todos WHERE id = ?').run(id);
  return info.changes > 0;
}

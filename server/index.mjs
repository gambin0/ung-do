// Minimal HTTP API for the ung-do to-do app.
// Zero dependencies: node:http + node:sqlite. Binds to loopback only.
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDb, list, create, update, remove, reorder } from './db.mjs';

const HOST = '0.0.0.0';
const PORT = Number(process.env.PORT || 3000);
const DB_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)), 'data', 'ung-do.db');

const db = openDb(DB_PATH);

function sendJson(res, code, body) {
  const payload = JSON.stringify(body);
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(payload);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => { data += c; });
    req.on('end', () => {
      if (!data) return resolve({});
      try { resolve(JSON.parse(data)); } catch { reject(new Error('invalid JSON')); }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host ?? HOST}`);
  const m = url.pathname.match(/^\/api\/todos(?:\/(\d+))?$/);
  const isOrder = url.pathname === '/api/todos/order';

  try {
    // Only /api/todos, /api/todos/order, and /api/todos/:id are served.
    if (!m && !isOrder) return sendJson(res, 404, { error: 'not found' });
    const id = m?.[1] ? Number(m[1]) : null;

    if (req.method === 'PUT' && isOrder) {
      const body = await readBody(req);
      const updated = reorder(db, body?.ids);
      if (!updated) return sendJson(res, 400, { error: 'ids must be a list containing every to-do id exactly once' });
      return sendJson(res, 200, { ok: true });
    }

    if (req.method === 'GET' && id === null) {
      const status = url.searchParams.get('status') ?? 'all';
      if (!['all', 'active', 'completed'].includes(status)) {
        return sendJson(res, 400, { error: "status must be 'all', 'active', or 'completed'" });
      }
      return sendJson(res, 200, { todos: list(db, status) });
    }

    if (req.method === 'POST' && id === null) {
      const body = await readBody(req);
      const todo = create(db, body.title, body.dueAt);
      if (!todo) return sendJson(res, 400, { error: 'title is required' });
      return sendJson(res, 201, { todo });
    }

    if (req.method === 'PATCH' && id !== null) {
      const body = await readBody(req);
      const todo = update(db, id, body);
      if (!todo) return sendJson(res, 404, { error: 'todo not found' });
      return sendJson(res, 200, { todo });
    }

    if (req.method === 'DELETE' && id !== null) {
      const deleted = remove(db, id);
      if (!deleted) return sendJson(res, 404, { error: 'todo not found' });
      res.writeHead(204);
      return res.end();
    }

    return sendJson(res, 405, { error: 'method not allowed' });
  } catch (err) {
    return sendJson(res, err.message === 'invalid JSON' ? 400 : 500, { error: err.message });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`[ung-do api] listening on http://${HOST}:${PORT} (db: ${DB_PATH})`);
});

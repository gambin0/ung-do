#!/usr/bin/env node
// Manual API test script for the dueAt field.
// Run with: node test-api.mjs
// Assumes the API server is running on http://localhost:3000

const BASE = 'http://localhost:3000/api/todos';

async function request(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(`${method} ${path} -> ${res.status}: ${JSON.stringify(data)}`);
  }
  return data;
}

async function test() {
  let passed = 0;
  let failed = 0;

  try {
    // 1. List todos
    console.log('1. GET /api/todos');
    const list = await request('GET', '');
    console.log(`   ✓ Got ${list.todos.length} todos`);
    passed++;

    // 2. Create todo without dueAt
    console.log('2. POST /api/todos (no dueAt)');
    const todo1 = await request('POST', '', { title: 'Test without due date' });
    console.log(`   ✓ Created todo ${todo1.todo.id}, dueAt: ${todo1.todo.dueAt}`);
    if (todo1.todo.dueAt !== null && todo1.todo.dueAt !== undefined) {
      throw new Error('Expected dueAt to be null/undefined');
    }
    passed++;

    // 3. Create todo with dueAt
    const futureDate = new Date(Date.now() + 3600000).toISOString();
    console.log('3. POST /api/todos (with dueAt)');
    const todo2 = await request('POST', '', { title: 'Test with due date', dueAt: futureDate });
    console.log(`   ✓ Created todo ${todo2.todo.id}, dueAt: ${todo2.todo.dueAt}`);
    if (!todo2.todo.dueAt) {
      throw new Error('Expected dueAt to be set');
    }
    passed++;

    // 4. Update todo with new dueAt
    const newDueDate = new Date(Date.now() + 7200000).toISOString();
    console.log('4. PATCH /api/todos/:id (update dueAt)');
    const updated = await request('PATCH', `/${todo2.todo.id}`, { dueAt: newDueDate });
    console.log(`   ✓ Updated dueAt to: ${updated.todo.dueAt}`);
    if (updated.todo.dueAt !== newDueDate) {
      throw new Error('dueAt not updated correctly');
    }
    passed++;

    // 5. Clear dueAt
    console.log('5. PATCH /api/todos/:id (clear dueAt)');
    const cleared = await request('PATCH', `/${todo2.todo.id}`, { dueAt: null });
    console.log(`   ✓ Cleared dueAt: ${cleared.todo.dueAt}`);
    if (cleared.todo.dueAt !== null) {
      throw new Error('dueAt not cleared');
    }
    passed++;

    // 6. Verify in list
    console.log('6. GET /api/todos (verify dueAt in list)');
    const list2 = await request('GET', '');
    const found = list2.todos.find(t => t.id === todo2.todo.id);
    console.log(`   ✓ Found todo in list, dueAt: ${found.dueAt}`);
    passed++;

    // Cleanup: delete test todos
    console.log('7. Cleanup');
    await fetch(`${BASE}/${todo1.todo.id}`, { method: 'DELETE' });
    await fetch(`${BASE}/${todo2.todo.id}`, { method: 'DELETE' });
    console.log('   ✓ Deleted test todos');
    passed++;

  } catch (err) {
    console.error(`   ✗ ${err.message}`);
    failed++;
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

test();

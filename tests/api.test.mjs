import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const port = 8123;
const db = path.join(os.tmpdir(), `ledgerlens-test-${Date.now()}.json`);
const app = spawn(process.execPath, ['server.mjs'], { env: { ...process.env, PORT: String(port), DB_FILE: db } });
await new Promise(resolve => setTimeout(resolve, 400));
const call = async (pathName, options = {}) => {
  const response = await fetch(`http://localhost:${port}${pathName}`, { headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }, ...options });
  return { status: response.status, body: await response.json() };
};
test('employee submits and admin approves a receipt', async () => {
  const employee = await call('/api/login', { method: 'POST', body: JSON.stringify({ username: 'employee', password: 'emp123' }) });
  assert.equal(employee.status, 200); assert.equal(employee.body.password, undefined);
  const receipt = await call('/api/receipts', { method: 'POST', headers: { Authorization: `Bearer ${employee.body.token}` }, body: JSON.stringify({ vendor: 'Grab Malaysia', invoiceNumber: 'TEST-1', total: 38.5, category: 'Travel & Transport' }) });
  assert.equal(receipt.status, 201); assert.equal(receipt.body.status, 'pending');
  const admin = await call('/api/login', { method: 'POST', body: JSON.stringify({ username: 'admin', password: 'admin123' }) });
  const queue = await call('/api/receipts', { headers: { Authorization: `Bearer ${admin.body.token}` } });
  assert.equal(queue.body.length, 1);
  const approved = await call(`/api/receipts/${receipt.body.id}`, { method: 'PATCH', headers: { Authorization: `Bearer ${admin.body.token}` }, body: JSON.stringify({ status: 'approved', risk: 'approved' }) });
  assert.equal(approved.body.status, 'approved');
  const notifications = await call('/api/notifications', { headers: { Authorization: `Bearer ${employee.body.token}` } });
  assert.match(notifications.body[0].message, /已审核并入账/);
});
test.after(async () => { app.kill(); await fs.rm(db, { force: true }); });

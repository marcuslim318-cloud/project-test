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

const login = async (username, password) => call('/api/login', { method: 'POST', body: JSON.stringify({ username, password }) });
const submit = async (token, payload) => call('/api/receipts', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) });

test('登录 API 绝不返回任何账号的密码', async () => {
  for (const [username, password] of [['admin', 'admin123'], ['finance', 'fin123'], ['employee', 'emp123'], ['staff2', 'staff123']]) {
    const res = await login(username, password);
    assert.equal(res.status, 200);
    assert.equal(res.body.password, undefined);
    assert.equal('password' in res.body, false);
    assert.equal(res.body.username, username);
  }
  const bad = await login('admin', 'wrong-password');
  assert.equal(bad.status, 401);
});

test('正常收据：提交 → 管理员从 /api/receipts 读取全部待审核 → 批准入账 → 员工通知', async () => {
  const employee = await login('employee', 'emp123');
  const receipt = await submit(employee.body.token, {
    vendor: 'Petronas Station', date: '2026-08-12', invoiceNumber: 'PET-8812', total: 120, tax: 0,
    currency: 'MYR', category: 'Travel & Transport', confidence: 95, myinvoisStatus: 'Reference detected',
  });
  assert.equal(receipt.status, 201);
  assert.equal(receipt.body.status, 'pending');
  assert.equal(receipt.body.risk, 'approved');

  const admin = await login('admin', 'admin123');
  const queue = await call('/api/receipts', { headers: { Authorization: `Bearer ${admin.body.token}` } });
  assert.equal(queue.status, 200);
  const pending = queue.body.filter(r => r.status === 'pending');
  assert.equal(pending.some(r => r.id === receipt.body.id), true);

  const approved = await call(`/api/receipts/${receipt.body.id}`, { method: 'PATCH', headers: { Authorization: `Bearer ${admin.body.token}` }, body: JSON.stringify({ status: 'approved', risk: 'approved' }) });
  assert.equal(approved.body.status, 'approved');

  const notifications = await call('/api/notifications', { headers: { Authorization: `Bearer ${employee.body.token}` } });
  assert.match(notifications.body[0].message, /已审核并入账/);
});

test('重复收据：同一收据号再次提交会被标记为重复并待复核', async () => {
  const employee = await login('employee', 'emp123');
  const base = { vendor: 'Grab Malaysia', date: '2026-08-11', invoiceNumber: 'GRAB-28491', total: 38.5, tax: 0, currency: 'MYR', category: 'Travel & Transport', confidence: 96, myinvoisStatus: 'Reference detected' };
  const first = await submit(employee.body.token, base);
  assert.equal(first.body.risk, 'approved');
  const duplicate = await submit(employee.body.token, base);
  assert.equal(duplicate.status, 201);
  assert.equal(duplicate.body.risk, 'review');
  assert.match(duplicate.body.riskReason, /重复收据/);
  assert.equal(duplicate.body.checks.some(c => c.type === 'bad' && /重复/.test(c.label)), true);
});

test('模糊/缺失 MyInvois 信息：低置信度或信息缺失的高风险收据被标记待复核', async () => {
  const employee = await login('employee', 'emp123');
  const fuzzy = await submit(employee.body.token, {
    vendor: 'Unreadable MiniMart', date: '', invoiceNumber: '', total: 45.9, tax: 0,
    currency: 'MYR', category: 'Other Expenses', confidence: 41, myinvoisStatus: '',
  });
  assert.equal(fuzzy.status, 201);
  assert.equal(fuzzy.body.risk, 'review');
  assert.match(fuzzy.body.riskReason, /MyInvois/);
  assert.match(fuzzy.body.riskReason, /关键信息不完整/);
  assert.match(fuzzy.body.riskReason, /置信度/);
  assert.equal(fuzzy.body.checks.some(c => c.type === 'bad'), true);

  const admin = await login('admin', 'admin123');
  const queue = await call('/api/receipts', { headers: { Authorization: `Bearer ${admin.body.token}` } });
  assert.equal(queue.body.filter(r => r.status === 'pending' && r.id === fuzzy.body.id).length, 1);
});

test.after(async () => { app.kill(); await fs.rm(db, { force: true }); });

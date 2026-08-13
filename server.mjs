import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const dbFile = process.env.DB_FILE || path.join(root, 'data.json');
const sessions = new Map();
const accounts = {
  admin: { password: 'admin123', role: 'admin', name: 'Aina' },
  finance: { password: 'fin123', role: 'admin', name: 'Finance Admin' },
  employee: { password: 'emp123', role: 'employee', name: '员工' },
  staff2: { password: 'staff123', role: 'employee', name: '员工 2' },
};

async function readDb() {
  try { return JSON.parse(await fs.readFile(dbFile, 'utf8')); }
  catch { return { receipts: [], notifications: [] }; }
}
async function writeDb(db) { await fs.writeFile(dbFile, JSON.stringify(db, null, 2)); }
function send(res, status, data, type = 'application/json') {
  res.writeHead(status, { 'Content-Type': type, 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' });
  res.end(type === 'application/json' ? JSON.stringify(data) : data);
}
async function body(req) { let text = ''; for await (const chunk of req) text += chunk; return text ? JSON.parse(text) : {}; }
function userFrom(req) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  return token ? sessions.get(token) : null;
}
function requireUser(req, res) {
  const user = userFrom(req);
  if (!user) { send(res, 401, { error: '请先登录。' }); return null; }
  return user;
}
function requireAdmin(req, res) {
  const user = requireUser(req, res);
  if (!user) return null;
  if (user.role !== 'admin') { send(res, 403, { error: '只有管理员可以执行此操作。' }); return null; }
  return user;
}
function notify(db, to, type, message) {
  db.notifications.unshift({ id: crypto.randomUUID(), to, type, message, createdAt: new Date().toISOString(), read: false });
}
function evaluateRisk(input, existing) {
  const checks = [];
  const total = Number(input.total);
  const tax = Number(input.tax || 0);
  const totalMathOk = !Number.isNaN(total) && (total - tax) >= 0;
  checks.push({ label: totalMathOk ? '金额计算一致' : '金额与税额匹配待复核', type: totalMathOk ? 'ok' : 'warn' });
  const inv = String(input.invoiceNumber || '').trim();
  const dup = existing.find(r => r.status !== 'rejected' && String(r.invoiceNumber || '').trim().toLowerCase() === inv.toLowerCase() && inv);
  checks.push({ label: dup ? `发现重复收据：${dup.invoiceNumber}（${dup.uploadedByName || dup.uploadedBy} 已提交）` : '未发现重复收据', type: dup ? 'bad' : 'ok' });
  const confidence = Number(input.confidence ?? 0) || 0;
  const myinvoisRaw = String(input.myinvoisStatus || '').toLowerCase();
  const myInvoisVerified = /(uuid|reference|detected|valid)/.test(myinvoisRaw);
  checks.push({ label: myInvoisVerified ? 'MyInvois 信息已识别' : 'MyInvois 无 UUID/参考号，需保留凭证', type: myInvoisVerified ? 'ok' : 'warn' });
  const missing = [];
  if (!input.vendor) missing.push('商户');
  if (!inv) missing.push('收据号');
  if (Number.isNaN(total) || total <= 0) missing.push('金额');
  if (!input.date) missing.push('日期');
  if (missing.length) checks.push({ label: `缺失关键字段：${missing.join('、')}`, type: 'bad' });
  const lowConf = confidence > 0 && confidence < 70;
  if (lowConf) checks.push({ label: `AI 置信度低（${confidence}%）`, type: 'warn' });

  let risk = 'approved';
  const reasons = [];
  if (dup) { risk = 'review'; reasons.push('系统检测到重复收据，需人工确认是否存在重复报销。'); }
  if (missing.length) { risk = 'review'; reasons.push(`关键信息不完整（${missing.join('、')}），无法可靠核对。`); }
  if (lowConf) { risk = 'review'; reasons.push(`AI 置信度仅 ${confidence}%，建议人工复核。`); }
  if (!myInvoisVerified && !dup) { risk = 'review'; reasons.push('收据未包含可验证的 MyInvois UUID，需保留原件后核对有效性。'); }
  if (risk === 'approved') reasons.unshift('金额、字段与历史记录核对一致，可正常入账。');
  return { risk, riskReason: reasons.join(' '), checks };
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'OPTIONS') return send(res, 204, '');
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (url.pathname === '/api/login' && req.method === 'POST') {
      const { username, password } = await body(req);
      const account = accounts[username];
      if (!account || account.password !== password) return send(res, 401, { error: '账号或密码不正确。' });
      const token = crypto.randomUUID();
      const user = { username, role: account.role, name: account.name };
      sessions.set(token, user);
      return send(res, 200, { ...user, token });
    }
    if (url.pathname === '/api/accounts' && req.method === 'GET') {
      const user = requireUser(req, res); if (!user) return;
      return send(res, 200, Object.entries(accounts).map(([username, a]) => ({ username, role: a.role, name: a.name })));
    }
    if (url.pathname === '/api/logout' && req.method === 'POST') {
      sessions.delete(req.headers.authorization?.replace('Bearer ', ''));
      return send(res, 200, { ok: true });
    }
    if (url.pathname === '/api/receipts' && req.method === 'GET') {
      const user = requireUser(req, res); if (!user) return;
      const db = await readDb();
      const receipts = user.role === 'admin' ? db.receipts : db.receipts.filter(r => r.uploadedBy === user.username);
      return send(res, 200, receipts);
    }
    if (url.pathname === '/api/receipts' && req.method === 'POST') {
      const user = requireUser(req, res); if (!user) return;
      const input = await body(req);
      const db = await readDb();
      const evaluated = evaluateRisk(input, db.receipts);
      const receipt = { ...input, ...evaluated, id: crypto.randomUUID(), uploadedBy: user.username, uploadedByName: user.name, status: 'pending', createdAt: new Date().toISOString() };
      db.receipts.unshift(receipt);
      notify(db, 'admin', 'new_receipt', `${user.name} 提交了一张新收据待审核。`);
      await writeDb(db);
      return send(res, 201, receipt);
    }
    if (url.pathname.startsWith('/api/receipts/') && req.method === 'PATCH') {
      const user = requireAdmin(req, res); if (!user) return;
      const id = url.pathname.split('/').pop();
      const input = await body(req); const db = await readDb();
      const receipt = db.receipts.find(r => r.id === id);
      if (!receipt) return send(res, 404, { error: '找不到收据。' });
      if (!['approved', 'rejected'].includes(input.status)) return send(res, 400, { error: '审核状态无效。' });
      Object.assign(receipt, { status: input.status, risk: input.risk, reason: input.reason || '', reviewedBy: user.username, updatedAt: new Date().toISOString(), postedAt: input.postedAt || null });
      notify(db, receipt.uploadedBy, input.status === 'approved' ? 'posted' : 'rejected', input.status === 'approved' ? `你的收据 ${receipt.invoiceNumber || ''} 已审核并入账。` : `你的收据 ${receipt.invoiceNumber || ''} 未通过审核：${receipt.reason || '请联系管理员。'}`);
      await writeDb(db); return send(res, 200, receipt);
    }
    if (url.pathname === '/api/notifications' && req.method === 'GET') {
      const user = requireUser(req, res); if (!user) return;
      const db = await readDb(); const target = user.role === 'admin' ? 'admin' : user.username;
      return send(res, 200, db.notifications.filter(n => n.to === target));
    }
    if (url.pathname === '/api/notifications/read' && req.method === 'POST') {
      const user = requireUser(req, res); if (!user) return;
      const db = await readDb(); const target = user.role === 'admin' ? 'admin' : user.username;
      db.notifications.filter(n => n.to === target).forEach(n => n.read = true);
      await writeDb(db); return send(res, 200, { ok: true });
    }
    const requested = url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname.slice(1));
    const file = path.resolve(root, requested);
    if (!file.startsWith(root)) return send(res, 403, { error: '禁止访问。' });
    const data = await fs.readFile(file);
    const type = file.endsWith('.html') ? 'text/html; charset=utf-8' : file.endsWith('.js') ? 'text/javascript; charset=utf-8' : 'text/css; charset=utf-8';
    return send(res, 200, data, type);
  } catch (error) { return send(res, 500, { error: error.message }); }
});
const port = Number(process.env.PORT || 8000);
server.listen(port, () => console.log(`LedgerLens running at http://localhost:${port}`));

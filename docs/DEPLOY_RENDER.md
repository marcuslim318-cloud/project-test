# 部署到 Render（免费 · 公开网址）

> **本项目已部署**：https://ledgerlens-ai-p819.onrender.com （免费实例，闲置 15 分钟会休眠，首次访问需醒 30–60 秒）

LedgerLens AI 是前后端一体的 Node 应用（登录、收据、审核都走 `server.mjs` 的 API），因此要用**能运行 Node 的服务**才能得到“可正常运作”的公网链接。这里用 Render 免费版，约 5–10 分钟。

> 为什么不用 GitHub Pages？Pages 只能托管静态文件，`/api/*` 后端不会运行，登录和审核会失败。

## 方式 A：Blueprint 自动部署（推荐，用仓库里的 `render.yaml`）

1. 把仓库推到 GitHub（本文档所在分支已包含 `render.yaml`）。
2. 打开 **https://dashboard.render.com/blueprints**（用 GitHub 账号登录）。
3. 点 **New + / New Blueprint Instance** → 授权并选择仓库 `marcuslim318-cloud/project-test`，分支选 `main`。
4. Render 读到 `render.yaml`，自动创建名为 `ledgerlens-ai` 的 Web Service（免费实例）。
5. 首次部署完成后，会得到如 `https://ledgerlens-ai.onrender.com` 的公网地址。

## 方式 B：手动创建 Web Service

1. Render 首页 → **New + → Web Service** → 连接本 GitHub 仓库。
2. 填写：
   - **Name**: `ledgerlens-ai`
   - **Runtime**: `Node`
   - **Branch**: `main`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.mjs`
   - **Instance Type**: `Free`
3. **Advanced** → Health Check Path: `/`。
4. 点 **Create Web Service**，等待构建完成（约 1–3 分钟）。

## 部署后检查

1. 打开返回的 `https://xxx.onrender.com`，应看到登录页。
2. 用 `admin / admin123` 登录 → 审核中心从 `/api/receipts` 读取单据；用 `employee / emp123` 上传演示收据 → 管理员获批后员工收到通知。
3.（可选）在额外终端跑 `node --test tests/api.test.mjs` 验证 7 个用例。

## 你要知道的限制（诚实声明）

- **数据不持久**：免费实例使用临时磁盘，`data.json` 在每次重启/重新部署后会清空。比赛演示够用；生产版应接 Supabase/PostgreSQL（见 `docs/IMPLEMENTATION_PLAN.md` 与 `docs/TECHNICAL_DESIGN.md`）。
- **免费实例闲置 15 分钟会休眠**：第一次访问可能需要 30–60 秒“唤醒”，之后正常。评审演示前建议先点开一次。
- **WhatsApp / MyInvois 仍是模拟接入**：部署后的公网版本同样不调用任何真实 Meta/LHDN API，UI 与 README 的边界声明不变。
- NODE_VERSION 由 `render.yaml` 固定为 22；也可在项目根放 `.node-version` 或依赖 `package.json` 的 `engines.node`。

## 本地等价命令（无部署时验证同样行为）

```powershell
node server.mjs
# → http://localhost:8000
```
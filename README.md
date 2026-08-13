# LedgerLens AI

> 把一张收据，变成可追溯的财务决策。

[![test](https://github.com/marcuslim318-cloud/project-test/actions/workflows/test.yml/badge.svg)](https://github.com/marcuslim318-cloud/project-test/actions/workflows/test.yml)

LedgerLens AI 是面向马来西亚小微企业的 AI 财务闭环原型。员工上传收据，AI 提取关键字段；系统检查风险；管理员审核后生成可追溯的分录，并更新管理报表。

## 代码仓库

GitHub：<https://github.com/marcuslim318-cloud/project-test/tree/main>

比赛提交物均在本仓库 `beginner/` 目录下：README、`docs/` 说明文档、`tests/` 可复现测试、`pptx_build/make_deck.mjs`（PPT 生成脚本）与生成的 `LedgerLens_AI_pitch.pptx`、Demo 视频脚本 `docs/DEMO_VIDEO_SCRIPT.md`。

## 已完成

- 员工、管理员、财务管理员的角色隔离
- Gemini 多模态收据识别（真实 API Key 可选）
- 演示收据模式，保证无 Key 时也能复现 Demo
- 后端登录、Token 鉴权、共享收据审核队列（管理员工作台真实从 `/api/receipts` 读取全部待审核单据）
- 后端规则引擎：重复收据、金额/税额校验、低置信度、缺失 MyInvois 信息自动标记待复核
- 登录 API 只返回 `username / role / name / token`，绝不返回密码
- 员工端「我的收据」：查看每张单据的审核状态与被拒原因，修正后可重新提交
- 凭证哈希（SHA-256）存证：上传真实收据时保存图片指纹，支撑审计轨迹
- 员工和管理员的状态通知
- 管理报表、总账审计轨迹与 AI 摘要
- WhatsApp Business 模拟入口：点击按钮会通过 `/api/receipts` 真实创建一张演示单据进入审核队列（但不发起任何真实 Meta API 调用）
- GitHub Actions CI：推送即运行全部集成测试
- 三种演示数据：正常单据 / 低置信度 / 重复单据，一键演示不同风险场景
- 管理员「数据管理」页：查看数据量并清空全部演示数据（仅管理员可用，`POST /api/admin/reset`）

## 本地运行

要求：Node.js 20+。

```powershell
npm start
```

打开 `http://localhost:8000`。

**公网演示入口（已部署）**：<https://ledgerlens-ai-p819.onrender.com> —— 可直接打开演示，无需本地运行。部署与维护说明见 [部署到 Render](docs/DEPLOY_RENDER.md)。

如果系统没有 Node，可使用 Codex 附带运行时：

```powershell
& 'C:\Users\User\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' server.mjs
```

## 演示账号

| 角色 | 账号 | 密码 | 能力 |
|---|---|---|---|
| 管理员 | `admin` | `admin123` | 审核、入账、报表、AI/WhatsApp 设置 |
| 财务管理员 | `finance` | `fin123` | 与管理员相同，供比赛展示职责分工 |
| 员工 | `employee` | `emp123` | 上传并查看自己的状态 |
| 员工 2 | `staff2` | `staff123` | 上传并查看自己的状态 |

## 可复现 Demo

系统启动后自动落库到 `data.json`。若无该文件会自动创建空库，不会破解演示路径。

1. 清空/删除 `data.json` 以获得干净数据，然后 `npm start`。
2. 用 `employee` 登录，在「上传收据」页选择演示数据：**正常单据**、**置信度低** 或 **重复单据**（均无需 API Key）。
3. 系统显示“已提交，管理员会收到通知”。
4. 退出并用 `admin` 登录；**审核中心会列出 `/api/receipts` 中的全部待审核单据**，点击任意一张查看识别结果、风险与建议分录。
5. 点击「确认并入账」，再用员工账号在「我的收据」页查看“已审核并入账”状态。
6. 风险场景演示：先提交「正常单据」，再提交「重复单据」→ 后端规则引擎标记“重复收据”并进入待复核；「置信度低」单据自动待复核。
7. 管理员在「数据管理」页可一键清空全部演示数据，复位后重新演示。

## 可复现测试

```powershell
npm test
```

共 7 个集成测试，全部只依赖 Node 内置测试框架与 `fetch`，不依赖网络或外部密钥：

1. **登录安全**：`admin / finance / employee / staff2` 四个账号登录后，响应中都不包含密码字段；错误密码返回 401。
2. **正常收据**：员工提交 → 管理员调用 `GET /api/receipts` 读取全部待审核单据 → 批准入账 → 员工收到“已审核并入账”通知。
3. **重复收据**：相同收据号再次提交时，后端规则引擎标记 `risk: review`、风险原因包含“重复收据”，并在检查项中给出 `bad` 类型的重复提示。
4. **模糊/缺失 MyInvois 信息的高风险收据**：低置信度（41%）、缺失收据号与日期、MyInvois 状态为空时，自动标记 `risk: review`，风险原因同时指出“MyInvois 无 UUID / 关键信息不完整 / 置信度低”。
5. **WhatsApp 模拟收据真实入队**：与页面「模拟收到一张收据」按钮相同的 POST 路径，提交后管理员能从 `/api/receipts` 读到该待审核单据。
6. **凭证哈希存证**：带 `imageHash`（SHA-256）提交时，该值会被持久化保存。
7. **管理员重置**：`employee` 调用 `POST /api/admin/reset` 被拒 403；`admin` 调用后全部收据被清空。

## 架构

```text
Web UI → Node.js API → JSON demo database → shared review queue
                   ├→ Gemini API (receipt extraction)
                   ├→ MyInvois / LHDN API (planned)
                   └→ WhatsApp Cloud API (planned)
```

详情见 [技术方案](docs/TECHNICAL_DESIGN.md)、[落地计划](docs/IMPLEMENTATION_PLAN.md) 和 [视频脚本](docs/DEMO_VIDEO_SCRIPT.md)。

## 当前边界

这不是报税或正式审计系统。MPERS/MFRS 正式财务报表须由会计师审核；MyInvois 的法律有效性以 LHDN/MyInvois 官方结果为准。WhatsApp 和 MyInvois 页面当前为可演示的集成设计，尚未发起真实的 Meta/LHDN API 调用。

当前比赛版本的 Gemini Key 由浏览器输入，仅用于本地演示。生产版应把 AI 调用改为后端代理，并使用 Secret Manager、加密对象存储、企业身份认证和数据库审计日志。

## 开源协议

本项目采用 [MIT License](LICENSE)。

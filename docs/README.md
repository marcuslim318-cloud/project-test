# 参赛交付物清单

> 代码仓库：<https://github.com/marcuslim318-cloud/project-test/tree/main>
> 开源协议：[MIT License](../LICENSE)

| 交付物 | 位置 | 状态 |
|---|---|---|
| 项目介绍 | `docs/PROJECT_INTRO.md` | 完成 |
| 技术方案 | `docs/TECHNICAL_DESIGN.md` | 完成 |
| 代码仓库 | GitHub（本目录全部代码） | 完成 |
| Demo 视频 | 脚本+分镜+录屏步骤见 `docs/DEMO_VIDEO_SCRIPT.md`；正片按脚本录制 | 脚本完成 |
| 开源协议说明 | `LICENSE` + README「开源协议」 | 完成 |
| 项目落地计划 | `docs/IMPLEMENTATION_PLAN.md` | 完成 |
| 可复现测试 | `tests/api.test.mjs`（7 个用例，`npm test`） | 完成 |
| 最新网页 | `index.html` / `app.js` / `server.mjs` / `styles.css` | 完成 |
| 公网演示入口 | <https://ledgerlens-ai-p819.onrender.com>（部署说明 `docs/DEPLOY_RENDER.md`） | 完成 |
| 最新 PPT | `LedgerLens_AI_pitch.pptx`（由 `ppt_build/make_deck.mjs` 生成） | 完成 |
| 运行说明/演示账号/已知限制 | `README.md` | 完成 |

## 边界声明（重要）

- **WhatsApp / MyInvois 均为模拟接入**：当前原型不发起任何真实 Meta Cloud API 或 LHDN API 调用，UI 与 PPT 已明确标注“模拟/演示/待配置”。
- 管理报表非正式 MPERS/MFRS 财报，正式报表须由会计师审核。
- 比赛版 Gemini Key 由浏览器输入，仅用于本地演示；生产版必须改为后端代理 + Secret Manager + 加密存储。

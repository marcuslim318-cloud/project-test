# LedgerLens AI

> 把一张收据，变成可追溯的财务决策。

LedgerLens AI 是面向马来西亚小微企业的 AI 财务闭环原型。员工上传收据，AI 提取关键字段；系统检查风险；管理员审核后生成可追溯的分录，并更新管理报表。

## 已完成

- 员工、管理员、财务管理员的角色隔离
- Gemini 多模态收据识别（真实 API Key 可选）
- 演示收据模式，保证无 Key 时也能复现 Demo
- 后端登录、Token 鉴权、共享收据审核队列
- 重复/异常风险提示、人工批准或拒绝原因
- 员工和管理员的状态通知
- 管理报表、总账审计轨迹与 AI 摘要
- WhatsApp Business 的模拟入口与生产接入路线

## 本地运行

要求：Node.js 20+。

```powershell
npm start
```

打开 `http://localhost:8000`。

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

1. 用 `employee` 登录，选择「使用演示收据」。
2. 系统显示“已提交，管理员会收到通知”。
3. 退出并用 `admin` 登录；审核中心会从后端共享队列读取这张收据。
4. 点击「确认并入账」，再用员工账号重新登录查看“已审核并入账”通知。
5. 重复提交同一张演示收据，展示风险提示；也可在 WhatsApp 页面点击模拟消息。

## 测试

```powershell
npm test
```

测试会验证：不返回密码、员工提交、管理员读取共享队列、管理员批准及员工通知。

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

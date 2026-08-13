# 技术方案

代码仓库：<https://github.com/marcuslim318-cloud/project-test/tree/main>

## 当前比赛架构

```text
Browser UI → Node.js HTTP API → data.json
                ↓                 ↓
          Token / role check   receipts + notifications
                ↓
       Gemini generateContent (optional local demo)
```

后端 API：`/api/login`、`/api/receipts`、`/api/accounts`、`/api/notifications`。员工只能创建或读取自己的收据；管理员可读取全部队列并执行批准/拒绝。每次审批都会写入员工通知。

`POST /api/receipts` 的后端规则引擎对每张新单据做确定性判定（不依赖前端），保证测试可复现：

- **重复检测**：相同收据号在非拒绝单据中再次出现 → `risk: review` + `bad` 检查项。
- **金额校验**：`金额 − 税额 < 0` 或金额非法 → `warn` 检查项。
- **信息完整性**：缺失商户/收据号/金额/日期 → `risk: review` + `bad` 检查项。
- **MyInvois 校验**：`myinvoisStatus` 无 UUID/Reference/Valid 等字样 → `risk: review`（当前为状态字面量模拟，不会调用 LHDN）。
- **置信度**：AI 置信度低于 70 → `risk: review`。

## AI 方案

Gemini 接收图片及受限 JSON schema 提示词，返回供应商、日期、金额、税额、类别、置信度及风险建议。当前比赛版本的 API Key 由浏览器输入，仅用于本地演示；生产版应把 AI 调用改为后端代理，低置信度、重复或异常单据必须人工审核。

## 集成边界（避免夸大）

- **WhatsApp**：页面「模拟收到一张收据」按钮会通过 `/api/receipts` **真实创建一张演示单据**进入审核队列，以此模拟"WhatsApp → 同一队列"的链路；但 Webhook `/api/whatsapp/webhook` 未实现，不发起任何真实 Meta Cloud API 调用。
- **MyInvois / LHDN**：当前仅用 `myinvoisStatus` 字段做字面量规则判定；TIN/UUID/文件 Valid-Cancelled 状态查询属于生产路线，未接入官方 API。

## 凭证存证

上传真实收据时，前端计算图片内容的 SHA-256（`imageHash`）随单据保存；数据仅存字段与哈希，演示版不保存原件图片。生产版应在加密对象存储保存原件并记录存储路径与哈希。

## 生产演进

- PostgreSQL/Supabase：多租户企业、用户、收据、分录、审计日志。
- Object Storage：加密保存原始凭证与图片哈希。
- MyInvois/LHDN：后端查询 TIN、UUID、文件及 Valid/Cancelled 状态。
- WhatsApp Cloud API：HTTPS Webhook 收图，使用 media ID 下载图片、入队并自动回复。
- 安全：OAuth/SSO、RBAC、Secret Manager、速率限制、日志和数据留存策略。

# 技术方案

## 当前比赛架构

```text
Browser UI → Node.js HTTP API → data.json
                ↓                 ↓
          Token / role check   receipts + notifications
                ↓
       Gemini generateContent (optional local demo)
```

后端 API：`/api/login`、`/api/receipts`、`/api/notifications`。员工只能创建或读取自己的收据；管理员可读取全部队列并执行批准/拒绝。每次审批都会写入员工通知。

## AI 方案

Gemini 接收图片及受限 JSON schema 提示词，返回供应商、日期、金额、税额、类别、置信度及风险建议。后续将把 API Key 移至后端；低置信度、重复或异常单据必须人工审核。

## 生产演进

- PostgreSQL/Supabase：多租户企业、用户、收据、分录、审计日志。
- Object Storage：加密保存原始凭证与图片哈希。
- MyInvois/LHDN：后端查询 TIN、UUID、文件及 Valid/Cancelled 状态。
- WhatsApp Cloud API：HTTPS Webhook 收图，使用 media ID 下载图片、入队并自动回复。
- 安全：OAuth/SSO、RBAC、Secret Manager、速率限制、日志和数据留存策略。

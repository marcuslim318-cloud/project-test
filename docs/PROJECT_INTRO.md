# 项目介绍

代码仓库：<https://github.com/marcuslim318-cloud/project-test/tree/main>

LedgerLens AI 服务马来西亚小微企业“收据很多、财务人手少、老板看不到实时经营数据”的场景。员工上传收据或未来通过 WhatsApp 发送图片；AI 提取字段并推荐费用分类；规则引擎检查重复、异常与低置信度；管理员决定是否入账；确认后的分录更新管理报表。

产品不宣称 AI 自动出具正式 MPERS/MFRS 财报。AI 负责理解和解释，规则负责约束，管理员与会计师承担最终责任。

核心用户价值：减少人工录入、降低重复报销风险、缩短审核周期、提高收据到报表的可追溯性。

> 边界说明：WhatsApp 收据入口与 MyInvois/LHDN 校验当前均为**模拟/演示接口**，未发起任何真实 Meta Cloud API 或 LHDN API 调用；生产接入路线见 `IMPLEMENTATION_PLAN.md`。

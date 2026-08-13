# Lemon Squeezy JavaScript SDK 上游需求审计

> 研究日期：2026-08-11
>
> 研究问题：上游开放 issues、PR、讨论及相关源码中，哪些内容是真实的 SDK 缺陷、类型或功能需求、兼容性信号，哪些属于误投客服或仓库范围外问题；这些证据对 v5 beta 决策有何影响。

## 结论摘要

当前上游公开队列中：

- **已确认的 SDK 运行时缺陷只有一项**：`deleteDiscount()` 和 `deleteWebhook()` 对成功的 `204 No Content` 响应无条件调用 `response.json()`，把已成功的删除报告成失败。issue、当前源码及官方 API 文档三者互相印证。
- **高价值、仍未满足的 SDK 需求有两组**：入站 webhook 的可导出类型/事件类型/签名校验能力，以及清晰一致的错误语义。它们同时得到开放 issue、讨论、当前导出面和官方 webhook/license 文档支持。
- **存在明确的契约漂移信号**：当前 webhook 事件联合类型缺少官方文档列出的事件；开放 PR 又试图加入一个官方文档未列出的事件。历史上 `incomplete` subscription 状态曾被确认、合入、随后立即回滚，也暴露了“文档、真实 payload、SDK 类型谁优先”的未决问题。
- **其余开放项多数不构成 SDK 缺陷**：两个 checkout overlay 问题属于独立的 Lemon.js CDN 库；一个订阅更新问题更像两个服务端 API 操作的业务语义或竞态，现有证据不能归因于 SDK；五个开放 issue 是购买、退款、许可证或第三方软件支持误投。
- **上游维护本身是风险信号**：`main` 和最新 release `v4.0.0` 均停在 2024-11-05；2025 年提交的两个 PR 到 2026-08-11 仍未处理，开放的维护状态询问也未获维护者答复。v5 beta 不应把上游响应作为前置条件。

这些结论是 v5 决策输入，不包含修复任务拆分或实施顺序。

## 范围与方法

本次审计覆盖：

- `lmsqueezy/lemonsqueezy.js` 当前 **12 个开放 issue**、**2 个开放 PR**；
- 仓库全部 **9 个 GitHub Discussions**，重点核查与 SDK 契约有关的讨论；
- 能说明反复需求或兼容风险的历史 issues/PR；
- `main` 当前提交 `b1f66e9`（亦为 `v4.0.0`）的源码；
- Lemon Squeezy 官方 API、Webhook 与 Lemon.js 文档。

事实分类标准：

- **已确认 SDK 缺陷**：能从当前 SDK 源码直接推导，并与官方 API 契约或可重复的响应行为一致。
- **有效 SDK 需求**：属于本包应公开的客户端能力或类型/错误契约，并有多条一手证据支持。
- **兼容性信号**：说明契约可能漂移或用户依赖容易被破坏，但尚不足以确认具体缺陷。
- **非 SDK / 证据不足**：属于 Lemon.js、服务端 API、产品策略、客服支持，或缺少能归因到 SDK 的复现证据。

## 已确认的 SDK 缺陷

### 成功的无响应体删除被报告为失败

[开放 issue：deleteDiscount / deleteWebhook always return an error](https://github.com/lmsqueezy/lemonsqueezy.js/issues/154) 给出了 `v4.0.0` 的复现：服务端实际删除成功并返回空的 `204`，SDK 却返回 `Unexpected end of JSON input`。

这不是仅凭报告推测：当前 [`$fetch` 在读取状态码之前无条件执行 `fetchResponse.json()`](https://github.com/lmsqueezy/lemonsqueezy.js/blob/b1f66e905ee0614be87c3711d6529f2582e5729f/src/internal/fetch/index.ts#L62-L84)。与此同时，官方文档明确规定 [Delete a Discount](https://docs.lemonsqueezy.com/api/discounts/delete-discount) 和 [Delete a Webhook](https://docs.lemonsqueezy.com/api/webhooks/delete-webhook) 成功时均返回 `204 No Content`。SDK 自己的 [`deleteDiscount` 注释也承诺 `204 No Content`](https://github.com/lmsqueezy/lemonsqueezy.js/blob/b1f66e905ee0614be87c3711d6529f2582e5729f/src/discounts/index.ts#L125-L136)。

**对 v5 beta 的影响**：HTTP 成功不能以“存在 JSON body”为隐含前提；空 body、JSON body 和错误 body 的响应契约必须被明确区分。否则破坏性操作会出现“服务端已成功、客户端认为失败”的状态分叉。

## 有效的 SDK 需求与兼容性信号

### 1. 入站 webhook 缺少可直接使用的公共类型

[开放 issue：SDK's missing types for incoming Webhooks Requests](https://github.com/lmsqueezy/lemonsqueezy.js/issues/140) 指出：SDK 导出的 `Subscription` 是完整 API response wrapper，而 webhook body 是由 `meta` 与单个 JSON:API resource `data` 组成；内部 `SubscriptionData` 又没有导出，调用方无法复用。两名用户在 issue 中分别要求 webhook envelope 和事件名的强类型。相同的公共数据类型诉求也出现在 [讨论：How to use types from SDK?](https://github.com/lmsqueezy/lemonsqueezy.js/discussions/138)。

源码确认了这一点：[`SubscriptionData` 是文件内私有类型](https://github.com/lmsqueezy/lemonsqueezy.js/blob/b1f66e905ee0614be87c3711d6529f2582e5729f/src/subscriptions/types.ts#L221-L238)，包根只导出 [`Subscription` 等 response-level 类型](https://github.com/lmsqueezy/lemonsqueezy.js/blob/b1f66e905ee0614be87c3711d6529f2582e5729f/src/index.ts#L72-L87)。官方 [Webhook Requests](https://docs.lemonsqueezy.com/help/webhooks/webhook-requests) 则明确说明 body 是事件对应的 JSON:API resource，并带 `meta.event_name`、可选 `meta.custom_data` 与 `X-Signature`。

issue 还要求签名验证能力。当前包没有接收 webhook 或验签的导出；官方仍要求调用方按 [Signing Requests](https://docs.lemonsqueezy.com/help/webhooks/signing-requests) 自行计算 HMAC，并在 [Next.js webhook 指南](https://docs.lemonsqueezy.com/guides/tutorials/webhooks-nextjs) 中提供了另一版编码处理不同的示例。

**对 v5 beta 的影响**：公共类型面的决策不能只覆盖出站 API response；是否把 webhook envelope、resource data、event name 与验签能力纳入 v5 公共契约，必须显式决定。该需求有真实用户、官方 payload 结构和源码缺口三重证据，不是一般性的“希望多导出类型”。

### 2. webhook 事件枚举已与官方契约错位

当前 [`Events` 联合类型](https://github.com/lmsqueezy/lemonsqueezy.js/blob/b1f66e905ee0614be87c3711d6529f2582e5729f/src/webhooks/types.ts#L10-L25) 既是私有类型，又缺少官方当前 [Event Types](https://docs.lemonsqueezy.com/help/webhooks/event-types) 列出的 `customer_updated` 与 `affiliate_activated`。

[开放 PR：add subscription_plan_changed hook to webhook event types](https://github.com/lmsqueezy/lemonsqueezy.js/pull/145) 则加入 `subscription_plan_changed`，证据是 dashboard 截图；截至研究日，官方自称“完整列表”的 Event Types 页面并不包含该事件。因此，这个 PR 是**真实的漂移预警**，但不是足以直接确认该字符串已成为稳定公共 API 的证据。

**对 v5 beta 的影响**：需要先确定事件类型的权威来源以及面对未文档化真实值时的类型策略；不能把当前联合类型或该 PR 任一方直接视为完整事实。

### 3. 错误语义对调用者不够明确

[讨论：We should check both `response.error` and `response.data.error`?](https://github.com/lmsqueezy/lemonsqueezy.js/discussions/135) 揭示了两层同名错误：SDK 的 transport/API `response.error`，以及 License API 成功 HTTP response 内的领域字段 `data.error`。官方 [Validate a License Key](https://docs.lemonsqueezy.com/api/license-api/validate-license-key) 明确把 `error` 定义为“许可证无法验证时的错误消息”；通用 API 则用 HTTP 状态与 JSON:API `errors` 表示请求错误，[官方 Responses 文档](https://docs.lemonsqueezy.com/api/getting-started/responses) 明确说明了这套结构。

当前 `$fetch` 还把 JSON:API error array 塞入原生 `Error.cause`，而顶层 message 只保留 HTTP `statusText`（[源码](https://github.com/lmsqueezy/lemonsqueezy.js/blob/b1f66e905ee0614be87c3711d6529f2582e5729f/src/internal/fetch/index.ts#L67-L101)）。历史 [issue：Unprocessable Entity - What Entity?](https://github.com/lmsqueezy/lemonsqueezy.js/issues/69) 已证明用户不知道应从 `error.cause` 读取详细信息。

**对 v5 beta 的影响**：需要明确区分 transport、HTTP/JSON:API 与领域失败，并让类型能够表达各分支；否则 v4 兼容层会把现有含混语义继续带入 v5。

### 4. discount 限定参数存在文档与易用性缺口，不是 API 运行时缺陷

[开放 issue：Wiki createDiscount function missing isLimitedToProducts option](https://github.com/lmsqueezy/lemonsqueezy.js/issues/136) 报告仅传 `variantIds` 不会限制 discount，显式加 `isLimitedToProducts: true` 后正常。官方 [Create a Discount](https://docs.lemonsqueezy.com/api/discounts/create-discount) 的契约确实要求 attribute `is_limited_to_products=true`，并仅在该值为真时使用 variants relationship。

当前类型试图用联合类型表达该关系，但仍允许 `isLimitedToProducts?: false` 与 `variantIds` 同时出现（[类型源码](https://github.com/lmsqueezy/lemonsqueezy.js/blob/b1f66e905ee0614be87c3711d6529f2582e5729f/src/discounts/types.ts#L167-L190)）；运行时还把缺省 flag 固定为 `false`，同时照常发送 variants relationship（[实现源码](https://github.com/lmsqueezy/lemonsqueezy.js/blob/b1f66e905ee0614be87c3711d6529f2582e5729f/src/discounts/index.ts#L23-L74)）。

**对 v5 beta 的影响**：这是有效的文档/参数不变量信号，但现有证据不支持称其为服务端或 SDK 执行错误。v5 必须决定是否保留 v4 的显式 flag 语义，以及类型是否允许“提供 variants 但不启用限制”的组合。

### 5. 类型与文档的小型修正仍有效，但优先级低

[开放 PR：Correct comment for IntervalUnit type](https://github.com/lmsqueezy/lemonsqueezy.js/pull/147) 只把两处 TSDoc 中重复的 `week` 改为 `month`。当前实际 `IntervalUnit` 已正确包含 `month`（[源码](https://github.com/lmsqueezy/lemonsqueezy.js/blob/b1f66e905ee0614be87c3711d6529f2582e5729f/src/types/common.ts#L1-L6)），错误只存在于 price 字段注释（[源码](https://github.com/lmsqueezy/lemonsqueezy.js/blob/b1f66e905ee0614be87c3711d6529f2582e5729f/src/prices/types.ts#L114-L142)）。

**对 v5 beta 的影响**：说明生成/公开 API 文档需要与真实类型一起校验；它不改变运行时或兼容边界。

### 6. 历史记录显示三类反复发生的兼容风险

1. **包发布与声明文件完整性**：[`v1.2.4` 未发布 TypeScript declarations](https://github.com/lmsqueezy/lemonsqueezy.js/issues/32) 导致用户回退到 `1.2.2`；[Vite 无法解析 package entry](https://github.com/lmsqueezy/lemonsqueezy.js/issues/38) 和 [Vue 讨论](https://github.com/lmsqueezy/lemonsqueezy.js/discussions/33) 是同一事故的下游表现。
2. **公共数据类型反复被请求**：[Export types](https://github.com/lmsqueezy/lemonsqueezy.js/issues/78)、[Expose the TS types](https://github.com/lmsqueezy/lemonsqueezy.js/issues/80)、未合入的 [Export ProductData PR](https://github.com/lmsqueezy/lemonsqueezy.js/pull/106)、当前 [webhook 类型 issue](https://github.com/lmsqueezy/lemonsqueezy.js/issues/140) 和 [类型讨论](https://github.com/lmsqueezy/lemonsqueezy.js/discussions/138) 都指向同一需求：response wrapper 可导出并不等于 resource data 可复用。
3. **真实 payload 与静态类型/转换逻辑漂移**：[custom data 被全局 camel-to-snake 转换而破坏 webhook 关联](https://github.com/lmsqueezy/lemonsqueezy.js/issues/54)；`incomplete` subscription 状态先被维护者确认并由 [PR #86](https://github.com/lmsqueezy/lemonsqueezy.js/pull/86) 合入，随后又被 [PR #101](https://github.com/lmsqueezy/lemonsqueezy.js/pull/101) 无解释回滚；[`customer_id` 实际可为 null](https://github.com/lmsqueezy/lemonsqueezy.js/issues/84) 的类型 PR 也因被判断为服务端 bug 而关闭。这些记录说明“收紧到文档”会拒绝真实 payload，而“照单全收观测值”又可能固化服务端缺陷。

**对 v5 beta 的影响**：发布产物、数据类型复用和未知/未文档化字段的处理均是兼容基线，而非附带质量项。

## 不能归因于当前 SDK 的开放项

### 服务端 API/业务流程：有价值，但证据不足

[开放 issue：Subscription Update Flows Triggered In Incorrect Order](https://github.com/lmsqueezy/lemonsqueezy.js/issues/146) 依次 `await updateSubscription()` 再 `await updateSubscriptionItem()`，却观察到 variant 与 quantity 的最终组合偶尔不一致。当前 SDK 的两个函数分别直接发送独立 `PATCH` 请求（[`updateSubscription`](https://github.com/lmsqueezy/lemonsqueezy.js/blob/b1f66e905ee0614be87c3711d6529f2582e5729f/src/subscriptions/index.ts#L41-L76)、[`updateSubscriptionItem`](https://github.com/lmsqueezy/lemonsqueezy.js/blob/b1f66e905ee0614be87c3711d6529f2582e5729f/src/subscriptionItems/index.ts#L87-L147)），没有内部排队、重试或重排逻辑。

官方文档也把 [Update a Subscription](https://docs.lemonsqueezy.com/api/subscriptions/update-subscription) 与 [Update a Subscription Item](https://docs.lemonsqueezy.com/api/subscription-items/update-subscription-item) 定义为两个独立操作，并分别触发 proration 语义。现有 issue 没有 request/response、时间线、幂等信息或直接 API 对照，不能证明 SDK 改变了调用顺序。

**分类**：有效的服务端 API 行为/集成风险信号；不是已确认 SDK 缺陷。v5 beta 只能把它作为多操作语义和文档边界的输入，不能据此承诺 SDK 能保证跨请求原子性。

### Lemon.js checkout overlay：相关产品，但属于另一套库

- [Checkout in incognito mode](https://github.com/lmsqueezy/lemonsqueezy.js/issues/137) 有多人复现 overlay 在 Safari、隐私模式或广告拦截条件下跳转 404；这是可信的 Lemon.js/checkout 产品缺陷信号。
- [Checkout Overlay height is too short](https://github.com/lmsqueezy/lemonsqueezy.js/issues/148) 同样明确指向 overlay UI。

官方 [About Lemon.js](https://docs.lemonsqueezy.com/help/lemonjs) 将其定义为通过 CDN `https://app.lemonsqueezy.com/js/lemon.js` 加载的独立浏览器库；本仓库 README 反而明确警告 [不得在浏览器中直接使用此 API SDK](https://github.com/lmsqueezy/lemonsqueezy.js/blob/b1f66e905ee0614be87c3711d6529f2582e5729f/README.md#L41-L50)。因此两项都不应进入本 SDK v5 beta 的公共 API 或验收范围。

### 误投客服或第三方产品支持

以下五个开放 issue 没有 SDK 调用、源码、API 请求或开发者集成上下文；部分评论也明确引导发帖者联系支持：

- [just paid for license but no recvd](https://github.com/lmsqueezy/lemonsqueezy.js/issues/139)
- [Paid and got cancel notice](https://github.com/lmsqueezy/lemonsqueezy.js/issues/141)
- [Lama cleaner, windows installer](https://github.com/lmsqueezy/lemonsqueezy.js/issues/142)
- [Failed license key installation](https://github.com/lmsqueezy/lemonsqueezy.js/issues/143)
- [License change](https://github.com/lmsqueezy/lemonsqueezy.js/issues/150)

**分类**：购买/退款/许可证或第三方软件客服，不是 SDK 需求，也不构成 v5 beta 决策输入。

## 当前开放 issue / PR 逐项判定

| 项目                                                                                        | 判定                                       | 对 v5 beta 的影响                             |
| ------------------------------------------------------------------------------------------- | ------------------------------------------ | --------------------------------------------- |
| [#136 createDiscount wiki](https://github.com/lmsqueezy/lemonsqueezy.js/issues/136)         | 有效文档/参数不变量信号；非运行时缺陷      | 决定显式 flag 与 `variantIds` 的兼容语义      |
| [#137 incognito checkout](https://github.com/lmsqueezy/lemonsqueezy.js/issues/137)          | Lemon.js/checkout 产品缺陷                 | 排除出 API SDK v5 范围                        |
| [#139 license not received](https://github.com/lmsqueezy/lemonsqueezy.js/issues/139)        | 误投客服                                   | 无                                            |
| [#140 incoming webhook types](https://github.com/lmsqueezy/lemonsqueezy.js/issues/140)      | 有效且高价值的类型/功能需求                | 决定 webhook 公共契约与验签范围               |
| [#141 paid then cancelled](https://github.com/lmsqueezy/lemonsqueezy.js/issues/141)         | 误投客服                                   | 无                                            |
| [#142 Lama Cleaner installer](https://github.com/lmsqueezy/lemonsqueezy.js/issues/142)      | 第三方软件客服                             | 无                                            |
| [#143 failed license installation](https://github.com/lmsqueezy/lemonsqueezy.js/issues/143) | 第三方软件/客服                            | 无                                            |
| [PR #145 plan changed event](https://github.com/lmsqueezy/lemonsqueezy.js/pull/145)         | 兼容漂移信号；事件本身未被当前官方文档确认 | 决定事件权威来源与未知值策略                  |
| [#146 update flows order](https://github.com/lmsqueezy/lemonsqueezy.js/issues/146)          | 服务端 API/集成行为，证据不足以归因 SDK    | 明确跨请求不提供隐含原子性保证                |
| [PR #147 interval comment](https://github.com/lmsqueezy/lemonsqueezy.js/pull/147)           | 有效 TSDoc 修正；无运行时影响              | 文档校验输入                                  |
| [#148 overlay height](https://github.com/lmsqueezy/lemonsqueezy.js/issues/148)              | Lemon.js UI                                | 排除出 API SDK v5 范围                        |
| [#150 license change](https://github.com/lmsqueezy/lemonsqueezy.js/issues/150)              | 误投客服                                   | 无                                            |
| [#152 Is this repo maintained?](https://github.com/lmsqueezy/lemonsqueezy.js/issues/152)    | 治理/维护风险信号；非 SDK 功能需求         | v5 不能依赖上游及时合并或发布                 |
| [#154 DELETE 204](https://github.com/lmsqueezy/lemonsqueezy.js/issues/154)                  | 已确认 SDK 运行时缺陷                      | HTTP Core 成功/空 body 契约必须在 beta 前确定 |

## Discussions 判定

仓库共有 9 个 discussions：

- [How to use types from SDK?](https://github.com/lmsqueezy/lemonsqueezy.js/discussions/138) 和 [response.error vs data.error](https://github.com/lmsqueezy/lemonsqueezy.js/discussions/135) 是直接、仍有效的 SDK 类型与错误语义需求。
- [VueJS 3 SPA package entry](https://github.com/lmsqueezy/lemonsqueezy.js/discussions/33) 是已解决的历史发布事故，但对发布验收有兼容价值。
- [Customer Portal back URL](https://github.com/lmsqueezy/lemonsqueezy.js/discussions/90)、[Checkout back/cancel](https://github.com/lmsqueezy/lemonsqueezy.js/discussions/91) 和 [license-to-usage-record happy path](https://github.com/lmsqueezy/lemonsqueezy.js/discussions/131) 是产品/API 工作流问题；没有证据表明当前 SDK 错误实现了已有 API 契约。
- [Safari overlay 404](https://github.com/lmsqueezy/lemonsqueezy.js/discussions/144) 是 issue #137 的 Lemon.js 重复项；[Domain and subdomain](https://github.com/lmsqueezy/lemonsqueezy.js/discussions/149) 属于另一套 `affiliate.js` SDK。
- [Welcome discussion](https://github.com/lmsqueezy/lemonsqueezy.js/discussions/14) 不包含需求。

## 上游维护状态

上游 `main` 当前仍是 [`b1f66e9 chore: version 4.0.0`](https://github.com/lmsqueezy/lemonsqueezy.js/commit/b1f66e905ee0614be87c3711d6529f2582e5729f)，最新 [v4.0.0 release](https://github.com/lmsqueezy/lemonsqueezy.js/releases/tag/v4.0.0) 发布于 2024-11-05。两个开放 PR 分别创建于 2025-06 与 2025-07，到研究日均未获实质评审；[维护状态 issue](https://github.com/lmsqueezy/lemonsqueezy.js/issues/152) 自 2026-05 开放，仅有另一名用户追问。

这不能证明项目永久弃用，但足以说明：上游合并速度和文档同步速度不能作为 v5 beta 规划的可靠依赖。

## 提供给 v5 决策地图的事实输入

在不制定实施计划的前提下，本次研究使以下决策变得可明确提出：

1. **HTTP Core 契约**：成功响应是否允许无 body；如何区分 transport、HTTP/JSON:API 与领域失败。
2. **公共类型面**：只导出完整 response，还是同时稳定导出 resource data、webhook envelope 与 event types。
3. **契约权威来源**：官方文档、真实 payload/dashboard 与 SDK 现状冲突时，v5 类型以何种政策处理未知或未文档化值。
4. **兼容边界**：v4 的参数转换、错误形状与 discount 显式 flag 哪些属于必须保留的行为，哪些只能留在兼容层。
5. **仓库范围**：Lemon.js overlay、affiliate.js、服务端交易行为和客服请求明确不属于 API SDK v5 beta。
6. **发布验收**：历史声明文件/entrypoint 事故说明，类型声明和各模块入口可用性本身是兼容要求。

## 证据限制

- 本研究没有可用的 Lemon Squeezy 商户凭据，因此没有重新执行真实删除、订阅更新或 dashboard webhook 配置；已确认的 `204` 缺陷依靠 issue 复现、当前源码和官方响应契约交叉验证。
- `subscription_plan_changed` 只有 PR 提供的 dashboard 截图，官方当前 Event Types 页面未列出；因此只判定为漂移信号。
- issue #146 缺少原始 request/response 和直接 API 对照，无法判定服务端处理顺序，也无法提升为 SDK 缺陷。

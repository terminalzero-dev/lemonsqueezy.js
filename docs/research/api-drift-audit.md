# Lemon Squeezy API 相对 JavaScript SDK v4 的漂移审计

研究截止：2026-08-11（Asia/Shanghai）

## 结论摘要

以官方 JavaScript SDK `v4.0.0`（2024-11-05）为基线，官方 API changelog 和当前 API 参考可以确认以下 v4 后漂移：

- 新增一个只读资源 `affiliates`，以及 `GET /v1/affiliates/:id`、`GET /v1/affiliates` 两个 endpoint。
- `Subscription` 新增 `payment_processor`。
- `Order` 和 `SubscriptionInvoice` 各新增 `affiliate_id`、`referral_amount`，并各新增 `affiliate` relationship。
- `Customer` 新增 `affiliates` relationship。
- Webhook 新增 `affiliate_activated`、`customer_updated` 两个事件。
- 官方在 v4 发布后记录了 `OrderItem.quantity`，但 v4 源码已经包含它，因此它不是 v5 需要补上的 SDK 缺口。

没有找到 v4 发布后删除 endpoint、删除字段、缩窄枚举或新增 deprecation 的官方记录。官方仍把新增资源、可选请求参数、响应属性和 Webhook 事件视为 `/v1` 的向后兼容变更。[API 版本策略](https://docs.lemonsqueezy.com/api)

此外，当前 API 参考与 v4 源码之间还有三项无法从 changelog 确认引入日期的差异：订单列表的 `order_number` filter、订阅发票状态 `partial_refund`、订阅发票生成原因 `updated`。它们不能严谨地归类为“v4 后新增”，但 v5 的类型模型需要覆盖。

## 基线与方法

基线是官方仓库的 [`v4.0.0` release](https://github.com/lmsqueezy/lemonsqueezy.js/releases/tag/v4.0.0)，commit 为 [`b1f66e9`](https://github.com/lmsqueezy/lemonsqueezy.js/commit/b1f66e905ee0614be87c3711d6529f2582e5729f)。审计方法：

1. 以官方 [API changelog](https://docs.lemonsqueezy.com/api/getting-started/changelog) 的日期记录确定可归因于 v4 后的变化。
2. 以当前官方 API 对象页、endpoint 页和 Webhook 事件页核实字段、关系、枚举、payload 与查询参数。
3. 对照 `v4.0.0` 的模块导出、资源属性、relationship 注册表、列表参数和 Webhook 事件 union。
4. 官方公开 GitHub 组织当前没有 OpenAPI/JSON Schema 仓库，因此本次没有可用于机械 diff 的一手 schema；对象页的 JSON:API 示例是最接近 schema 的公开一手资料。[官方组织仓库列表](https://github.com/orgs/lmsqueezy/repositories)

“未找到变化”只表示在上述官方公开资料中没有证据，不表示未公开的服务端实现绝对没有变化。

## 可确认的 v4 后差异

### 1. Affiliates 资源和 endpoint

官方 changelog 在 2025-01-21 宣布 Affiliates endpoints。当前参考只列出两个只读 endpoint：

| Endpoint                 | 行为                             | 当前公开参数                                    |
| ------------------------ | -------------------------------- | ----------------------------------------------- |
| `GET /v1/affiliates/:id` | 返回指定 Affiliate               | 路径参数 `id`                                   |
| `GET /v1/affiliates`     | 按 `created_at` 倒序返回分页列表 | filters：`store_id`、`user_email`；通用分页参数 |

直接来源：[changelog](https://docs.lemonsqueezy.com/api/getting-started/changelog)、[Retrieve an Affiliate](https://docs.lemonsqueezy.com/api/affiliates/retrieve-affiliate)、[List All Affiliates](https://docs.lemonsqueezy.com/api/affiliates/list-all-affiliates)。

当前官方文档没有 Affiliate 的 create、update 或 delete endpoint，不应为 v5 推断写操作。

Affiliate 对象的公开形状：

| 项目          | 当前文档含义                                                                                                                                                                |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| resource type | `affiliates`                                                                                                                                                                |
| fields        | `store_id`, `user_id`, `user_name`, `user_email`, `share_domain`, `status`, `application_note`, `products`, `total_earnings`, `unpaid_earnings`, `created_at`, `updated_at` |
| `status` enum | `active`, `pending`, `disabled`                                                                                                                                             |
| relationships | `store`, `user`                                                                                                                                                             |
| `products`    | 文档只称其为 JSON 格式的启用产品列表，示例值为 `null`；没有公开元素 schema                                                                                                  |

直接来源：[The Affiliate Object](https://docs.lemonsqueezy.com/api/affiliates/the-affiliate-object)、[Retrieve an Affiliate 的完整 JSON:API 示例](https://docs.lemonsqueezy.com/api/affiliates/retrieve-affiliate)。

v4 的根导出中没有 Affiliate 模块，通用 resource/relationship 注册表也没有 `affiliates`、`affiliate` 或 `user`：[v4 根导出](https://github.com/lmsqueezy/lemonsqueezy.js/blob/v4.0.0/src/index.ts)、[v4 Relationships](https://github.com/lmsqueezy/lemonsqueezy.js/blob/v4.0.0/src/types/response/relationships.ts#L1-L62)。

对 v5 类型覆盖的最低要求：

- 提供 `getAffiliate`、`listAffiliates` 及单项/分页响应类型。
- `ListAffiliatesParams` 覆盖 `filter.storeId`、`filter.userEmail`、`include`、`page`；`include` 和分页来自 API 的通用 JSON:API 查询能力。[Requests](https://docs.lemonsqueezy.com/api/getting-started/requests)
- resource type 注册 `affiliates`；relationship key 覆盖 `store`、`user`、`affiliate`、`affiliates`。
- `products` 在官方给出 schema 前不应臆造具体数组元素类型；保守表示为可空 JSON/unknown 值。

### 2. Subscription.payment_processor

2025-06-11，`Subscription` 新增 `payment_processor`。当前对象页定义为小写支付处理服务名，枚举为：

- `stripe`
- `paypal`

直接来源：[changelog](https://docs.lemonsqueezy.com/api/getting-started/changelog)、[The Subscription Object](https://docs.lemonsqueezy.com/api/subscriptions/the-subscription-object)。官方 Webhook 指南的 Subscription payload 示例也包含 `payment_processor`：[Sync With Webhooks](https://docs.lemonsqueezy.com/guides/developer-guide/webhooks)。

v4 的 Subscription attributes 在 `card_last_four` 后直接进入 `pause`，没有该字段：[v4 Subscription 类型](https://github.com/lmsqueezy/lemonsqueezy.js/blob/v4.0.0/src/subscriptions/types.ts#L71-L220)。

类型覆盖要求：响应字段应为 `payment_processor: "stripe" | "paypal"`。它属于 Subscription 对象，因此同一对象用于 Webhook payload 时也必须可见。

### 3. Affiliate 归因字段与关系

2026-07-22，`Order` 和 `SubscriptionInvoice` 新增 `affiliate_id` 和 `affiliate` relationship；`Customer` 新增复数 `affiliates` relationship。2026-07-29，`Order` 和 `SubscriptionInvoice` 又新增 `referral_amount`。

| 对象                  | 新字段/关系                       | 当前语义                                            |
| --------------------- | --------------------------------- | --------------------------------------------------- |
| `Order`               | `affiliate_id: number \| null`    | 引荐该订单的 Affiliate ID；无引荐时为 `null`        |
| `Order`               | `referral_amount: number \| null` | 订单币种下、以分为单位的联盟佣金；无引荐时为 `null` |
| `Order`               | `affiliate` relationship          | related/self relationship links                     |
| `SubscriptionInvoice` | `affiliate_id: number \| null`    | 引荐该发票的 Affiliate ID；无引荐时为 `null`        |
| `SubscriptionInvoice` | `referral_amount: number \| null` | 发票币种下、以分为单位的联盟佣金；无引荐时为 `null` |
| `SubscriptionInvoice` | `affiliate` relationship          | related/self relationship links                     |
| `Customer`            | `affiliates` relationship         | 客户可关联多个 Affiliates                           |

直接来源：[changelog](https://docs.lemonsqueezy.com/api/getting-started/changelog)、[Order object](https://docs.lemonsqueezy.com/api/orders/the-order-object)、[Retrieve an Order](https://docs.lemonsqueezy.com/api/orders/retrieve-order)、[Subscription Invoice object](https://docs.lemonsqueezy.com/api/subscription-invoices/the-subscription-invoice-object)、[Retrieve a Subscription Invoice](https://docs.lemonsqueezy.com/api/subscription-invoices/retrieve-subscription-invoice)、[Retrieve a Customer](https://docs.lemonsqueezy.com/api/customers/retrieve-customer)。

v4 对照：

- Order attributes 与 relationships 都没有 Affiliate 信息：[v4 Order 类型](https://github.com/lmsqueezy/lemonsqueezy.js/blob/v4.0.0/src/orders/types.ts#L69-L272)。
- SubscriptionInvoice attributes 和 relationships 只有 `store`、`subscription`、`customer`：[v4 SubscriptionInvoice 类型](https://github.com/lmsqueezy/lemonsqueezy.js/blob/v4.0.0/src/subscriptionInvoices/types.ts#L22-L215)。
- Customer relationships 没有 `affiliates`：[v4 Customer 类型](https://github.com/lmsqueezy/lemonsqueezy.js/blob/v4.0.0/src/customers/types.ts#L98-L109)。

官方 Order 与 SubscriptionInvoice 列表页当前没有 `affiliate_id` filter，因此不能因为响应新增了 `affiliate_id` 就推断列表可按它过滤：[List All Orders](https://docs.lemonsqueezy.com/api/orders/list-all-orders)、[List All Subscription Invoices](https://docs.lemonsqueezy.com/api/subscription-invoices/list-all-subscription-invoices)。

### 4. Webhook 事件

| 日期       | 新事件                | Data Sent        | v4 状态                  |
| ---------- | --------------------- | ---------------- | ------------------------ |
| 2025-01-21 | `affiliate_activated` | Affiliate object | v4 `Events` union 不包含 |
| 2026-02-25 | `customer_updated`    | Customer object  | v4 `Events` union 不包含 |

直接来源：[API changelog](https://docs.lemonsqueezy.com/api/getting-started/changelog)、[官方完整 Event Types 表](https://docs.lemonsqueezy.com/help/webhooks/event-types)。v4 union 来源：[v4 Webhook 类型](https://github.com/lmsqueezy/lemonsqueezy.js/blob/v4.0.0/src/webhooks/types.ts#L10-L25)。

当前完整事件表仍保留 v4 已有的 `subscription_payment_refunded`；它在简版 Developer Guide 列表中被遗漏，但完整 Event Types 表明确存在，因此不得当作废弃事件删除。

### 5. OrderItem.quantity：API 记录变晚，但不是 SDK 缺口

changelog 把 `OrderItem.quantity` 记在 2024-12-06，时间晚于 v4 发布；当前 Order Item 对象页也有该字段。但 v4 源码早已将其声明为 `quantity: number`，所以 v5 无需把它计为新增 SDK 覆盖。

直接来源：[API changelog](https://docs.lemonsqueezy.com/api/getting-started/changelog)、[The Order Item Object](https://docs.lemonsqueezy.com/api/order-items/the-order-item-object)、[v4 OrderItem 类型](https://github.com/lmsqueezy/lemonsqueezy.js/blob/v4.0.0/src/orderItems/types.ts#L10-L78)。

这也说明 changelog 的发布日期不能单独作为 SDK diff；必须回看 v4 源码。

## 当前参考与 v4 的未定年差异

以下差异在当前官方参考中存在，但 changelog 没有给出引入日期。应纳入 v5 覆盖，同时不要在发布说明中声称它们一定是 v4 后新增。

### Order 列表的 order_number filter

当前 `GET /v1/orders` 文档列出 `store_id`、`user_email`、`order_number` 三个 filter，而 v4 `ListOrdersParams` 只有 `storeId`、`userEmail`。

直接来源：[List All Orders](https://docs.lemonsqueezy.com/api/orders/list-all-orders)、[v4 ListOrdersParams](https://github.com/lmsqueezy/lemonsqueezy.js/blob/v4.0.0/src/orders/types.ts#L264-L272)。

v5 应覆盖 `filter.orderNumber?: number`，序列化为 `filter[order_number]`。

### SubscriptionInvoice 枚举缺口

当前对象页定义：

- `billing_reason`: `initial | renewal | updated`
- `status`: `pending | paid | void | refunded | partial_refund`

v4 源码却把 `InvoiceBillingReason` 写成 `"initial" | "renewal" | "renewal"`，并把 `InvoiceStatus` 写成 `"pending" | "paid" | "void" | "refunded"`。前者显然遗漏 `updated`，后者遗漏 `partial_refund`。

直接来源：[The Subscription Invoice Object](https://docs.lemonsqueezy.com/api/subscription-invoices/the-subscription-invoice-object)、[v4 SubscriptionInvoice enums](https://github.com/lmsqueezy/lemonsqueezy.js/blob/v4.0.0/src/subscriptionInvoices/types.ts#L12-L21)。

v5 应按当前参考补齐这两个枚举。

## 官方资料中的不确定性

### Subscription URL 字段命名冲突

当前 Subscription 对象页的文字说明把 PayPal 更新订阅 URL 称为 `urls.update_customer_portal`，但同页 JSON 示例实际返回 `urls.customer_portal_update_subscription`；v4 源码采用后者。官方 2024-02-20 changelog 又使用 `urls.update_customer_portal` 这个名字。

直接来源：[The Subscription Object](https://docs.lemonsqueezy.com/api/subscriptions/the-subscription-object)、[API changelog](https://docs.lemonsqueezy.com/api/getting-started/changelog)、[v4 Subscription 类型](https://github.com/lmsqueezy/lemonsqueezy.js/blob/v4.0.0/src/subscriptions/types.ts)。

没有 live API 响应或官方澄清时，不能把它判定为 v4 后字段重命名。类型设计阶段应单独决定：以示例和既有 v4 名称为主，还是暂时兼容两个可选键。

### Affiliate.products 没有公开 schema

官方只说它是“JSON 格式”的启用产品列表，且示例为 `null`，没有说明非空时的元素结构。不要根据字段名猜成 `number[]` 或 Product 对象数组。[The Affiliate Object](https://docs.lemonsqueezy.com/api/affiliates/the-affiliate-object)

## 未发现的变化

截至研究截止日，在官方 changelog、当前 API 导航和对象/endpoint 参考中没有发现：

- v4 后新增的其他资源或 endpoint；
- endpoint 删除、HTTP method 变更或 API major version 变更；
- v4 后新标记的废弃字段、关系、枚举值或 Webhook 事件；
- Affiliate 写 endpoint；
- Order 或 SubscriptionInvoice 的 `affiliate_id` 列表 filter。

`checkout_options.dark` 的废弃，以及 Variant 上迁移到 Price 的旧定价字段，均发生在 v4 之前并已由 v4 表达，不属于本次漂移：[API changelog](https://docs.lemonsqueezy.com/api/getting-started/changelog)、[v4 Checkout 类型](https://github.com/lmsqueezy/lemonsqueezy.js/blob/v4.0.0/src/checkouts/types.ts)、[v4 Variant 类型](https://github.com/lmsqueezy/lemonsqueezy.js/blob/v4.0.0/src/variants/types.ts)。

## 供后续资源与类型决策使用的清单

v5 资源覆盖至少需要：

1. 新增 Affiliates 只读模块、完整对象类型、分页类型和两个 filter。
2. 给 Subscription 增加 `payment_processor: "stripe" | "paypal"`。
3. 给 Order、SubscriptionInvoice 增加可空 `affiliate_id`、`referral_amount` 和 `affiliate` relationship。
4. 给 Customer 增加 `affiliates` relationship。
5. 给 Webhook 事件 union 增加 `affiliate_activated`、`customer_updated`，保留 `subscription_payment_refunded`。
6. 给订单列表参数增加 `orderNumber`。
7. 修正 SubscriptionInvoice 的 `billing_reason` 和 `status` enums。
8. 不重复处理 v4 已有的 `OrderItem.quantity`。
9. 把 Subscription URL 命名冲突和 `Affiliate.products` schema 保留为显式待决项，不在实现中暗自猜测。

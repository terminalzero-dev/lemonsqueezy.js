# 数据类型模型与 API 真相源契约

状态：已确认，作为 LemonSqueezy SDK v5 beta 的实施输入。

关联票据：[确定数据类型模型与 API 真相源](https://github.com/terminalzero-dev/lemonsqueezy.js/issues/14)

原型资产：

- [数据类型与真相源交互原型](../../src/prototypes/data-type-source.prototype.html)
- [可编译 TypeScript 类型原型](../../src/prototypes/data-type-source.prototype.ts)

## 决策摘要

v5 采用轻量混合 Contract Catalog：官方 Lemon Squeezy 文档与 changelog 是外部证据，经人工审核并提交到 Terminal Zero fork 的契约才是 SDK 的版本化真相源。

Contract Catalog 不从官方网页直接生成发布代码，也不预建通用 schema compiler。每个资源共同维护：

1. 人工设计的语义类型，包括 response attributes、复杂 input DTO、null 语义、条件约束与 Opaque user data；
2. typed contract values，包括 resource type、relationships、known values、operation method/path、query/body/form wire mapping 和 evidence pointers；
3. 从上述定义机械推导的 operation registry、serializer mapping、known-value unions、导出清单和一致性 fixtures。

Canonical v5 type model 与 Compatibility facade 类型是两个静态投射，但共用同一 runtime resource implementation 和 HTTP Core。

## 事实边界

截至 2026-08-12，没有找到 Lemon Squeezy 公开或承诺提供的 OpenAPI、Swagger、JSON Schema 或 GraphQL schema。当前公开真相分散在：

- [API Reference](https://docs.lemonsqueezy.com/api)；
- 各 resource object 与 endpoint 页面；
- [API Changelog](https://docs.lemonsqueezy.com/api/getting-started/changelog)；
- [Webhook Event Types](https://docs.lemonsqueezy.com/help/webhooks/event-types)；
- [License API](https://docs.lemonsqueezy.com/api/license-api)。

主 Authenticated API 是 REST/JSON:API；License API 是 form request + JSON response 的独立协议。官方资料通过 prose、列表和示例描述 required、nullability、枚举与 relation cardinality，不是可复现 code generation 的形式化输入。

官方把新增 response property、optional request parameter 与 Webhook event 视为 `/v1` 的兼容变化。因此 SDK 不能以封闭 runtime parser 或封闭 response enum 把这些变化升级为运行时破坏。

## Contract Catalog Module

### Seam

Contract Catalog Module 位于资源维护 seam，而不是公共 runtime seam：

```text
official docs / changelog / reviewed Test Mode evidence / v4 baseline
                                │
                         human review
                                │
              co-located resource types + typed contracts
                                │
       ┌────────────────────────┼─────────────────────────┐
       │                        │                         │
resource implementation   canonical public types   compatibility projection
       │                        │                         │
       └────────────────────────┴──────────┬──────────────┘
                                          │
                                     consistency checks
```

消费者不导入 Contract Catalog、resource definition、schema、codec、registry 或 evidence 类型。它们是内部 Module Interface，不进入 v5 beta semver surface。

### Co-location

一个资源的 semantic types、typed contract 和 evidence pointers 必须处于同一个 resource Module 内，使 endpoint、DTO、response 与 serializer 变化具有 Locality。具体目录和文件拆分由后续资源模块票决定，但不得恢复一个与资源类型分离的全局 relationship registry。

推荐形状：

```ts
const orderRelationships = {
  store: { target: "stores", cardinality: "one", nullable: false },
  customer: { target: "customers", cardinality: "one", nullable: false },
  affiliate: { target: "affiliates", cardinality: "one", nullable: true },
} as const satisfies RelationshipCatalog;

interface ListOrdersParams {
  readonly include?: readonly (keyof typeof orderRelationships)[];
  readonly filter?: {
    readonly storeId?: Id;
    readonly userEmail?: string;
    readonly orderNumber?: number;
  };
}

const listOrdersContract = {
  protocol: "jsonapi",
  method: "GET",
  path: "/v1/orders",
  response: "list",
  query: {
    filter: {
      storeId: "filter[store_id]",
      userEmail: "filter[user_email]",
      orderNumber: "filter[order_number]",
    },
  },
  evidence: ["https://docs.lemonsqueezy.com/api/orders/list-all-orders"],
} as const satisfies OperationContract<ListOrdersParams>;
```

这个 Interface 把资源维护者必须知道的事实集中在一处，同时避免把每个 response attribute 重复编码为一套 runtime schema。

### 人工维护

以下内容由 TypeScript 人工设计和审核：

- response attribute 名称、类型、required 与 nullability；
- create/update/action inputs 与跨字段约束；
- 金额单位、时间含义、deprecated 语义和敏感字段；
- request 与 response 的不同开放策略；
- Opaque user data ownership；
- Webhook event 到 payload resource 的语义映射；
- License API 的业务否定成功语义；
- 官方资料冲突、provisional 字段与 compatibility 投射；
- 无法由简单 descriptor 可靠表达的业务校验。

### 机械派生

以下内容优先通过 TypeScript inference、组合或小型确定性生成器派生：

- resource `type` literal 与已知 resource union；
- known enum/event union；
- relationship names、target、cardinality 与合法 `include` union；
- operation method/path/protocol/response kind registry；
- camelCase input 到 query/body/form wire name mapping；
- endpoint serializer fixtures；
- 21 个 Resource namespace 覆盖清单；
- root、`./client`、`./types` 与 `./compat` 的导出清单；
- v4 的 60 个 runtime 和 92 个直接 type 名称 snapshot；
- declaration 与 runtime contract 的一致性报告。

生成文件如确有必要，必须：

- 从已提交的本地输入确定性生成；
- 提交到版本控制并标记为 generated；
- 禁止直接编辑；
- 在 CI 中重新生成后保持 clean diff。

不生成 response attribute interfaces、复杂 DTO、业务语义或文档裁决。首个 beta 不建设 IR、overlay language、通用 source adapter framework 或多目标 schema compiler。

## 公共类型模型

### Canonical 命名

资源类型统一使用：

| 概念                 | Order 示例                           |
| -------------------- | ------------------------------------ |
| wire attributes      | `OrderAttributes`                    |
| relationships object | `OrderRelationships`                 |
| `data` resource      | `OrderResource`                      |
| single API body      | `OrderResponse`                      |
| list API body        | `OrderListResponse`                  |
| get/list query       | `GetOrderParams`, `ListOrdersParams` |
| create input         | `CreateCustomerInput`                |
| update input         | `UpdateCustomerInput`                |
| action input         | `RefundOrderInput`                   |

Explicit Client resource methods 返回 Canonical response body：

```ts
client.orders.get(id): Promise<OrderResponse>
client.orders.list(params): Promise<OrderListResponse>
client.webhooks.delete(id): Promise<void>
```

Canonical resource、response、input、relationship、enum 和 JSON:API primitives 从 `@terminalzero/lemonsqueezy/types` 集中导出。根入口继续优先承担 Compatibility facade 的 v4 type names 和 Client core types，避免 `Order` 与 `OrderResponse` 的含义冲突。

### Shared JSON:API types

`./types` 至少公开：

```ts
type JSONPrimitive = string | number | boolean | null;

type JSONValue =
  | JSONPrimitive
  | readonly JSONValue[]
  | { readonly [key: string]: JSONValue };

interface JSONAPIResourceIdentifier<Type extends string = string> {
  readonly type: Type;
  readonly id: string;
}

interface JSONAPIRelationship<Related> {
  readonly links: {
    readonly related: string;
    readonly self: string;
  };
  readonly data?: Related;
}

interface JSONAPIResource<
  Type extends string,
  Attributes,
  Relationships = never,
> extends JSONAPIResourceIdentifier<Type> {
  readonly attributes: Attributes;
  readonly relationships?: Relationships;
  readonly links: { readonly self: string };
}

interface JSONAPISingleResponse<Resource> {
  readonly jsonapi: { readonly version: string };
  readonly links: { readonly self: string };
  readonly data: Resource;
  readonly included?: readonly LemonSqueezyResource[];
}

interface JSONAPIListResponse<Resource> {
  readonly jsonapi: { readonly version: string };
  readonly links: JSONAPIListLinks;
  readonly meta: JSONAPIPageMeta;
  readonly data: readonly Resource[];
  readonly included?: readonly LemonSqueezyResource[];
}
```

以下 shared type names 固定为公共契约：`JSONPrimitive`、`JSONValue`、`JSONAPIResourceIdentifier`、`JSONAPIRelationship`、`JSONAPIResource`、`JSONAPISingleResponse`、`JSONAPIListResponse`、`JSONAPIListLinks`、`JSONAPIPageMeta`、`JSONAPIError`、`KnownLemonSqueezyResource`、`LemonSqueezyResource` 和 `UnknownJSONAPIResource`。其中 `LemonSqueezyResource` 是已知 resource union 与 unknown fallback 的联合。

### Wire-native response

- 返回体保持 JSON:API envelope，不解包为 domain object。
- resource `type` 使用准确 literal，例如 `"orders"`。
- resource `id` 保持 JSON:API string。
- attributes、relationships、meta 与 links 保持 wire snake_case/kebab-case。
- 所有时间戳保持 ISO string，不转换为 `Date`。
- Canonical response、input 属性和数组使用 `readonly`；SDK 不修改调用方对象。
- Compatibility types 独立保留 v4 所需的可写性或旧名称，避免 readonly 破坏 v4 source compatibility。

### Relationships 与 included

每个 relationship 必须记录：

- relationship key；
- target resource type；
- `one` 或 `many` cardinality；
- to-one 是否可为 `null`；
- linkage `data` 是否可省略；
- 是否可作为该 endpoint 的 `include` 参数。

公共关系类型分别表达：

```ts
type ToOneRelationship<T extends string> =
  JSONAPIRelationship<JSONAPIResourceIdentifier<T> | null>;

type ToManyRelationship<T extends string> = JSONAPIRelationship<
  readonly JSONAPIResourceIdentifier<T>[]
>;
```

`include` 只接受对应 resource/operation 已确认的 relationship keys。

`included` 不根据具体 `include` 参数构造条件类型。它使用全部已知 `LemonSqueezyResource` union，并包含 `UnknownJSONAPIResource` fallback。调用方通过 `type` narrowing 识别已知 resource；未来新增 resource 不导致 runtime parse failure。

## 开放世界与运行时校验

### Shallow protocol validation

v5 beta 不根据所有 TypeScript fields 执行完整 runtime schema validation。

对 Authenticated API 的预期 JSON 成功响应仅检查：

- 根值是 object；
- operation 要求 single、list 或 void 的 response kind 正确；
- `data` 存在，single 为 resource object、list 为 array；
- 已检查的 resource object 至少具有 string `type`、string `id` 和 object `attributes`；
- `relationships`、`links`、`meta`、`included` 如出现，满足其最低容器形状。

对 License API 仅检查 JSON object 与该 operation 最低必需 discriminator；不把 `valid: false`、`activated: false` 或 body 中的 `error` 字段误判为 HTTP failure。

协议结构不满足时产生 `invalid_response`。字段 required、nullability、金额、timestamp、relationship target 与 enum members 不做逐值 runtime rejection。

### Unknown response data

- parser 保留未知 attributes、relationships、meta、links 和 included resources；不 strip、不 reject。
- 已知 attributes interfaces 不添加 `[key: string]: unknown`，避免拼写错误和错误属性访问静默通过。
- 消费者需要访问 SDK 尚未知的字段时，使用 narrowing、显式局部类型扩展或 `unknown` fallback。
- 新 response field 或 relationship 的到达不依赖先发布新版 SDK。

### Enum direction

Response enum 是开放世界：

```ts
type OpenString<Known extends string> = Known | (string & Record<never, never>);

type OrderStatus = OpenString<
  "pending" | "failed" | "paid" | "refunded" | "fraudulent"
>;
```

它保留已知值 autocomplete，但不允许消费者假设 switch 永远穷举。

Request enum 是封闭世界。只有官方确认 endpoint 接受的值才可发送；未知值与拼写错误在 TypeScript 和资源校验层被拒绝。

不得默认复用一个 union 同时代表 request 与 response。

### Opaque user data

只有资源契约明确标记的 caller-owned subtree 接受任意键，例如：

```ts
interface CreateCheckoutInput {
  readonly checkoutData?: {
    readonly custom?: Readonly<Record<string, unknown>>;
  };
}
```

这些键和值不参与 camelCase → snake_case 转换、字段生成、runtime validation 或 drift 推断。SDK 其他 request fields 不提供全局 `Record<string, unknown>` escape hatch。

### Webhook direction

Contract Catalog 分开：

- `webhooks` resource 的 create/update subscription input；
- 入站 Webhook delivery 的 event name 与 payload mapping。

管理 Webhook 时的 event list 使用封闭 `WebhookSubscriptionEventName`，阻止订阅官方未支持的事件。

入站 event name 使用开放策略：已知事件具有精确 event-to-resource mapping，未知事件保留原 event name 与 `UnknownJSONAPIResource` fallback。receiver 强制先对 Webhook raw body 验签再解析，并返回带 `known` 与 `eventName` 判别字段的开放联合；完整 Interface 与边界见 [v5 Webhook 接收端契约](./webhook-receiver-contract.md)。

## Evidence 与冲突处理

### Evidence kinds

每个新增、删除、收窄或冲突的 contract fact 必须链接 supporting evidence。证据类型为：

| Evidence                       | 可以证明                                 | 不能单独证明                              |
| ------------------------------ | ---------------------------------------- | ----------------------------------------- |
| 当前官方 object/endpoint prose | 文档明确声明的字段、参数、枚举、relation | 未说明项不存在                            |
| 官方 changelog                 | 变化时间、明确新增/修改                  | 当前完整 shape                            |
| 官方 JSON/curl example         | 某个示例 shape/value 曾被文档展示        | required、完整枚举、所有 nullability      |
| 脱敏 Test Mode observation     | 某 shape/value 曾真实出现于 Test Mode    | production 完整性、字段永远存在、枚举封闭 |
| v4 compatibility baseline      | v4 已承诺的 public names/shapes          | 当前 API 真实 shape                       |

网页抽取或 hash 只是 drift signal，不是新的 evidence authority。

### Conflict rules

- 证据冲突必须显式记录，不按 source 数组顺序或简单权重静默覆盖。
- 当前官方 object/endpoint prose 与 changelog 是主要人工判断输入。
- example 与 observation 可以扩大 response 可能性，不能自动删除字段、缩窄类型、改 optional 为 required 或把 enum 设为 closed。
- 仅 observation 支持的字段标为 optional/observed。
- unresolved conflict 使用保守、可向前兼容的 Canonical 类型。
- Compatibility projection 只因已确认的兼容决策改变；Canonical drift 不得自动重写 v4 public names。
- 任何 source 建议的 breaking change 都必须由人工 PR 明确批准。

### Current provisional fields

Subscription object 当前 prose、changelog 与 JSON example 对 URL key 存在冲突。Canonical v5 暂时表达：

```ts
interface SubscriptionUrls {
  readonly update_payment_method: string;
  readonly customer_portal: string;
  readonly customer_portal_update_subscription?: string;
  readonly update_customer_portal?: string;
}
```

Compatibility `Subscription` 继续保护 v4 的 `customer_portal_update_subscription` 名称；可以 additive 地暴露另一可选键。真实 Test Mode evidence 或官方澄清可在后续 minor/beta 中收敛 Canonical 类型，但不能未经证据把任一键设为唯一 required key。

Affiliate `products` 只被官方描述为 JSON，公开示例是 `null`，没有非空 element schema。Canonical v5 使用：

```ts
readonly products: JSONValue | null;
```

不得猜测为 product IDs、Product resources 或特定 object array。

## Compatibility type projection

- 根入口与 `./compat` 精确保留已决定的 92 个 v4 direct type names。
- Canonical 命名不复用含义冲突的 v4 response 名；例如 `OrderResponse` 是 Canonical，`Order` 是 Compatibility name。
- 当 Canonical 类型对 v4 source-compatible 时，Compatibility name 可以是 alias。
- 当 readonly、开放 enum、runtime/d.ts 修正或旧 envelope 语义会改变 v4 source assignability 时，使用独立 Compatibility projection。
- Compatibility projection 不是第二套 runtime 或 endpoint model；它只改变 declaration view。
- v4 type names 不再复制已明确修正的缺陷，包括错误 data 类型、invoice optional params、subscription-item overload、错误 enum members、错误 timestamp 类型和 response casing。
- `JSONAPIError`、共享 response primitives、Webhook event names 等参与公共 signatures 的类型必须从正式公共入口可命名导入。

Canonical 与 Compatibility declaration snapshots 都是发布前必检产物。

## v5 beta 最低 API 覆盖

Contract Catalog 和 Canonical types 至少包含此前漂移审计确认的变化：

1. `Affiliates` resource：get/list、`storeId`/`userEmail` filters、`active | pending | disabled` known status、`store`/`user` relationships、`products: JSONValue | null`。
2. `Subscription.payment_processor`，known values 为 `stripe | paypal`，response 保持开放。
3. `Order.affiliate_id`、`Order.referral_amount` 与 `affiliate` relationship。
4. `SubscriptionInvoice.affiliate_id`、`referral_amount` 与 `affiliate` relationship。
5. `Customer.affiliates` to-many relationship。
6. `affiliate_activated` 与 `customer_updated` Webhook events，并保留 `subscription_payment_refunded`。
7. `ListOrdersParams.filter.orderNumber` → `filter[order_number]`。
8. `InvoiceBillingReason` known values `initial | renewal | updated`。
9. `InvoiceStatus` known values `pending | paid | void | refunded | partial_refund`。

并修正 v4 类型快照中的结构问题：

- response timestamps 全部使用 snake_case ISO string，不使用 `Date` 或 camelCase；
- response page meta 保持 wire snake_case；
- Subscription status known values 不包含错误的 `pause`，不重复 `cancelled`；
- relationships 区分 to-one/to-many/null，不再依赖一个全局 `Record`；
- list links 保留实际出现的 `first`、`last`、`next?`、`prev?`；
- runtime 与 declaration 的 optional params/overloads 一致；
- error body 不再静态冒充业务 response data。

## Drift detection

### Candidate-only automation

自动化可以：

- 监控官方 changelog 和已引用 docs 页面变化；
- 比较页面 hash 或规范化抽取结果；
- 对 sanitized Test Mode fixtures 生成 shape diff；
- 对 future official schema 生成候选 Catalog diff；
- 分类 additive、contradictory、observed-only 和 potentially breaking 变化；
- 生成报告或待审核 PR 输入。

自动化不可以：

- 直接修改 Contract Catalog、public types 或 serializers；
- 根据 example 缺失删除字段；
- 根据一次 observation 把 optional 改为 required；
- 自动缩窄 nullability 或 enum；
- 直接发布 generated change。

### Required human review

每个 accepted drift change 必须在 PR 中同时展示：

1. official evidence 或 sanitized observation；
2. typed contract diff；
3. Canonical declaration diff；
4. Compatibility declaration diff；
5. serializer/operation diff；
6. semver classification；
7. conflict 或 uncertainty resolution。

### Local consistency checks

CI 最低验证：

- Contract Catalog TypeScript 编译；
- 21 个 Resource namespace 均有相应 contract/type coverage；
- operation input keys 与 wire mappings 一致；
- relationship target 与 resource type 可解析；
- known enum/event values 无重复；
- Opaque user data 不进入 key conversion；
- 60 个 Compatibility runtime names 与 92 个 direct type names 精确匹配 snapshot；
- generated artifacts clean；
- Canonical 和 Compatibility declarations 可由 ESM/CJS consumer typecheck；
- response fixtures 可通过 shallow protocol validation，未知字段和值不被删除；
- serializer fixtures 覆盖 `undefined`、`null`、falsy、数组和 opaque maps。

漂移监测的具体 schedule、CI job、失败策略和 stable release gate 由后续测试与发布治理票决定。

### Future official schema

未来若 Lemon Squeezy 发布机器可读 schema：

- 原始 schema 和版本/digest 作为新的 true-external evidence；
- importer 只生成 candidate diff；
- SDK naming、Compatibility projection、Opaque user data 和人工业务语义继续由本仓库维护；
- 首次引入必须审查全量 semantic drift；
- official schema 不未经审核直接替换 public declarations。

## 验收场景

实施测试至少证明：

1. `OrderResponse.data.type` 精确为 `"orders"`，response fields 保持 snake_case。
2. `OrderStatus` 接受未来 string，同时 IDE 保留已知 literals。
3. request enum 拒绝未知值。
4. JSON:API response 新增 attribute/relationship 时 runtime 保留整个值。
5. 已知 attributes 上的拼错属性产生 TypeScript 错误。
6. to-one、nullable to-one 与 to-many relationships 产生不同类型。
7. resource `include` 拒绝其他资源的 relationship name。
8. unknown included resource 可由 `UnknownJSONAPIResource` 表达。
9. `checkoutData.custom.customerID` 不转换为 `customer_id`。
10. 未知入站 Webhook event 可进入 fallback，不伪装成已知 payload。
11. Webhook create/update input 拒绝未知 event subscription name。
12. Subscription URL 两个 provisional keys 均可安全判断。
13. `Affiliate.products` 接受任意 JSON value 或 `null`，不接受函数与 `undefined`。
14. v4 的 92 个 type imports 保持可用，Canonical response names 不与其冲突。
15. runtime method optionality/overload 与 declarations 一致。
16. docs drift report 不会自动修改或发布类型。

## 明确不采用

### 全手写分散模型

不继续让 resource types、endpoint runtime、relationship registry、serializer 和 root exports 分别维护相同事实。v4 的 enum、timestamp、casing、overload 与 API drift 已证明该模型缺少 Locality。

### 官方网页全生成

不把 HTML scraper、prose 或 JSON examples 当作 schema。它们最多产生 candidate drift signal；required、nullability、cardinality、ownership 和业务语义仍需人工判断。

### 完整 schema compiler

首个 v5 beta 不建设通用 IR、source priority engine、overlay language、projection plugin framework 或未来 OpenAPI adapter。当前没有 official machine schema，也没有足够 Adapter 证明这套复杂 Interface 能产生近期 Leverage。

### 严格 response parser

不逐字段验证或 strip API response，不因未知字段、relationship、included resource、enum value 或 Webhook event 拒绝合法的兼容性变化。

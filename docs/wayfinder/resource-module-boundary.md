# v5 资源覆盖与 Namespace Module 契约

状态：已确认，作为 LemonSqueezy SDK v5 beta 的实施输入。

关联票据：[定义资源覆盖与模块边界](https://github.com/terminalzero-dev/lemonsqueezy.js/issues/8)

证据与原型：

- [v5 资源与 operation 覆盖调查](../research/v5-resource-coverage.md)
- [Namespace Module 交互原型](../../src/prototypes/resource-module-boundary.prototype.html)
- [可编译 TypeScript Interface 原型](../../src/prototypes/resource-module-boundary.prototype.ts)

## 决策摘要

v5 beta 完整覆盖当前官方公开 API：21 个 Namespace Module、61 个 Explicit Client 方法。20 个 Namespace Module 对应 Authenticated API resources，`license` 对应独立 License API 协议。

每个 Explicit Client 方法恰好映射一个 co-located、可执行的 Operation Contract。Operation Contract 负责编译封闭的协议请求并声明成功响应形状；单一 Resource Runtime 调用 HTTP Core，并为 Explicit Client 与 Compatibility facade 提供同一执行结果。

每个 Namespace Module 共同拥有：

- Canonical public types；
- 该 namespace 的 Operation Contracts；
- request compiler 与 response kind；
- 官方 evidence pointers；
- 显式 namespace adapter；
- 通过 namespace Interface 执行的测试。

Compatibility facade 不是第二套资源实现。它只把 v4 参数投射到同一 Operation Contract，再把 Resource Runtime 的结果投射为 Compatibility envelope。

## 覆盖事实

截至 2026-08-12，官方公开资料包含：

- 20 个 Authenticated JSON:API resources，共 57 个 endpoint operations；
- 3 个 License API form operations；
- 17 个已知 Inbound Webhook event names。

Explicit Client 另外保留 `customers.archive` convenience。它与 `customers.update` 共用官方 Customer PATCH endpoint，但表达独立、稳定的 SDK 语义。因此：

```text
57 Authenticated endpoint operations
+ 3 License API operations
+ 1 customers.archive convenience
= 61 Explicit Client methods
```

v4 能力可映射为 20 个 namespaces、59 个方法。当前唯一完全缺失的官方 endpoint coverage 是 Affiliates 的 `get`、`list`。两个 refund operation 已存在于 v4，但 v4 强制 `amount`，不能表达官方支持的全额退款。

完整一手证据和逐 endpoint 矩阵见 [v5 资源与 operation 覆盖调查](../research/v5-resource-coverage.md)。

## v5 beta operation set

| Namespace              | Canonical methods                            |   数量 |
| ---------------------- | -------------------------------------------- | -----: |
| `users`                | `getAuthenticated`                           |      1 |
| `stores`               | `get`, `list`                                |      2 |
| `customers`            | `create`, `get`, `update`, `list`, `archive` |      5 |
| `products`             | `get`, `list`                                |      2 |
| `variants`             | `get`, `list`                                |      2 |
| `prices`               | `get`, `list`                                |      2 |
| `files`                | `get`, `list`                                |      2 |
| `orders`               | `get`, `list`, `generateInvoice`, `refund`   |      4 |
| `orderItems`           | `get`, `list`                                |      2 |
| `subscriptions`        | `get`, `list`, `update`, `cancel`            |      4 |
| `subscriptionInvoices` | `get`, `list`, `generateInvoice`, `refund`   |      4 |
| `subscriptionItems`    | `get`, `list`, `update`, `currentUsage`      |      4 |
| `usageRecords`         | `create`, `get`, `list`                      |      3 |
| `discounts`            | `create`, `get`, `list`, `delete`            |      4 |
| `discountRedemptions`  | `get`, `list`                                |      2 |
| `licenseKeys`          | `get`, `list`, `update`                      |      3 |
| `licenseKeyInstances`  | `get`, `list`                                |      2 |
| `checkouts`            | `create`, `get`, `list`                      |      3 |
| `webhooks`             | `create`, `get`, `update`, `delete`, `list`  |      5 |
| `license`              | `activate`, `validate`, `deactivate`         |      3 |
| `affiliates`           | `get`, `list`                                |      2 |
| **合计**               |                                              | **61** |

不得根据“资源通常有 CRUD”补造方法。只读 resources 保持只读；Affiliate 当前不提供 `create`、`update` 或 `delete`。

## Canonical method signatures

### 参数顺序

所有 Explicit Client 方法遵循：

1. 业务 ID，如 operation 需要；
2. write input 或 query params，如 operation 需要；
3. 可选 `RequestOptions`。

`RequestOptions` 永远是最后一个参数。它只包含 HTTP Core 已决定的 `signal` 和 `timeoutMs`。

### Read operations

普通 resource read operations 使用：

```ts
get(
  id: Id,
  params?: GetResourceParams,
  options?: RequestOptions,
): Promise<ResourceResponse>;

list(
  params?: ListResourcesParams,
  options?: RequestOptions,
): Promise<ResourceListResponse>;
```

Users 的当前 endpoint 是固定的 `/v1/users/me`，不伪造 ID 或 list：

```ts
users.getAuthenticated(options?: RequestOptions): Promise<UserResponse>;
```

### Create 与 update

Create input 自己拥有创建所需的 relationship IDs，不另加位置参数：

```ts
customers.create(input: CreateCustomerInput, options?: RequestOptions);
webhooks.create(input: CreateWebhookInput, options?: RequestOptions);
checkouts.create(input: CreateCheckoutInput, options?: RequestOptions);
```

例如 `storeId`、`variantId` 和 `subscriptionItemId` 属于相应 input。Operation Contract 负责把这些 camelCase fields 投射为 attributes、relationships、query 或 form；HTTP Core 不猜字段位置。

Update 使用：

```ts
update(id: Id, input: UpdateResourceInput, options?: RequestOptions);
```

Canonical `subscriptionItems.update` 只接受 `UpdateSubscriptionItemInput` object。Compatibility facade 继续支持 v4 runtime 已接受的 number shorthand，并在 adapter 中转换为 Canonical input。

### Archive 与 cancel

```ts
customers.archive(id: Id, options?: RequestOptions): Promise<CustomerResponse>;
subscriptions.cancel(
  id: Id,
  options?: RequestOptions,
): Promise<SubscriptionResponse>;
```

`customers.archive` 有独立 Operation Contract，固定编译为 Customer PATCH + archived status。它可以复用低层 helper，但不得变成一个只存在于 Compatibility facade 的 wrapper。

Subscription cancel 虽使用 DELETE，成功时返回 Subscription JSON:API document；不能从 HTTP method 推断为 `void`。

### Invoice actions

```ts
orders.generateInvoice(
  id: Id,
  input?: GenerateOrderInvoiceInput,
  options?: RequestOptions,
): Promise<GenerateOrderInvoiceResponse>;

subscriptionInvoices.generateInvoice(
  id: Id,
  input?: GenerateSubscriptionInvoiceInput,
  options?: RequestOptions,
): Promise<GenerateSubscriptionInvoiceResponse>;
```

官方允许省略 invoice input；Canonical signatures 与 runtime 必须一致。返回值保持官方 non-resource invoice body，不伪装成 Order 或 Subscription Invoice resource。

### Refund actions

```ts
interface RefundOrderInput {
  readonly amount?: number;
}

orders.refund(
  id: Id,
  input?: RefundOrderInput,
  options?: RequestOptions,
): Promise<OrderResponse>;
```

Subscription Invoice 使用等价的独立 input type。省略 input 或省略 `amount` 都表示全额退款；提供合法 `amount` 表示部分退款。Compiler 省略未提供的 attribute，不注入默认值。显式 `0` 进入 validation，而不是被当作缺失。

### Empty operations

```ts
discounts.delete(id: Id, options?: RequestOptions): Promise<void>;
webhooks.delete(id: Id, options?: RequestOptions): Promise<void>;
```

成功的 204 body 在 runtime 是 `undefined`。Compatibility adapter 投射为 `{ statusCode: 204, data: null, error: null }`。

### License API

License Canonical methods 全部接受对象 input：

```ts
license.activate(
  input: ActivateLicenseInput,
  options?: RequestOptions,
): Promise<ActivateLicenseResponse>;

license.validate(
  input: ValidateLicenseInput,
  options?: RequestOptions,
): Promise<ValidateLicenseResponse>;

license.deactivate(
  input: DeactivateLicenseInput,
  options?: RequestOptions,
): Promise<DeactivateLicenseResponse>;
```

Compatibility facade 保留 v4 positional call shapes。License Keys 是业务输入，不是 API credential。

## Namespace Module seam

### 外部与内部 Interface

```text
Explicit Client namespace ─┐
                           ├─ Operation Contract
Compatibility facade ──────┘        │
                                    ▼
                         Resource Runtime.invoke
                                    │
                                    ▼
                               HTTP Core
                                    │
                       ┌────────────┴────────────┐
                       │                         │
                production fetch        recording test adapter
```

调用方只接触已经冻结的 namespace Interface。Operation Contract、Resource Runtime、HTTP Core adapter、recording adapter、contract registry 与 evidence types 均为内部 Interface，不从 package exports 暴露。

Lemon Squeezy HTTP 是 true-external dependency。生产 fetch 与 recording test adapter 使 HTTP Core 的内部 seam 成为真实 seam；不因测试需要把 transport injection 加入公共 Client options。

### 默认目录

21 个 Namespace Module 位于：

```text
src/namespaces/
  orders/
    types.ts
    contract.ts
    namespace.ts
    orders.test.ts
  subscription-invoices/
    types.ts
    contract.ts
    namespace.ts
    subscription-invoices.test.ts
  license/
    types.ts
    contract.ts
    namespace.ts
    license.test.ts
```

目录使用 kebab-case，公共 namespace properties 使用已确认的 camelCase。

默认不采用 method-per-file，也不预建 `operations/`、`schemas/` 或 `adapters/` 子层。某个文件只有在实际失去可读性时才按职责拆分；拆分不改变 Module Interface 或把一个 endpoint 的知识移到全局 registry。

### Ownership

每个 Namespace Module 拥有：

- 该 namespace 的 Canonical resource、response、params 与 input types；
- resource type、relationships、known values 和 evidence；
- 所有公开 methods 的 Operation Contracts；
- 参数 validation 与 request compiler；
- namespace adapter；
- namespace Interface tests。

共享 Module 拥有：

- JSON:API primitives；
- `RequestOptions` 与 `LemonSqueezyError`；
- Resource Runtime；
- HTTP Core；
- Explicit Client composition root；
- Default Client 与 Compatibility adapters；
- `KnownLemonSqueezyResource` 和 package public export assembly。

Namespace Module 之间禁止 runtime imports。Relationship types 使用共享 `JSONAPIResourceIdentifier<"resource-type">`，typed contracts 使用字符串 target。`KnownLemonSqueezyResource` 在中央 type assembly 中从已知 resource exports 机械汇总，避免 resource-to-resource runtime cycles。

## Operation Contract

### Internal shape

下列为实施约束，不是公共 import：

```ts
declare const operationResult: unique symbol;

interface OperationContract<Args extends readonly unknown[], Result> {
  readonly key: `${NamespaceName}.${string}`;
  readonly compile: (args: Args) => CoreRequest;
  readonly success: SuccessContract;
  readonly evidence: readonly EvidencePointer[];
  readonly [operationResult]?: Result; // phantom inference only
}

interface ResourceRuntime {
  invoke<Args extends readonly unknown[], Result>(
    operation: OperationContract<Args, Result>,
    args: Args,
    options?: RequestOptions
  ): Promise<CoreSuccess<Result>>;
}

interface CoreSuccess<Result> {
  readonly statusCode: number;
  readonly body: Result;
}
```

每个 Explicit Client method 恰好对应一个 Operation Contract，共 61 个。Contract key 全局唯一，并与 `<namespace>.<method>` 精确相同。

`compile` 是人工维护的纯函数，不是 runtime schema compiler。它可以使用共享的小型 protocol helpers，但不得进行 I/O、读取 Client state、调用 fetch 或返回任意 URL。

### Success contracts

内部 `SuccessContract` 是封闭 union：

| Kind             | 用途                                              |
| ---------------- | ------------------------------------------------- |
| `jsonapi-single` | single resource get/create/update/action response |
| `jsonapi-list`   | paginated resource list response                  |
| `meta-only`      | Subscription Item current usage                   |
| `invoice`        | 两个 generate-invoice non-resource response       |
| `empty`          | Discount/Webhook 204 delete                       |
| `license-json`   | 三个 License API plain JSON response              |

HTTP method 与 success kind 正交：

- DELETE + `empty` 不解析 JSON；
- DELETE + `jsonapi-single` 解析 Subscription body；
- GET + `meta-only` 不要求 resource `data`；
- POST + `invoice` 不要求 JSON:API resource；
- `license-json` 使用业务 discriminator，但业务否定 boolean 不构成 HTTP failure。

Resource Runtime 根据 success kind 执行已决定的 shallow protocol validation。HTTP Core 只负责协议 headers/auth、单次请求、status、JSON/text/empty parsing、取消、超时和错误规范化。

新增 success kind 需要至少一个真实官方 operation，且必须在本 Module 的 tests 和中央 completeness checks 中显式加入。不得为假想 endpoint 扩展 union。

### Request compiler rules

Compiler 必须遵循 HTTP Core 契约：

- 固定 path template，只对独立 path segment percent-encode；
- params/inputs 使用 Canonical camelCase；
- 显式映射到 query bracket names、JSON:API attributes/relationships 或 License form fields；
- 省略 `undefined` 和 endpoint 指定的空集合；
- 保留合法的 `null`、`false`、`0` 与空字符串；
- Opaque user data 原样传递；
- 不递归猜测未知对象的 wire names；
- 不读取 API credential、base URL、Default Client 或 Error observer。

参数 validation 在 `ResourceRuntime.invoke()` 的 Promise boundary 内运行。已知失败 reject `LemonSqueezyError` with `validation`，不产生网络请求，也不重新引入 v4 的同步 throw 差异。

## Explicit Client composition

`createClient()` 创建一个 immutable Resource Runtime，然后显式装配 21 个 Namespace Module：

```ts
return Object.freeze({
  users: createUsersNamespace(runtime),
  stores: createStoresNamespace(runtime),
  // ...全部已确认 namespaces，显式列出
  webhooks: createWebhooksNamespace(runtime),
  license: createLicenseNamespace(runtime),
  affiliates: createAffiliatesNamespace(runtime),
});
```

Client、namespace objects 和 method references 在实例生命周期内稳定并冻结。

Composition root 不使用 Proxy、reflection、dynamic registration、plugin discovery 或基于 descriptor 的 runtime namespace generation。显式 21 行装配是公共覆盖审查点，不是应被隐藏的重复。

## Compatibility projection

59 个 v4 resource facade functions 映射到相应 Canonical Operation Contracts。`lemonSqueezySetup` 是第 60 个 root runtime name，但不是 resource operation。

例如：

```ts
function issueOrderRefund(orderId: Id, amount?: number) {
  return invokeCompatibility(getDefaultRuntime, ordersContract.refund, [
    orderId,
    amount === undefined ? undefined : { amount },
  ]);
}
```

Compatibility adapter 可以改变：

- 参数位置与 shorthand；
- Canonical result 到 Compatibility envelope 的投射；
- validation rejection 与其他错误 envelope 的既定差异；
- Error observer notification。

Compatibility adapter 不得复制或覆盖：

- method/path/protocol；
- query/body/form serialization；
- API credential 或 License protocol handling；
- response parsing；
- endpoint validation rules。

相同业务场景通过 Explicit Client 与 Compatibility facade 必须产生 byte-equivalent CoreRequest；允许的差异只有 Client configuration、每次 RequestOptions 和结果投射。

## Protocol boundaries

### License Namespace Module

`license` 使用与其余 modules 相同的 namespace/contract/runtime pattern，但不是 JSON:API resource。

它的 Operation Contracts：

- 只编译已确认的 form fields；
- 不读取或要求 API credential；
- 不使用 JSON:API serializer；
- 不把 License Key 写入错误、日志或 diagnostic request body；
- 使用 `license-json` success kind；
- 把 HTTP 200 + `valid: false`、`activated: false` 或业务 `error` 保持为成功 response。

### Webhook Management API

`webhooks` Namespace Module 只拥有：

- create/get/update/delete/list registrations；
- Webhook resource types；
- management create/update inputs；
- 可订阅 event name 的 closed request union；
- Webhook management evidence 与 tests。

Inbound Webhook delivery 不计入 61 个 Client methods，也不进入 `webhooks` operation contracts。

Inbound event payload types 复用 Canonical resource types；独立 receiver module 负责 raw-body HMAC validation、最低 envelope validation 与 event narrowing。acknowledgment、retry、框架适配和幂等仍由应用负责，完整 Interface 与 module location 见 [v5 Webhook 接收端契约](./webhook-receiver-contract.md)。

不把官方模拟页单独出现的 `subscription_plan_changed` 当作正式可订阅 event；不推断官方未公开的 delivery ID、timestamp 或 replay window。

## Beta gaps that must be closed

实施 v5 beta 时必须：

1. 新增 `affiliates` Namespace Module，以及 `get`、`list` Operation Contracts。
2. `affiliates.list` 覆盖 `storeId`、`userEmail` filters。
3. 两个 refund Canonical inputs 允许省略 `amount`，并正确编译全额退款。
4. 两个 invoice actions 的 input optionality 与 runtime 对齐。
5. Canonical `subscriptionItems.update` 使用对象 input；Compatibility adapter 保留 number shorthand。
6. 将 `users.getAuthenticated` 映射到固定 `/v1/users/me`。
7. 为 Discount/Webhook delete 声明 `empty`，为 Subscription cancel 声明 `jsonapi-single`。
8. 为 current usage 声明 `meta-only`，为 invoice actions 声明 `invoice`。
9. 为三个 License methods 声明 `license-json` 和封闭 form mapping。
10. 纳入数据类型契约已确认的 2025/2026 fields、relationships、filters、known values 和 events。

## Deferred or excluded

以下不进入 v5 beta operation set：

- 未文档化的 Affiliate create/update/delete；
- 自动分页、async iterator、`listAll` 或跨页并发；
- batch/bulk helpers；
- generic/raw request；
- consumer transport、middleware、retry 或 resource plugin；
- runtime resource subpath exports；
- 由 UI 能力推断但官方 API reference 未公开的 endpoints；
- `affiliate_id` filters，除非官方明确文档化；
- `subscription_plan_changed` 正式 event 支持，除非获得足够 evidence；
- Inbound Webhook receiver Interface；
- 完整 response field runtime schema validation。

新增公开 endpoint 后可以在相应 Namespace Module 中 additive 地增加方法，但必须先更新 Contract Catalog evidence、Canonical signatures、Client composition coverage 和 semver classification。

## Test Interface

### Namespace behavior

每个 Namespace Module 通过绑定后的 namespace Interface 测试，不直接调用 private compiler。

测试创建真实 Resource Runtime 并注入 private Recording HTTP Adapter：

```text
namespace method
  → Operation Contract
  → Resource Runtime
  → Recording HTTP Adapter
```

测试观察：

- 编译后的 method/path/query/body/form；
- RequestOptions 传递；
- response kind 与 shallow validation；
- Explicit Client body/void 结果；
- validation 时零网络请求；
- unknown response data 保留。

### Cross-projection parity

每个有 v4 facade mapping 的 operation 至少有一个 parity case：

```text
Explicit Client call ─────┐
                          ├─ same recorded CoreRequest
Compatibility facade call ┘
```

Parity test 不重复 HTTP Core 的 status/error matrix，只证明两个公共表面没有形成第二套 endpoint implementation。

### HTTP Core

HTTP Core 独立通过自己的 Interface 验证：

- JSON、text 和 empty response；
- 204/205；
- JSON:API error body；
- network、abort、timeout、invalid response；
- actual status preservation；
- credential/header/protocol handling；
- 一次调用最多一次网络尝试。

### Completeness and type checks

CI 最低锁定：

- 21 个 namespace names；
- 61 个 Canonical method names 与 signatures；
- 61 个唯一 Operation Contract keys；
- 58 个 Authenticated Client methods、3 个 License methods；
- protocol、HTTP method/path 和 success kind snapshot；
- 每个 Operation Contract 至少一个 evidence pointer；
- 每个 method 恰好一个 namespace adapter mapping；
- 59 个 facade resource functions 的 Operation Contract mapping；
- Canonical/Compatibility declaration consumer tests；
- Namespace Module 之间没有 runtime dependency cycle；
- internal paths、contracts、runtime 和 test adapters 不可从 package 导入。

旧 `$fetch`、recursive key converter、global Relationships 和浅 helper 的实现级测试在新 Interface coverage 建立后删除。测试不穿透 seam，也不同时保留新旧实现测试。

上述 Interface、parity、completeness 与 type checks 全部属于默认 credential-free merge gate；Test Mode integration 只保留代表性 canary。完整分层与真实 API 安全边界见 [v5 测试分层与真实 API 安全边界](./test-strategy-safety-boundary.md)。

## 验收场景

实施至少证明：

1. 两个 Explicit Client instances 的 namespace objects 稳定且完全隔离。
2. `users.getAuthenticated()` 请求 `/v1/users/me`，不接受 ID。
3. `affiliates.get/list` 存在，且没有 Affiliate write methods。
4. `orders.refund(id)` 和 `subscriptionInvoices.refund(id)` 不发送 `amount`。
5. 显式 refund amount 正确发送；`0` 被 validation 拒绝而非被视为缺失。
6. generateInvoice input 可省略并返回 non-resource response。
7. Discount/Webhook delete 204 不解析 JSON，Explicit Client 返回 `void`。
8. Subscription cancel DELETE 解析并返回 Subscription response。
9. currentUsage 接受 meta-only success，不要求 `data`。
10. License validate 发送 form、不发送 Bearer，并把 `valid: false` 作为成功 body。
11. Webhook management 与 Inbound Webhook delivery 不共享 Operation Contract。
12. Compatibility positional inputs 与 Canonical object inputs 产生相同 CoreRequest。
13. 新 relationship 或 response field 不要求修改 HTTP Core。
14. Namespace Module 只通过 Resource Runtime 产生 I/O。
15. 21/61 completeness check 对缺失、多余或重复 mapping 失败。

## 未采用的设计

### 自动绑定整个 Contract Catalog

一个通用 binder 可以从 contracts 自动生成所有 namespace methods，使 Resource Runtime Interface 极小。但 61 个固定公共方法并不需要 runtime reflection；自动 binding 会让 stack trace、generic diagnostics 和 public composition 更间接。

因此不使用 Proxy、动态 method creation 或从 registry 推导 runtime namespaces。机械 completeness checks 保留，公共方法仍显式编写。

### Passive catalog + direct HTTP namespace methods

普通 namespace factory 直接构造请求最容易逐行调试，但 method/path/response kind 会同时存在于 passive Contract Catalog 和 runtime method，形成两个事实源。

因此 Operation Contract 必须可执行，namespace adapter 只把 public args 交给它；不得在 adapter 中重写 endpoint 请求。

### Method-per-file

61 个独立 method modules 会产生大量浅 Interface、imports、barrels 和测试装配。多数 namespace 只有 1–5 个 methods，资源整体 Locality 比单 method 文件更有价值。

因此默认以 Namespace Module 为维护单元，只在真实文件规模问题出现时按职责拆分。

### 通用 endpoint/schema framework

不增加 public Operation、runtime schema AST、plugin registry、generic CRUD builder、source adapter framework 或完整 code generator。Operation Contract 只表达当前 61 个真实方法所需的协议编译与成功形状。

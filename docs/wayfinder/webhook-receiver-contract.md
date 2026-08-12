# v5 Webhook 接收端契约

## 结论

v5 beta 包含独立的 Inbound Webhook receiver。它不属于 Explicit Client、`webhooks` 管理 namespace 或 61 个 Client methods。

公共 runtime 只有一个主操作：同步 `parseWebhookEvent()`。它强制按照以下顺序执行：

```text
Webhook raw body + signature + signing secret
  → HMAC-SHA256 authentication
  → JSON parsing
  → minimum envelope validation
  → known event narrowing or unknown event fallback
```

SDK 不公开 verify-only、未验签 parser、泛型 receiver factory、框架 request adapter 或 handler runner。这个 Interface 用一个调用隐藏密码学细节、解析顺序、17 个 event mappings 和未来事件兼容策略。

## 公共 Interface

根入口公开 runtime：

```ts
export function parseWebhookEvent(
  input: ParseWebhookEventInput
): InboundWebhookEvent;

export class WebhookError extends Error {
  readonly name: "WebhookError";
  readonly code: WebhookErrorCode;
  readonly cause?: unknown;
}

export function isWebhookError(value: unknown): value is WebhookError;
```

Canonical webhook types 从 `@terminalzero/lemonsqueezy/types` 集中导出。v5 beta 不增加 `./webhooks`、`./receiver` 或 runtime resource subpath。

```ts
export type WebhookRawBody = string | Uint8Array | ArrayBuffer;

export interface ParseWebhookEventInput {
  readonly secret: string;
  readonly rawBody: WebhookRawBody;
  readonly signature: string;
}

export type WebhookErrorCode = "invalid_signature" | "invalid_payload";
```

`Buffer` 通过 `Uint8Array` 兼容。`string` 按 UTF-8 编码；`Uint8Array` 只使用当前 view 的 `byteOffset` 与 `byteLength`；`ArrayBuffer` 使用其全部字节。

不接受 parsed object、Fetch `Request`、Node request、stream 或 framework context。调用方必须在任何 JSON parsing 之前取得 Webhook raw body。

## 签名契约

`signature` 是 `X-Signature` header 的值。receiver 使用 signing secret 对 Webhook raw body 计算 HMAC-SHA256，并把官方 hex digest 以常量时间方式比较。

- 签名必须是 64 位十六进制字符串；大小写均可接受。
- 格式、长度或 HMAC 不匹配统一产生 `invalid_signature`，不泄漏比较细节。
- 只有签名通过后才运行 JSON parser。
- `X-Event-Name` 不进入公共 input，也不是类型判断的信任源；event name 读取已签名 body 的 `meta.event_name`。
- v5 beta 目标 Node 22、Node 24 与 Bun `>=1.3.14 <2`，使用同步 in-process crypto；不为明确排除的 Edge/WebCrypto 增加异步 factory。完整范围见 [v5 运行时与包产物支持矩阵](./runtime-package-support-matrix.md)。

签名验证只证明给定 body 与给定 secret 的 HMAC 匹配。它不证明 freshness、delivery 唯一性、幂等处理或防重放。

## Event envelope

receiver 返回带 SDK 派生 discriminants 的原始 envelope 投射：

```ts
export type WebhookEventMeta<Name extends string = string> = Readonly<
  Record<string, JSONValue>
> & {
  readonly event_name: Name;
  readonly custom_data?: Readonly<Record<string, JSONValue>>;
};

type WebhookEventEnvelope<
  Name extends string,
  Resource extends UnknownJSONAPIResource,
  Known extends boolean,
> = Readonly<Record<string, JSONValue>> & {
  readonly known: Known;
  readonly eventName: Name;
  readonly meta: WebhookEventMeta<Name>;
  readonly data: Resource;
};

export type KnownInboundWebhookEvent = {
  readonly [Name in KnownWebhookEventName]: WebhookEventEnvelope<
    Name,
    WebhookEventResourceMap[Name],
    true
  >;
}[KnownWebhookEventName];

export type UnknownInboundWebhookEvent = WebhookEventEnvelope<
  string,
  UnknownJSONAPIResource,
  false
>;

export type InboundWebhookEvent =
  | KnownInboundWebhookEvent
  | UnknownInboundWebhookEvent;
```

`known` 与 `eventName` 是 SDK 派生的 ergonomic fields；签名 body 中的 `meta.event_name` 原样保留，并始终与 `eventName` 相等。显式 `known` 避免开放的 `string` fallback 吞掉 TypeScript literal narrowing。

`meta.custom_data` 是 Opaque user data：键和值不转换、不生成、不逐字段校验。Envelope、meta、resource 及其 attributes/relationships 中的其他未知 JSON 字段同样保留。

## 已知事件映射

Contract Catalog 在截止日确认 17 个 known events：

| Canonical resource            | Known event names                                                                                                                                                        |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `OrderResource`               | `order_created`, `order_refunded`                                                                                                                                        |
| `CustomerResource`            | `customer_updated`                                                                                                                                                       |
| `SubscriptionResource`        | `subscription_created`, `subscription_updated`, `subscription_cancelled`, `subscription_resumed`, `subscription_expired`, `subscription_paused`, `subscription_unpaused` |
| `SubscriptionInvoiceResource` | `subscription_payment_success`, `subscription_payment_failed`, `subscription_payment_recovered`, `subscription_payment_refunded`                                         |
| `LicenseKeyResource`          | `license_key_created`, `license_key_updated`                                                                                                                             |
| `AffiliateResource`           | `affiliate_activated`                                                                                                                                                    |

完整类型关系由 `WebhookEventResourceMap` 表达：

```ts
export interface WebhookEventResourceMap {
  readonly order_created: OrderResource;
  readonly order_refunded: OrderResource;
  readonly customer_updated: CustomerResource;
  readonly subscription_created: SubscriptionResource;
  readonly subscription_updated: SubscriptionResource;
  readonly subscription_cancelled: SubscriptionResource;
  readonly subscription_resumed: SubscriptionResource;
  readonly subscription_expired: SubscriptionResource;
  readonly subscription_paused: SubscriptionResource;
  readonly subscription_unpaused: SubscriptionResource;
  readonly subscription_payment_success: SubscriptionInvoiceResource;
  readonly subscription_payment_failed: SubscriptionInvoiceResource;
  readonly subscription_payment_recovered: SubscriptionInvoiceResource;
  readonly subscription_payment_refunded: SubscriptionInvoiceResource;
  readonly license_key_created: LicenseKeyResource;
  readonly license_key_updated: LicenseKeyResource;
  readonly affiliate_activated: AffiliateResource;
}
```

已知 event name 只有在 `data.type` 与 mapping 相符时返回 `known: true`。已知 event 与错误 resource type 的组合是 `invalid_payload`；不能降级成 unknown event。

未知 event name 是成功的、已认证的 `UnknownInboundWebhookEvent`。它保留原 event name、metadata 与 `UnknownJSONAPIResource`，使官方新增兼容事件不会被 SDK runtime 拒绝。当前只有模拟页提到的 `subscription_plan_changed` 不进入 known union；若真实收到，它按 unknown event 处理。

## Runtime validation 深度

验签通过后，receiver 只验证安全路由所需的最低结构：

1. body 是合法 JSON object；
2. `meta` 与 `data` 是 object；
3. `meta.event_name` 是非空 string；
4. `data.type` 与 `data.id` 是 string；
5. known event 的 `data.type` 符合 `WebhookEventResourceMap`。

receiver 不逐字段验证 Canonical resource attributes、relationship payload、enum value、nullability 或未来 response fields，也不 strip 未知字段。官方将新增 event 与 response property 视为兼容变化，严格闭世界 parser 会把上游兼容变化升级为 SDK runtime failure。

## 错误模型

`parseWebhookEvent()` 成功时直接返回 `InboundWebhookEvent`，失败时同步抛出 `WebhookError`。它不返回 Result union，也不使用 Compatibility envelope。

| `WebhookError.code` | 含义                                                                          |
| ------------------- | ----------------------------------------------------------------------------- |
| `invalid_signature` | signature 格式、长度或 HMAC 不匹配；payload 没有被解析                        |
| `invalid_payload`   | 已认证 body 不是 JSON、缺少最低 envelope、routing field 错误或 mapping 不匹配 |

`code` 与错误字段是稳定契约；面向人的 `message` 不保证逐字稳定。错误不能包含 signing secret、signature、Webhook raw body 或解析后的完整 payload。底层 JSON parsing failure 可以保留为不含 body 的 `cause`。

消费者使用 `isWebhookError()` 跨 ESM/CJS 或多份 package instance 识别错误，不依赖 `instanceof`。Webhook receiver failure 与 Explicit Client 操作产生的 `LemonSqueezyError` 是两条独立错误边界。

## 使用方式

框架只负责取得 raw body 与 `X-Signature`：

```ts
import { isWebhookError, parseWebhookEvent } from "@terminalzero/lemonsqueezy";

const rawBody = await request.arrayBuffer();
const signature = request.headers.get("X-Signature") ?? "";

try {
  const event = parseWebhookEvent({
    secret: env.LEMON_SQUEEZY_WEBHOOK_SECRET,
    rawBody,
    signature,
  });

  if (!event.known) {
    await recordUnknownEvent(event.eventName, event.data);
  } else {
    switch (event.eventName) {
      case "order_created":
        await handleOrderCreated(event.data); // OrderResource
        break;
    }
  }

  return new Response(null, { status: 200 });
} catch (error) {
  if (!isWebhookError(error)) throw error;

  return new Response(null, {
    status: error.code === "invalid_signature" ? 401 : 400,
  });
}
```

示例中的 HTTP status 是应用选择；receiver 自身不创建 Response。Lemon Squeezy 当前只把精确 `200` 当作成功 acknowledgment，其他 status 会触发官方 retry 行为。

## 应用与 SDK 的责任边界

| 能力                                       | v5 beta owner  |
| ------------------------------------------ | -------------- |
| raw-body HMAC-SHA256 authentication        | Core SDK       |
| minimum envelope validation                | Core SDK       |
| known event narrowing / unknown fallback   | Core SDK       |
| Fetch/Express/Next.js/Fastify/Hono adapter | 应用或文档示例 |
| HTTP `200` acknowledgment                  | 应用           |
| handler invocation、queue 与 retry         | 应用           |
| delivery deduplication 与业务幂等          | 应用           |
| replay protection 与 freshness             | 应用           |

官方未公开 delivery ID、event timestamp、signature timestamp 或 replay-tolerance window。SDK 不伪造 Stripe-style replay protocol，也不提供没有稳定输入的通用 idempotency helper。应用应选择自身可持久化的业务标识和处理策略。

## Module seam

生产实现放在独立的 inbound receiver module，例如：

```text
src/
  webhook-receiver/
    parse-webhook-event.ts
    event-map.ts
    error.ts
    index.ts
```

该 module 依赖 Canonical JSON:API resource types 和同进程 crypto，但不依赖：

- Client configuration、API credential 或 HTTP Core；
- `webhooks` Namespace Module 或 Webhook Management Operation Contracts；
- Default Client 与 Compatibility facade；
- framework request/response types；
- network、storage、queue 或 user handler。

没有必要为 crypto 建立公共 dependency injection seam。固定 HMAC vectors 可以直接验证真正的 in-process dependency；公开 fake crypto 会扩大安全相关 surface，却没有第二个生产 Adapter。

## v5 beta 验收

实现票至少覆盖：

1. string、`Uint8Array` view、`ArrayBuffer` 与 Node `Buffer` 的 exact-byte HMAC fixtures；
2. Unicode raw body、body byte mutation、错误 signature、非 hex 与错误长度；
3. 17 个 known event→Canonical resource 的 runtime matrix 与 TypeScript narrowing；
4. unknown event 保留 event name、meta、resource 和未知 fields；
5. known event/resource mismatch 产生 `invalid_payload`；
6. invalid signature 不调用 JSON parser；
7. malformed JSON、缺 meta/data 与 invalid routing fields 产生 `invalid_payload`；
8. error 不暴露 secret、signature、raw body 或完整 payload；
9. ESM、CJS 与双 declarations 能从 root 使用 runtime、从 `./types` 命名导入所有签名类型；
10. `parseWebhookEvent` 不依赖 Client，也不增加第 62 个 Client method。

## 明确不采用

### 公开 verify → parse 两阶段 API

Branded verified payload 可以在类型层表达顺序，但当前只有一个 post-verification consumer。两个 Result、opaque token 与可序列化误解增加了 Interface 成本，还允许调用方验证后绕过官方 parser；首个 beta 没有足够 Leverage。

### Stateful receiver factory + Result

`createWebhookReceiver({ signingSecret }).receive()` 适合无异常规范、同 secret 高频复用或 WebCrypto/Edge，但当前 runtime 已明确为 Node/Bun，SDK 已采用成功直接返回、失败 typed error 的模式。factory、Promise 与 Result 分支不是当前需求。

### verify-only 或 unsafe parser

公开低层函数会让“解析但忘记验签”成为合法路径，并把 HMAC encoding 与比较细节变成长期公共契约。不采用。

### Framework adapters 与 handler runner

不同框架获取 raw body、消费 stream 和构造 response 的方式不同。把这些责任放入核心会扩大依赖与版本矩阵，并模糊验签和业务 acknowledgment 的边界。v5 beta 只提供文档示例。

## 原型资产

- [`src/prototypes/webhook-receiver-contract.prototype.ts`](../../src/prototypes/webhook-receiver-contract.prototype.ts)
- [`src/prototypes/webhook-receiver-contract.prototype.html`](../../src/prototypes/webhook-receiver-contract.prototype.html)

原型是用于验证 Interface、事件流与职责边界的可丢弃资产，不是生产实现，也不作为发布入口。

## Evidence

- [Webhook Requests](https://docs.lemonsqueezy.com/help/webhooks/webhook-requests)
- [Signing Requests](https://docs.lemonsqueezy.com/help/webhooks/signing-requests)
- [Event Types](https://docs.lemonsqueezy.com/help/webhooks/event-types)
- [v5 resource coverage research](../research/v5-resource-coverage.md)
- [数据类型模型与 API 真相源](./data-type-source-contract.md)
- [资源覆盖与模块边界](./resource-module-boundary.md)

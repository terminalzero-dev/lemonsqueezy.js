# Lemon Squeezy Test Mode 安全边界事实

研究截止：2026-08-12（Asia/Shanghai）

## 结论摘要

- Lemon Squeezy 为每个 store 提供 Test Mode；官方将它描述为与 live store 分离的测试环境，至少明确分离 products、customers、purchases、API keys 和 webhooks。
- Test Mode 不依赖另一套 API host。Authenticated API 仍使用 `https://api.lemonsqueezy.com/v1`，由在 Test Mode 中创建的 Bearer API key 访问 test-side data；test key 与 live key 只在各自一侧生效。
- Test Mode 支持 checkout、products、discounts、subscriptions、license keys、webhooks 和 API integration，但不是对 live 的完全等价承诺：官方明确指出 test purchases 的 file downloads 被禁用，测试邮件会重定向给 store owner 和所有 team members。
- 官方 API 只为 Discounts 和 Webhooks 提供真正的 delete；Subscription 的 `DELETE` 是 cancel，Customer 的 `archived` 只是停止 marketing email。Orders、checkouts、usage records、license keys 等没有公开的 delete operation，因此 Test Mode fixture 并不普遍可清理。
- 官方没有公开 ephemeral store、Test Mode reset、fixture TTL、测试数据自动清理、Test Mode 专属 rate limit 或 write idempotency contract。不能把这些能力当作受支持行为。

本文件只记录官方事实、未找到的承诺和由事实直接导出的推断，不替项目决定 CI、fixture 或 cleanup 策略。

## 1. Test Mode 与 live 的隔离

### 已确认事实

1. 每个 store 都有 Test Mode。新 store 默认处于 Test Mode；store activation 会启用 Live Mode，激活后仍可在 dashboard 中切换 Test/Live。来源：[Testing & Going Live](https://docs.lemonsqueezy.com/guides/developer-guide/testing-going-live)、[Activate Your Store](https://docs.lemonsqueezy.com/help/getting-started/activate-your-store)。
2. 官方称 Test Mode 是与 live store “completely separate”的环境，并明确列出 separate products、customers 和 purchases。Test products 不会因 store activation 自动进入 live；copy to live 会创建新的 ID 和 checkout URL。来源：[Testing & Going Live](https://docs.lemonsqueezy.com/guides/developer-guide/testing-going-live)、[Test Mode](https://docs.lemonsqueezy.com/help/getting-started/test-mode)。
3. Test 与 live 的 API keys 只在各自一侧生效；Test Mode 创建的 key 只与 test-mode store data 交互。来源：[API Reference](https://docs.lemonsqueezy.com/api)、[Testing & Going Live](https://docs.lemonsqueezy.com/guides/developer-guide/testing-going-live)。
4. Test 与 live webhooks 分开；test webhook 只会被 test data 触发，反之亦然。来源：[Simulate Webhook Events](https://docs.lemonsqueezy.com/help/webhooks/simulate-webhook-events)。

### 直接推断

- Store activation 不是 Test Mode integration 的前置条件；未激活 store 本来就处于 Test Mode。若需要同时查看或验证 Live Mode，才需要 activation。
- Test data 不会自动变成 live data，但 “separate” 不等于临时或自动销毁；数据生命周期需要按各 resource 的公开能力分别判断。

## 2. API 认证与 mode 选择

### Authenticated JSON:API

- Test 和 live 都使用相同 base URL、JSON:API media types 与 Bearer authentication；官方没有公开独立的 sandbox hostname。来源：[Requests](https://docs.lemonsqueezy.com/api/getting-started/requests)。
- Mode 的主要认证边界是 API key 创建时所在的 mode。Key 的公开有效期为一年。来源：[Requests](https://docs.lemonsqueezy.com/api/getting-started/requests)。
- 部分 create operation 另外公开 `test_mode` request attribute：Checkout、Discount、Webhook。Create Customer 和 Create Usage Record 的公开 input 没有该字段。来源：[Create Checkout](https://docs.lemonsqueezy.com/api/checkouts/create-checkout)、[Create Discount](https://docs.lemonsqueezy.com/api/discounts/create-discount)、[Create Webhook](https://docs.lemonsqueezy.com/api/webhooks/create-webhook)、[Create Customer](https://docs.lemonsqueezy.com/api/customers/create-customer)、[Create Usage Record](https://docs.lemonsqueezy.com/api/usage-records/create-usage-record)。

### 尚未公开说明

- 官方没有解释 mode-scoped API key 与 create payload 中 `test_mode` 的优先级，也没有说明 mode 不匹配时是拒绝、忽略还是由关联 resource 决定。测试程序不能仅凭未文档化的默认值推断安全模式；响应 resource 的 `attributes.test_mode` 可作为观察证据，但不是预请求 guard 的替代品。
- 官方没有公开一个通用 request header/query parameter 可将任意 Authenticated API call 切到 Test Mode。

## 3. Test Mode 支持与已知限制

| 能力                 | 官方事实                                                                                                                                                                                   | 来源                                                                                                                                                                       |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Checkout / purchase  | 支持完整 checkout flow、dummy customer data 和 test cards；官方警告不要使用真实卡号                                                                                                        | [Test Mode](https://docs.lemonsqueezy.com/help/getting-started/test-mode)                                                                                                  |
| Products / discounts | 可在 Test Mode 创建并测试；可手动 copy to live，但 copy 后 ID/URL 不同                                                                                                                     | [Test Mode](https://docs.lemonsqueezy.com/help/getting-started/test-mode), [Testing & Going Live](https://docs.lemonsqueezy.com/guides/developer-guide/testing-going-live) |
| Subscriptions        | 支持测试；测试 checkout 可产生 subscription                                                                                                                                                | [Test Mode](https://docs.lemonsqueezy.com/help/getting-started/test-mode)                                                                                                  |
| License keys         | 支持测试；Test Mode purchase 可覆盖带 license key 的产品流程                                                                                                                               | [Test Mode](https://docs.lemonsqueezy.com/help/getting-started/test-mode)                                                                                                  |
| Webhooks             | Test events 与真实模式一样触发；可针对 test order/subscription 手动模拟一部分事件                                                                                                          | [Simulate Webhook Events](https://docs.lemonsqueezy.com/help/webhooks/simulate-webhook-events)                                                                             |
| File downloads       | 对所有 Test Mode purchases 禁用                                                                                                                                                            | [Test Mode](https://docs.lemonsqueezy.com/help/getting-started/test-mode)                                                                                                  |
| Email                | Test Mode 的 receipts、subscription notifications、broadcasts 等发给 store owner 和所有 team members，不按 checkout 中填写的 customer email 投递；notifications 可在 account settings 关闭 | [Testing & Going Live](https://docs.lemonsqueezy.com/guides/developer-guide/testing-going-live), [Test Mode](https://docs.lemonsqueezy.com/help/getting-started/test-mode) |

“Almost every aspect” 是官方用语，不是逐 operation 等价保证。至少 file delivery 与 email recipient behavior 已知不同于 live。

## 4. Resource 创建、撤销与清理能力

当前官方 [API Reference](https://docs.lemonsqueezy.com/api) 的 operation 导航显示，Authenticated API 的可写面并不是全资源 CRUD：

| Resource / write                    | 可恢复或清理能力                                                    | 事实边界                                                                                                                                                                                                      |
| ----------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Discount create                     | `DELETE /v1/discounts/:id`，成功 `204`                              | 真正 delete；官方没有 restore 说明。[Delete Discount](https://docs.lemonsqueezy.com/api/discounts/delete-discount)                                                                                            |
| Webhook create/update               | `DELETE /v1/webhooks/:id`，成功 `204`                               | 真正 delete；create secret 不会从 API response 返回。[Create Webhook](https://docs.lemonsqueezy.com/api/webhooks/create-webhook), [Delete Webhook](https://docs.lemonsqueezy.com/api/webhooks/delete-webhook) |
| Customer create/update              | 可将 `status` 更新为 `archived`                                     | `archived` 仅表示不再接收 marketing emails，不是删除记录；无公开 delete endpoint。[Update Customer](https://docs.lemonsqueezy.com/api/customers/update-customer)                                              |
| Checkout create                     | 可在 create 时设置 `expires_at`                                     | 到期使 checkout URL 失效；官方没有说 record 会删除，也无公开 delete endpoint。[Checkout Object](https://docs.lemonsqueezy.com/api/checkouts/the-checkout-object)                                              |
| Subscription update/cancel          | `DELETE /subscriptions/:id` 会将 active subscription 变成 cancelled | Cancel 不是物理删除；resource 仍返回 cancelled state，并可能在 grace period 内 resume。[Cancel Subscription](https://docs.lemonsqueezy.com/api/subscriptions/cancel-subscription)                             |
| Order / subscription-invoice refund | 可 partial/full refund                                              | Refund 改变交易状态，不删除 order/invoice；无公开 delete endpoint。[Issue Order Refund](https://docs.lemonsqueezy.com/api/orders/issue-refund), [API Reference](https://docs.lemonsqueezy.com/api)            |
| Usage record create                 | 无公开 update/delete                                                | 已写入 record 不能依靠公开 API 移除。[API Reference](https://docs.lemonsqueezy.com/api), [Create Usage Record](https://docs.lemonsqueezy.com/api/usage-records/create-usage-record)                           |
| License key update                  | 可设置 `disabled`、`activation_limit`、`expires_at`                 | 无公开 delete；disable/expiry 是状态变化。[Update License Key](https://docs.lemonsqueezy.com/api/license-keys/update-license-key)                                                                             |
| License activation                  | 可用 `POST /licenses/deactivate` 撤销具体 instance                  | Deactivate 需要 license key 和 instance ID；是 instance state cleanup，不删除 license/order/customer。[Deactivate License](https://docs.lemonsqueezy.com/api/license-api/deactivate-license-key)              |

### 直接推断

- 只有 Discount 和 Webhook fixture 能通过公开 API 做完整、确定的 hard cleanup。
- Customer、Checkout、Subscription、Order、Usage Record、License Key 等测试写入会留下持久 test-side records 或状态痕迹。用 archive、expiry、cancel、refund、disable、deactivate 可以降低副作用，但不能宣称恢复到运行前状态。
- Checkout 的 `expires_at` 是单 resource 行为，不构成通用 fixture TTL。

## 5. Webhook Test Mode

### 已确认事实

- Create Webhook 支持 `test_mode: true`；Webhook object 也公开 `test_mode` 属性。Signing secret 是必填，且不会从 API response 返回。来源：[Create Webhook](https://docs.lemonsqueezy.com/api/webhooks/create-webhook)。
- Test Mode store 中发生事件时会像 live 一样发送 webhooks；test 和 live webhooks 彼此隔离。来源：[Simulate Webhook Events](https://docs.lemonsqueezy.com/help/webhooks/simulate-webhook-events)。
- Dashboard 可对 test-mode order/subscription 手动模拟列出的 order 与 subscription events。某些 `subscription_payment_*` simulation 需要先发生真实的测试 renewal；官方建议 daily billing 后等待一次 renewal。来源：[Sync With Webhooks](https://docs.lemonsqueezy.com/guides/developer-guide/webhooks)。
- Webhook delivery 需要精确 `200` acknowledgement；其他状态最多重试三次，示例退避为 5、25、125 秒。Recent events 可从 dashboard resend。来源：[Webhook Requests](https://docs.lemonsqueezy.com/help/webhooks/webhook-requests)、[Webhooks](https://docs.lemonsqueezy.com/help/webhooks)。

### 限制

- 手动 simulate 是 dashboard 行为；当前公开 API Reference 没有 simulate-delivery endpoint。
- 官方没有公开 Test Mode webhook 的 delivery ID、fixture TTL 或 delivery 自动清理承诺。

## 6. License API 与 Test Mode

### 已确认事实

- Test Mode 明确支持 license keys。来源：[Test Mode](https://docs.lemonsqueezy.com/help/getting-started/test-mode)。
- License API 是与 Bearer-authenticated JSON:API 分离的协议：`activate`、`validate`、`deactivate` 都使用 form-encoded `POST`，以 `license_key`（以及 operation 所需的 instance 参数）访问。来源：[License API](https://docs.lemonsqueezy.com/api/license-api)。
- `activate` 会创建 license instance；`deactivate` 撤销一个指定 instance。来源：[Activate License](https://docs.lemonsqueezy.com/api/license-api/activate-license-key)、[Deactivate License](https://docs.lemonsqueezy.com/api/license-api/deactivate-license-key)。

### 直接推断与未知

- License API 没有 Bearer API key，也没有公开 `test_mode` parameter；mode 只能由所提交的、源自 Test 或 Live purchase 的 license key/resource identity 隐式关联。这是对协议形状的直接推断，不是官方单独写明的 mode-routing contract。
- 官方没有说明 Test Mode license key 是否有不同的格式、TTL、rate limit 或自动清理规则。

## 7. Rate limit 与 secret handling

### 已确认事实

- Authenticated API 的公开限制为 300 calls/min；成功 response 含 `X-Ratelimit-Limit` 和 `X-Ratelimit-Remaining`，超限返回 `429`。来源：[API Reference](https://docs.lemonsqueezy.com/api)。
- License API 独立限制为 60 calls/min。来源：[License API](https://docs.lemonsqueezy.com/api/license-api)。
- 官方要求 API keys 不要出现在 GitHub、client-side code 或其他 public location；入门指南建议存入 environment files 并定期 rotation。API key 只展示一次，丢失后可创建新 key 或删除旧 key。来源：[Requests](https://docs.lemonsqueezy.com/api/getting-started/requests)、[Getting Started with the API](https://docs.lemonsqueezy.com/guides/developer-guide/getting-started)。
- Webhook signing secret 不会从 create response 返回；dashboard 才能查看。来源：[Create Webhook](https://docs.lemonsqueezy.com/api/webhooks/create-webhook)。

### 尚未公开说明

- 没有找到 Test Mode 专属 rate limit 或与 live 共用/分离 quota 的公开说明；只能引用上述 API-level limits，不能声称 test store 有独立额度。
- Lemon Squeezy 文档没有提供 GitHub Actions 等特定 CI 的 secret masking、fork-PR secret availability 或 short-lived credential 指南。这些属于 CI 平台策略，不是 Lemon Squeezy API contract。

## 8. 未找到的公开承诺

截至研究截止日，在官方 Test Mode、API Requests/Reference/Changelog、resource endpoint 与 webhook/license 文档中未找到以下承诺：

- ephemeral/single-run store 或 API-based store create/delete；
- Test Mode data reset、bulk purge 或每次 run 后自动清理；
- 通用 fixture TTL/lease；
- 对所有 create/update/delete operation 的 idempotency key 或 retry-safety contract；
- API key 的 scope/read-only permission 或 Test Mode write restriction；
- Test Mode 与 Live Mode 的独立 rate-limit bucket；
- Test Mode 对当前每个 Authenticated API operation 都与 live 完全等价的逐项保证。

“未找到”只表示这些能力没有出现在截止日可访问的官方公开资料中，不证明服务端内部不存在。测试安全设计必须把它们按 **无公开保证** 处理，直到有新的官方文档或官方支持答复。

## 供测试策略决策使用的事实清单

1. 使用 Test Mode key 可以把 Authenticated API 与 live data 隔离，但仍应核验 key mode；官方没有额外 sandbox host。
2. Test Mode 会产生持久共享数据，且只有少数 resources 可 hard-delete；它不是一次性数据库。
3. Test Mode 与 live 在 file download、email recipients 等方面存在明确差异，integration result 不能推广为所有 live behavior 的证明。
4. Webhook 和 License API 都可在 Test Mode 覆盖，但 webhook simulation 有 dashboard/renewal 前置，License API 的 mode routing 没有显式 request parameter。
5. 公开 rate limit、key 一年有效期和 secret-handling 要求适用于任何自动化；官方没有提供 Test Mode 专属配额或短期 credential。

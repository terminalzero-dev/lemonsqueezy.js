# LemonSqueezy JavaScript SDK v4 公共契约清单

## 范围与方法

本清单冻结的基线是 v4.0.0 / commit [`b1f66e9`](https://github.com/lmsqueezy/lemonsqueezy.js/commit/b1f66e905ee0614be87c3711d6529f2582e5729f)。盘点依据是仓库源码、声明产物、package tarball、现有测试以及使用 fake `fetch` 的本地行为验证；没有访问真实 Lemon Squeezy API。

清单使用三个分类：

- **兼容候选**：消费者可以直接观察、README 明示或类型系统承诺的行为。是否在 v5 保留，由后续兼容决策确定。
- **疑似缺陷**：虽然消费者可以观察，但与文档、类型、HTTP 语义或测试意图冲突，不应未经判断直接固化。
- **实现细节**：当前实现方式，不应成为 v5 兼容承诺。

## 摘要

- npm 包是 `@lemonsqueezy/lemonsqueezy.js@4.0.0`，只有根入口，提供 ESM、CJS 及各自声明文件。
- 根入口直接导出 **60 个运行时符号**：`lemonSqueezySetup` 加 59 个 API 函数；另直接导出 **92 个类型**。
- SDK 使用模块级单例配置。后一次 `lemonSqueezySetup` 会覆盖同一进程中的前一次配置。
- 普通 API 调用返回 `Promise<FetchResponse<T>>`，公开结果是 `{ statusCode, data, error }` envelope；部分参数错误会在返回 Promise 前同步抛出。
- API 资源保持 JSON:API envelope 和 snake_case attributes；调用参数通常使用 camelCase，再在请求边界转换成 snake_case。
- 当前 transport 只接受 JSON 响应；`204 No Content` 和非 JSON 错误都会丢失真实 HTTP status。
- 构建成功，但仓库当前 `typecheck` 失败，暴露了两个“运行时允许、声明不允许”的公共 API 漂移。

## 1. 包与分发契约

来源：[package.json](../../package.json)、[tsup.config.ts](../../tsup.config.ts)、[tsconfig.json](../../tsconfig.json)。

| 项目              | v4 行为                                                  | 分类                     |
| ----------------- | -------------------------------------------------------- | ------------------------ |
| 包名与版本        | `@lemonsqueezy/lemonsqueezy.js@4.0.0`                    | 兼容候选                 |
| 模块类型          | package 为 `type: module`                                | 兼容候选                 |
| 入口              | 仅 `.`；没有资源、types、webhook 或 core subpath exports | 兼容候选                 |
| ESM               | `dist/index.js`                                          | 兼容候选                 |
| CJS               | `dist/index.cjs`                                         | 兼容候选                 |
| ESM types         | `dist/index.d.ts`                                        | 兼容候选                 |
| CJS types         | `dist/index.d.cts`                                       | 兼容候选                 |
| tree-shaking 声明 | `sideEffects: false`；README 宣称 tree-shakeable         | 兼容候选                 |
| Node 要求         | `engines.node >=20`                                      | 兼容候选                 |
| 编译目标          | `ESNext`，tsup 未覆盖 target                             | 兼容候选，但需要重新选择 |
| 运行时依赖        | 无 dependencies                                          | 兼容候选                 |
| 许可证            | MIT                                                      | 兼容候选                 |
| 发布可见性        | `publishConfig.access: public`                           | 兼容候选                 |
| 包管理器          | 未声明 `packageManager`；仓库提交 `bun.lockb`            | 实现细节                 |
| 构建器            | 单入口 tsup，minify，双格式 + 双声明                     | 实现细节                 |

本地重建结果：

- ESM：11,215 bytes；CJS：12,748 bytes。
- ESM/CJS 均有 60 个运行时导出。
- `.d.ts` 和 `.d.cts` 各 149,303 bytes。
- `npm pack --dry-run` 产生 55,161-byte tarball，解包 332,750 bytes，仅包含 LICENSE、README、package.json 和 4 个 dist 文件。

仓库元数据、README、Changesets 和 release workflow 仍指向 `lmsqueezy/lemonsqueezy.js` 与原 npm 包；这些是 fork 的身份/发布输入，不是应复制到 Terminal Zero 包的兼容契约。

## 2. 根入口导出

来源：[src/index.ts](../../src/index.ts)。

### 2.1 运行时导出

| 领域                  | 导出函数                                                                                                              |
| --------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Setup                 | `lemonSqueezySetup`                                                                                                   |
| User                  | `getAuthenticatedUser`                                                                                                |
| Stores                | `getStore`, `listStores`                                                                                              |
| Customers             | `listCustomers`, `getCustomer`, `createCustomer`, `archiveCustomer`, `updateCustomer`                                 |
| Products              | `getProduct`, `listProducts`                                                                                          |
| Variants              | `getVariant`, `listVariants`                                                                                          |
| Prices                | `getPrice`, `listPrices`                                                                                              |
| Files                 | `getFile`, `listFiles`                                                                                                |
| Orders                | `getOrder`, `listOrders`, `generateOrderInvoice`, `issueOrderRefund`                                                  |
| Order Items           | `getOrderItem`, `listOrderItems`                                                                                      |
| Subscriptions         | `getSubscription`, `listSubscriptions`, `updateSubscription`, `cancelSubscription`                                    |
| Subscription Invoices | `getSubscriptionInvoice`, `listSubscriptionInvoices`, `generateSubscriptionInvoice`, `issueSubscriptionInvoiceRefund` |
| Subscription Items    | `getSubscriptionItem`, `listSubscriptionItems`, `getSubscriptionItemCurrentUsage`, `updateSubscriptionItem`           |
| Usage Records         | `listUsageRecords`, `getUsageRecord`, `createUsageRecord`                                                             |
| Discounts             | `listDiscounts`, `getDiscount`, `createDiscount`, `deleteDiscount`                                                    |
| Discount Redemptions  | `listDiscountRedemptions`, `getDiscountRedemption`                                                                    |
| License Keys          | `listLicenseKeys`, `getLicenseKey`, `updateLicenseKey`                                                                |
| License Key Instances | `listLicenseKeyInstances`, `getLicenseKeyInstance`                                                                    |
| Checkouts             | `listCheckouts`, `getCheckout`, `createCheckout`                                                                      |
| Webhooks              | `listWebhooks`, `getWebhook`, `createWebhook`, `updateWebhook`, `deleteWebhook`                                       |
| License API           | `activateLicense`, `validateLicense`, `deactivateLicense`                                                             |

函数名、调用参数及从根入口导入的能力都是兼容候选。资源文件的目录名、内部 helper 和 `$fetch` 不由包入口导出，属于实现细节。

### 2.2 直接导出的类型

根入口直接导出 92 个类型：

- 通用：`Flatten`。
- User：`User`。
- Stores：`Store`, `ListStores`, `GetStoreParams`, `ListStoresParams`。
- Customers：`Customer`, `ListCustomers`, `NewCustomer`, `UpdateCustomer`, `GetCustomerParams`, `ListCustomersParams`。
- Products、Variants、Prices、Files：每个资源的单项、列表、Get params、List params。
- Orders：`Order`, `ListOrders`, `OrderInvoice`, `GetOrderParams`, `ListOrdersParams`, `GenerateOrderInvoiceParams`。
- Order Items：`OrderItem`, `ListOrderItems`, `GetOrderItemParams`, `ListOrderItemsParams`。
- Subscriptions：`Subscription`, `ListSubscriptions`, `GetSubscriptionParams`, `ListSubscriptionsParams`, `UpdateSubscription`。
- Subscription Invoices：`SubscriptionInvoice`, `ListSubscriptionInvoices`, `GenerateSubscriptionInvoice`, `GetSubscriptionInvoiceParams`, `ListSubscriptionInvoicesParams`, `GenerateSubscriptionInvoiceParams`。
- Subscription Items：`SubscriptionItem`, `SubscriptionItemCurrentUsage`, `ListSubscriptionItems`, `GetSubscriptionItemParams`, `ListSubscriptionItemsParams`, `UpdateSubscriptionItem`。
- Usage Records：`NewUsageRecord`, `UsageRecord`, `ListUsageRecords`, `GetUsageRecordParams`, `ListUsageRecordsParams`。
- Discounts：`Discount`, `ListDiscounts`, `GetDiscountParams`, `ListDiscountsParams`, `NewDiscount`。
- Discount Redemptions：`DiscountRedemption`, `ListDiscountRedemptions`, `GetDiscountRedemptionParams`, `ListDiscountRedemptionsParams`。
- License Keys：`LicenseKey`, `ListLicenseKeys`, `GetLicenseKeyParams`, `ListLicenseKeysParams`, `UpdateLicenseKey`。
- License Key Instances：`LicenseKeyInstance`, `ListLicenseKeyInstances`, `GetLicenseKeyInstanceParams`, `ListLicenseKeyInstancesParams`。
- Checkouts：`Checkout`, `ListCheckouts`, `GetCheckoutParams`, `ListCheckoutsParams`, `NewCheckout`。
- Webhooks：`Webhook`, `ListWebhooks`, `GetWebhookParams`, `ListWebhooksParams`, `NewWebhook`, `UpdateWebhook`。
- License API：`ActivateLicense`, `ValidateLicense`, `DeactivateLicense`。

以下类型虽然决定公开函数签名或嵌套在导出类型中，却不能从根入口按名称导入：`Config`、`FetchResponse`、`JSONAPIError`、`LemonSqueezyResponse`、`Data`、`Links`、`Meta`、`Params`、`Relationships`、多数状态 union、Webhook `Events` 和 ISO 类型。这是 v5 类型表面需要明确处理的设计缺口，不应被当作必须延续的隐藏契约。

## 3. 配置契约

来源：[setup](../../src/internal/setup/index.ts)、[Config](../../src/internal/setup/types.ts)、[KV](../../src/internal/utils/kv.ts)。

公开签名：

```ts
lemonSqueezySetup(config: {
  apiKey?: string;
  onError?: (error: Error) => void;
}): Config;
```

可观察行为：

- `apiKey` 在类型上可选；缺失或空字符串不会在 setup 阶段失败，而是在每次需要鉴权的请求中返回错误 envelope。
- setup 返回传入的 config；内部只保存 `apiKey` 和 `onError`。
- 配置保存在模块级 `__config__` 单例中，没有实例隔离、reset 或请求级覆盖。
- 同一进程最后一次 setup 胜出，之前的 key 和 callback 被覆盖。
- License API 的 activate/validate/deactivate 显式绕过 Bearer API key。

`lemonSqueezySetup` 的函数名和 v4 facade 可视为兼容候选；KV、key 名和单例实现属于实现细节。多实例不可能在保持当前内部状态模型的前提下实现。

## 4. 函数、参数与资源覆盖

### 4.1 通用调用形态

- 单项读取通常是 `(id: string | number, params?: { include?: RelationshipName[] })`。
- 列表读取通常是 `(params?: { filter?, include?, page? })`。
- 输入 ID 接受 string 或 number；写入 JSON:API relationships/body 时转成 string。
- List filters 使用 camelCase，如 `storeId`、`orderItemId`、`userEmail`；wire query 转成 `filter[store_id]` 等 snake_case。
- `page.number` / `page.size` 转成 `page[number]` / `page[size]`。
- `include` 是由各资源 relationship key 推导的字符串数组，wire value 使用逗号连接。
- 创建/更新类型通常暴露 camelCase，wire attributes 选择性递归转成 snake_case。
- 只有普通对象会递归转换；数组不会自动递归，因此 checkout 的 `variantQuantities` 由资源函数手动处理。

### 4.2 资源矩阵

| 资源                  | 读取/列表              | 写操作                   | List filters                                                           | 返回类型                                                                         |
| --------------------- | ---------------------- | ------------------------ | ---------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| User                  | authenticated user     | —                        | —                                                                      | `User`                                                                           |
| Stores                | get/list               | —                        | 无 filter                                                              | `Store` / `ListStores`                                                           |
| Customers             | get/list               | create/update/archive    | storeId, email                                                         | `Customer` / `ListCustomers`                                                     |
| Products              | get/list               | —                        | storeId                                                                | `Product` / `ListProducts`                                                       |
| Variants              | get/list               | —                        | productId, status                                                      | `Variant` / `ListVariants`                                                       |
| Prices                | get/list               | —                        | variantId                                                              | `Price` / `ListPrices`                                                           |
| Files                 | get/list               | —                        | variantId                                                              | `File` / `ListFiles`                                                             |
| Orders                | get/list               | generate invoice, refund | storeId, userEmail                                                     | `Order`, `ListOrders`, `OrderInvoice`                                            |
| Order Items           | get/list               | —                        | orderId, productId, variantId                                          | `OrderItem` / `ListOrderItems`                                                   |
| Subscriptions         | get/list               | update/cancel            | storeId, orderId, orderItemId, productId, variantId, userEmail, status | `Subscription` / `ListSubscriptions`                                             |
| Subscription Invoices | get/list               | generate invoice, refund | storeId, status, refunded, subscriptionId                              | `SubscriptionInvoice`, `ListSubscriptionInvoices`, `GenerateSubscriptionInvoice` |
| Subscription Items    | get/list/current usage | update                   | subscriptionId, priceId                                                | `SubscriptionItem`, `ListSubscriptionItems`, `SubscriptionItemCurrentUsage`      |
| Usage Records         | get/list               | create                   | subscriptionItemId                                                     | `UsageRecord` / `ListUsageRecords`                                               |
| Discounts             | get/list               | create/delete            | storeId                                                                | `Discount` / `ListDiscounts`                                                     |
| Discount Redemptions  | get/list               | —                        | discountId, orderId                                                    | `DiscountRedemption` / `ListDiscountRedemptions`                                 |
| License Keys          | get/list               | update                   | storeId, orderId, orderItemId, productId, status                       | `LicenseKey` / `ListLicenseKeys`                                                 |
| License Key Instances | get/list               | —                        | licenseKeyId                                                           | `LicenseKeyInstance` / `ListLicenseKeyInstances`                                 |
| Checkouts             | get/list               | create                   | storeId, variantId                                                     | `Checkout` / `ListCheckouts`                                                     |
| Webhooks              | get/list               | create/update/delete     | storeId                                                                | `Webhook` / `ListWebhooks`                                                       |
| License API           | validate               | activate/deactivate      | —                                                                      | 非 JSON:API 的 `ActivateLicense` / `ValidateLicense` / `DeactivateLicense`       |

当前 CRUD 覆盖、函数命名、参数顺序和导出类型是兼容决策的输入。它们不证明 v5 beta 应继续缺失官方 API 后来增加的资源或操作。

## 5. 响应与错误契约

来源：[fetch implementation](../../src/internal/fetch/index.ts)、[fetch types](../../src/internal/fetch/types.ts)、[response types](../../src/types/response/index.ts)。

所有资源函数最终返回：

```ts
type FetchResponse<T> =
  | { statusCode: number; data: T; error: null }
  | { statusCode: number | null; data: T | null; error: Error };
```

### 5.1 成功

- 所有 2xx 响应都会先执行 `response.json()`。
- JSON 可解析时返回真实 status、解析后的 data、`error: null`。
- transport 不根据 HTTP method 或 status 区分有 body/无 body。

### 5.2 API 错误

- JSON 可解析的非 2xx 响应保留真实 status。
- `data` 是完整错误 body，即使 TypeScript 仍把它声明成 `T | null`。
- `error` 是原生 `Error`，name 被改为 `Lemon Squeezy Error`。
- error message 来自 `response.statusText`。
- error cause 依次取 body 的 `errors`、`error`、`message`，否则是 `unknown cause`。

### 5.3 缺少 API key

不发请求，返回：

```ts
{
  statusCode: null,
  data: null,
  error: Error // name: Lemon Squeezy Error; cause: Missing API key
}
```

并调用全局 `onError` 一次。

### 5.4 网络、解析和 callback 错误

- 网络错误或 JSON 解析错误被 catch 后放入 envelope，status 保持 null，data 保持 null。
- `onError` 在 envelope 形成后同步调用。
- 如果 `onError` 自己抛错，`$fetch` 可能 reject，而不是返回 envelope；缺少 key 的路径还可能二次调用 callback。

### 5.5 同步参数异常

`requiredCheck` 在多数非 async 资源函数调用 `$fetch` 前执行，因此空 ID 等错误会在返回 Promise 前同步抛出。License API 的三个函数是 async；`updateSubscriptionItem` 把检查放在 async helper 中，因此同类错误表现为 rejected Promise。该差异可观察，但更像偶然实现结果。

## 6. HTTP 请求契约

来源：[fetch implementation](../../src/internal/fetch/index.ts) 和 [request helpers](../../src/internal/utils/index.ts)。

| 项目          | v4 行为                                                                  | 分类                             |
| ------------- | ------------------------------------------------------------------------ | -------------------------------- |
| Base URL      | 固定为 `https://api.lemonsqueezy.com`                                    | 兼容候选，但不应限制 v5 可测试性 |
| Transport     | 直接使用全局 `fetch`、`URL`、`Headers`                                   | 实现细节                         |
| Accept        | 固定 `application/vnd.api+json`                                          | 兼容候选                         |
| Content-Type  | 所有请求均设置 `application/vnd.api+json`                                | 兼容候选/需复核                  |
| Authorization | 一般请求使用 `Bearer <apiKey>`；License API 不设置                       | 兼容候选                         |
| Methods       | GET、POST、PATCH、DELETE                                                 | 兼容候选                         |
| Body          | 只有 POST/PATCH 会 JSON.stringify；无 body 时设 null                     | 兼容候选/需复核                  |
| Query         | URLSearchParams 编码；值隐式转 string                                    | 兼容候选                         |
| 注入能力      | 无 fetch、base URL、headers、signal、timeout、retry、hook 或 logger 注入 | 当前限制，不是应保留契约         |

## 7. JSON:API 与数据类型契约

资源响应普遍使用：

```ts
type LemonSqueezyResponse<D, M, L, I> = {
  jsonapi: { version: string };
  links: L;
  meta: M;
  data: D;
  included?: I;
};

type Data<Attributes, Relationships> = {
  type: string;
  id: string;
  attributes: Attributes;
  relationships: Relationships;
  links: { self: string };
};
```

- 单项资源通常省略 meta，只保留 `links.self`。
- 列表通常包含 data array、`meta.page`、`links.first` / `links.last`。
- `included` 是可选 JSON:API data array。
- Response attributes 和 relationship keys 保持 API snake_case / kebab-case。
- 请求 DTO、filter 和部分嵌套 update object 使用 camelCase。
- Attributes、relationships、状态 union、ISO union 都是手写的静态快照。
- License API 返回独立的非 JSON:API 对象，仍被外层 `FetchResponse<T>` 包裹。
- Webhook 模块只管理远端 webhook 配置；没有接收端签名验证或 typed payload parsing。Webhook `Events` union 还是不可直接导入的私有类型。

JSON:API envelope、字段命名和 consumer-facing types 是兼容候选；具体手写类型组织和内部泛型是实现细节。

## 8. 已验证的疑似缺陷与契约冲突

| 项目                       | 已验证行为                                                                                            | 为什么不应直接固化                                                |
| -------------------------- | ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| 204 No Content             | DELETE 的 204 在 `response.json()` 抛 SyntaxError；返回 status null、data null、error SyntaxError     | 与 delete 函数文档及测试期望 `{204, null, null}` 冲突             |
| 非 JSON 错误               | 500 text/plain 返回 status null，原 body 丢失，只留下 parse error                                     | 丢失真实 HTTP status 和服务端错误信息                             |
| 空 list 参数               | 所有默认 list 调用产生 `?include=`                                                                    | 空 include 不应改变 URL；是 helper 默认值泄漏                     |
| `updateLicenseKey`         | 只更新 activationLimit/expiresAt 时也发送 `disabled: false`                                           | 可能意外重新启用 license key                                      |
| `updateSubscriptionItem`   | object 形式默认发送 `invoice_immediately: false` 和 `disable_prorations: false`                       | 未区分“调用方没提供”和“显式 false”                                |
| Invoice params 类型        | `generateOrderInvoice` 与 `generateSubscriptionInvoice` 运行时允许省略 params，公开声明却要求第二参数 | 现有测试按运行时行为调用，导致当前 `tsc --noEmit` 失败 4 处       |
| Subscription item overload | 运行时接受 numeric quantity，生成的公开声明只接受 `UpdateSubscriptionItem` object                     | implementation signature 不属于公开 overload，运行时与 types 分裂 |
| `requiredCheck`            | 使用 truthiness；0、空字符串、false、null、undefined 都被判缺失                                       | 会把某些有效值和缺失值混为一类                                    |
| 参数校验时机               | 多数函数同步 throw，License API 和 subscription item update 形成 rejected Promise                     | 同类错误语义取决于实现是否 async                                  |
| `onError` 抛错             | callback 抛错会使 `$fetch` reject，缺 key 路径可能二次触发 callback                                   | 打破“错误都在 envelope 中”的表面承诺                              |
| 错误 data 类型             | 非 2xx 的 data 实际是错误 body，类型仍声明成业务 `T`                                                  | 消费者可能在 error 分支得到错误的静态类型                         |
| 导出测试                   | 测试数组仍写 `getStoreById` / `getAllStores`，但只比较数量                                            | 无法发现同数量的导出重命名或替换                                  |
| 默认 typecheck             | invoice 测试的 4 个调用与公开签名冲突                                                                 | v4 仓库当前不是 typecheck-clean baseline                          |

另有多处运行时校验只检查顶层 ID、不检查类型上 required 的 DTO 字段。这是校验覆盖不一致，不应把“任意无效 DTO 都能发请求”定义成兼容承诺。

## 9. 明确的实现细节

以下内容不应在 v5 兼容票中默认冻结：

- `KV` 对象、`__config__` key 和内部目录结构。
- `$fetch`、`convertKeys`、`requiredCheck` 等 helper 名称。
- tsup、Bun、ESLint、Prettier、Changesets 的当前组合。
- 单入口源码文件、minify 结果和具体字节大小。
- discount 默认 code 的 `btoa(Date.now())` 生成算法。
- 通过函数体重复拼装 JSON:API payload 的方式。
- attributes、relationship 和 endpoint 全部手写的组织方式。
- 21 个依赖真实 Test Mode 数据的测试文件及其固定 fixture 状态。

## 10. 对后续决策票的直接输入

### 定义 v5 对 v4 的兼容承诺

必须逐项决定是否兼容：

- 60 个运行时导出和 92 个直接类型导出。
- 平铺函数名、参数顺序、string/number ID 和 camelCase request DTO。
- 根入口与 ESM/CJS 消费方式。
- JSON:API + snake_case response model。
- `{ statusCode, data, error }` envelope。
- setup facade、默认 client 和 `onError`。
- 参数错误的 throw/reject 语义。

本清单第 8 节的项目应先作为 bug 候选，不应仅因 v4 可观察就自动进入兼容承诺。

### 原型化 HTTP Core 请求与响应契约

必须显式解决 204、非 JSON、错误 body 类型、onError、取消/超时、transport 注入和只发送显式字段。

### 确定数据类型模型与 API 真相源

必须决定是否继续暴露 JSON:API/snake_case、是否公开共享响应/错误/Webhook 类型，以及如何替代手写静态快照造成的漂移。

## 验证记录

- `bun run build`：通过。
- ESM import / CJS require：各验证 60 个运行时导出。
- `npm pack --dry-run --json`：通过，7 个包文件。
- 本地无凭据测试：`test/index.test.ts`、`test/internal/configure.test.ts`、`test/internal/utils.test.ts` 共 21 个通过。
- `bun run typecheck`：失败，4 个 invoice params 调用与公开签名冲突。
- fake transport 行为检查：验证了 missing API key、JSON:API 422、204、非 JSON 500、默认 list query、update 默认字段和 License API 无 Bearer header。

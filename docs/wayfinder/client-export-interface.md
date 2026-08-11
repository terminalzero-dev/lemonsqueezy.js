# v5 Client 与导出结构决策

## 结论

v5 新 interface 使用 `createClient()` factory 返回配置不可变、实例隔离的 `LemonSqueezyClient`。Client 通过只读 resource namespaces 提供操作；根入口同时保留 compatibility facade，但显式 Client 不读写 Default Client。

首个 beta 优先保证常见调用的可发现性和公共 interface 的稳定性，接受完整 Client 包含所有资源的成本，不复制第二套 runtime 资源函数。

```ts
import { createClient } from "@terminalzero/lemonsqueezy/client";

const client = createClient({
  apiKey: process.env.LEMON_SQUEEZY_API_KEY,
});

const orders = await client.orders.list({
  filter: { storeId: 42 },
});
```

## Client interface

核心公共符号固定为：

```ts
export function createClient(options?: ClientOptions): LemonSqueezyClient;

export interface ClientOptions {
  readonly apiKey?: string;
}

export interface LemonSqueezyClient {
  readonly orders: OrdersNamespace;
  readonly customers: CustomersNamespace;
  // 其余 namespaces
}

export class LemonSqueezyError extends Error {}

export function isLemonSqueezyError(value: unknown): value is LemonSqueezyError;
```

不提供 default export、公开 Client class、`new`、继承、setter、clone 或 `instanceof Client` 契约。API credential 在创建时复制；轮换 credential 时创建新的 Explicit Client。

`apiKey` 可选，因为 `license` namespace 不使用 Bearer credential。其他 namespace 缺少 credential 时必须在发出请求前 reject。

## Resource namespaces

Client 首发提供 21 个引用稳定、只读的 namespaces：

- `users`, `stores`, `customers`, `products`, `variants`, `prices`, `files`
- `orders`, `orderItems`
- `subscriptions`, `subscriptionInvoices`, `subscriptionItems`, `usageRecords`
- `discounts`, `discountRedemptions`
- `licenseKeys`, `licenseKeyInstances`, `license`
- `checkouts`, `webhooks`, `affiliates`

常规方法使用 `get`, `list`, `create`, `update`, `delete`；领域动作使用 `archive`, `cancel`, `refund`, `generateInvoice`, `currentUsage`, `activate`, `validate`, `deactivate`。namespace 内不重复资源名。

参数顺序固定为：

1. 业务 ID；
2. 写入 DTO 或 query params；
3. 可选 `RequestOptions`。

本票只固定命名、顺序和 namespace 存在。最终资源操作覆盖、DTO 和 query 类型由资源模块票决定；`RequestOptions` 字段由 HTTP Core 票决定。

## 返回与错误

Explicit Client 方法直接 resolve 解析后的 Lemon Squeezy API body，不使用 Result union 或 compatibility envelope。无内容操作 resolve `void`。

SDK 识别的配置、参数、API、网络、解析和中止失败 reject `LemonSqueezyError`。消费者使用 `isLemonSqueezyError` 进行稳定判别；错误种类和字段由 HTTP Core 票决定。

Compatibility facade 继续把共享核心结果转换成 `{ statusCode, data, error }`，因此没有第二套请求实现。

## Export map

| 入口                                | 稳定用途                                                             |
| ----------------------------------- | -------------------------------------------------------------------- |
| `@terminalzero/lemonsqueezy`        | `createClient`、新 Client 类型、v4 facade 的 60 个运行时和 92 个类型 |
| `@terminalzero/lemonsqueezy/client` | 新 Client runtime、错误判别和 Client 相关类型，不加载 facade         |
| `@terminalzero/lemonsqueezy/compat` | v4 compatibility facade                                              |
| `@terminalzero/lemonsqueezy/types`  | 集中的公共类型入口                                                   |

所有入口最终都要满足已决定的 ESM、CJS 和双声明要求。具体 package `exports` 条件由构建与包产物票决定。

v5 beta 不公开 default export、wildcard、`./internal`、runtime 资源 subpath、transport、middleware、testing、generic request 或 extension 入口。未来可按真实需求增量添加；当前不提前承担 semver 成本。

## Module seam

Explicit Client 及 namespaces 是外部 seam。它们隐藏：

- API credential 与每实例配置；
- endpoint、HTTP method、header 与 query/body 编译；
- camelCase 到 wire 格式的转换；
- JSON:API、空 body 和错误响应解析；
- Default Client 与 compatibility envelope 适配；
- 生产 fetch 与测试 adapter。

Lemon Squeezy HTTP 是 true-external dependency。生产与测试 transport 构成真实的内部 seam，但不因测试需要而进入首个 beta 的公共 interface。

## 未采用的方案

### Callable Client + opaque operations

`client(orders.list())` 可以得到最小 Client interface 和最强资源级 tree-shaking，但语法陌生、自动补全弱，并要求消费者学习 Operation 概念。

### 函数式 Kernel + 可组合资源

公开 Transport、Middleware、Operation、ResourceDefinition 与资源组合具有最大扩展性，但会把实现 seam 变成长期公共契约，超过首个 beta 的需求。

### Class + resource namespaces

`new LemonSqueezy()` 的常见调用体验良好，但公开 class 会带来构造、继承、实例判别和内部表示的额外承诺；factory 能提供相同的 namespace 可发现性而不承担这些约束。

### Factory namespaces + runtime 资源函数

当 factory 本身挂载全部 namespaces 时，再增加 `list(client, params)` 等资源函数不会自动移除 Client 已加载的资源代码，只会复制公共 surface。没有真实 bundle 证据前不采用。

## 原型资产

- [交互原型](../../src/prototypes/client-export-interface.prototype.html)
- [TypeScript declaration stub](../../src/prototypes/client-export-interface.prototype.ts)

两个文件都是 throwaway prototype，不是生产实现。它们保留为本决策的第一手证据。

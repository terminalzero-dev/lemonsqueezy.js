# HTTP Core 请求与响应契约

状态：已确认，作为 LemonSqueezy SDK v5 beta 的实施输入。

关联票据：[原型化 HTTP Core 请求与响应契约](https://github.com/terminalzero-dev/lemonsqueezy.js/issues/2)

交互资产：[HTTP Core 契约原型](../../src/prototypes/http-core-contract.prototype.html)

## 决策摘要

v5 使用一个内部 HTTP Core 服务 Explicit Client 与 Compatibility facade。资源方法负责把领域参数编译成封闭的协议请求；HTTP Core 负责发送一次请求、组合取消与超时、解析响应并产生统一错误；两个公共表面只负责投射结果。

稳定公共配置仅包含 API credential、超时和调用方取消信号。`fetch`、base URL、headers、重试、hooks、logger、中间件、原始请求方法和测试替身均不是 v5 beta 公共扩展点。

## 模块边界

```text
resource operation
  └─ validate and compile protocol request
       └─ internal HTTP Core
            ├─ Explicit Client adapter → body or rejected LemonSqueezyError
            └─ Compatibility adapter → { statusCode, data, error } → onError observer
```

HTTP Core 是深模块：协议 headers、鉴权、编码、取消、超时、响应分类和错误规范化隐藏在一个内部接口后面。资源模块不直接调用 `fetch`，两个公共表面也不分别实现传输语义。

以下形状是实施草图，不是可导入的公共类型：

```ts
type CoreRequest =
  | {
      protocol: "jsonapi";
      method: "GET" | "POST" | "PATCH" | "DELETE";
      path: string;
      query?: URLSearchParams;
      body?: unknown;
      signal?: AbortSignal;
      timeoutMs: number;
    }
  | {
      protocol: "license";
      operation: "activate" | "validate" | "deactivate";
      form: URLSearchParams;
      signal?: AbortSignal;
      timeoutMs: number;
    };

type CoreSuccess<T> = {
  statusCode: number;
  body: T;
};
```

内部接口可以在不改变公共契约的前提下演进。

## 稳定公共配置

```ts
interface ClientOptions {
  apiKey?: string;
  timeoutMs?: number;
}

interface RequestOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
}
```

- `ClientOptions.timeoutMs` 默认是 `30_000`。
- `RequestOptions.timeoutMs` 仅覆盖当前操作的客户端默认值。
- `timeoutMs` 必须是正有限数；无效值在发送请求前以 `validation` 错误拒绝。
- 每个执行网络请求的 Explicit Client 操作均可接受共享的 `RequestOptions`；具体参数位置由资源类型契约统一定义。
- Compatibility facade 保留既有调用形状，不新增每次请求的控制参数；其请求使用 Default Client 的超时配置。
- 调用方 `signal` 与内部 timeout signal 会被组合。先发生的原因决定错误码：调用方取消为 `aborted`，内部期限到达为 `timeout`。
- 已经 aborted 的调用方 signal 不创建网络请求。

### 非公共配置

以下能力在 v5 beta 保持内部，并且不受 semver 保护：

- `fetch` 实现或 transport adapter；
- Authenticated API 和 License API 的 base URL；
- 默认或每次请求 headers；
- 自动重试策略；
- hooks、logger 与 middleware；
- generic/raw request；
- 专用测试注入面。

内部测试可替换边界，但该机制不从发布包导出。

## 协议规则

| 规则         | Authenticated API                        | License API                                                 |
| ------------ | ---------------------------------------- | ----------------------------------------------------------- |
| 请求媒体类型 | `application/vnd.api+json`               | `application/x-www-form-urlencoded`                         |
| `Accept`     | `application/vnd.api+json`               | `application/json`                                          |
| 鉴权         | `Authorization: Bearer <API credential>` | 无 Bearer；License Key 是表单业务输入                       |
| 输入编码     | JSON:API body 与 bracket query           | form fields                                                 |
| 成功判断     | HTTP 2xx                                 | HTTP 2xx；`valid: false` 或 `activated: false` 仍是业务响应 |

base URL、路径模板、方法和 headers 来自资源操作定义，调用方不能提供任意 URL、覆盖鉴权或修改协议 headers。

## 请求序列化

资源操作是 endpoint 形状的唯一事实源。实现不得把任意对象盲目递归转换后发送。

### Path

- 路径由固定模板和经过 percent-encoding 的独立 path segment 组成。
- 不接受调用方提供的完整 URL 或任意 path。

### Query

- SDK 公共字段使用 camelCase；资源定义把它们映射为 Lemon Squeezy 的 snake_case 和 bracket notation。
- 省略 `undefined`、`null`、空数组和空对象。
- 保留显式的 `false`、`0` 和空字符串。
- `include` 仅在至少有一项时发送，多个关系用逗号连接；不再生成 `?include=`。
- 数组、排序、过滤与分页的具体编码由 endpoint schema 决定，不由通用猜测器决定。

### JSON:API body

- 省略 `undefined`，不注入调用方未提供的默认字段。
- 保留显式的 `null`、`false`、`0` 和空字符串；`null` 可表达 API 支持的显式清空。
- SDK 定义的字段递归转换为 snake_case，包括数组中的 SDK 定义对象。
- 用户所有的 opaque map 原样保留键名和值；例如 `checkoutData.custom` 中的 `customerID` 不得变为 `customer_id`。
- 关系、`type`、`id` 与 attributes 由资源定义构建，调用方不能借通用 transport 绕过资源契约。

### License form

- 仅发送该操作明确定义且已提供的 form field。
- License Key 是请求数据，不得进入日志或错误消息。
- 不应用 JSON:API 的 camelCase 转换或 Bearer headers。

## 响应矩阵

| 底层结果                       | Explicit Client                      | Compatibility facade               | `statusCode` |
| ------------------------------ | ------------------------------------ | ---------------------------------- | ------------ |
| 2xx + 预期 JSON                | resolve 解析后的 API body            | `{ data: body, error: null }`      | 实际状态码   |
| 204/205 或操作定义的无内容成功 | resolve `void`（运行时 `undefined`） | `{ data: null, error: null }`      | 实际状态码   |
| 2xx + 缺失/损坏的预期 JSON     | reject `invalid_response`            | error envelope                     | 实际状态码   |
| 非 2xx + JSON:API errors       | reject `http`                        | error envelope                     | 实际状态码   |
| 非 2xx + 其他 JSON 或文本      | reject `http`                        | error envelope                     | 实际状态码   |
| 网络失败、未收到响应           | reject `network`                     | error envelope                     | `null`       |
| 调用方 signal 取消             | reject `aborted`                     | error envelope                     | `null`       |
| SDK timeout                    | reject `timeout`                     | error envelope                     | `null`       |
| 缺少必需 API credential        | reject `configuration`               | error envelope                     | `null`       |
| 资源参数校验失败               | reject `validation`                  | Promise rejection，不构造 envelope | `null`       |

响应分类以 HTTP status 和 operation response contract 为准，而不是以 body 中是否出现 `error` 字段为准。非 2xx body 即使无法解析为 JSON，也必须保留真实状态码并归类为 `http`；它不是 `invalid_response`。

## `LemonSqueezyError`

```ts
type LemonSqueezyErrorCode =
  | "configuration"
  | "validation"
  | "http"
  | "network"
  | "aborted"
  | "timeout"
  | "invalid_response";

interface LemonSqueezyError extends Error {
  readonly code: LemonSqueezyErrorCode;
  readonly statusCode: number | null;
  readonly responseBody: unknown | null;
  readonly apiErrors?: readonly JSONAPIError[];
  readonly cause?: unknown;
}
```

- `code`、`statusCode` 和字段含义是稳定契约；`message` 面向人类诊断，不保证逐字稳定。
- `apiErrors` 只在响应含可识别的 JSON:API `errors` 数组时出现。
- `responseBody` 保存已解析 body，或在无法解析时保存文本；无响应时是 `null`。
- `cause` 仅保留底层异常链，主要用于 network、aborted、timeout 和 invalid response 诊断。
- 错误不暴露原始 `Request`、`Response`、API credential、License Key 或序列化后的请求 body。
- `isLemonSqueezyError` 是跨 ESM/CJS 边界识别该错误的公共方式；消费者不应依赖 `instanceof`。

## 重试

v5 beta 不自动重试。一次 SDK 调用最多产生一次网络尝试，包括 GET、429、5xx、网络错误和 timeout。

调用方依据业务幂等性显式重试。HTTP Core 会保留状态码和原因供调用方判断，但不承诺 `Retry-After`、退避、抖动、幂等键或重试次数等策略字段。此边界避免 SDK 对写操作进行不可见的重复提交，也避免在缺少 API 保证时冻结错误策略。

## Compatibility facade 与 `onError`

- HTTP Core 不感知 `onError`。
- Compatibility adapter 捕获 `LemonSqueezyError` 并先构造 error envelope，再通知 Error observer。
- 每个返回的 error envelope 最多通知一次，包括缺少 API credential、HTTP、network、aborted、timeout 和 invalid response。
- 资源参数校验以 Promise rejection 结束，不构造 envelope，因此不通知 observer。
- observer 抛出的异常被隔离，不改变或替换 envelope，也不会触发第二次通知。
- Explicit Client 永不读取或调用 Default Client 的 observer。

## 验收场景

实施测试至少覆盖：

1. 200 JSON:API body 在 Explicit Client 和 facade 上分别投射为 body 与 envelope。
2. DELETE 204/205 不调用 JSON parser，并保留真实 status。
3. 200 空 body 或损坏 JSON 产生 `invalid_response`，保留 200。
4. 422 JSON:API errors 产生 `http`，并填充 `apiErrors`。
5. 500 text body 产生 `http` 而不是 parse error，并保留文本与 500。
6. network、caller abort 与 timeout 使用三个不同 code，且一次调用仅一次网络尝试。
7. 缺少 API credential 不创建请求；facade observer 只运行一次。
8. 参数校验失败以 rejection 结束，observer 不运行。
9. License API 的 HTTP 200 + `valid: false` 作为成功 body 返回。
10. query 不生成空 `include`，并保留 `false`、`0` 与空字符串。
11. JSON body 不注入隐式 `false`，保留显式 `null`，并保持 opaque custom map 的键。
12. observer 抛错不突破 Compatibility envelope。

## 明确不承诺

- 不承诺通用 HTTP client、任意 endpoint 或 transport 插件系统。
- 不承诺自动重试、缓存、限流队列、日志或遥测 hooks。
- 不承诺 Edge runtime；正式范围是 Node 22、Node 24 与 Bun `>=1.3.14 <2`，具体边界见 [v5 运行时与包产物支持矩阵](./runtime-package-support-matrix.md)。
- 不复现 v4 的 204 parse error、错误状态丢失、空 `include`、隐式 falsy body、同步参数 throw 或 `onError` 二次调用。

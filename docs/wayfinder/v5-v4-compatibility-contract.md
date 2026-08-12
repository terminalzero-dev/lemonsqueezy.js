# v5 对 v4 的兼容承诺

## 目的

本文定义 `@terminalzero/lemonsqueezy` v5 中 compatibility facade 对 v4 消费者的承诺。它以 [v4 公共契约清单](https://github.com/terminalzero-dev/lemonsqueezy.js/blob/0a6cef825fd209f5a041f9ad45ab0f3227d45d2e/docs/wayfinder/v4-public-contract-inventory.md) 为事实基线，只约束消费者可观察且有意的公共契约，不要求复制已知缺陷或内部实现。

本文不设计新的 Client API、HTTP Core 的具体错误对象或 v6 生命周期。

## 总体规则

- 兼容目标是 v4 有效用法的源码级兼容，不是 bug-for-bug 行为复制。
- v4 文档、根入口导出、公开类型和经验证的安全运行时能力共同构成兼容基线。
- 当 v4 运行时与声明文件冲突时，v5 采用不会扩大副作用的安全并集。
- 已确认缺陷不进入兼容承诺；所有消费者可见修正必须进入迁移文档。
- 新能力可以增量加入，但不得在 v5 内删除或破坏本承诺覆盖的 facade 能力。

## 兼容矩阵

| 表面          | v5 承诺                                                                                                                  | 明确例外或修正                                                                |
| ------------- | ------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| 包与导入      | 消费者把依赖和根导入改为 `@terminalzero/lemonsqueezy` 后，继续使用 named imports；ESM `import` 和 CJS `require` 都受支持 | 不接管原 npm 包名，不承诺未公开的 deep imports                                |
| 运行时导出    | 新包根入口保留 v4 的 60 个运行时名称：`lemonSqueezySetup` 和 59 个平铺 API 函数                                          | 允许新增 Client 和其他导出；不得以同数量的替代名称伪装兼容                    |
| 类型导出      | 新包根入口保留 v4 的 92 个直接类型名称；不再理想的名称可由 type alias 维持                                               | 允许新增此前隐藏的共享响应、错误和 Webhook 类型                               |
| 函数参数      | 保留平铺函数名、参数顺序、字符串或数字 ID 和 camelCase 请求 DTO                                                          | Invoice params 可省略；Subscription Item 同时接受数字和对象形式               |
| 请求字段      | 保留 camelCase 消费者输入及 wire 层的 snake_case 转换                                                                    | 更新请求只发送调用方明确提供的字段，不补隐式 `false`                          |
| 响应数据      | facade 保留 JSON:API envelope、snake_case attributes 和既有 relationship key 形状                                        | 可增加字段、关系和 union 成员；不得删除或重命名既有有效字段                   |
| setup         | `lemonSqueezySetup` 仍同步接收配置并原样返回配置；后一次调用替换 facade 使用的 Default Client                            | setup 只影响 Default Client，不改变任何显式创建的 Client                      |
| API key 缺失  | facade 调用不发网络请求，返回 `statusCode: null`、`data: null` 的错误 envelope                                           | 新 Client 的构造校验由公共 API 设计另行决定                                   |
| API 函数返回  | 59 个平铺 API 函数继续返回 Promise，结果保留 `statusCode`、`data`、`error` 三个字段                                      | 不保留因 callback 或解析缺陷导致的偶然 Promise 行为                           |
| 参数错误      | 无效 ID 或缺少必填 DTO 字段统一表现为 Promise rejection                                                                  | 不保留 v4 在同步 throw 与 rejected Promise 之间的实现差异                     |
| HTTP/API 错误 | API、网络和解析错误通过 compatibility envelope 返回，并保留可获得的真实 HTTP status 和响应信息                           | 错误分支不得把错误 body 静态声明成业务成功类型；具体错误对象由 HTTP Core 决定 |
| 空响应        | `204 No Content` 是成功结果，保留真实 204 且 `data: null`、`error: null`                                                 | 不把空 body 误报为 JSON 解析错误                                              |
| `onError`     | 仅在产生错误 envelope 时调用一次；成功和参数 rejection 不调用                                                            | callback 自身抛错不得替换原结果、二次触发或影响显式 Client                    |
| 生命周期      | compatibility facade 在整个 v5 主版本内受 semver 保护                                                                    | v5 beta 不加 `@deprecated`；未来主版本是否移除需另行决策                      |

## v4 缺陷处置

以下 13 类清单项全部是 v5 修正项，不是兼容承诺：

1. `204 No Content` 丢失真实状态并被误报为解析错误。
2. 非 JSON 错误丢失真实 HTTP status 和响应信息。
3. 默认 list 调用生成空的 `?include=`。
4. `updateLicenseKey` 隐式发送 `disabled: false`。
5. `updateSubscriptionItem` 隐式发送两个 `false` 字段。
6. Invoice params 在运行时可省略、公开类型却要求必传。
7. Subscription Item 的数字 overload 存在于运行时、缺失于声明文件。
8. `requiredCheck` 把所有 falsy value 当成缺失。
9. 同类参数错误在同步 throw 和 rejected Promise 之间漂移。
10. `onError` 自身抛错会破坏 envelope，并可能被调用两次。
11. 非 2xx 错误 body 被静态声明成业务成功类型。
12. 根导出测试只比较数量，无法发现名称替换。
13. 默认 typecheck 因公开 Invoice 签名与有效调用冲突而失败。

## 实施验收点

后续实施计划至少需要覆盖：

- 对照 v4 清单逐名验证 60 个运行时和 92 个类型根导出。
- 分别编译 ESM、CJS 和 TypeScript 消费者 fixture。
- 编译验证 v4 参数形状，以及 Invoice 和 Subscription Item 的安全并集。
- 验证 Default Client 的 last-write-wins 与显式 Client 隔离。
- 验证 success、204、JSON API error、非 JSON error、network error、parse error 和 missing key envelope。
- 验证所有参数错误只产生 rejected Promise。
- 验证 `onError` 的零次/一次调用边界及 callback 异常隔离。
- 验证更新请求不会发送未显式提供的字段。
- 将本页所有消费者可见修正纳入迁移文档。

## 不在本承诺内

- 原 `@lemonsqueezy/lemonsqueezy.js` 包名或其发布权。
- 未从 v4 根入口公开的源码路径、helper、目录结构和构建器。
- v4 的模块级 KV、固定 fetch、固定 base URL 等实现方式。
- 新 Client API 的方法命名、构造参数和返回类型。
- HTTP Core 错误对象的最终字段设计。
- v6 是否移除 compatibility facade。

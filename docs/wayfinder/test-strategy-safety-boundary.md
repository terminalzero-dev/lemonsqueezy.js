# v5 测试分层与真实 API 安全边界

状态：已确认，作为 LemonSqueezy SDK v5 beta 的实施输入。

关联票据：[定义测试分层与真实 API 安全边界](https://github.com/terminalzero-dev/lemonsqueezy.js/issues/17)

## 决策摘要

v5 使用五个互补测试层：Unit、Transport Contract、Type Contract、Installed-package Smoke 和 Test Mode integration。前四层组成 Credential-free test suite，是每个 pull request 的默认 CI 与合并门禁；它们不得依赖 Lemon Squeezy 凭据、真实 API 或共享账号状态。

Test Mode integration 只是一组小型真实 API canary，用于发现上游协议漂移和账号配置失败。它不承担 61 个方法的完整行为覆盖，不在 pull request 中运行，也不接收 fork 代码。它在默认分支每晚运行、可由维护者手动运行，并作为 v5 beta 发布前针对确切 tarball 的强制门禁。

真实 API 自动化只能访问 Dedicated SDK Test Store。任何写操作必须先通过 Test Mode safety preflight；例行临时写入只允许使用可 hard-delete 的 Discount 和 Webhook。所有其他真实数据使用只读 Seed Fixtures，或退出例行自动化。

## 现状基线

当前 v4 仓库的 `bun test` 混合了实现测试与真实 API integration：

- 24 个 test files 中有 21 个读取 Lemon Squeezy API key、store ID 或 License Key；
- 默认脚本直接运行全部 240 个 tests，没有 credential-free 默认路径；
- resource tests 共享跨 case 的 IDs 和模块级配置，运行顺序会影响结果；
- create/update/delete 与读取断言混在同一文件，部分创建记录没有对应 cleanup；
- 真实响应大量使用完整 key-count assertions，官方增加兼容字段也会造成失败；
- 当前 release workflow 只 build/publish，没有独立 test gate。

这些 tests 是迁移证据，不是 v5 应延续的测试架构。

## 五层契约

| 测试层                  | 保证内容                                                                                    | 不保证                                         | 默认 PR gate |
| ----------------------- | ------------------------------------------------------------------------------------------- | ---------------------------------------------- | ------------ |
| Unit                    | serialization、validation、event decode、error mapping 等纯规则                             | endpoint wiring、真实网络、package resolution  | 是           |
| Transport Contract      | 61 个 Operation Contracts 的 request compile、response interpretation、validation 与 parity | Lemon Squeezy 当前线上状态                     | 是           |
| Type Contract           | public signatures、positive/negative usage、narrowing、entry declaration resolution         | runtime 行为                                   | 是           |
| Installed-package Smoke | 真实 `.tgz` 的 runtime、ESM/CJS、exports、TypeScript、bundler 与 tarball integrity          | Lemon Squeezy API 可用性                       | 是           |
| Test Mode integration   | Test Mode 认证、代表性协议交互、上游 drift、seed 与账号配置                                 | 61 个方法穷举、live 等价、完整 response schema | 否           |

普通 lint、format、build 和 repository typecheck 仍是默认 CI checks，但它们不替代任何测试层。

## Credential-free test suite

### Unit

Unit tests 使用 Vitest，测试没有 I/O 的 policy 与 transformation：

- path segment、query、JSON:API body 与 License form 编码；
- `undefined`、`null`、`false`、`0`、空字符串和 opaque data 规则；
- input validation 与错误分类；
- Webhook raw bytes、HMAC vectors、17 个 known event routes 和 unknown fallback；
- deterministic helpers，不读取环境变量、时钟或模块级账号状态。

Unit test 不 mock 整个 SDK method 来证明自身实现，也不通过真实网络覆盖可在纯函数边界证明的行为。

### Transport Contract

Transport Contract tests 使用 Vitest，并通过 private in-memory Recording HTTP Adapter 调用真实 Namespace Interface：

```text
public namespace method
  → Operation Contract
  → Resource Runtime
  → Recording HTTP Adapter
```

它们观察 method、path、query、body/form、RequestOptions、success kind 与 error projection，而不直接调用 private compiler。最低覆盖：

1. 每个 v5 beta Operation Contract 至少一个 compiled request 和成功 response case；
2. 所有 input branches，包括 optional、nullable、filter、include、pagination 与 special action；
3. validation failure 不产生 recorded request；
4. HTTP Core 的 JSON、text、empty、204/205、JSON:API error、network、abort、timeout 与 invalid response matrix；
5. 59 个 Compatibility facade resource functions 各有 Explicit Client parity evidence；
6. 21 namespaces、61 methods、61 unique contract keys、protocol/path/method/success kind 与 evidence pointer completeness；
7. SDK 调用一次最多产生一次 transport attempt。

Recording HTTP Adapter 是 private test seam，不从 package exports 暴露。详细 module seam 见 [v5 Resource Namespace 模块边界](./resource-module-boundary.md)，响应与错误矩阵见 [HTTP Core 请求与响应契约](./http-core-contract.md)。

### Type Contract

Type Contract tests 使用独立 TypeScript consumer fixtures，而不是只 snapshot 生成的 declaration text。

- positive fixtures 编译合法的 Client、Compatibility、Webhook 与 type-only 用法；
- negative fixtures 使用 `@ts-expect-error` 锁定不允许的参数、入口与 narrowing；
- TypeScript 5.4 与 latest 分别执行；
- ESM `nodenext`、ESM `bundler` 和 CJS `.cts` context 分别执行；
- root、`./client`、`./compat` 和 `./types` 从 package specifier 解析；
- public declarations 不要求未声明的 Node、DOM、Bun 或 Edge type dependency。

Repository `tsc --noEmit` 证明源码自洽；Type Contract fixtures 证明消费者契约，两者都必须通过。

### Installed-package Smoke

Package Smoke 只测试一次 build/pack 产生的 exact `.tgz`。CI 将同一 tarball 安装进隔离 consumer fixtures，再 fan out 完整 [Supported runtime matrix](./runtime-package-support-matrix.md)：

- Node 22 minimum/latest 与 Node 24 minimum/latest；
- Bun 1.3.14 与 latest stable 1.x；
- root、`./client`、`./compat` runtime/type 与 type-only `./types`；
- ESM import、CJS require、negative exports 和 declaration resolution；
- esbuild、Rollup/Vite、webpack 与 Bun bundle graph；
- tarball targets、module identity 和 declaration hygiene。

Package Smoke 不允许 source import、workspace symlink、直接 `dist` path 或重新 build 一个与待测 tarball 不同的 artifact。完整矩阵在每个 pull request 中是 required check，不延后到 nightly 或 release。

## Structural test coverage

合并门禁使用明确的结构化 inventory，不使用一个 repository-wide line coverage percentage 代表正确性。

| Inventory                      | 完成条件                                                     |
| ------------------------------ | ------------------------------------------------------------ |
| Namespace / Operation Contract | 21 namespaces、61 methods、61 unique keys 全部映射           |
| Compatibility projection       | 59 个 resource facade functions 全部有 parity case           |
| HTTP outcomes                  | 契约定义的成功、empty、API、transport、abort、timeout 全覆盖 |
| Webhook receiver               | 17 个 known events、unknown、signature 与 invalid payload    |
| Public types                   | 每个 public entry 有 positive 与关键 negative consumer       |
| Package matrix                 | runtime matrix 中每个 promised cell 通过 actual tarball      |
| Evidence                       | 每个 Operation Contract 有 reviewed source pointer           |

Coverage report仍可用于发现未执行分支，但不设全仓库统一百分比 threshold。新增 public operation、event、entry 或 Supported runtime 时，必须先扩展相应 inventory；不能靠已有测试的 incidental execution 视为覆盖。

## Dedicated SDK Test Store

### Store 与数据边界

真实 API 自动化使用一个专属 store：

- 永久保持 Test Mode，绝不激活 Live Mode；
- 不含任何 Live Mode data 或真实客户、订单、支付、License Key 等业务数据；Test Mode Seed Fixtures 只使用 synthetic data；
- team membership 保持必要最少，关闭 Test Mode email notifications；
- fixtures 使用明显的 synthetic values，不输入真实卡号、邮箱或 personal data；
- store ID 是唯一 allowlist，不接受多个候选或 runtime fallback。

Test 与 Live 共用 `https://api.lemonsqueezy.com`，因此 host 检查不能证明安全。安全边界来自 Test Mode credential、API response evidence 和 configured store allowlist 的共同验证。

### Credential 与 workflow 边界

Test Mode API key 与 Seed License Key 只存于 protected GitHub Actions environment。Per-run Webhook signing secret 在 job 内生成并只保留于内存。Store/seed IDs 可以是 environment configuration，但不写入通用 repository test defaults。

持有 secret 的 job 必须：

- 只由 trusted default-branch schedule、maintainer `workflow_dispatch` 或 protected release workflow 触发；
- 不使用 `pull_request_target` 执行可变 repository code；
- 不向 pull request 或 fork job 暴露 environment；
- 使用最小 GitHub token permissions，默认只需 `contents: read`；
- 不打印 environment、request headers、License Key、Webhook secret 或 raw request body；
- 不把 secrets 放入 cache、Fixture journal、artifact、snapshot 或 failure message；
- 定期轮换 API key，并在疑似暴露时立即 revoke；没有凭据时 fail closed，绝不回退到 Live Mode key。

### Test Mode safety preflight

每次 Test Mode integration run 在任何写操作前执行 read-only preflight：

1. 必需 environment configuration 全部存在；
2. authenticated user response 的 `meta.test_mode` 必须严格为 `true`；
3. configured store ID 必须能由该 key 读取并等于唯一 allowlist；
4. Seed Fixtures 必须属于该 store，且响应中任何可用的 Test Mode marker 都不得为 `false`；
5. preflight 未完成、字段缺失、mode 矛盾或 store 不匹配时，终止整个 run，零写入。

一个自报的 `LEMON_SQUEEZY_TEST_MODE=true` environment flag 不能替代 API evidence。

## Fixture lifecycle

### Seed Fixtures

Seed Fixtures 是少量长期 Test Mode records，用于只读 `get/list/validate` canaries。它们由维护者在受保护的 inventory 中登记 resource type、ID、purpose 和 expected store；routine automation：

- 不创建、更新、archive、cancel、refund、disable 或删除 Seed Fixture；
- 不依赖列表位置、总数、生成时间或其他测试留下的数据；
- fixture 缺失时 fail，不能静默选择列表中的第一条记录；
- 替换 fixture 需要更新 inventory，并先通过 safety preflight。

### Ephemeral Integration Fixtures

官方 API 只有 Discount 与 Webhook 提供真正的 DELETE。因此 routine write canaries 只创建这两类 Ephemeral Integration Fixtures。

每个 fixture：

- 使用 `sdk-ci-<run-id>-<attempt>` 标识；Discount 放入 name/code，Webhook 放入专用 synthetic URL path；
- 创建成功后立即追加到 Fixture journal；
- journal 只记录 run、type、ID、store、created-at、cleanup action/status；
- Webhook secret 独立生成且永不写入 journal 或 response log；
- 在同一 run 内完成必要的 create/get/update assertion 后 hard-delete。

Customer、Checkout、Subscription、Order、Subscription Invoice、Usage Record、License Key 和 License activation 都会留下 record 或不可逆状态痕迹，不作为 per-run fixture。它们的 write behavior 由 Transport Contract tests 保证；只有维护者批准的专项手动测试才能使用专属 fixture 与明确恢复方案，且不能成为 release gate 的隐含前提。

## Test Mode canary set

Test Mode integration 使用独立的 Vitest suite，从安装后的 tarball 导入 package，并将 test concurrency 固定为 1。例行 canary 按协议形状选择，不按 61 个 methods 穷举：

1. authenticated user + store reads，完成 preflight；
2. Seed Product 的 single/list JSON:API read；
3. Seed License Key 的 License API validate business response；
4. ephemeral Discount 的 create/get/update/delete lifecycle；
5. ephemeral Webhook 的 create/get/update/delete lifecycle；
6. 两个 DELETE 均验证真实 `204` empty-body semantics。

Inbound Webhook receiver 使用固定 HMAC vectors 在 Unit 层证明；真实 delivery、dashboard simulate、renewal、email、checkout、refund 与 file download 不进入例行 canary。未来只有出现具体 upstream drift 或用户需求时才增加真实场景，并重新评估 fixture 和清理边界。

## Serial execution 与 cleanup

真实 API workflow 使用一个跨 schedule、manual 与 release 的 shared concurrency group：

- `cancel-in-progress` 为 false，不能为了新 run 中断旧 run 的 cleanup；
- 整个 canary set 串行执行，不并发写共享 store；
- 请求数量保持远低于 Authenticated API 300/min 与 License API 60/min 的公开限制；
- SDK 和普通 test assertions 不自动重试 network、429 或 5xx；维护者可以重跑整个 workflow。

Cleanup 在 `finally`/`always()` 路径按创建逆序执行。Cleanup harness 可以对 network、429 或 5xx 最多重试三次；成功 DELETE 和随后出现的 404 都视为 cleaned。Cleanup retry 属于测试基础设施，不改变 SDK 的“一次调用一次尝试”契约。

若 assertion 与 cleanup 同时失败，两者分别报告，原始失败不能被 cleanup exception 覆盖。任何未清理 fixture 都使 run 失败，并上传 secret-free Fixture journal。

### 失败恢复

维护者恢复流程优先按 journal 中的 exact type + ID 重试 cleanup。若 runner 在 artifact 上传前被强制终止，reaper 只能处理同时满足以下条件的对象：

- Dedicated SDK Test Store 与 API Test Mode evidence 均已重新验证；
- resource type 是 Discount 或 Webhook；
- SDK-owned run prefix 可从允许的属性中精确识别；
- `created_at` 已超过 24 小时；
- object 不在 Seed Fixture inventory 中。

条件缺一即不自动删除，转为人工检查。恢复流程不做无界 list-and-delete，不按模糊名称匹配，也不处理其他 resource types。

## Integration assertions 与 drift

真实 response 只断言稳定协议不变量：

- 预期 HTTP status 与 response kind；
- JSON:API resource `type`、请求或新建的 ID；
- Test Mode evidence；
- 本次发送并由 API 回显的关键字段；
- License validate 的 documented business shape；
- DELETE 的 204 empty body。

不把以下内容作为 gate：

- 完整 attribute/relationship key count；
- 整个 response JSON snapshot；
- list total、顺序或第一条记录；
- timestamps、generated URLs/IDs 或 unrelated store state；
- 未文档化的 formatting、message text 或 dashboard behavior。

官方把新增 response property 视为向后兼容，因此 additive fields 不使 integration 失败。既有 required invariant 消失、resource type/path/status/empty-body/error semantics 改变、Test Mode evidence 丢失或 configured seed 不再可用时，才报告 drift。

普通 integration case 不做 test-level retry，避免偶发成功掩盖 drift。Network、429、5xx 或平台故障由维护者判断后重跑完整 workflow；发布 gate 必须由同一待发布 tarball 的新 run 通过。

## CI 与发布编排

| Trigger                | Credential-free suite     | Test Mode integration | 结果语义                               |
| ---------------------- | ------------------------- | --------------------- | -------------------------------------- |
| Pull request           | 全部 required             | 不运行、无 secrets    | 前四层任一失败阻止 merge               |
| Push to default branch | 全部 required             | 不在同一 secret job   | 证明合并 commit 的 deterministic 状态  |
| Nightly default branch | 使用该 commit 的 `.tgz`   | required canary       | 失败告警，但不追溯阻塞已合并 PR        |
| Maintainer manual      | 使用指定 commit 的 `.tgz` | required canary       | 调查 drift 或验证修复                  |
| v5 beta release        | exact `.tgz` required     | exact `.tgz` required | 任一失败阻止 publish；不允许复用旧结果 |

Release flow 对一次 build/pack 生成的 tarball 计算 identity/hash，Credential-free suite、Release integration gate 与 publish 使用同一文件。测试后重新构建的 tarball 不是已验证 artifact。

外部 API 故障、secret 过期或 fixture 丢失可以解释失败，但不是 bypass 理由；修复环境或服务恢复后重新运行 exact artifact。

## v4 tests 迁移规则

实施 v5 时，为每个现有 test case 选择唯一归宿：

1. pure rule → Unit；
2. endpoint request/response/error behavior → Transport Contract；
3. public compile behavior → Type Contract；
4. installed consumer behavior → Package Smoke；
5. 仍有真实上游价值且满足本安全边界 → Test Mode integration；
6. 只验证 v4 defect、共享账号偶然状态或完整 key count → 删除。

只有新层已经提供等价或更强证据后才删除对应旧 test。迁移结束后，默认命令不保留 `legacy`、`real-api` 或第二套 v4 suite；缺少 credentials 也不应使 Credential-free test suite skip tests 或产生 false green。

## v5 beta 验收

实施必须证明：

1. 默认 local/CI test path 不需要 Lemon Squeezy credentials，也不访问 Lemon Squeezy API；
2. Unit、Transport Contract、Type Contract 和完整 Package Smoke matrix 都是 PR required checks；
3. 21/61/59 completeness inventories 与 HTTP/Webhook/type/package matrices 可机械验证；
4. Test Mode secrets 对 PR 和 forks 不可见，trusted workflow 使用 protected environment；
5. 任一 write 前 fail-closed preflight 同时证明 Test Mode 与唯一 store allowlist；
6. routine run 只创建可 hard-delete 的 Discount/Webhook fixtures；
7. writes 串行、journal 即时记录、cleanup always 运行且失败可恢复；
8. integration assertions 不因 additive response fields 或共享 list state 失败；
9. nightly/manual/release canary 使用安装后的 tarball；
10. beta publish 只发布通过全部 gates 的 exact tarball；
11. 没有自动 retry 隐藏普通 assertion 或 API drift；
12. v4 credentialed tests 完成单归宿迁移后退出默认体系。

## 明确不采用

- 在 pull request 或 `pull_request_target` 中运行持 secret 的真实 API tests；
- 用真实 API 穷举 61 个 methods，或把 integration 当主要覆盖层；
- 使用 Live Mode key、store、customer、payment 或 License data；
- 假设 Test Mode store、fixture 或 records 会自动 reset/expire；
- 每次运行创建无法 hard-delete 的 Customer、Checkout、Subscription、Order、Usage Record 或 License records；
- 并行写共享 Test Store，或启动新 run 时取消旧 cleanup；
- 按列表第一项、模糊名称或无界 prefix sweep 删除资源；
- exact response snapshot、attribute key count 或 list total assertions；
- 自动重试普通 SDK calls 以让 flaky test 变绿；
- 用一个 line coverage percentage 替代 contract completeness；
- 测源码或 `dist` 后发布另一份未验证 tarball。

## Evidence

- [Lemon Squeezy Test Mode 安全边界事实](../research/test-mode-safety-facts.md)
- [Lemon Squeezy Testing & Going Live](https://docs.lemonsqueezy.com/guides/developer-guide/testing-going-live)
- [Lemon Squeezy API Reference](https://docs.lemonsqueezy.com/api)
- [Lemon Squeezy License API](https://docs.lemonsqueezy.com/api/license-api)
- [Lemon Squeezy Webhook Requests](https://docs.lemonsqueezy.com/help/webhooks/webhook-requests)
- [v5 运行时与包产物支持矩阵](./runtime-package-support-matrix.md)
- [v5 Resource Namespace 模块边界](./resource-module-boundary.md)
- [HTTP Core 请求与响应契约](./http-core-contract.md)

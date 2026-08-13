# v4 到 v5 迁移与弃用策略

状态：已确认，作为 LemonSqueezy SDK v5 beta 的实施输入。

关联票据：[设计 v4 到 v5 的迁移与弃用策略](https://github.com/terminalzero-dev/lemonsqueezy.js/issues/4)

## 决策摘要

现有 v4 消费者默认先执行 Compatibility-first migration：把 dependency 和 module specifier 从 `@lemonsqueezy/lemonsqueezy.js` 换成 `@terminalzero/lemonsqueezy`，同时保留现有 setup、平铺函数、根类型和 Compatibility envelope。Package migration complete 是完整、长期受支持的 v5 结果，不要求随后改写 Explicit Client。

新项目从 Explicit Client 开始；已经完成换包的项目可以按 namespace 或完整调用点执行 Progressive Client migration。两种 interface 在 v5 中都正式受支持，但配置和返回/error contract 各自独立，不能靠类型断言把一种语义伪装成另一种。

Compatibility facade 从 `5.0.0-beta.1` 起冻结并受整个 v5 semver 保护，不标记 deprecated、不产生 runtime warning，也不预定 v6 删除。首个 beta 不发布 codemod；迁移资产以随 package 发布的 `MIGRATION.md`、可编译 examples、Migration Behavior Audit、旧 package/deep-import detection 和明确 rollback checklist 为核心。

## 已冻结的边界

本票不重新决定以下事实：

- Terminal Zero package 名称是 `@terminalzero/lemonsqueezy`，无法让旧 package specifier 自动取得 v5；
- Compatibility facade 保护 v4 的 60 个 runtime names、92 个 type names、平铺参数与 envelope，但不复制 13 类已确认缺陷；
- 新 interface 是隔离的 `createClient()` + 21 namespaces / 61 methods，直接返回 API body 并 reject `LemonSqueezyError`；
- package 只公开 root、`./client`、`./compat` 与 type-only `./types`，不支持 upstream source deep imports；
- Node 22/24、Bun 1.3.14–1.x、ESM/CJS 与 TypeScript 5.4+ 是 Supported consumer matrix；
- v5 beta 只通过 exact prerelease version 评估和部署，Stable 受单独的 readiness gate 约束；
- v4 维护版本、原 npm package 控制权、自动包名重定向和 v6 facade removal 都不在本规划范围内。

详细契约分别见 [v5 对 v4 的兼容承诺](./v5-v4-compatibility-contract.md)、[v5 Client 与导出结构](./client-export-interface.md)、[v5 运行时与包产物支持矩阵](./runtime-package-support-matrix.md) 与 [CI 发布治理与 Stable 晋级门槛](./ci-release-stable-governance.md)。

## 三条迁移路径

| 消费者           | 默认路径                   | 完成状态                               | 后续选择                                |
| ---------------- | -------------------------- | -------------------------------------- | --------------------------------------- |
| 现有 v4 项目     | Compatibility-first        | Package migration complete             | 可以永久停留；也可渐进采用 Client       |
| 已完成换包的项目 | Progressive Client         | 选定范围达到 Client migration complete | 继续按 namespace/调用点迁移或保留混用   |
| 新项目           | Greenfield Explicit Client | 从一开始使用 Client contract           | 仅在接入 v4-oriented code 时使用 facade |

迁移文档必须先帮助读者选择路径，再展示代码。不能以 Explicit Client 的推荐地位把现有消费者导向一次性重写，也不能因 Compatibility-first 风险较低而让新项目默认采用模块级 Default Client。

## Compatibility-first migration

### 目标

这条路径只跨越 Package migration boundary，并隔离所有可选 API modernization。典型调用：

```ts
import {
  getAuthenticatedUser,
  lemonSqueezySetup,
} from "@terminalzero/lemonsqueezy";

lemonSqueezySetup({ apiKey });

const { data, error, statusCode } = await getAuthenticatedUser();
```

函数名、参数顺序、有效 DTO、根类型、ESM/CJS named consumption 和 Compatibility envelope 都由 facade contract 保护。消费者仍须完成 Migration Behavior Audit，因为这是 source-compatible migration，不是 bug-for-bug、行为中性的 package replacement。

直接从 package root 导入是 v4 项目变更最少的 fast path。`@terminalzero/lemonsqueezy/compat` 是可选的显式 ownership boundary，适合把 facade imports 集中到迁移 adapter；切换到它不是 Package migration complete 的必要条件，也不改变 facade semantics。

### 执行顺序

实施后的 canonical guide 必须给出以下顺序：

1. 记录迁移前 commit、lockfile、exact upstream SDK version、runtime/module/TypeScript versions 和已知行为基线；
2. 建立专用迁移 branch；
3. 安装 exact `@terminalzero/lemonsqueezy@5.0.0-beta.N`，不得以 `@beta` 进入可部署 lockfile；
4. 把受支持的 root imports/requires 改为新 module specifier；
5. 扫描并移除旧 package specifier、未公开 deep imports、源码路径和隐式 workspace aliases；
6. 编译并运行项目自己的 tests；
7. 逐项签收 Migration Behavior Audit；
8. 使用 Test Mode credential 在 consumer 自己的受控测试环境验证真实业务路径；
9. 记录 Terminal Zero Last Known Good version 和完整 upstream rollback reference；
10. 小比例部署、观察，再全量部署。

`@beta` 只用于发现当前候选或临时评估。进入 branch、CI、preview 或 production 的 package manifest 与 lockfile 必须解析为 exact prerelease version；依赖更新应是可 review 的独立 change。

### Package migration complete

同时满足以下条件才算完成：

- direct dependency 只保留一个 exact Terminal Zero package version；
- application source、config、scripts 与 tests 中的旧 package specifier 和 unsupported deep imports 清零；
- Compatibility-first positive fixtures 通过；
- Migration Behavior Audit 已由项目 owner 签收；
- consumer tests 与 Test Mode canary 通过；
- deployment observation 没有未处理 blocker；
- migration 前 commit/lockfile/upstream exact version 与 Terminal Zero LKG rollback ref 已记录。

安装成功或 TypeScript 编译成功本身不构成 Package migration complete。

## Progressive Client migration

### 目标与边界

项目在验证 Compatibility-first migration 后，可以把有明确价值的调用移到 Explicit Client：

```ts
import {
  createClient,
  isLemonSqueezyError,
} from "@terminalzero/lemonsqueezy/client";

const client = createClient({ apiKey });

try {
  const response = await client.orders.list({
    filter: { storeId: 42 },
  });
} catch (error) {
  if (isLemonSqueezyError(error)) {
    // Handle the typed Client failure.
  }
}
```

迁移单位必须是一个 namespace、模块或完整调用点，包含配置、调用、success shape 和 error handling。不能只替换函数名后继续把 direct Client response 解构为 `{ statusCode, data, error }`，也不能把 facade envelope 强转为 Canonical response。

### 共存规则

渐进期间允许 facade 与 Client 同时存在：

- `lemonSqueezySetup` 只配置同一 package-format instance 的 Default Client；
- `createClient` 显式接收自己的 immutable configuration，不读取或修改 Default Client；
- credential rotation 分别通过重新 setup 或创建新 Explicit Client 完成；
- 同一业务 mutation 只能选择一条调用路径，不能为比较结果向 facade 和 Client 双发；
- ESM 与 CJS 混用时不假设共享 Default Client；
- response/error handling 在调用点保持各自 contract，公共 application abstraction 必须显式归一化而不是依赖偶然 shape。

选定迁移范围不再读取 Default Client、不使用 Compatibility envelope，并通过 Client positive/negative fixtures 后，该范围达到 Client migration complete。项目其他范围可以永久保留 facade。

## Greenfield Explicit Client

README 与新项目 quickstart 以 Explicit Client 为默认：

- 根据配置边界创建一个或多个 Client；
- 通过 resource namespaces 发现操作；
- 使用 direct API body 和 `isLemonSqueezyError`；
- Webhook receiver 独立于 Client；
- 只在接入仍依赖 v4-shaped interface 的代码时链接 Compatibility path。

README 的推荐不改变 facade 的支持等级。`./compat` 也不能被描述为 private、legacy、best-effort 或将在 v6 删除。

## Migration Behavior Audit

`MIGRATION.md` 必须提供可签收表格，至少覆盖兼容契约已经确认的 13 类修正。正式指南使用对应实现和 fixtures 的链接，不只给抽象说明。

| 区域                       | v4 可观察行为或冲突                                                                     | v5 Compatibility 行为                                                | 消费者检查                                                        |
| -------------------------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `204 No Content`           | 可能因 `response.json()` 失败而返回 parse error，并丢失 status                          | 成功 envelope：`statusCode: 204`、`data: null`、`error: null`        | 删除/空响应逻辑不得依赖 error 分支                                |
| 非 JSON HTTP error         | parse failure 可遮蔽真实 status/response                                                | 保留真实 HTTP status 与可用响应信息                                  | 重新核对 status-based handling 与日志                             |
| 默认 list query            | 可发送空 `?include=`                                                                    | 未提供 include 时不发送空 query                                      | 若 proxy/cache 依赖错误 URL，修正测试                             |
| `updateLicenseKey`         | 未提供时可隐式发送 `disabled: false`                                                    | 只发送调用方明确字段                                                 | 检查是否误依赖隐式启用                                            |
| `updateSubscriptionItem`   | 未提供时可隐式发送两个 `false` 字段                                                     | 只发送调用方明确字段                                                 | 显式表达真正需要的 boolean mutation                               |
| Invoice params             | runtime 允许省略，declaration 要求必传                                                  | 参数可省略                                                           | 可删除只为满足旧类型的空对象                                      |
| wire-native timestamps     | `Order.refunded_at` 声明为 `Date \| null`，但 transport 不做日期转换                    | `Order.refunded_at` 保持 API 返回的 `string \| null`                 | 删除依赖 `Date` 方法的调用；在应用边界显式解析时间戳              |
| Subscription Item overload | runtime 接受数字，declaration 未公开                                                    | 数字与对象形式都受支持                                               | 删除本地 cast/augmentation                                        |
| falsy validation           | `0`、`false`、空字符串可能一律视为缺失；Order refund 省略 amount 会在 v4 preflight 失败 | 按字段语义验证；Order refund 省略 amount 表示全额退款，显式 `0` 拒绝 | 检查 refund 调用没有意外省略 amount；核对依赖本地预校验的边界用例 |
| 参数失败时机               | 同类错误在 sync throw 与 Promise rejection 间漂移                                       | facade 参数错误统一 Promise rejection                                | async tests 必须 `await` rejection                                |
| `onError` 次数             | callback 可能被调用两次                                                                 | 只对 error envelope 调用一次                                         | 移除按重复回调计数的副作用                                        |
| `onError` 异常             | callback throw 可替换 SDK 结果                                                          | observer failure 被隔离                                              | 不依赖 callback throw 控制主流程                                  |
| 非 2xx error data 类型     | error body 可被声明成业务 success `T`                                                   | error branch 不伪装成成功数据                                        | 删除对错误分支业务 data 的不安全访问                              |
| export/type proof          | 数量测试和默认 typecheck 不能证明真实公共名称/有效调用                                  | exact name 与 consumer fixtures 证明 surface                         | 删除本地 shim 前编译完整用法                                      |

Audit 还必须提示：Canonical Client types 不是 facade 类型的可替换别名；response 保持 wire-native，但 Client 直接返回 body、facade 返回 Compatibility envelope。

## Canonical `MIGRATION.md`

实施阶段在 repository root 创建 `MIGRATION.md` 并加入 npm tarball allowlist。它是版本化的 canonical migration artifact，至少包含：

1. Terminal Zero 的 community-maintained / non-official positioning；
2. Supported runtime 与 Package migration boundary；
3. Compatibility-first fast path；
4. 完整 Migration Behavior Audit；
5. Progressive Client 的 request、response、error 和 configuration mapping；
6. Greenfield Explicit Client quickstart；
7. ESM-first TypeScript examples，以及精简 CJS import/require 差异；
8. npm、pnpm、Bun 的 exact-version 安装和回退命令；
9. old-specifier / deep-import detection checklist；
10. Test Mode canary、小比例部署与 rollback checklist；
11. known limitations、beta stability policy 和 feedback link。

README 以 Explicit Client 作为新项目 quickstart，并在 installation/usage 附近显著链接 `MIGRATION.md`。`CHANGELOG.md` 和每个 GitHub Release 链接到对应 Git tag 的 guide，不链接会随 `main` 漂移的未版本化页面。

Wiki、博客或 issue comment 可以补充说明，但不能成为唯一 migration truth source。

## 示例与扫描门禁

### 可执行文档

迁移示例必须作为 consumer fixtures 从 exact Canonical Package Artifact 安装和验证：

- TypeScript 5.4 与 latest；
- ESM NodeNext、ESM Bundler 与 CJS `.cts`/`require`；
- v4 有效调用只改变 module specifier 后继续编译；
- Invoice optional params 与 Subscription Item overload 安全并集；
- Explicit Client direct response 与 typed error narrowing；
- facade 与 Client 的独立 configuration；
- root、`./client`、`./compat` 与 type-only `./types`；
- old package name、unsupported deep import、envelope/Client response 混用的 negative fixtures。

Doc snippet 与 fixture 必须共享单一来源或由机械检查证明一致，不能维护两份手工拷贝。指南丢失、tarball 未包含、链接指向错误 tag、示例不编译或负向用法意外通过都阻止 beta/Stable publish。

### 检测而非 codemod

首个 v5 beta 不发布 codemod、migration CLI、Babel/TS transform 或 editor extension。Fast path 的确定性变更只有 dependency 和 module specifier；lockfile 由 consumer 的 package manager 更新。

Guide 提供只读检测方式，帮助定位：

- `@lemonsqueezy/lemonsqueezy.js` imports/requires；
- upstream package aliases；
- package deep paths、relative vendor copies 或 direct source imports；
- local type augmentations/casts 针对已修复 v4 declaration conflict；
- 同一业务 mutation 的 facade/Client/upstream 双路径。

不提供盲目全仓库替换命令；实现阶段必须根据 package manager、monorepo 和 generated code 边界给出安全示例。只有至少多个独立真实项目反复出现同一个非平凡、可机械证明的转换时，才另开决策评估 codemod，其准确率、幂等、diff review 和 rollback 需单独定义。

## Beta 变更纪律

### Compatibility facade

从 `5.0.0-beta.1` 开始，facade 的既定 v4 compatibility contract 冻结：

- 只允许 source-compatible/additive change、类型 widening 和已经公开的行为修正；
- 不删除或重命名受保护 runtime/type export；
- 不改变既定函数参数顺序、Compatibility envelope 或 Default Client lifecycle；
- 新发现的 v4 缺陷只有在有 evidence、风险说明、Migration Behavior Audit 更新和 parity fixture 后才能修正；
- 无法兼容处理的新需求进入 Explicit Client 或等到未来 major，而不是破坏 facade。

Beta label 不构成绕过 facade 承诺的许可。

### 新 v5 surface

Explicit Client、Canonical types、Webhook receiver 或新的 package surface 在 Stable 前仍可发生必要的 beta breaking change。每次必须：

1. 有公开 issue/Changeset 说明问题、替代方案和受影响 usage；
2. 发布新的 exact beta version，不改写旧 tarball/version；
3. 更新 declaration/runtime fixtures、`MIGRATION.md`、CHANGELOG 和 Release；
4. 在 Release 的 Migration impact 中给出 before/after、行动和 exact rollback version；
5. 把受影响的既有 adopter evidence 标记为需要重新验证，并在 Stable 前重新取得对应反馈；
6. 按 release governance 重置最终 candidate 的 14 天 soak。

Stable 后所有公开 v5 surface 都遵守正常 semver，不能再使用 `Breaking beta change` 分类绕过 major-version requirement。

## Migration impact

每个 beta 的 Changeset/CHANGELOG 与 GitHub Release 都必须包含且只选择一个最高等级：

| 等级                   | 含义                                      | 必需内容                                                   |
| ---------------------- | ----------------------------------------- | ---------------------------------------------------------- |
| `None`                 | 无消费者迁移动作                          | 简述验证范围                                               |
| `Additive`             | 只增加兼容 surface                        | 新能力、适用消费者、无需修改的证明                         |
| `Behavior correction`  | 修正可观察行为但不破坏受支持 source shape | Behavior Audit 链接、风险、consumer check                  |
| `Breaking beta change` | 改变未 Stable 的 v5-only contract         | before/after、受影响调用、迁移步骤、exact rollback version |

不能只写 “bug fixes” 或 “breaking changes”。一个 release 同时包含多个影响时使用最高等级，并逐项列出较低等级内容。

## 部署、共存与回退

### 推荐部署序列

```text
record pre-migration ref
  -> install exact beta
  -> credential-free consumer tests
  -> Test Mode canary
  -> small rollout
  -> full rollout
```

SDK 不提供 runtime version switch、remote feature flag、自动 fallback、shadow request 或 dual-write helper。应用如果在自身 composition boundary 短期保留路径开关，任一请求只能选择一条 SDK path；尤其 create/update/delete/cancel/refund/license mutation 不得双发。

上游 SDK 与 Terminal Zero package 可以在隔离 canary 或 rollback branch 中短期共存，但必须使用显式 package alias 和不同 import name，且不能依赖共享全局 setup。Package migration complete 前必须移除生产 direct dependency 中的 upstream package。

### Migration rollback

消费者记录两个不同目标：

1. **Terminal Zero LKG rollback**：恢复已验证的 exact Terminal Zero beta、manifest 与 lockfile，不使用可移动的 `beta` tag 猜测；
2. **Upstream rollback**：完整恢复迁移前 commit/patch、exact `@lemonsqueezy/lemonsqueezy.js` version、lockfile、module specifiers、local type shims 和旧 behavior expectations。

回退必须重新执行 consumer tests 和 Test Mode canary。SDK 本身没有 persistent migration state，因此没有 SDK data rollback；但已经对 Lemon Squeezy API 完成的 create/update/delete/cancel/refund/license operations 不会因 package rollback 被撤销，应用必须按业务能力单独恢复。

旧 beta 保持 immutable 和可 exact-install，但项目只主动支持当前 Last Known Good beta。安全或严重误导之外，不因为版本旧而批量 deprecate；缺陷修复只发布到新 prerelease。Stable 发布收口后 `latest` 与 `beta` 都指向 Stable，旧 exact beta 仍可用于审计和 rollback。

## Compatibility facade 生命周期

### 整个 v5

Compatibility facade 是正式 v5 API：

- root 与 `./compat` 保持可发现；
- public declarations 不使用 `@deprecated`；
- runtime 不输出 warning、日志或 telemetry；
- documentation 不称其为 legacy、temporary、best-effort 或 unsupported；
- README 可以推荐 Explicit Client，但必须保留 Compatibility-first 入口；
- v5 minor/patch 继续运行全部 facade name/type/parity fixtures。

### 未来可能的 facade deprecation

本规划不预定 v6 删除。未来 major 只有在取得 v5 实际使用数据、证明替代 Client 覆盖、定义迁移窗口、兼容桥、warning policy 和 rollback 后，才能通过新的公开决策考虑 facade deprecation。发布 v5 或使用量较低都不是自动触发条件。

### 整个 package 的 official adoption path

Terminal Zero package 默认与可能出现的官方 SDK 独立共存。只有存在等价官方迁移目标和明确合作协议时，才可以：

1. 发布最终兼容桥；
2. 提供经验证的 package/API migration guide；
3. 在可用替代版本明确后设置 npm deprecation message；
4. 保留历史 versions、source、issues 和 release evidence。

不会静默重定向、自动安装另一个 package、删除历史、转发 credentials，或在当前 v5 文档中预告尚不存在的弃用。

## 反馈与 Stable adoption evidence

Repository 建立 migration feedback issue template，至少收集：

- upstream exact version 与目标 Terminal Zero beta；
- runtime/version、ESM/CJS、TypeScript/version 与 package manager；
- Compatibility-first、Progressive Client 或 Greenfield 路径；
- 实际使用的 facade functions、Client namespaces、Webhook receiver；
- 最小复现、期望/实际、workaround；
- 是否阻断升级、是否愿意在当前 contract 上采用 Stable。

模板不收集 API key、License Key、store/customer identifiers、raw webhook payload 或其他 secret/个人数据。SDK 不加入 telemetry，不承诺响应/修复 SLA。

Stable 所需的三个独立项目可以引用公开 issue，或由维护者提交去标识化 attestation；后者仍须保留环境、exact version、surface、路径与 blocker 结论。维护者 fixtures、demo 和同一产品的重复 repositories 不计独立 adopter。

## 文档与发布门禁

每个公开 beta 和 Stable Candidate 必须证明：

- package tarball 包含当前 `MIGRATION.md`；
- README installation/usage、CHANGELOG、tagged migration guide 与 GitHub Release 互相链接到同一 version；
- Migration impact 已分类；
- Behavior correction / breaking beta change 的指南段落和 rollback version 存在；
- exact tarball 的 migration fixture matrix 全部通过；
- package identity scan 不含陈旧的 official/upstream claims；
- feedback template 可用且不要求 secret；
- Stable Readiness issue 能引用三个 adopter evidence、零 migration blocker 与最终 guide review。

文档是 release artifact，不是发布后补写项。缺失或漂移会阻止 publish。

## 实施验收

实施阶段必须证明：

1. root `MIGRATION.md` 创建并进入 package allowlist；
2. README 以 Explicit Client 为 greenfield 默认，同时在安装与使用处显著提供 Compatibility-first path；
3. 三条路径、两个完成状态和配置/返回/error 分界清晰；
4. 13 类 Migration Behavior Audit 全部有风险、行动和 fixture evidence；
5. npm/pnpm/Bun exact install、Test Mode canary、small rollout 和双层 rollback checklist 可执行；
6. old package/deep import/local shim detection 不做盲目源码改写；
7. v4 valid usage 只换 module specifier 后在 TS 5.4/latest、ESM/CJS 编译；
8. Client examples 对 direct response 和 `isLemonSqueezyError` 正确 narrowing；
9. facade/Client 错误混用、unsupported deep import 与旧 specifier 有 negative evidence；
10. snippets 从单一来源进入 docs 与 exact-tarball fixtures；
11. facade 与 Client 共存不共享隐式配置，也没有同一 mutation 双发；
12. 每个 beta 的 CHANGELOG/Release 都有一个明确 Migration impact；
13. Compatibility facade 没有 deprecation annotation、runtime warning 或 removal claim；
14. 不发布 codemod、telemetry、自动 fallback 或 dual-write helper；
15. migration feedback template 与 Stable adopter evidence 字段一致。

## 明确不采用

- 强迫现有 v4 项目直接重写为 Explicit Client；
- 把 Package migration complete 描述为临时或不完整状态；
- 一次性 flag-day Client rewrite；
- 首个 beta 的 codemod、migration CLI 或盲目 search-and-replace；
- 在 facade declarations 加 `@deprecated` 或运行时 warning；
- 以 beta 标签为由破坏已经冻结的 facade contract；
- 只写 “bug fixes”/“breaking changes” 而不给 consumer action；
- 用 `@beta`、`latest` 或未锁定 range 部署 prerelease；
- upstream/Terminal Zero、facade/Client 的生产双发或自动 fallback；
- 假装 package rollback 会撤销已完成的远程业务 mutation；
- 为每个旧 beta 回补修复或因版本旧批量 deprecate；
- 在没有等价官方目标和协议时弃用整个 package；
- 预定 v6 删除 facade；
- SDK telemetry 或 migration support SLA。

## Evidence

- [v5 对 v4 的兼容承诺](./v5-v4-compatibility-contract.md)
- [v5 Client 与导出结构](./client-export-interface.md)
- [v5 运行时与包产物支持矩阵](./runtime-package-support-matrix.md)
- [v5 测试分层与真实 API 安全边界](./test-strategy-safety-boundary.md)
- [v5 构建与包管理工具链](./build-package-toolchain.md)
- [CI 发布治理与 Stable 晋级门槛](./ci-release-stable-governance.md)
- [v4 公共契约清单](https://github.com/terminalzero-dev/lemonsqueezy.js/blob/0a6cef825fd209f5a041f9ad45ab0f3227d45d2e/docs/wayfinder/v4-public-contract-inventory.md)

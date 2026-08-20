# v5 CI 发布治理与 Stable 晋级门槛

状态：已确认，作为 LemonSqueezy SDK v5 beta 的实施输入。

关联票据：[定义 CI 发布治理与 stable 晋级门槛](https://github.com/terminalzero-dev/lemonsqueezy.js/issues/6)

## 决策摘要

Terminal Zero fork 采用 Single-maintainer release authority：一名指定维护者可以提出、验证并执行发布，不要求第二人 review 或批准。安全边界来自受保护的 branch/tag rules、手动发布意图、GitHub environment、最小权限、强账号恢复和 npm Trusted Publishing，而不是长期个人 npm token 或形式上的多人名单。

`5.0.0-beta.1` 是唯一 Bootstrap publish，也是唯一不要求 npm provenance 的公开版本。它仍必须来自 CI 生成并完成全部 gates 的 exact Canonical Package Artifact；完成首次发布后立即绑定 GitHub Actions trusted publisher、撤销 bootstrap credential，并禁用传统 token publishing。从下一次 prerelease 开始，发布只允许 GitHub-hosted runner 使用 OIDC 上传经过验证的 exact `.tgz`。

npm `latest` 表示当前推荐版本。在首个 Stable 发布前，`latest` 与 `beta` 同时指向当前已验证的 Last Known Good beta；Stable 发布后，`latest` 只跟随当前推荐 Stable，后续 prerelease 使用各自的 prerelease tag。npm `latest` 与 GitHub Release 的 latest 状态彼此独立，Beta GitHub Release 仍保持 prerelease 且 `latest=false`。

Beta 到 Stable 不是一次 dist-tag 操作。`5.0.0` 必须同时满足契约完成、公开运行与最终候选 soak、零阻断缺陷、完整支持矩阵、至少三个独立采用项目反馈，以及公开 Stable Readiness issue。下载量、stars、日期或维护者直觉都不能代替其中任何一类证据。

## 已确认的平台边界

截至 2026-08-12：

- `@terminalzero/lemonsqueezy` 在 public npm registry 不存在；GitHub owner 权限不授予 npm `@terminalzero` scope 权限；
- npm Trusted Publishing 只能在既有 package settings 中配置，不能创建全新 package；
- GitHub Actions OIDC 只允许 GitHub-hosted runner，publish job 需要 `id-token: write`；
- npm version 内容不可覆盖，即使 unpublish 也不能复用同一 `name@version`；
- brand-new prerelease 可能被 registry 自动赋予 `latest`，即使 publish 指定了 `beta`；
- 当前 repository 尚未配置 environment、ruleset、`main` protection、release 或 immutable releases；这些都是后续实施项，不能当作当前保证；
- `pnpm 11.21.0 + exact .tgz + OIDC + provenance` 的分项能力存在，但完整路径必须通过第二个公开 prerelease 的 live rehearsal 才能升级为本项目保证。

官方依据和现场读数见 [CI 发布治理与 Stable 晋级事实](../research/ci-release-stable-governance-facts.md)。

## 发布责任与账号边界

### 单维护者发布权

指定 release maintainer 可以：

- 创建并合并不要求他人批准、但满足全部 required checks 的 release PR；
- 手动创建 Release Candidate；
- 手动执行 Bootstrap publish；
- 手动触发后续受保护 OIDC publish；
- 在全部证据满足后批准 Stable Readiness issue；
- 执行 dist-tag rollback、deprecate 和修复版发布。

不设置 required reviewer、`prevent self-review` 或两人 quorum。GitHub 原生 environment 即使列出多名 reviewer 也只要求其中一人批准，不能表达双人控制；本项目也明确不要求这种控制。

这项选择接受指定 GitHub/npm 账号作为控制面单点。它不接受共享密钥、长期 `NPM_TOKEN`、无人值守自动发布或把 recovery code 存入仓库作为替代。

### 账号与恢复要求

在第一次公开发布前必须完成：

1. 确认或创建 npm organization `terminalzero`，并确认指定维护者具有 owner 和创建 public scoped package 的权限；
2. GitHub 与 npm 账号启用 2FA，优先使用 Passkey 或硬件安全密钥，并保留可用的第二认证方式；
3. 离线保存并核验 GitHub/npm recovery codes，不把 codes、OTP seed、session token 或截图放入 repository、issue、Actions secret、artifact 或普通云端笔记；
4. GitHub organization 强制 2FA；执行前确认保留账号已满足要求，避免因策略切换丢失组织访问；
5. 在每次 Stable promotion 前执行一次不暴露 secret 的 account-recovery tabletop，确认恢复材料位置、npm support 路径和 repository rule 管理能力。

npm scope 的真实 ownership 无法由本仓库或 GitHub 邀请推断。在它被人工确认前，可以实施和演练无 registry mutation 的 CI，但不能执行 Bootstrap publish。

## Repository 与 Actions 治理

### Branch 与 tag rules

`main` 和 `release/v5-beta` 使用 ruleset 或 branch protection 强制：

- 所有变更经 pull request 进入；不要求 approving review；
- Credential-free test suite、Package Smoke、lint、format、typecheck 和 build checks 全部 required；
- required conversations 必须 resolved；
- 禁止 force push 和 branch deletion；
- release/version PR 与普通 PR 使用相同 gate，不允许因为由维护者本人提出而跳过；
- 不配置日常 bypass actor。若账号恢复或 GitHub incident 迫使维护者修改规则，必须先建公开 incident/decision record，恢复后重新运行 gates。

`v*` release tag 单独受保护：只有发布 workflow 的受控身份能创建；创建后禁止 update 和 delete。发布 workflow 不能先建 tag 再尝试 registry mutation。

`release/v5-beta` 保持 Changesets pre mode，`main` 不进入 pre mode：

1. v5 implementation 和 fixes 先经 PR 进入 `main`；
2. 需要进入 beta line 的 commit 再经 PR 同步到 `release/v5-beta`；
3. version/changelog/pre-state 变更经 release branch 上的独立 PR review checks；
4. `5.0.0-beta.0` 只作内部 implementation baseline，不发布；
5. `5.0.0-beta.1` 是首个公开 Release Candidate；之后 prerelease 顺序递增；
6. Stable promotion 在 release branch 执行 `changeset pre exit` 和 version step；除 version、lockfile、CHANGELOG、release notes 与文档外，Stable source 必须与已经 soak 的最终 beta 相同；
7. `5.0.0` 发布后把对应 release commit 合并回 `main`，并保留受保护的历史 beta branch，不强推或删除它。

### Workflow 权限

所有 workflows 从最小 `permissions` 开始。普通 CI 不需要 secrets，也不授予写权限。第三方 Actions 固定到完整 commit SHA；release jobs 只运行 GitHub-hosted runner。

职责分离为：

| Workflow role     | Trigger                                  | 凭据/权限                                                                                                                          | 结果                                         |
| ----------------- | ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| Pull-request CI   | PR / trusted branch push                 | 无外部凭据；read-only                                                                                                              | required deterministic checks                |
| Nightly Test Mode | trusted default-branch schedule / manual | 专用 Test Mode environment                                                                                                         | drift canary，不发布                         |
| Release Candidate | maintainer manual，受保护 branch         | Test Mode environment；无 npm credential                                                                                           | exact `.tgz`、digest、全部 gates 与 evidence |
| Registry release  | maintainer manual，受保护 branch         | `contents: read`、读取 candidate artifact、`id-token: write`；tag step 才使用单仓库 App 的 `contents: write` 与 `workflows: write` | publish、registry verify、tag、Release       |

不使用 `pull_request_target` 执行可变 PR code，不让 release workflow 响应普通 push 自动发布，也不依赖 `GITHUB_TOKEN` 创建 tag 后隐式触发另一个 workflow。

Release Candidate 和 Registry release 使用同一个 repository-wide concurrency group，允许排队、`cancel-in-progress: false`。每个 run 在任何 registry mutation 前重新读取 exact version 与 dist-tags，不能复用排队前的判断。

### 受保护发布环境

publish job 绑定专用 GitHub environment `npm-release`，并在 npm Trusted Publisher 中绑定同一 environment 和精确 workflow 文件名。该 environment：

- 只允许受保护的 `main` 与 `release/v5-beta` refs；
- 不设置 required reviewer 或 prevent-self-review；手动 `workflow_dispatch` 本身表达发布意图；
- 不保存 npm token；
- 不与 Test Mode credentials 共用；
- OIDC subject、repository、workflow 和 environment 任一不匹配都必须 fail closed。

## Release Candidate

### 生成与身份

Release Candidate 由以下不可分割的 identity 构成：

- package name 与 exact version；
- protected source commit SHA；
- Canonical Package Artifact `.tgz`；
- SHA-256 workflow identity 和用于 registry 比对的 SHA-512 integrity；
- Changesets publish plan；
- gate results 与生成这些 evidence 的 workflow run ID。

Candidate workflow 接受 expected version 与 commit 输入，从 clean frozen install build，并且只执行一次 pack。它对 exact `.tgz` 完成：

1. Credential-free test suite 与完整 Installed-package Smoke matrix；
2. Release integration gate；
3. tarball manifest、package identity、version、exports 和禁止文件检查；
4. SHA-256/SHA-512 计算与 publish plan digest 复核；
5. secret-free evidence manifest 输出。

Candidate artifact 在 workflow artifact retention 内只作为受控 job 间传递。正式发布后，exact `.tgz`、digest manifest 和 release evidence 作为 GitHub Release assets 长期保留；Actions artifact 不能充当永久记录。

改变 source、version、tarball bytes、lockfile、build inputs 或 gate configuration 会创建新 Candidate。不得在 publish job build、pack、修补或重压 tarball。

### 手动发布输入

Registry release 必须由维护者显式提供并相互校验：

- candidate workflow run/artifact identity；
- expected package version；
- expected source commit；
- expected SHA-256。

workflow 下载 artifact 后重新计算 digest，确认 candidate run 的 required gates 仍为成功，确认 registry 中 exact version 不存在，再进入 `npm-release` environment。任一输入或 evidence 不匹配都在 registry mutation 前失败。

## Bootstrap publish：`5.0.0-beta.1`

Trusted Publisher 无法创建不存在的 package，因此首发使用一次性 bootstrap runbook：

1. 确认 npm scope ownership、public access、package metadata、repository URL 和账号 2FA；
2. 下载已经通过全部 Candidate gates 的 `5.0.0-beta.1` exact `.tgz` 与 digest manifest；
3. 在维护者本地隔离目录重新计算 digest，不 checkout、build 或 repack；
4. 使用 pnpm 对 exact `.tgz` 做一次交互式 2FA public publish，并显式指定 `beta` tag；credential 不进入 GitHub 或 shell history；
5. 立即读取 exact version metadata、tarball integrity 和全部 dist-tags；
6. 验证 brand-new package 自动产生的 `latest` 与 `beta` 都精确指向同一个已验证 `5.0.0-beta.1` Candidate；
7. 在 npm package settings 绑定 `terminalzero-dev/lemonsqueezy.js`、精确 release workflow 与 `npm-release` environment；
8. 将 publishing access 切换为要求 2FA 且 disallow tokens，撤销本地 login/session/granular token 等 bootstrap credential；
9. 记录无法生成 npm provenance 的一次性例外及 registry integrity evidence；
10. 由受保护 workflow 对同一 Candidate 完成 registry 复核，再创建 `v5.0.0-beta.1` tag 和 immutable GitHub prerelease。

`beta.1` 是唯一 provenance 例外。bootstrap runbook 不能用于重试后续版本、CI fallback、紧急修复或 Stable publish。

## OIDC 正常发布

`beta.2` 或之后的第一个 prerelease 必须作为 live rehearsal 验证完整路径：

```text
reviewed version commit
  -> one exact Candidate .tgz
  -> deterministic + Test Mode gates
  -> manual protected publish
  -> pnpm OIDC trusted publishing
  -> npm beta dist-tag
  -> registry integrity + provenance verification
  -> maintainer npm web login + 2FA dist-tag drill
  -> public Issue evidence + live tag verification
  -> npm latest + beta point to the verified recommended beta
  -> protected Git tag
  -> immutable GitHub prerelease
```

正常 publish job：

1. 不提供 `NPM_TOKEN` fallback，publish 使用 GitHub OIDC 换取短期 package-scoped credential；OIDC 不用于 npm 不支持的 dist-tag mutation；
2. 使用 pnpm 11.21.0 上传 exact `.tgz`，显式指定 public access、正确 dist-tag 与 provenance；
3. 发布成功后读取 exact registry metadata，比较 `dist.integrity` 与 candidate SHA-512，并重新下载 exact version 复核 bytes；
4. 验证 npm provenance 指向正确 repository、workflow、commit、package version 和 tarball subject；
5. 从隔离 consumer 对 registry exact version 运行最小 ESM/CJS install smoke 和 registry signature/provenance verification；
6. registry 验证后，由维护者通过 `npm login --auth-type=web` 与 Passkey/TOTP 的短期会话移动 dist-tags；不得把 token、OTP、Passkey 或 recovery material 写入仓库、Issue、Actions 或日志；
7. 将 promote、rollback、restore 的完整状态与时间线作为 secret-free JSON 发布到公开 Issue，CI 验证作者、Candidate identity、证据内容和 live tags；
8. 在首个 Stable 发布前，将 `latest` 与 prerelease tag 一起绑定到已验证的当前推荐 beta，并回读两个 dist-tags；Stable 发布后，`latest` 只跟随当前推荐 Stable；
9. 所有 registry 与 dist-tag evidence 验证成功后才创建受保护的 `v<version>` tag；
10. 使用 `--verify-tag` 语义建立 draft GitHub Release、上传 exact `.tgz`、digest manifest 与 evidence，再发布为 immutable Release。

Beta GitHub Release 明确设置 prerelease 且 `latest=false`。Stable GitHub Release不是 prerelease，并在全部 Stable post-publish verification 通过后成为 latest Release。

只有 `beta.2+` live rehearsal 完成，`pnpm + exact tarball + OIDC + provenance` 才能在 Stable Readiness issue 中标为已验证。组件文档或 dry-run 不能替代这项 evidence。

## Version、dist-tag 与 GitHub Release

| Version class          | npm publish tag     | npm `latest`                    | npm `beta`                    | GitHub Release             |
| ---------------------- | ------------------- | ------------------------------- | ----------------------------- | -------------------------- |
| `5.0.0-beta.N`         | `beta`              | 首个 Stable 前指向当前推荐 beta | 指向当前 Last Known Good beta | prerelease，`latest=false` |
| `5.0.0`                | `latest`            | 指向已验证 Stable               | 在发布收口后也指向 `5.0.0`    | stable/latest              |
| 下一个 prerelease line | 对应 prerelease tag | 保持当前推荐 Stable             | 再移动到新 prerelease         | prerelease，`latest=false` |

npm dist-tags 与 GitHub prerelease/latest 状态彼此独立，每次发布后分别读取和验证。Git tag、package version 和 immutable Release 不移动；只有 dist-tag 是常规可移动状态。

## 失败恢复与 rollback

### 发布中断

- **registry mutation 前失败**：修复 workflow 后可以重用仍在 retention 内的 exact Candidate，但必须重新确认 digest、version 尚不存在、gates 和 inputs 未变化；否则生成新 Candidate。
- **publish 已成功、registry verification 失败**：不得再次 publish 同一 version。立即停止 tag/Release finalization，保存 evidence，按受影响 dist-tag 的 rollback 流程处理。
- **registry 已验证、tag/Release finalization 失败**：从 registry metadata 与 candidate digest 恢复确认；只补建缺失的 tag/Release，不 rebuild、repack 或 republish。
- **tag 已创建、Release 创建失败**：保留不可变 tag，使用 `--verify-tag` 语义恢复 Release；不删除或移动 tag 来重跑整个流程。

### 常规 rollback

任何 version 都不可覆盖或重发。问题发布的标准动作顺序是：

1. 识别受影响 dist-tags 和对应 Last Known Good version；
2. 使用维护者短期 npm web/2FA 会话将这些 dist-tags 移回 Last Known Good，回读状态并立即 logout；
3. deprecate 问题 version，消息包含影响、替代 version 与升级/降级指引；
4. 开公开 incident/issue，记录时间线、artifact identity、影响和恢复动作；
5. 发布新的修复 prerelease 或 patch version；
6. 完成全套 gates 后再前移 dist-tag。

移动 dist-tag 只改变未来 tag/unversioned resolution，不召回 exact install 或 lockfile。发布沟通不得声称 rollback 已让问题 version 消失。

若首个 Stable `5.0.0` 出现问题且没有旧 Stable 可回退：

- 将 `latest` 与 `beta` 一起退回最终 Last Known Good beta，使默认安装仍解析到当前推荐版本；
- deprecate `5.0.0` 并发布 `5.0.1` 修复；
- 在 `5.0.1` 完成全部 Stable release gates 后恢复 `latest` 和 `beta`。

unpublish 只用于凭据/secret 泄漏、法律要求或继续分发本身构成重大安全事件且 deprecate 不足的情况，并且必须满足 npm policy。普通功能、类型、打包、provenance 或兼容缺陷不使用 unpublish。

## Stable 晋级门槛

Stable promotion 同时要求以下五组证据，全部记录在一个公开 Stable Readiness issue。任一条件未满足即继续 beta。

### 1. 契约与文档完成

- 所有 v5 beta Wayfinder 决策对应的 implementation acceptance criteria 已完成并可追溯；
- v4 Compatibility facade、Explicit Client、HTTP Core、Canonical types、21/61 Operation Contracts、Webhook receiver、package entries 和 Supported runtime matrix 的结构化 inventory 全部通过；
- v4 到 v5 migration guide、API usage、known limitations、beta/stable release notes 与 rollback communication template 完成；
- 在批准 Stable 前 7 天内完成一次官方 API docs/changelog 对 Contract Catalog 的 drift review；没有未处理的 breaking drift 或已知漏项；
- final `5.0.0` 相对最终 beta 只允许 version、lockfile、CHANGELOG、release notes 与文档变化。任何 runtime、public declaration、dependency output、exports 或 package structure 变化都返回 beta 并重置最终候选 soak。

### 2. 时间与运行证据

- 从 `5.0.0-beta.1` 首次公开可安装起至少经过 6 周；
- 至少有一个 `beta.2+` 通过 OIDC、provenance 和 post-publish verification 的公开 prerelease；
- 最终 beta Candidate 的 public API、runtime behavior 和 package structure 连续 14 天未变化；
- 这 14 天内针对该 Candidate 的 scheduled Test Mode canaries 和必要补跑均成功；
- 可确认的 GitHub/npm/Lemon Squeezy 第三方平台故障可以记为外部事件，不计为 SDK defect，但必须在 24 小时内记录分类并用同一 Candidate 补跑成功；否则不满足连续观察证据；
- 任何 runtime/public/package change、P0/P1 修复或 candidate bytes 改变都从新 Candidate 重新计算 14 天。

六周是最低公开观察期，不是自动晋级日期。即使超过六周，其余证据缺失仍不得发布 Stable。

### 3. 缺陷与安全门槛

晋级时必须：

- 零未解决 P0；
- 零未解决 P1；
- 零影响发布 artifact、支持 runtime 或 build/release trust path 的可处置 High/Critical security vulnerability；
- 连续 14 天没有未解决的 adoption upgrade blocker。

Severity 定义：

| Severity | Stable 阻断定义                                                                                                                                                            |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P0       | credential/secret 泄漏；会对错误 store/live data 造成破坏性写入；发布物被篡改；包对全部或绝大多数支持消费者不可用                                                          |
| P1       | 任一 Supported runtime/module/type entry 系统性失效；核心请求/响应语义可能产生错误业务 mutation 或数据解释；v4 migration 的关键路径无可行 workaround；Webhook 验签边界失效 |
| P2/P3    | 有局部 workaround、不会破坏数据或发布信任、且不阻止声明支持面的缺陷；公开记录但不自动阻断 Stable                                                                           |

“可处置”表示漏洞触达发布 runtime 或 CI/build/release path，并存在可用修复或明确 mitigation。确实不可达或不适用的 alert 必须在 Stable Readiness issue 中给出证据和处置结论，不能静默忽略或只降低标签。

### 4. Exact artifact 支持矩阵

最终 Stable Candidate 必须对 exact `.tgz` 重新通过：

- Node 22 minimum/latest ESM 与 CJS；
- Node 24 minimum/latest ESM 与 CJS；
- Bun 1.3.14 与 latest stable 1.x；
- TypeScript 5.4、source compiler 6.x 与 latest 7.x consumer fixtures；
- root、`./client`、`./compat`、type-only `./types` 与负向 exports；
- Unit、Transport Contract、Type Contract、Installed-package Smoke；
- protected Test Mode release integration。

不能用最终 beta 的 tarball 测试结果替代 `5.0.0` exact artifact；Stable version/metadata 更新后必须 pack 一次并完整重跑，但不得借机改变 runtime bytes graph 或 public contract。

Stable approval 发生在 registry mutation 前，因此这里要求的是 `5.0.0` Candidate 的 pre-publish matrix，加上已经由 `beta.2+` 证明的 OIDC/provenance release path。实际 `5.0.0` 的 registry integrity、OIDC provenance 和 post-install smoke 是批准后的发布 closeout gate；它们必须在 npm dist-tags 与 GitHub Stable Release 收口前通过，但不伪装成 publish 前就能取得的证据。

### 5. 独立采用与人工反馈

至少三个不受 release maintainer 控制的独立项目使用公开 beta 并提交结构化反馈。一个组织内的重复 demo、维护者自己的 fixtures 或同一产品的多个 repository 只计一个项目。

三个项目合计必须覆盖：

- 从 v4 包迁移并使用 Compatibility facade；
- 使用 Explicit Client；
- 使用 Inbound Webhook receiver。

每份反馈至少记录：

- 使用的 exact SDK version、runtime、module format 和 TypeScript version；
- 实际使用的 surface 与迁移来源；
- 成功路径、遇到的问题、workaround 和是否阻断升级；
- 是否愿意在当前 contract 上采用 Stable。

私有项目可以通过维护者 attestation 计入，不要求公开代码、公司名称或 secret；attestation 仍须记录去标识化的环境、surface、版本和 blocker 结论。

在第三个有效反馈到达且最后一个 upgrade blocker 关闭后，必须再保持连续 14 天无未解决 upgrade blocker。Stars、downloads、issue 数、社交媒体反馈或维护者自己的项目都不能替代三份采用证据。

## Stable Readiness issue 与批准

Stable Readiness issue 在最终 beta Candidate 开始 14 天 soak 前建立，固定记录：

- final beta version、commit、tarball digest 与 workflow run；
- 六周公开观察期起止；
- 14 天 candidate soak 和 blocker-free 窗口；
- Contract Catalog drift review；
- P0/P1 与 security triage；
- exact artifact matrix；
- 三个独立 adopter evidence；
- OIDC/provenance live rehearsal；
- dist-tag rollback live drill；
- account recovery、publish interruption 和 first-Stable rollback tabletop；
- migration/known limitations/release notes；
- `5.0.0` Candidate digest 与全部 pre-publish gates。

单一 release maintainer 是最终批准者。批准只能在所有 checkbox 都有可追溯 evidence 后发生，不设第二人签字。

批准后该 issue 保持打开，直到 `5.0.0` 的 registry integrity、provenance、post-install smoke、最终 `latest`/`beta` 状态和 immutable GitHub Release evidence 全部补齐。只有 release closeout 完成后才关闭；post-publish failure 按 rollback 流程处理，不追溯改写批准时的记录。

门槛不是普通 release checklist 中可勾选的 waiver。若发现门槛本身错误，必须在 Stable promotion 前通过公开决策 issue 修改本契约，说明依据和风险；不能在同一个 readiness comment 中临时豁免，也不能把修改后的条件追溯用于掩盖已经失败的 evidence。

## 发布演练

Stable 前必须至少完成：

1. `beta.1` Bootstrap publish，以及自动 `latest` 与 `beta` 同时指向已验证当前推荐版本的现场检查；
2. `beta.2+` exact tarball OIDC/provenance live publish；
3. publish success 后 registry integrity、downloaded bytes 与 provenance 验证；
4. 在公开公告前通过短期 npm web/2FA 会话，把 `latest` 与 `beta` 从新 LKG 移回前一个已验证 beta、验证解析，再恢复到新 LKG；将 secret-free drill evidence 发布到 Issue 并由 CI 复核；
5. deprecate、unpublish policy、publish-succeeded/finalization-failed 和首个 Stable 无 LKG 的桌面演练；
6. GitHub/npm account recovery tabletop；
7. immutable tag/Release assets 与 evidence 恢复验证。

演练不能用未验证的 dummy package 代替目标 package 的 OIDC、provenance 和 dist-tag 路径。会给真实消费者产生安装 warning 或不可逆 version 污染的动作只做 tabletop；实际 dist-tag 移动必须在公告前的受控窗口完成并立即复核。

## v5 beta 实施验收

实现阶段必须证明：

1. `main` 与 `release/v5-beta` 通过 PR + required checks 保护，但单维护者不依赖他人 review；
2. branch 不可 force push/delete，`v*` tag 只能由 release workflow 创建且不可更新/删除；
3. ordinary CI credential-free、read-only，release 不由普通 push 自动触发；
4. Release Candidate 的 version、commit、digest、plan 与 gate evidence 是机械关联的；
5. Package Smoke、Test Mode integration 与 publish 使用同一 exact `.tgz`；
6. `beta.1` bootstrap credential 不进入 GitHub 且发布后撤销；
7. `beta.2+` publish 不存在 `NPM_TOKEN` fallback，只用 `npm-release` environment + OIDC；dist-tag 只用维护者短期 npm web/2FA 会话并立即 logout；
8. registry integrity、downloaded bytes、provenance、npm dist-tags 与 GitHub Release 状态分别验证；
9. registry verification 前不创建 Git tag/Release；GitHub Release 保存长期 evidence assets；
10. release concurrency 不取消进行中的 publish，并在 mutation 前重查 version/tag state；
11. rollback runbook 不覆盖、复用或常规 unpublish version；
12. Stable Readiness issue 可以机械显示全部数值门槛及证据状态。

## 明确不采用

- 双人 release quorum、required external reviewer 或 prevent-self-review；
- 单维护者模式下绕过 CI、手工修改 tarball 或自动 push-to-publish；
- GitHub/npm 共享账号、共享 OTP、长期 `NPM_TOKEN` 或 bootstrap token fallback；
- 通过 OIDC Trusted Publishing credential 调用 npm dist-tag API，或把人工 npm session 搬进 CI；
- 在 publish job rebuild、repack 或对 Changesets plan digest 不复核；
- registry verification 前创建 tag 或 GitHub Release；
- `latest` 不指向当前推荐版本，或 Stable 发布后让 `beta` 长期停留在旧 beta；
- 覆盖/复用 npm version，或以 unpublish 处理常规缺陷；
- 把 dist-tag rollback 描述为召回 exact installs；
- 用日期、beta 数量、downloads、stars 或维护者自己的项目替代 Stable evidence；
- 静默忽略 P0/P1/security/adoption blocker，或在 readiness issue 中临时豁免门槛；
- 把 Actions artifact retention 当作永久 release audit record。

## Evidence

- [CI 发布治理与 Stable 晋级事实](../research/ci-release-stable-governance-facts.md)
- [v5 构建与包管理工具链](./build-package-toolchain.md)
- [v5 测试分层与真实 API 安全边界](./test-strategy-safety-boundary.md)
- [v5 运行时与包产物支持矩阵](./runtime-package-support-matrix.md)
- [v5 对 v4 的兼容承诺](./v5-v4-compatibility-contract.md)
- [npm Trusted Publishing](https://docs.npmjs.com/trusted-publishers/)
- [npm dist-tags](https://docs.npmjs.com/cli/dist-tag/)
- [npm unpublish policy](https://docs.npmjs.com/policies/unpublish/)
- [GitHub Actions OIDC](https://docs.github.com/en/actions/reference/security/oidc)
- [GitHub environments](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments)
- [Changesets prereleases](https://github.com/changesets/changesets/blob/main/docs/prereleases.md)

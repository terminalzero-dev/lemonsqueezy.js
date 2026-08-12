# CI 发布治理与 stable 晋级事实

研究截止：2026-08-12（Asia/Shanghai）

## 结论摘要

- 目标 npm 包 `@terminalzero/lemonsqueezy` 截止研究时没有公开 registry 记录。npm trusted publisher 配置入口位于**既有 package** 的 settings，staged publishing 也明确不支持 brand-new package；因此第一次发布需要有 npm scope 权限的维护者用 2FA 或允许 bypass 2FA 的 granular access token 完成 bootstrap。此后才能绑定 GitHub Actions trusted publisher。
- npm trusted publishing 把 GitHub Actions OIDC 换成短期、package-scoped 凭据，不需要长期 `NPM_TOKEN`。GitHub workflow 必须使用 GitHub-hosted runner，并授予 `id-token: write`；npm 会校验 GitHub owner、repository、workflow 文件名，以及配置时可选的 environment。trusted publishing 成功后，npm 建议再把 package publishing access 改为“Require 2FA and disallow tokens”。
- 既定 pnpm 11.21.0 已有原生 npm OIDC exchange、tarball publish 和 provenance 能力；但 npm trusted-publishing 文档把最低版本承诺写在 npm CLI 上，而 Changesets 3 artifact publish 又没有 provenance flag。`pnpm 11.21.0 + exact .tgz + trusted publisher + provenance` 必须在第二个 prerelease 做一次 live rehearsal，不能只由各组件的分项文档推定。
- npm package version 不可覆盖；unpublish 后也不能复用同一 `name@version`。常规回退边界是移动 dist-tag、deprecate 坏版本、再发布修复版，而不是改写或回收已发布 tarball。tag 移动只改变未来按 tag/无版本安装的解析，不会召回 exact version 或 lockfile。
- GitHub environment 最多可配置 6 个 required reviewers，但原生规则只要求其中**一人**批准；`prevent self-review` 可以阻止触发者自批。GitHub environment 本身没有“两位 reviewer 都必须批准”的 quorum 语义。
- 当前 repository 没有 environment、ruleset、`main` branch protection 或 release；immutable releases 关闭。默认 `GITHUB_TOKEN` 是 read-only 且不能批准 PR。后续治理不能假定这些门禁已经存在。
- Changesets 3 的 pre mode、npm dist-tag、GitHub Release `prerelease` 都是发布机制或标签，不定义“beta 已可晋级 stable”。stable 的指标、观察期、采用证据和 blocker 阈值必须由维护者另行决定；本文件只列出待填决策槽，不替维护者设置数值。

本文件使用三个证据等级：

- **一手事实**：npm、GitHub、pnpm 或 Changesets 的官方文档、官方 source，或官方 API/registry 的截止日现场读数。
- **项目推断**：由一手事实推导、可用于规划的约束；不是平台承诺。
- **未公开承诺 / 待实演**：官方资料没有覆盖本项目的完整组合，必须用实际发布或演练验证。

## 1. 截止日项目基线

以下读数于 2026-08-12 从 npm registry 与 GitHub API 获取：

| 检查                                                 | 截止日结果                                                           |
| ---------------------------------------------------- | -------------------------------------------------------------------- |
| `npm view @terminalzero/lemonsqueezy version --json` | public registry 返回 `E404`                                          |
| GitHub repository                                    | `terminalzero-dev/lemonsqueezy.js`，public，default branch 为 `main` |
| Environments                                         | `0`                                                                  |
| Repository rulesets                                  | `0`                                                                  |
| `main` branch protection                             | API 返回 `Branch not protected`                                      |
| 默认 workflow token 权限                             | `read`；`can_approve_pull_request_reviews: false`                    |
| Releases                                             | `0`                                                                  |
| Immutable releases                                   | `enabled: false`；`enforced_by_owner: false`                         |

现场命令：

```sh
npm view @terminalzero/lemonsqueezy version --json
gh api repos/terminalzero-dev/lemonsqueezy.js
gh api repos/terminalzero-dev/lemonsqueezy.js/environments
gh api repos/terminalzero-dev/lemonsqueezy.js/rulesets
gh api repos/terminalzero-dev/lemonsqueezy.js/branches/main/protection
gh api repos/terminalzero-dev/lemonsqueezy.js/actions/permissions/workflow
gh api repos/terminalzero-dev/lemonsqueezy.js/releases
gh api repos/terminalzero-dev/lemonsqueezy.js/immutable-releases
```

**事实边界：** public registry 的 `E404` 证明没有可见的 public package，不证明 `terminalzero` npm organization 是否存在、由谁所有或当前账号是否有权限。GitHub organization `terminalzero-dev` 与 npm scope `@terminalzero` 是两个独立的授权域；GitHub owner 邀请不会授予 npm scope 权限。

## 2. npm trusted publishing 与第一次发布

### 2.1 GitHub Actions trusted publisher 前置条件

npm 对 GitHub Actions trusted publishing 的正式要求与行为如下：

- npm 文档要求 npm CLI `11.5.1` 或更高、Node.js `22.14.0` 或更高；旧 CLI 不识别 trusted-publishing OIDC flow。来源：[npm trusted publishers](https://docs.npmjs.com/trusted-publishers/)。
- 只支持 GitHub-hosted runner；GitHub self-hosted runner 不受支持。workflow 至少需要 `permissions: id-token: write`，checkout 时还需要 `contents: read`。`id-token: write` 允许 workflow 请求 OIDC token，不等于授予 repository 写权限。来源：[npm trusted publishers](https://docs.npmjs.com/trusted-publishers/)、[GitHub OIDC reference](https://docs.github.com/en/actions/reference/security/oidc)。
- package settings 中需要填写 GitHub organization/user、repository、workflow 文件名；workflow 必须位于 `.github/workflows/`，只填文件名而不是完整路径，`.yml`/`.yaml` 与大小写都必须准确。可选绑定 GitHub environment。npm 保存设置时不验证这些字段，错误通常到 publish 才暴露。来源：[npm trusted publishers](https://docs.npmjs.com/trusted-publishers/)。
- package `repository.url` 必须准确指向被绑定的 GitHub repository。reusable workflow 场景校验的是调用方 workflow 名称；调用方与被调用方都需要 `id-token: write`。来源同上。
- 每个 package 只能配置一个 trusted publisher；可允许 `npm publish`、`npm stage publish` 或两者，至少选择一种。来源同上。
- OIDC 生成短期、workflow-specific 凭据，正常 trusted flow 不需要 repository 中保存长期 npm token。来源同上。
- 来自 public GitHub repository、发布 public npm package 的 trusted publishing 会自动生成 provenance，无需再给 npm CLI 传 `--provenance`；private repository 即使发布 public package 也不支持这条自动 provenance 路径。来源同上。
- 验证 trusted publisher 工作后，npm 建议把 publishing access 切换为“Require 2FA and disallow tokens”，再撤销旧 token。这个设置阻断传统 access token，不阻断 trusted-publishing OIDC。来源同上。

对本项目，npm 绑定字段中的 repository owner/repository 应分别是 `terminalzero-dev` 与 `lemonsqueezy.js`；workflow 文件名和 environment 名仍是后续实现决策，不能提前猜测。

### 2.2 Scoped public package 与 bootstrap

**一手事实：**

- 首次发布 scoped public package 需要 npm 用户属于相应 npm organization，并使用 `--access public`；direct publish 要求账号启用 2FA，或使用允许 bypass 2FA 的 granular access token。来源：[Creating and publishing scoped public packages](https://docs.npmjs.com/creating-and-publishing-scoped-public-packages/)、[Requiring 2FA for package publishing](https://docs.npmjs.com/requiring-2fa-for-package-publishing-and-settings-modification/)。
- trusted publisher 是在既有 package 的 settings 中配置。npm staged publishing 又明确要求 package 已存在，不能用来创建 brand-new package。来源：[npm trusted publishers](https://docs.npmjs.com/trusted-publishers/)、[npm staged publishing](https://docs.npmjs.com/staged-publishing/)。
- staging 时上传动作不要求 2FA；批准或拒绝 staged package 必须使用 2FA，并可在批准前下载 tarball 检查。pnpm 11 的 `pnpm stage publish/approve/reject` 提供对应命令。来源：[npm staged publishing](https://docs.npmjs.com/staged-publishing/)、[pnpm stage](https://pnpm.io/cli/stage)。

**项目推断：** 目标 package 目前 public `E404`，所以 bootstrap 顺序存在硬约束：

1. 人工确认 npm organization `terminalzero` 的所有权、至少一名具备 package create/publish 权限的操作者及其 2FA recovery；
2. 用预先验证的 exact prerelease tarball 做第一次 direct public publish；
3. package 存在后配置精确的 GitHub workflow/environment trusted publisher；
4. 用后续 prerelease 实演 OIDC、registry provenance 与 exact tarball 一致性；
5. 成功后再 disallow tokens 并撤销 bootstrap credential。

这是平台限制推导出的迁移顺序，不是 npm 提供的一键 bootstrap workflow。第一次发布是否允许短期 granular token、还是只允许维护者交互式 2FA，是项目治理选择。

### 2.3 pnpm 11.21.0 的 OIDC / provenance 边界

- pnpm 11 `publish` 已是原生实现，不再委托 npm CLI；支持发布指定 tarball、`--tag`、`--access`、`--otp` 与 `--provenance`。来源：[pnpm publish](https://pnpm.io/cli/publish)。
- pnpm 11.21.0 source 会读取 GitHub Actions OIDC request URL/token，向 npm exchange endpoint 换取 package-scoped token，再用于 publish。来源：[pnpm 11.21.0 `idToken.ts`](https://github.com/pnpm/pnpm/blob/v11.21.0/pnpm11/releasing/commands/src/publish/oidc/idToken.ts)、[`authToken.ts`](https://github.com/pnpm/pnpm/blob/v11.21.0/pnpm11/releasing/commands/src/publish/oidc/authToken.ts)。
- pnpm 已修正“静态 auth token 抢先于 OIDC”的优先级问题；该修复包含在 11.21.0 选择范围内。来源：[pnpm OIDC priority fix](https://github.com/pnpm/pnpm/commit/6a5156bed88787528efde190bfced0dab83294a7)。

**未公开承诺 / 待实演：** npm trusted-publishing 文档以 npm CLI 最低版本表达支持条件，而本项目选用 pnpm 原生 publish；Changesets 3 的 artifact publish 也没有显式 provenance option。因此以下完整组合仍需 live rehearsal：

```text
Changesets version/pack
  -> 已 smoke-test 的同一 exact .tgz
  -> pnpm 11.21.0 原生 OIDC trusted publish
  -> beta dist-tag
  -> npm registry dist.integrity 与 provenance 指向同一 tarball/repo/workflow/commit
```

CI 正式 OIDC job 不保留 fallback `NPM_TOKEN` 可减少认证路径歧义；这是 least-privilege 设计推断，不是 npm 强制项。

## 3. npm organization、package access 与恢复

### 3.1 权限事实

- organization scoped public package 对所有人可读；写权限由 organization team 对 package 的 read/write access 决定。来源：[Package scope, access level, and visibility](https://docs.npmjs.com/package-scope-access-level-and-visibility/)、[Managing team access](https://docs.npmjs.com/managing-team-access-to-organization-packages/)。
- npm organization owner 可以管理成员、团队与 package access；npm 不允许移除最后一名 owner。来源：[Organization roles and permissions](https://docs.npmjs.com/organization-roles-and-permissions/)。
- 所有 organization 成员（包括 owner）自动属于 `developers` team；该 team 默认对新 package 有 read/write。npm 官方建议把默认改为 read-only，并为需要发布的人员创建独立 write team。来源：[About the developers team](https://docs.npmjs.com/about-developers-team/)。
- organization owner 可强制成员启用 2FA；未满足要求的成员会失去 organization access，执行强制策略的 owner 本身也必须先启用 2FA。来源：[Requiring 2FA in your organization](https://docs.npmjs.com/requiring-two-factor-authentication-in-your-organization/)。

### 3.2 冗余与恢复边界

- npm 2FA 设置会给出一次性 recovery codes；重新生成会使旧 codes 失效。npm 建议安全保存 recovery codes，并可关联 GitHub account 辅助身份恢复。来源：[Configuring 2FA](https://docs.npmjs.com/configuring-two-factor-authentication/)、[Recovering a 2FA-enabled account](https://docs.npmjs.com/recovering-your-2fa-enabled-account/)。
- 若设备与 recovery codes 同时丢失，只能联系 npm support 尝试账号恢复；官方不承诺必然恢复。来源：[Recovering a 2FA-enabled account](https://docs.npmjs.com/recovering-your-2fa-enabled-account/)。

**项目推断：** “至少两名 npm organization owner、至少两名具备受控 release/approve 权限的维护者，并分别验证 recovery”可以消除单账号/单设备故障，但这不是 npm 的强制数量。平台只强制不能移除最后一个 owner。GitHub organization owner 冗余也不能代替 npm organization 冗余。

后续票据必须由人确认而不能从 public API 推断的项目状态：

- `terminalzero` npm organization 是否已经存在、由哪个账号创建；
- `keyding` 与备用维护者是否已成为 npm owner/member，而不只是 GitHub owner；
- `developers` team 默认 access、专用 release team 与 organization 2FA policy；
- recovery codes 的保管与交接方式。研究文件不记录 recovery code 或其他 secret。

## 4. npm 版本、dist-tag 与回退边界

### 4.1 Version 与 dist-tag 是两层状态

- npm registry 的 package version 内容是 immutable；已发布的同一 `name@version` 不可覆盖，即使 unpublish 也不能复用该 version。来源：[npm unpublish policy](https://docs.npmjs.com/policies/unpublish/)。
- dist-tag 是可移动的人类可读别名，`npm dist-tag add/rm/ls` 可管理；`npm publish` 默认使用 `latest`，`--tag beta` 等可指定其他 tag。无版本的 `npm install <package>` 解析 `latest`。来源：[npm dist-tag](https://docs.npmjs.com/cli/dist-tag/)、[Adding dist-tags](https://docs.npmjs.com/adding-dist-tags-to-packages/)。
- registry package metadata 的 `dist` 包含 tarball URL、SHA-1 `shasum` 与 SHA-512 SRI `integrity`；registry 把 `dist` 视为生成且可靠的发布元数据。来源：[npm registry package metadata](https://github.com/npm/registry/blob/main/docs/responses/package-metadata.md)。

**项目推断：**

- `beta` / `next` 与 `latest` 的职责必须显式：prerelease publish 要传非默认 tag；stable publish 才移动 `latest`。
- 移动 tag 只影响未来以 tag 或无版本解析的安装。已经锁定 exact version 的 lockfile、显式 `package@version` 和缓存中的 tarball 不会被召回。
- SemVer prerelease（例如 `5.0.0-beta.7`）仍是 prerelease。把 `latest` 指向它不会把其版本语义变成 stable；stable 晋级需要发布无 prerelease suffix 的 `5.0.0`。来源：[Semantic Versioning 2.0.0](https://semver.org/)。

### 4.2 Brand-new prerelease 的 `latest` 特例

Changesets 官方 prerelease 文档明确提醒：如果 package 在 npm 从未发布，第一次只发布 prerelease 时，npm registry 会为它自动建立 `latest`；Changesets 3 也为这个 registry 行为保留了对应处理。来源：[Changesets prereleases](https://github.com/changesets/changesets/blob/main/docs/prereleases.md)、[@changesets/cli 3.0.0 release](https://github.com/changesets/changesets/releases/tag/%40changesets%2Fcli%403.0.0)。

**项目推断：** 对本项目的第一次 beta，单写 `--tag beta` 不能成为“`latest` 绝不会出现”的充分证明。发布演练必须立即读取 `npm dist-tag ls @terminalzero/lemonsqueezy`，记录实际状态，并在公开公告前执行已批准的 tag normalization。npm 官方资料没有为“全新 package 只保留 beta、完全没有 latest”给出项目级保证，因此不能先写死预期。

### 4.3 Deprecate、unpublish 与实际 rollback

- deprecate 会在安装及 package 页面显示维护者消息，可以对单 version 或 range 设置；传空消息可 undeprecate。它不删除 tarball。来源：[Deprecating and undeprecating packages](https://docs.npmjs.com/deprecating-and-undeprecating-packages-or-package-versions/)。
- package/version 创建后 72 小时内，满足没有 dependents 等条件时可以 unpublish；超过 72 小时必须同时满足没有 dependents、上一周 downloads 少于 300、只有单一 owner/maintainer 等严格条件。完整 package unpublish 后 24 小时内不能重发同名 package。unpublish 不可逆，且原 version 永远不能复用。来源：[npm unpublish policy](https://docs.npmjs.com/policies/unpublish/)。
- npm 官方优先建议在不能或不应 unpublish 时使用 deprecate。来源同上。

因此，生产可行的常规 rollback 边界是：

1. 把受影响 dist-tag 移回最近的已验证版本；
2. deprecate 错误 version 并给出升级/降级指引；
3. 发布新的修复 prerelease 或 patch；
4. 只有满足 npm policy 且风险确实要求删除时才考虑 unpublish。

以上流程无法收回 exact version，不能把“tag 已回退”等同于“坏版本已消失”。

### 4.4 Registry integrity 与 provenance 验证

- npm registry 对发布 tarball 提供 `dist.integrity`；registry signatures 与 provenance 可以通过 `npm audit signatures` 验证。该命令会对支持它们的 registry 检查签名/attestation 缺失或无效。来源：[Verifying registry signatures](https://docs.npmjs.com/verifying-registry-signatures/)、[Viewing package provenance](https://docs.npmjs.com/viewing-package-provenance/)。
- npm provenance statement 把 package name/version 与 tarball SHA-512 subject 绑定到 CI source context。来源：[npm/provenance](https://github.com/npm/provenance)、[Generating provenance statements](https://docs.npmjs.com/generating-provenance-statements/)。
- provenance 证明来源和构建关联，不证明代码安全、API 正确或发布者意图正确。来源：[Generating provenance statements](https://docs.npmjs.com/generating-provenance-statements/)。

**项目推断：** post-publish verification 不能只看 publish exit code；至少应读取 exact version metadata，比较 registry `dist.integrity` 与发布前 canonical `.tgz` 的 SHA-512，重新下载 exact version，验证 provenance 中的 repository/workflow/commit，并在隔离 consumer install 上运行 signature/provenance verification。任何 mismatch 都应阻断创建/移动 stable tag 与正式 Release。

## 5. GitHub Actions 发布治理

### 5.1 Environments 与人工批准

GitHub deployment environment 提供以下原生能力：

- 可选最多 6 名 required reviewers，但只需其中一人批准 job；reviewer 至少需要 repository read access；可允许 reviewer 是 user 或 team。来源：[Deployments and environments](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments)。
- `Prevent self-review` 会阻止触发 deployment 的用户批准自己的 run；可选择不允许 admin bypass protection rules。来源：[Managing environments](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments)。
- deployment branches/tags 可限制为 protected branches 或 selected patterns；environment secrets 只有在 protection rules 通过后才提供给 job。来源：[Deployments and environments](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments)。
- GitHub OIDC token 包含 repository、workflow、actor、runner environment 等 claims；job 绑定 environment 时，OIDC subject 也包含 environment。来源：[GitHub OIDC reference](https://docs.github.com/en/actions/reference/security/oidc)。

**项目推断：** npm trusted publisher 同时填写 environment，且 publish job 声明同名 `environment`，可以把 npm OIDC credential 限定在经过环境门禁的 job。仅选择多名 required reviewers 不构成多人 quorum；若项目要“两个人参与”，可用 `prevent self-review` 表达“触发者 + 另一批准者”，或另加 staged approval/custom rule，但 exact policy 必须另定。

### 5.2 `GITHUB_TOKEN` least privilege 与事件边界

- workflow/job 可用 `permissions` 缩小 `GITHUB_TOKEN`；一旦显式声明某些权限，未声明的权限会变为 `none`。`permissions: {}` 可全部关闭。来源：[Workflow syntax for permissions](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax)、[Automatic token authentication](https://docs.github.com/actions/how-tos/security-for-github-actions/security-guides/automatic-token-authentication)。
- OIDC publish job 只需 `id-token: write` 与读取代码所需的 `contents: read`。创建 tag/Release 另需 `contents: write`；生成 GitHub artifact attestation 另需 `attestations: write`。这些权限不应默认混在每个 test job。来源：[GitHub OIDC reference](https://docs.github.com/en/actions/reference/security/oidc)、[Using artifact attestations](https://docs.github.com/en/enterprise-cloud@latest/actions/how-tos/secure-your-work/use-artifact-attestations/use-artifact-attestations)。
- 使用 repository `GITHUB_TOKEN` 触发的绝大多数 events 不会再启动新的 workflow run，避免递归；例外包括 `workflow_dispatch` 与 `repository_dispatch`。来源：[The `GITHUB_TOKEN`](https://docs.github.com/en/actions/concepts/security/github_token)。
- GitHub 安全文档建议 third-party Actions 用 full-length commit SHA 固定，因为 SHA 是唯一 immutable 的 action reference。来源：[Secure use reference](https://docs.github.com/en/actions/reference/security/secure-use)。

**项目推断：** 如果版本 workflow 用 `GITHUB_TOKEN` 创建 tag，不能设计成“等 tag push 自动唤起另一个 publish workflow”并假定它必然发生。发布、registry verification、tag/release 可在同一受保护 workflow 中串联，或使用明确授权的 `workflow_dispatch`/App token；选择哪一种属于实现决策。

### 5.3 Branch/tag rulesets

- branch protection 可要求 PR、approving reviews、status checks、conversation resolution、signed commits、linear history，并禁止 force push/delete；默认只对指定 branch 生效。来源：[About protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)。
- repository rulesets 可同时约束 branches 与 tags，并能控制 tag create/update/delete、required workflows/checks 与 bypass actors。多个适用 rulesets 会叠加。来源：[Available rules for rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets)。

当前 repository 两种机制都没有启用。后续规划至少要明确：version/changelog 如何经 PR 进入 `main`、哪些 checks 必须通过、谁能创建 release tag、是否允许 bypass，以及紧急修复如何留审计痕迹；本研究不替项目选择 reviewer 数或 bypass 人员。

### 5.4 Artifact retention、attestation 与 Release asset

- GitHub Actions public repository 的 artifact/log retention 可设 1–90 天，默认 90 天；因此 workflow artifact 不是永久 release record。来源：[Configuring artifact and log retention](https://docs.github.com/en/organizations/managing-organization-settings/configuring-the-retention-period-for-github-actions-artifacts-and-logs-in-your-organization)。
- `actions/upload-artifact@v4` 的 artifact ID 内容不可原地修改；overwrite 会删除旧 artifact 并创建新 ID。action 输出 SHA-256 digest，但下载时 digest mismatch 的默认行为只是 warning。来源：[actions/upload-artifact](https://github.com/actions/upload-artifact)、[Store and share data with workflow artifacts](https://docs.github.com/en/actions/tutorials/store-and-share-data)。
- GitHub artifact attestation 需要 `id-token: write`、`contents: read`、`attestations: write`，且只有执行 verification 才产生供应链价值。来源：[Artifact attestations](https://docs.github.com/en/actions/concepts/security/artifact-attestations)、[Using artifact attestations](https://docs.github.com/en/enterprise-cloud@latest/actions/how-tos/secure-your-work/use-artifact-attestations/use-artifact-attestations)。
- immutable releases 启用后，已发布 Release 的 tag 和 assets 不可移动、修改或删除；GitHub 也为 release assets 生成 attestation。最佳实践是先 draft、上传全部 assets，再 publish。当前 repository 没有启用该能力。来源：[Immutable releases](https://docs.github.com/en/enterprise-cloud@latest/code-security/concepts/supply-chain-security/immutable-releases)、[Prevent release changes](https://docs.github.com/en/enterprise-cloud@latest/code-security/how-tos/secure-your-supply-chain/establish-provenance-and-integrity/prevent-release-changes)。

**项目推断：** canonical `.tgz`、digest manifest 与 publish-plan 可以先作为 workflow artifact 在受控 job 间传递，但 publish 前必须把 warning 升级为显式 digest failure。要长期保留发布证据，应把 exact `.tgz` 与 digest manifest 附到已验证 tag 的 GitHub Release，或另有明确长期存储；Actions retention 不能承担永久档案职责。GitHub artifact attestation 与 npm registry provenance 是两份不同证据，不能互相替代。

### 5.5 Concurrency

- 同一 concurrency group 默认最多保留一个 running 和一个 pending run；新进入的 pending run 会替换旧 pending。`cancel-in-progress: true` 还会取消正在运行的 run。来源：[Control workflow concurrency](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency)。
- 截止日文档也提供 bounded queue 配置，可把同组等待数提高到 `max`（上限 100）；它不能与 `cancel-in-progress: true` 同用。等待入队按顺序处理，但 GitHub 不对 run/job 的实际启动顺序作一般保证。来源同上。

**项目推断：** release workflow 应使用 repository-wide 固定 concurrency group、允许排队且不取消 in-progress publish。每个开始执行的 run 仍须在 registry mutation 前重新读取当前 version/dist-tags，因为排队时生成的判断可能已过期。

## 6. Changesets 3 prerelease 与 tag flow

### 6.1 Pre mode

- Changesets 强烈建议在非 default 的专用 prerelease branch 使用 pre mode；default branch 一旦进入 pre mode，在 exit 前会阻塞常规 release flow。来源：[Changesets prereleases](https://github.com/changesets/changesets/blob/main/docs/prereleases.md)。
- `changeset pre enter beta` 写入 prerelease state；之后 `changeset version` 生成 `-beta.0`，后续 changeset/version 递增 prerelease。`changeset publish` 会使用同名 `beta` npm dist-tag。来源同上。
- `changeset pre exit` 只记录退出意图；还要再执行 `changeset version` 才移除 prerelease suffix、应用待处理 changesets并形成 stable version。来源同上。
- Changesets 3 把已经 versioned 的 prerelease changesets 移到 `.changeset/pre/`；实现和 review 不能沿用 v2 的内部文件假设。来源：[@changesets/cli 3.0.0 release](https://github.com/changesets/changesets/releases/tag/%40changesets%2Fcli%403.0.0)。

### 6.2 Version、pack、publish 与 tags

- `changeset version` 消费 pending changesets，更新 package version 与 changelog；官方流程要求在 publish 前 review version/changelog 变更。来源：[Intro to using Changesets](https://github.com/changesets/changesets/blob/main/docs/intro-to-using-changesets.md)。
- Changesets 3 的 `changeset pack --out-dir` 生成 tarball 与 `publish-plan.json`；`changeset publish --from-pack-dir` 把记录的 exact tarball path 交给 npm/pnpm adapter。plan 记录 SHA-256，但 publish source 只校验 plan shape，没有在上传前重新 hash tarball。来源：[@changesets/cli 3.0.0 release](https://github.com/changesets/changesets/releases/tag/%40changesets%2Fcli%403.0.0)、[`pack` source](https://github.com/changesets/changesets/blob/main/packages/cli/src/commands/pack/index.ts)、[`publish` source](https://github.com/changesets/changesets/blob/main/packages/cli/src/commands/publish/index.ts)、[`publish-plan` source](https://github.com/changesets/changesets/blob/main/packages/cli/src/commands/publish-plan/getPublishPlan.ts)。
- `changeset publish` 在 registry publish 成功后创建 git tags，`--no-git-tag` 可关闭；若发布由别的步骤完成，`changeset tag` 可单独创建 tags。single-package repository 的 tag 形状是 `v<version>`。来源：[Changesets CLI changelog](https://github.com/changesets/changesets/blob/main/packages/cli/CHANGELOG.md)。

**项目推断：** 既定工具链让 Changesets 负责 intent/version/changelog/artifact plan、pnpm 负责最终 exact `.tgz` upload，因此 tag ownership 必须显式选择：在 registry exact-version verification 成功后运行受控 tag 步骤，而不是同时让 Changesets publish 与另一发布步骤各自建 tag。tag 不应早于 registry verification，否则失败发布会留下看似成功的 release ref。

**未公开承诺 / 待实演：** v3 artifact flow 在截止日前一天才正式发布；它没有显式 provenance flag，也不复核 plan digest。需要固定 exact v3 patch，并证明 pack、consumer smoke、OIDC publish 与 registry verification 使用相同 bytes。

## 7. GitHub Release prerelease 标记

- GitHub Release 可以标记为 prerelease；`gh release create --prerelease` 设置该状态，`--latest=false` 可避免它被标为 latest。来源：[Managing releases](https://docs.github.com/en/repositories/releasing-projects-on-github/managing-releases-in-a-repository)、[`gh release create`](https://cli.github.com/manual/gh_release_create)。
- `gh release create --verify-tag` 会要求 remote 中已存在 tag；若不使用该 flag，CLI 可以从目标 commit/default branch 自动创建 tag。来源：[`gh release create`](https://cli.github.com/manual/gh_release_create)。

**项目推断：** beta Release 应同时显式指定 GitHub `prerelease`、`latest=false` 与 npm `beta` dist-tag；三者互不自动同步。stable Release 应只绑定已经由 registry verification 确认的 stable tag。使用 `--verify-tag` 可避免 Release 命令隐式从错误 commit 创 tag。

若启用 immutable releases，Release 最终 publish 前必须已上传所有计划 assets；发布后不能再补改资产。是否启用、何时启用属于 repository 治理决定，但当前状态不能提供该保证。

## 8. Stable 晋级：官方没有定义的部分

npm、GitHub 与 Changesets 的官方机制分别能表达：

- SemVer prerelease/stable version；
- npm `beta` / `latest` dist-tags；
- Changesets pre enter/exit；
- GitHub Release prerelease/latest 状态；
- CI approvals、branch/tag rules 与 provenance。

它们都**没有**定义“SDK beta 何时质量足够、可晋级 stable”，也没有承诺推荐的 beta 观察天数、发布次数、采用者数量或 blocker 数量。Changesets `pre exit` 是维护者意图，不是质量评估器；移动 npm `latest` 只是 registry mutation。

下一步 PRD/票据可要求维护者给下列决策槽填入可测值，但本研究不填值：

| 决策槽        | 需要维护者定义的内容                                                                   |
| ------------- | -------------------------------------------------------------------------------------- |
| 时间/版本证据 | 最短 beta 观察期、最少 prerelease 数及何时重置观察                                     |
| 采用与反馈    | 需要哪些真实 consumer/adopter 证据，反馈记录在哪里                                     |
| 阻断缺陷      | 哪些 severity、security、contract regression 会阻断或重置晋级                          |
| 兼容矩阵      | exact candidate tarball 必须通过哪些 Node/Bun/TypeScript/module-mode fixtures          |
| API 契约      | v4 compatibility contract 与 intentional breaking changes 如何签收                     |
| 运营能力      | dist-tag rollback、deprecate、credential recovery、第二维护者演练是否必须完成          |
| 供应链证据    | exact tarball digest、npm provenance、GitHub attestation/Release asset 的必需项        |
| 文档          | migration guide、known limitations、release notes 与 rollback communication 的完成定义 |
| 批准权        | 谁能提出晋级、谁批准、是否阻止 self-review、紧急 bypass 如何审计                       |

没有这些显式项目值时，可以确认 beta/stable 的机械流程，但不能声称 stable readiness 门槛已经定义。

## 9. 必须演练后才能关闭的事实缺口

1. npm organization `terminalzero` 的真实 owner/member/team/2FA 状态，以及至少一个备用恢复路径。
2. 第一次 scoped public prerelease 的 bootstrap 是否由预期账号成功执行，且没有上传错误 package name/access/tag。
3. brand-new prerelease 发布后 registry 实际生成哪些 dist-tags，`latest` normalization 是否可按计划完成。
4. package settings 中 `terminalzero-dev/lemonsqueezy.js`、精确 workflow 文件名与 environment 绑定是否被 npm 接受。
5. pnpm 11.21.0 在 GitHub-hosted runner 是否不带长期 token 即可用 OIDC 发布 exact `.tgz`，并自动/显式得到正确 npm provenance。
6. Changesets 3 `publish-plan.json` digest、上传前重新计算的 digest、registry `dist.integrity` 与重新下载 tarball 是否全部对应同一 bytes。
7. environment approval、prevent-self-review、branch/tag restrictions、concurrency 与失败重跑是否在真实 workflow 中表现为预期状态机。
8. `GITHUB_TOKEN` 创建 tag 后的事件是否不被错误设计成依赖隐式 workflow recursion。
9. beta rollback rehearsal 能否在不 unpublish 的情况下完成 tag 回退、deprecate、修复版发布和 consumer communication。
10. GitHub prerelease/immutable Release asset、npm dist-tag 与 npm provenance 是否分别验证且没有被当成同一信号。

这些缺口通过后，才能把对应条目从“平台能力/项目推断”升级为“本仓库已验证的发布保证”。

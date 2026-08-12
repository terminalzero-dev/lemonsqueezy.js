# v5 构建与包管理工具链

状态：已确认，作为 LemonSqueezy SDK v5 beta 的实施输入。

关联票据：[选择构建与包管理工具链](https://github.com/terminalzero-dev/lemonsqueezy.js/issues/3)

## 决策摘要

Terminal Zero fork 使用 pnpm 作为唯一 Repository package manager，并以 Node 24 作为 Build host。源码通过 tsdown 从同一 TypeScript graph 生成 bundleless ES2022 ESM/CJS 与匹配 declarations；TypeScript 6 负责源码检查和 declaration emission，TypeScript 5.4 与 latest 只在隔离 consumer fixtures 中证明兼容。

Oxlint + 少量 type-aware rules 是唯一 linter，Oxfmt 是唯一 formatter。Changesets 3 只负责变更意图、版本、changelog 和一次性 artifact plan；最终 registry upload 由 pnpm 对已经验证的 Canonical Package Artifact 执行。

工具链不使用隐式 lifecycle build/publish hooks，不引入 task runner，也不让 Bun、npm/npx 或全局工具成为仓库命令的隐含依赖。

## 已冻结的输入约束

本票不重新设计 package contract。工具链必须实现：

- package root、`./client`、`./compat` 三个双格式 runtime entries；
- `./types` declaration-only entry，无 runtime export target；
- ESM `.js` + `.d.ts`，CJS `.cjs` + `.d.cts`；
- 固定 `ES2022` target；
- 保持模块图供 ESM tree-shaking 验证；
- Node 22/24、Bun `>=1.3.14 <2` 与 TypeScript `>=5.4` consumer matrix；
- 从一次 pack 产生的 exact `.tgz` 安装、测试并发布。

详细 package surface 见 [v5 运行时与包产物支持矩阵](./runtime-package-support-matrix.md)，测试门禁见 [v5 测试分层与真实 API 安全边界](./test-strategy-safety-boundary.md)。

## Repository package manager

### pnpm 是唯一权威

`package.json` 使用精确的：

```json
{
  "packageManager": "pnpm@11.21.0"
}
```

仓库只提交 `pnpm-lock.yaml`。所有本地与 CI dependency install 使用：

```sh
pnpm install --frozen-lockfile
```

只有显式依赖更新或 Changesets version step 可以修改 lockfile。实现迁移时删除 `bun.lockb`，不创建 `bun.lock`、`package-lock.json`、`npm-shrinkwrap.json`、Yarn lockfile 或第二个 workspace/package-manager layer。

Bun 是 Supported runtime consumer，不是 repository installer。npm CLI 不参与 install、build、pack 或 publish；最终 registry upload 也使用 pnpm。Node 22/24 与 Bun fixtures 仍各自执行安装后的 package，不能因为 pnpm 是仓库工具而缩小消费矩阵。

### Build host

Repository tooling 运行在当前 Node 24 release line，最低为 Node 24.11；CI 解析最新 24.x 并记录实际 patch version。Node consumer fixtures 仍分别覆盖已承诺的 Node 22/24 minimum/latest，二者不能与 Build host 混为一谈。

不把所有 direct devDependencies 写成 exact version：

- `packageManager` 精确固定 pnpm binary；
- stable tools 使用受控 `^` range；
- `0.x`/beta tools 使用 `~` range，避免自动跨 minor；
- `pnpm-lock.yaml` 固定每次 frozen install 的完整解析结果；
- tool upgrade 只通过独立 dependency PR，并重新运行全部 credential-free gates；
- CI 输出 pnpm、Node、tsdown、TypeScript、Oxlint/Oxfmt 与 consumer fixture 的 resolved versions。

因此可重复性来自 frozen lockfile 与 recorded environment，不来自把 package manifest 中每个 devDependency 都写成 exact。

## Build 与 declarations

### tsdown

采用 `tsdown ~0.22.14`，替换已停止积极维护的 tsup。采用它是基于本项目组合 proof，而不是假设任意 tsdown 配置都可靠。

目标配置语义：

```ts
export default {
  entry: {
    index: "src/index.ts",
    "client/index": "src/client/index.ts",
    "compat/index": "src/compat/index.ts",
    "types/index": "src/types/index.ts",
  },
  format: ["esm", "cjs"],
  target: "es2022",
  unbundle: true,
  dts: true,
  clean: true,
  minify: false,
  sourcemap: false,
  outDir: "dist",
  outExtensions({ format }) {
    return format === "cjs"
      ? { js: ".cjs", dts: ".d.cts" }
      : { js: ".js", dts: ".d.ts" };
  },
};
```

这是配置形状，不冻结 import syntax 或无关 defaults。实施验收以输出 manifest 和 consumer fixtures 为准。

### 四个 build entries、三个 runtime package entries

tsdown 的 build entry list 包含 root、client、compat 和 types。`src/types/index.ts` 是只使用 `export type` 的 public type barrel，用于完整生成：

- `dist/types/index.d.ts`；
- `dist/types/index.d.cts`。

tsdown 0.22.14 仍会为纯类型 entry 机械地产生 inert `dist/types/index.js` 与 `.cjs`。一个很小的显式 build-normalization step 必须先验证该 entry 没有 runtime exports，再移除这两个精确文件；它不得扫描或删除其他 output。Package export map 的 `./types` 只有 declaration conditions，tarball manifest 也不得包含 types JavaScript；runtime import/require 必须由 exports resolution 拒绝。

| Package entry | ESM runtime | CJS runtime | ESM types | CJS types |
| ------------- | ----------- | ----------- | --------- | --------- |
| root          | `.js`       | `.cjs`      | `.d.ts`   | `.d.cts`  |
| `./client`    | `.js`       | `.cjs`      | `.d.ts`   | `.d.cts`  |
| `./compat`    | `.js`       | `.cjs`      | `.d.ts`   | `.d.cts`  |
| `./types`     | 无          | 无          | `.d.ts`   | `.d.cts`  |

### 不 minify、不发 sourcemap

发布代码保持可读，便于 stack trace、debug 和 package inspection。Bundleless output 的行号直接指向发布 JavaScript；v5 beta 不生成 JS source maps、declaration maps 或指向未发布 source 的注释。

`dist/` 不提交。tsdown 每次 build 先清理 output；Package Smoke 只能消费当前 clean build 生成的 tarball，不能复用 workspace 内 stale files。

### 本地组合 proof

2026-08-12 的可丢弃 proof 使用 tsdown 0.22.14 + TypeScript 6.0.3，验证了：

- root/client/compat bundleless entries 同时生成 `.js/.cjs/.d.ts/.d.cts`；
- internal ESM imports 使用 `.js`，CJS require 使用 `.cjs`；
- dedicated type entry 完整生成 `types/index.d.ts/.d.cts`；当前 tsdown 会附带 inert types JavaScript，正式 build 必须精确移除；
- Node 24 ESM/CJS 与 Bun 1.3.14 ESM/CJS 均可执行；
- TypeScript 5.4.5 与 7.0.2 的 NodeNext ESM/CJS consumers 均可编译；
- clean build 连续执行两次后 output manifest digest 相同。

临时 proof 已删除，不是 production config。真实 v5 source、四个 package entries 与完整 tarball matrix 仍必须作为实施验收运行。

## TypeScript 分工

### Source compiler

Root 使用 `typescript ~6.0.3`：

- `tsc --noEmit` 检查源码、tests 与 config；
- tsdown declaration generator 使用同一 compiler generation；
- root `tsconfig.json` 保持 `strict`、`ES2022`、ES module 与 bundler resolution；
- 不建立没有当前需要的 project-reference tree；
- 不用 Oxlint type-aware 或 declaration build 替代 `tsc`。

暂不使用 TypeScript 7 生成 declarations。TS 7 缺少旧 programmatic API，tsdown 的 tsgo declaration path 在当前组合中不是比 TS 6 更低风险的默认值。

### Consumer compatibility

TypeScript 5.4 不是 Build host dependency，而是已冻结的最低 consumer compatibility：

- 精确 5.4.x fixture 验证最低声明语法与 package resolution；
- latest fixture 当前为 7.x，作为升级探针；
- 两者从真实 `.tgz` 安装 package，并使用独立 compiler binary；
- ESM NodeNext、ESM Bundler 与 CJS `.cts` 分别编译；
- `skipLibCheck` 必须是 `false`；
- CI 记录 latest 实际 resolved version。

SDK package 不把 TypeScript 声明为 runtime dependency 或 peer dependency。保留 5.4 避免 v4 到 v5 同时强迫消费者升级 TypeScript；提高最低版本必须由未来 major 决策。

## Lint 与 format

### Oxlint

采用 `oxlint ^1.78.0`。普通 correctness rules 与显式项目规则作为 required gate，所有 warnings 通过 `--deny-warnings` 变为失败。

同时采用 `oxlint-tsgolint ~7.0.2001` 的 type-aware engine，但不启用整个推荐 preset。初始只启用对异步 SDK 边界高价值的规则：

- `no-floating-promises`；
- `no-misused-promises`；
- `await-thenable`。

新增 type-aware rule 必须有具体 defect class 和现有代码 baseline，不能只因 preset 新增。Type-aware lint 使用 TS 7/tsgo semantics，因此 root tsconfig 必须同时能被 TS 6 source compiler 与 TS 7 engine 读取；它仍不能代替 TypeScript 5.4/latest consumer fixtures。

实现迁移时手工映射当前少量 ESLint rules，并建立 clean baseline；旧 ESLint 8 config 不能由 Oxlint migration tool 直接证明等价。

### Oxfmt

采用 `oxfmt ~0.63.0` 作为唯一 formatter，删除 Prettier。Oxfmt 当前仍是 beta，这是已接受且由以下边界控制的工具风险：

- lockfile 固定实际版本；
- PR 和本地使用同一 binary；
- `format:check` 是 required gate；
- 第一次 migration 形成独立机械 formatting commit；
- 后续 Oxfmt upgrade 与产生的机械 diff 使用独立 dependency/format commit；
- 不同时保留 Prettier fallback 或双 formatter。

本仓库没有 Prettier plugins，所需 TypeScript、JavaScript、JSON、YAML 与 Markdown 均在 Oxfmt 当前支持面内。

### 删除本地 hook toolchain

删除：

- ESLint、`@typescript-eslint/parser`、`@typescript-eslint/eslint-plugin` 与 `.eslintrc.*`；
- Prettier、Prettier config/ignore；
- Commitlint、lint-staged、simple-git-hooks 与对应 package config；
- 文档中对 Husky/Bun/旧 lint-format 命令的陈旧说明。

Conventional Commit 可以保留为贡献指南，但不由 local Git hook 强制。CI required checks 是唯一权威，避免 hook install、shell 与 package-manager 差异制造第二套结果。

## Changesets 3

### 职责

保留 `@changesets/cli ^3.0.0` 与 `@changesets/changelog-github ^1.0.0`，并将 config repo 改为 `terminalzero-dev/lemonsqueezy.js`。

Changesets 负责：

- 记录 public API、behavior、type 与 package-output change intent；
- 聚合 semver bump；
- 修改 package version；
- 生成 CHANGELOG；
- 生成一次性 tarball 与 publish plan。

纯文档、tests 与不改变公共契约的 internal refactor 不需要 changeset，也不强制 empty changeset。CI 对真正需要 changeset 的 PR 如何判定留给 release governance 票据，不在 package script 中猜测 git diff。

Changesets 不负责 provenance policy、GitHub permissions、npm trusted publishing、Git tag、GitHub Release、dist-tag rollback 或 stable promotion。

### Version command

删除当前 `.github/changeset-version.js`。显式版本流程是：

```sh
pnpm changeset version
pnpm install --lockfile-only
pnpm install --frozen-lockfile
```

Version PR 必须同时提交 manifest、CHANGELOG、Changesets state 与更新后的 `pnpm-lock.yaml`。

### Beta pre mode

不在 `main` 长期进入 Changesets pre mode。专用 beta release branch 执行 `changeset pre enter beta`：

1. 建立不发布的 `5.0.0-beta.0` implementation baseline；
2. 首个外部 artifact 递增为已确认的 `5.0.0-beta.1`；
3. 后续 beta 由 Changesets 顺序递增；
4. stable promotion 的 branch merge/pre-exit 规则由 release governance 票据决定。

### Canonical Package Artifact

`changeset pack --out-dir <artifact-dir>` 对已经 versioned 和 built 的 package 只执行一次，生成 tarball 和 publish plan。Workflow 随即计算 SHA-256；之后：

```text
one .tgz
  ├─ Installed-package Smoke
  ├─ Test Mode integration
  └─ pnpm registry upload + provenance
```

Publish 前必须重新计算并比对 digest。Changesets plan 自带的 integrity 不是 workflow verification 的替代品。最终上传使用 pnpm 对 exact tarball path 执行；具体 OIDC/provenance command 必须在下一张 release governance 票据中 rehearsal 后冻结。

## Canonical scripts

| Script             | 单一职责                                                                  |
| ------------------ | ------------------------------------------------------------------------- |
| `build`            | clean tsdown build + exact type-entry normalization + output validation   |
| `typecheck`        | TypeScript 6 `tsc --noEmit`                                               |
| `lint`             | Oxlint correctness + selected type-aware rules，deny warnings             |
| `format`           | Oxfmt write                                                               |
| `format:check`     | Oxfmt check                                                               |
| `test`             | Vitest Unit + Transport Contract                                          |
| `test:types`       | Type Contract fixtures                                                    |
| `test:package`     | exact tarball Installed-package Smoke matrix                              |
| `test:integration` | explicit protected Test Mode integration                                  |
| `check`            | format check、lint、typecheck 与全部 credential-free tests                |
| `changeset`        | create a Changeset                                                        |
| `version`          | apply Changesets version state and refresh pnpm lockfile                  |
| `pack:artifact`    | create the single release-candidate tarball/publish plan from clean build |

Scripts 只能调用 local dependencies through pnpm；不得使用 `bun`、`bunx`、`npx` 或未固定的 global binary。

`test:integration` 绝不进入普通 `test` 的隐式路径。`check` 包含完整 Package Smoke，因此可以较慢，但从干净 checkout 不需要 Lemon Squeezy credentials。

## 禁止隐式 lifecycle

不定义会修改或重新生成 package 的：

- `prepare`；
- `postinstall`；
- `prepack`；
- `prepublishOnly`；
- publish-time version/build hook。

Build、version、pack、digest verification、test 和 publish 是 workflow 中可见、按顺序执行的 steps。Publishing an exact `.tgz` 不得触发 source rebuild 或第二次 pack。

## 可重复性与产物卫生

- `dist/`、coverage、artifact directory 与 `.tgz` 不提交；
- `package.json#files` 是 tarball allowlist，只包含发布所需的 dist、README/LICENSE 等；
- build 不读取 release secret、API credential、当前时间或未记录环境变量；
- PR 对同一 clean checkout 连续 build 两次，比较 sorted output manifest 与 SHA-256；
- output file 缺失、多余、覆盖、stale、extension 错误或 digest 不稳定都使 gate 失败；
- 不承诺独立 pack 两次产生 bit-identical gzip bytes；安全模型是 pack 一次后复用 exact file；
- package smoke 从 tarball specifier 加载，不读取 repo `dist`。

## 实施迁移清单

1. 将 Build host 更新为 Node 24 current line，并声明 pnpm 11.21.0。
2. 生成并提交唯一 `pnpm-lock.yaml`，删除 `bun.lockb`。
3. 用 tsdown config 替换 tsup config，创建四 build entries，并精确移除 types entry 的 inert JavaScript。
4. 将 root TypeScript 固定在 6.0.x，建立 5.4/latest consumer fixtures。
5. 迁移到 Oxlint + selected type-aware rules，形成无 warning baseline。
6. 迁移到 Oxfmt，单独提交机械 format diff。
7. 删除 ESLint、Prettier、Commitlint、lint-staged 与 Git hooks。
8. 升级和修正 Changesets config，删除 custom version script。
9. 建立 canonical scripts、禁止 lifecycle hooks，并更新贡献文档。
10. 建立 repeated-build manifest/digest、pack-once 与 tarball smoke checks。

## v5 beta 验收

实施必须证明：

1. `pnpm install --frozen-lockfile` 是唯一 dependency installation path；
2. repo 中只有 `pnpm-lock.yaml`，scripts 不调用 Bun/npm/npx/global tools；
3. tsdown 从 clean source 生成完整、无覆盖的 ES2022 ESM/CJS + dual declaration graph；
4. `./types` 有 `.d.ts/.d.cts`；types JavaScript 经验证后精确移除，且没有 runtime export target；
5. output 不 minify、不含 source/declaration maps；
6. Node/Bun runtime、TS 5.4/latest types 和四 package entries 通过 exact tarball fixtures；
7. two-build manifest/digest comparison 稳定；
8. Oxlint ordinary/type-aware rules、Oxfmt check 和 TS 6 typecheck 全部 required；
9. lint/format/tool upgrades 不能绕过 frozen lockfile；
10. Changesets version 正确更新 changelog、pre state 与 pnpm lockfile；
11. `changeset pack` 只生成一个 Canonical Package Artifact，后续 gates 使用同一 digest；
12. 没有 lifecycle hook 在 install、pack 或 publish 时重建 package。

## 明确不采用

- Bun、npm、Yarn 或多个 package managers 管理 repository dependencies；
- 继续使用二进制 `bun.lockb`；
- 继续使用不再积极维护的 tsup；
- 直接 Rollup + 两套手工 `tsc` output pipelines；
- TypeScript 7/tsgo 作为 v5 beta declaration emitter；
- 取消 TypeScript 5.4 consumer baseline；
- ESLint、Prettier、Commitlint、lint-staged 或 local Git hook gate；
- Oxfmt 与 Prettier 双 formatter；
- 全量 Oxlint type-aware preset；
- 把每个 devDependency 在 manifest 写成 exact version；
- 自定义 task runner、无必要 workspace 或 package-manager enforcement dependency；
- implicit install/build/publish lifecycle scripts；
- 测试源码后重新 build/pack 一个不同 artifact；
- 把 bit-identical repack 当作发布同一 artifact 的替代品。

## Evidence

- [构建与包管理工具链事实](../research/build-package-toolchain-facts.md)
- [pnpm install](https://pnpm.io/cli/install)
- [pnpm pack](https://pnpm.io/cli/pack)
- [pnpm publish](https://pnpm.io/cli/publish)
- [tsdown](https://tsdown.dev/)
- [TypeScript module reference](https://www.typescriptlang.org/docs/handbook/modules/reference)
- [Oxlint](https://oxc.rs/docs/guide/usage/linter)
- [Oxfmt](https://oxc.rs/docs/guide/usage/formatter)
- [Changesets 3.0.0](https://github.com/changesets/changesets/releases/tag/%40changesets%2Fcli%403.0.0)
- [v5 运行时与包产物支持矩阵](./runtime-package-support-matrix.md)
- [v5 测试分层与真实 API 安全边界](./test-strategy-safety-boundary.md)

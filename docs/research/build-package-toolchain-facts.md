# 构建与包管理工具链事实

研究截止：2026-08-12（Asia/Shanghai）

## 结论摘要

- pnpm 11、npm 12 和 Bun 1.3 都提供文本 lockfile 与 frozen install。pnpm 11 同时满足 Node 22/24、Changesets 3 和显式 `pack`/tarball `publish`；Bun 的 package manager 本身具备这些基础能力，但 Changesets 3 没有把 Bun 列为受支持的 publish tool。
- `packageManager` 可以固定 pnpm/npm 的版本，但 Node 22/24 内置的 Corepack 仍是 experimental 且必须启用；Corepack 默认不拦截 `npm`。Bun 应由官方 setup action/installer 单独固定版本。
- tsup 官方仓库已经明确声明“不再积极维护”，并建议迁移至 tsdown。tsdown 0.22.14 明确支持多入口、ESM+CJS、target、source maps、clean、unbundle、dts 和输出扩展；其官方测试也证明双格式可以生成 `.mjs/.cjs` 与 `.d.mts/.d.cts`。
- 但官方资料没有一项组合测试能证明本项目要求的 **unbundle + 四个公开入口 + ESM `.js` + CJS `.cjs` + matching `.d.ts/.d.cts` + ES2022** 一次构建完全成立。特别是 unbundle+dts+双格式的组合需要本地 prototype 后才能称为可靠。
- 官方 `tsc` 可以稳定发射 bundleless declarations，且 TypeScript 明确规定 `.cjs` 对应 `.d.cts`。但从同一组普通 `.ts` 源直接得到两套 ESM/CJS declarations 不是一个单次 `tsc` 命令的通用承诺；应把 TS 5.4 与 latest consumer compilation 当作独立 fixture，而不是让当前编译器代替旧编译器。
- Oxlint 已稳定；截至截止日，Oxfmt 仍是 beta。Oxlint 的普通规则可替换当前简单 ESLint 规则集的候选，但 type-aware engine 绑定 TypeScript 7，不能证明 TS 5.4 兼容，也不应代替独立 `tsc` matrix。Oxfmt 覆盖本仓库主要文件类型，但迁移会产生一次全仓格式验证，且不支持 Prettier plugins。
- Changesets 3.0.0（2026-08-11 发布）首次正式提供 `changeset pack --out-dir` 与 `changeset publish --from-pack-dir`，后者把预构建 tarball 的精确路径传给 npm/pnpm。它解决了“先测 exact `.tgz`、后发布同一文件”的能力缺口；但 recorded SHA-256 没有在 publish path 中重新校验，provenance 也没有 Changesets CLI flag，仍需本地 release proof。

本文件只记录一手事实、能力边界和需要验证的组合，不替维护者选择工具。

## 1. 截止日版本与维护状态

| 工具       | 截止日可见版本/状态                                  | 一手依据                                                                                                                                                                                                                                     |
| ---------- | ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| pnpm       | 11.21.0；pnpm 12 仍为 RC                             | [pnpm 11.21 release](https://github.com/pnpm/pnpm/releases/tag/v11.21.0)、[pnpm installation](https://pnpm.io/installation)                                                                                                                  |
| npm        | npm registry 的 `latest` 为 12.0.2                   | [npm registry metadata](https://registry.npmjs.org/npm/latest)、[npm CLI docs](https://docs.npmjs.com/cli/v12/commands/npm)                                                                                                                  |
| Bun        | 1.3.14                                               | [Bun v1.3.14](https://github.com/oven-sh/bun/releases/tag/bun-v1.3.14)                                                                                                                                                                       |
| tsup       | 8.5.1；仓库声明不再积极维护                          | [tsup repository](https://github.com/egoist/tsup)、[v8.5.1](https://github.com/egoist/tsup/releases/tag/v8.5.1)                                                                                                                              |
| tsdown     | 0.22.14，仍为 `0.x`                                  | [tsdown v0.22.14](https://github.com/rolldown/tsdown/releases/tag/v0.22.14)、[docs](https://tsdown.dev/)                                                                                                                                     |
| TypeScript | registry latest 为 7.0.2；兼容下限 fixture 为 5.4.x  | [TypeScript 7.0 announcement](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/)、[TypeScript 5.4 announcement](https://devblogs.microsoft.com/typescript/announcing-typescript-5-4/)                                     |
| Oxlint     | 1.78.0；1.0 起 stable；type-aware engine 7 已 stable | [Oxlint v1.0 Stable](https://oxc.rs/blog/2025-06-10-oxlint-stable)、[Type-Aware Linting Stable](https://oxc.rs/blog/2026-07-22-type-aware-linting-stable.html)、[apps v1.78.0](https://github.com/oxc-project/oxc/releases/tag/apps_v1.78.0) |
| Oxfmt      | 0.63.0；beta，官方仍写明“towards a stable release”   | [Oxfmt Beta](https://oxc.rs/blog/2026-02-24-oxfmt-beta)、[apps v1.78.0](https://github.com/oxc-project/oxc/releases/tag/apps_v1.78.0)                                                                                                        |
| Changesets | 3.0.0，2026-08-11 发布                               | [@changesets/cli@3.0.0](https://github.com/changesets/changesets/releases/tag/%40changesets%2Fcli%403.0.0)                                                                                                                                   |

## 2. Package manager

### 2.1 版本固定与 Node 22/24 bootstrap

#### pnpm / npm

- Node 的 `packageManager` 字段格式是 `<name>@<version>`，目的是让协作者使用同一 package-manager 版本；Node 文档仍把它标为 experimental。来源：[Node package docs](https://nodejs.org/download/release/v22.14.0/docs/api/packages.html#packagemanager)。
- Corepack 支持 `pnpm`、`yarn` 和 `npm`，可按 `packageManager` 下载精确版本；hash 可选但 Corepack 官方强烈建议使用。来源：[Corepack README](https://github.com/nodejs/corepack#when-authoring-packages)。
- Corepack 随 Node 14.19 至 `<25` 分发，因此 Node 22/24 有 bundled Corepack；仍需执行 `corepack enable`。Node 25 起不再 bundled。来源：[Corepack README](https://github.com/nodejs/corepack#default-installs)、[Node 25 Corepack docs](https://nodejs.org/download/release/v25.8.0/docs/api/corepack.html)。
- Corepack 不默认启用 `npm` shim。即使 `packageManager` 写成 npm，直接运行的可能仍是 Node 随附的 global npm；若要精确固定 npm CLI，需要在 CI 明确安装/调用该版本并校验 `npm --version`。来源：[Node Corepack docs](https://nodejs.org/download/release/v20.11.0/docs/api/corepack.html#how-does-corepack-interact-with-npm)。
- pnpm 11 需要至少 Node 22，官方 compatibility table 明确支持 Node 22 和 24。来源：[pnpm installation](https://pnpm.io/installation#compatibility)。
- Changesets 3.0.0 声明 Node `^22.11 || ^24 || >=26`、npm `>=10.9.0`、pnpm `>=10.0.0`。来源：[@changesets/cli package.json](https://github.com/changesets/changesets/blob/main/packages/cli/package.json)。

#### Bun

- Bun 是独立二进制，不由 Node/Corepack bootstrap；官方 GitHub Action 支持 `bun-version: 1.3.14` 或 commit SHA，installer 也可指定 tag。来源：[Bun CI guide](https://bun.com/docs/guides/runtime/cicd)、[Bun installation](https://bun.com/docs/installation#installing-older-versions)。
- Corepack 允许的 package-manager 名称是 yarn、npm、pnpm，不包含 Bun。来源：[Corepack README](https://github.com/nodejs/corepack#when-authoring-packages)。
- Changesets 3 的 publish-tool detector 只原生选择 npm、pnpm、yarn；未知工具退回 npm。Bun 不是声明的受支持 publish tool。来源：[Changesets `getPublishTool.ts`](https://github.com/changesets/changesets/blob/main/packages/cli/src/commands/publish/getPublishTool.ts)。

### 2.2 Lockfile 与 frozen install

| 工具    | 文本 lockfile                                     | Frozen CI 行为                                                                                                                 | 来源                                                                                                         |
| ------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| pnpm 11 | `pnpm-lock.yaml`                                  | `pnpm install --frozen-lockfile` 不更新 lockfile；manifest 不一致、需更新或 lockfile 缺失会失败；CI 且 lockfile 存在时默认开启 | [pnpm install](https://pnpm.io/cli/install#--frozen-lockfile)                                                |
| npm 12  | `package-lock.json`                               | `npm ci` 要求 lockfile，manifest 不一致即失败，且不写 manifest/lockfile；会先移除现有 `node_modules`                           | [npm ci](https://docs.npmjs.com/cli/v12/commands/npm-ci/)                                                    |
| Bun 1.3 | `bun.lock`；1.2 起由 binary `bun.lockb` 改为 text | `bun ci` 等价于 `bun install --frozen-lockfile`，要求提交 `bun.lock`，不一致即失败                                             | [Bun lockfile](https://bun.com/docs/pm/lockfile)、[Bun install CI](https://bun.com/docs/pm/cli/install#cicd) |

三者都能实现确定性 install。lockfile 是各自格式，不能仅因 Bun 会自动迁移 `pnpm-lock.yaml` 就把迁移结果视作无差异；官方只承诺原 lockfile 被保留。来源：[Bun lockfile migration](https://bun.com/docs/pm/lockfile#automatic-lockfile-migration)。

### 2.3 Pack、精确 tarball publish 与 provenance

| 工具    | Pack                                                           | 发布指定 `.tgz`                                                          | Provenance                                        |
| ------- | -------------------------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------- |
| pnpm 11 | `pnpm pack --out <path>` / `--json`；也有 `--pack-destination` | `pnpm publish <tarball>`                                                 | `pnpm publish --provenance` 有正式文档            |
| npm 12  | `npm pack --json --pack-destination <dir>`；JSON 含 filename   | `npm publish ./file.tgz`；npm 把 gzipped tarball 定义为有效 package-spec | `npm publish --provenance` 或 `--provenance-file` |
| Bun 1.3 | `bun pm pack`                                                  | `bun publish ./package.tgz`；tarball path 时不再运行 lifecycle scripts   | 官方 `bun publish` 文档没有 provenance option     |

来源：[pnpm pack](https://pnpm.io/cli/pack)、[pnpm publish](https://pnpm.io/cli/publish)、[npm pack](https://docs.npmjs.com/cli/v12/commands/npm-pack/)、[npm publish](https://docs.npmjs.com/cli/v12/commands/npm-publish/)、[Bun publish](https://bun.com/docs/pm/cli/publish)。

因此，三者都能把 consumer smoke 安装过的文件路径作为 publish input；只有 npm/pnpm 有公开 provenance 能力。是否生成并发布了**同一字节序列**仍应在 release workflow 中记录并比较 tarball digest，不能只比较文件名。

## 3. 构建工具

### 3.1 tsup

- tsup 官方 README 明确写明项目不再积极维护，并建议使用 tsdown。来源：[egoist/tsup](https://github.com/egoist/tsup)。
- 最后可见正式 release 是 v8.5.1（2025-11-12）。停止积极维护不表示现有 v8.5.1 立即失效，但不构成面向新 v5 工具链的未来维护承诺。来源：[v8.5.1](https://github.com/egoist/tsup/releases/tag/v8.5.1)。

### 3.2 tsdown 已确认能力

截至 tsdown 0.22.14，官方 docs/source/tests 确认：

tsdown 0.22.14 自身要求 Node `^22.18.0 || >=24.11.0`，并声明 TypeScript peer range `^5.0.0 || ^6.0.0 || ^7.0.0`。这是 build-host 要求，不是 SDK consumer runtime 要求。来源：[v0.22.14 package.json](https://github.com/rolldown/tsdown/blob/v0.22.14/package.json)。

| 要求                          | 正式能力                                                                                                                        |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| 多入口                        | `entry` 接受 array、named object 和 glob；每个入口独立输出                                                                      |
| ESM + CJS                     | `format: ['esm', 'cjs']`；CJS 是 maintenance-only，但仍受支持                                                                   |
| ES2022                        | `target` 接受 ECMAScript target string，source type 例示 `es2020`；`es2022` 属于相同 target grammar，但项目组合仍需跑构建 proof |
| Bundleless                    | `unbundle: true` 将引用到的 source files 一对一发射并保持目录结构                                                               |
| Source map                    | `false`、`true`、`inline`、`hidden`                                                                                             |
| Declarations                  | `dts: true`；内部使用 `rolldown-plugin-dts`；可按 `isolatedDeclarations`/compiler version 选择 Oxc、`tsc` 或 `tsgo` generator   |
| ESM/CJS declaration extension | `fixedExtension: true` 的官方测试产出 `.mjs/.cjs` 与 `.d.mts/.d.cts`                                                            |
| Custom extension              | `outExtensions(context) => ({ js, dts })` 可按 format 返回 JS 与 declaration 扩展                                               |
| Clean                         | 默认 build 前清空 `outDir`；`--no-clean` 可关闭                                                                                 |
| Sourcemap                     | 可发射独立、inline 或 hidden maps                                                                                               |

来源：[Entry](https://tsdown.dev/options/entry)、[Output format](https://tsdown.dev/options/output-format)、[Unbundle](https://tsdown.dev/options/unbundle)、[DTS](https://tsdown.dev/options/dts)、[Source maps](https://tsdown.dev/options/sourcemap)、[Cleaning](https://tsdown.dev/options/cleaning)、[config types](https://github.com/rolldown/tsdown/blob/main/src/config/types.ts)、[`fixed extension` official test](https://github.com/rolldown/tsdown/blob/main/tests/e2e.test.ts)、[snapshot](https://github.com/rolldown/tsdown/blob/main/tests/__snapshots__/fixed-extension.snap.md)。

### 3.3 不能仅凭文档确认的组合

本项目目标不是官方 `fixedExtension: true` snapshot 的 `.mjs/.cjs`，而是 ESM `.js`、CJS `.cjs`，并分别配 `.d.ts`、`.d.cts`。`outExtensions` 的 source code 明确允许 JS 和 DTS 分别定制，也把 `format` 传入回调；因此**从 API 形状看可表达**。来源：[tsdown output source](https://github.com/rolldown/tsdown/blob/main/src/features/output.ts)。

但仍有以下事实边界：

1. 官方 `unbundle` tests 只覆盖 module structure、root、object entry 和 shims，没有同时启用 `dts` 与双 format。来源：[unbundle tests](https://github.com/rolldown/tsdown/blob/main/tests/unbundle.test.ts)。
2. 官方 fixed-extension test 只用一个入口，且未启用 `unbundle`。来源：[e2e test](https://github.com/rolldown/tsdown/blob/main/tests/e2e.test.ts)。
3. tsdown 的迁移文档明确说 code splitting 不能关闭；这与 `unbundle` 是两条不同机制。不能把 `unbundle` 等同于“bundled mode + splitting false”。来源：[Migrate from tsup](https://tsdown.dev/guide/migrate-from-tsup#unsupported-options)。
4. tsdown 仍是 `0.x`，且 2026 年的官方 issue/release history 仍包含 unbundle、DTS、CJS 和 output cleanup 修复；版本号本身不证明不稳定，但也没有 1.0 compatibility promise。来源：[tsdown releases](https://github.com/rolldown/tsdown/releases)、[tsdown issues](https://github.com/rolldown/tsdown/issues)。
5. TypeScript 7 是 Go native compiler，7.0 不提供旧的 TypeScript programmatic API。tsdown 0.22.14 所锁定的 `rolldown-plugin-dts` 0.27.13 已把 TypeScript 7/`@typescript/native-preview` 列为 peer，并在检测到 TypeScript 7 时选择 `tsgo` generator；但该 generator 在当时的官方 README 中仍称 experimental。来源：[TypeScript 7 announcement](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/#running-side-by-side-with-typescript-60)、[`rolldown-plugin-dts` README](https://github.com/sxzz/rolldown-plugin-dts)、[tsdown v0.22.14 lockfile](https://github.com/rolldown/tsdown/blob/v0.22.14/pnpm-lock.yaml)。

因此需要一个本地 prototype 精确证明：

- 4 个命名入口；
- `unbundle: true` + `format: ['esm', 'cjs']` + `target: 'es2022'` + `dts` + sourcemaps；
- ESM `.js/.d.ts` 和 CJS `.cjs/.d.cts` 无路径覆盖、无 stale output；
- internal relative imports 带 Node 可执行的扩展；
- declarations 在 TypeScript 5.4 与 latest 的 NodeNext/Bundler consumer fixtures 均通过；
- build twice 后输出 manifest/digest 稳定。

在该 proof 通过前，能确认的是“配置模型可表达、分项能力已有测试”，不能确认“本项目组合可靠”。

### 3.4 直接 Rollup / `tsc` 的事实边界

- Rollup 的 `preserveModules` 可以保留 module structure，`entryFileNames`/`chunkFileNames` 可以定义输出命名，`sourcemap` 支持外部或 inline maps。它是更低层能力，不自动生成 TypeScript declarations。来源：[Rollup configuration options](https://rollupjs.org/configuration-options/)。
- `tsc --declaration --emitDeclarationOnly` 可以只发射 declarations；`rootDir`/`outDir` 保持相对结构。来源：[emitDeclarationOnly](https://www.typescriptlang.org/tsconfig/emitDeclarationOnly.html)、[compiler options](https://www.typescriptlang.org/docs/handbook/compiler-options.html)。
- 直接 Rollup + `tsc` 因而能拆开 JS 与 declaration ownership，但需要项目自行承担两套 output 的入口、命名、路径与清理一致性；官方没有一个单命令替本项目装配这些约束。

## 4. TypeScript 与兼容 fixture

### 已确认事实

- TypeScript 的 extension substitution 明确规定 runtime `.js` 查找 `.ts/.d.ts`，`.mjs` 查找 `.mts/.d.mts`，`.cjs` 查找 `.cts/.d.cts`。来源：[Modules reference](https://www.typescriptlang.org/docs/handbook/modules/reference#file-extension-substitution)。
- TypeScript 4.7 起正式支持 `.d.mts` 和 `.d.cts`。来源：[TypeScript 4.7 release notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-7.html#new-file-extensions)。
- TypeScript 官方 library guide 要求 declarations 与实际 JS module 对应；如果 JS bundle 与 declaration graph 不一致，尤其 extensionless relative imports，NodeNext consumers 可能报错。该指南还建议第三方 emitter 的 ESM project 设置 `type: module`。来源：[Choosing compiler options](https://www.typescriptlang.org/docs/handbook/modules/guides/choosing-compiler-options)。
- `declarationMap` 只有在 package 同时发布 source 时才让 consumer 获得可靠 Go To Definition/debug experience；否则会产生指向未发布 source 的 map。来源：[Choosing compiler options](https://www.typescriptlang.org/docs/handbook/modules/guides/choosing-compiler-options)。

### TS 5.4 fixture 的边界

- “支持 TypeScript 5.4”只能由实际安装 5.4.x 的 consumer compiler 证明。让 TypeScript 7 编译 `types` 并不证明 5.4 能解析这些 declarations、`exports` conditions 或 syntax。
- 推荐的事实验证形状是两个互不共享 TypeScript binary 的 consumer fixtures：一个精确安装 5.4.x，一个安装截止实现时的 latest；都从真实 `.tgz` 安装 SDK，并对 ESM/CJS/public subpath 执行 positive 和 negative compilation。这里的“两个 fixtures”是从版本隔离要求导出的测试形状，不是 TypeScript 官方提供的 matrix runner。
- `skipLibCheck` 会跳过 declaration checking，若用于兼容门禁会遮蔽 SDK declarations 内部错误。来源：[TypeScript compiler options](https://www.typescriptlang.org/docs/handbook/compiler-options.html#--skipLibCheck)。
- TypeScript latest 会移动；要复现历史结果，CI log/artifact 应记录解析后的 exact compiler version。`latest` 是升级探针，不是可永久复现的版本标识。
- 截止日 latest 是 TypeScript 7.0.2。官方明确说明 7.0 没有旧 programmatic API，但保留 `tsc` CLI，并提供 `@typescript/typescript6`/npm alias 供需要旧 API 的工具并存。由此，consumer fixture 可直接执行 7.x `tsc`；build-time dts generator 是否与 7.x 配合正确仍必须单独证明。来源：[TypeScript 7.0 announcement](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/#running-side-by-side-with-typescript-60)。

## 5. Oxlint / Oxfmt 与现有 ESLint / Prettier

### 5.1 Oxlint

- Oxlint 1.0 自 2025-06 起 stable，遵循 semver；minor release 可以新增 diagnostics，并明确不视为 breaking。来源：[Oxlint Stable](https://oxc.rs/blog/2025-06-10-oxlint-stable)、[Versioning](https://oxc.rs/docs/guide/usage/linter/versioning)。
- 支持 `.js/.mjs/.cjs/.ts/.mts/.cts/.jsx/.tsx`；Vue/Svelte/Astro 只 lint `<script>` block。来源：[Oxlint](https://oxc.rs/docs/guide/usage/linter#what-oxlint-supports)。
- 内建 ESLint core、TypeScript、Vitest 等大量规则；官方迁移工具 `@oxlint/migrate` 只自动读取 ESLint v9/v10 flat config。Legacy ESLint v8 `.eslintrc.*` 不能自动迁移。来源：[Migrate from ESLint](https://oxc.rs/docs/guide/usage/linter/migrate-from-eslint.html)。
- 本仓库当前是 ESLint 8 legacy `.eslintrc.cjs` + `@typescript-eslint`。因此若迁移，需要手工映射现有少量 rules 或先转 flat config；不能把 migrate command 的成功当成已覆盖。

#### Type-aware 边界

- `oxlint-tsgolint` type-aware engine 截止日已 stable，覆盖 59/61 个 typescript-eslint type-aware rules。来源：[Type-Aware Linting Stable](https://oxc.rs/blog/2026-07-22-type-aware-linting-stable.html)。
- 它绑定 TypeScript 7/tsgo，要求 TS 7 compatible config；部分 legacy options 不支持。`--type-check` 在 Oxlint CLI 文档中仍标为 experimental，即使 underlying type-aware rules 已 stable。来源：[Type-aware docs](https://oxc.rs/docs/guide/usage/linter/type-aware.html)、[CLI](https://oxc.rs/docs/guide/usage/linter/cli)。
- 因此 Oxlint type-aware 不能替代 TS 5.4 consumer fixture，也不能单独替代本项目要求的 `tsc` latest/5.4 matrix。

### 5.2 Oxfmt

- Oxfmt 截止日仍是 beta；官方 roadmap 仍包括 stable release、plugin support 和更多稳定性工作。来源：[Oxfmt Beta](https://oxc.rs/blog/2026-02-24-oxfmt-beta)。
- 支持本仓库涉及的 JS/TS/JSON/JSONC/YAML/TOML/HTML/CSS/Markdown/MDX 等主要文件类型；JavaScript/TypeScript 已通过官方宣称的 100% Prettier conformance suite。来源：[Oxfmt](https://oxc.rs/docs/guide/usage/formatter)、[Language support](https://oxc.rs/docs/guide/usage/formatter/language-support)。
- `oxfmt --migrate=prettier` 能迁移配置；Oxfmt 最接近 Prettier 3.8，默认 `printWidth` 是 100 而 Prettier 是 80，且不支持 Prettier plugins。来源：[Migrate from Prettier](https://oxc.rs/docs/guide/usage/formatter/migrate-from-prettier.html)。
- 本仓库当前 Prettier config 只使用内建 options、没有 plugin，因此没有已知 plugin blocker；但 Oxfmt beta 状态与全仓 reformat diff 仍是独立维护风险。

### 5.3 保留现有工具的依赖事实

当前 ESLint path 至少依赖 `eslint`、`@typescript-eslint/parser`、`@typescript-eslint/eslint-plugin`；Prettier path 只依赖 `prettier`。Oxlint 普通 lint 通常只需 `oxlint`；type-aware 另需 `oxlint-tsgolint`。Oxfmt 只需 `oxfmt`。这些是 tool package 数量，不等价于实际 transitive install size；应从候选 lockfile 比较 transitive graph 后再量化。

## 6. Changesets 3

### 6.1 Single-package、version 与 changelog

- Changesets 虽为 monorepo 优先设计，但官方文档明确说明 single-package repo 仍可使用；changeset 是携带 semver bump 与 changelog summary 的“intent to change”。来源：[Detailed explanation](https://github.com/changesets/changesets/blob/main/docs/detailed-explanation.md#benefits-to-single-package-repos)。
- `changeset version` 聚合待发布 changesets，取最高 semver bump，更新 package version 并写 changelog。来源：[Changesets decisions](https://github.com/changesets/changesets/blob/main/docs/decisions.md#how-changesets-are-combined)。

### 6.2 Pre mode / beta numbering

- `changeset pre enter beta` 创建 prerelease state；接着 `changeset version` 生成如 `5.0.0-beta.0`，后续 version 递增为 `beta.1`。`changeset publish` 使用同名 npm dist-tag。来源：[Prereleases](https://github.com/changesets/changesets/blob/main/docs/prereleases.md)。
- 官方强烈建议不要在默认分支直接进入长期 pre mode，因为直到 exit 前会阻塞常规 release flow；建议使用独立 prerelease branch。来源同上。
- Changesets 3 调整了 pre-state storage，把已 versioned prerelease changesets 移到 `.changeset/pre/`。这是 v3 migration 行为，不应套用 v2 的内部文件假设。来源：[@changesets/cli@3.0.0 release](https://github.com/changesets/changesets/releases/tag/%40changesets%2Fcli%403.0.0)。

### 6.3 Exact prebuilt tarball

Changesets 3 新增正式 artifact flow：

1. `changeset pack --out-dir <dir>` 通过当前 repo 检测到的 npm/pnpm/yarn tool 打包 release packages；
2. 写入 `packages/<name>-<version>.tgz` 和 `publish-plan.json`；
3. plan 为 tarball 记录 relative path 与 SHA-256 integrity；
4. `changeset publish --from-pack-dir <dir>` 读取 plan，并把记录的 tarball path 传给底层 `npm publish` 或 `pnpm publish`。

来源：[v3.0.0 release notes](https://github.com/changesets/changesets/releases/tag/%40changesets%2Fcli%403.0.0)、[`pack` source](https://github.com/changesets/changesets/blob/main/packages/cli/src/commands/pack/index.ts)、[`publish` source](https://github.com/changesets/changesets/blob/main/packages/cli/src/commands/publish/index.ts)、[npm adapter](https://github.com/changesets/changesets/blob/main/packages/cli/src/lib/npm.ts)、[pnpm adapter](https://github.com/changesets/changesets/blob/main/packages/cli/src/lib/pnpm.ts)。

这证明 Changesets 3 **能够发布预构建的 exact tarball path**，而不是在 publish 时必须重新从 source packing。

仍有三项边界：

- `readPlanFile` 校验 plan shape/version，但当前 publish source 没有在上传前用 recorded integrity 重新 hash tarball；digest verification 需要 workflow 自己做。来源：[publish-plan source](https://github.com/changesets/changesets/blob/main/packages/cli/src/commands/publish-plan/getPublishPlan.ts)。
- Changesets `publish` CLI 没有 `--provenance` option，adapter 调用 npm/pnpm 时也没有显式传 `--provenance`。npm/pnpm 的 config/environment 是否能在 artifact mode 下无歧义启用 provenance，需要本地 dry-run 或临时 registry proof；不能仅由 Changesets 文档宣称。
- v3.0.0 在截止日前一天发布。它声明支持 npm/pnpm 当前版本，但新 artifact path 的生产成熟度尚无长期 release history；应固定 exact v3 patch 并做 release pipeline proof。

## 7. 必须本地 proof 的清单

以下问题不能从分项文档直接升级为项目保证：

1. tsdown 0.22.14 是否在四入口 unbundle dual-format build 中稳定产出 `.js/.cjs/.d.ts/.d.cts`，并保持所有相对 import 扩展与 source maps 正确。
2. 相同 tsdown config 连续 build 是否无输出覆盖，clean 是否不会删除另一个 format 的同轮产物。
3. 真实 `.tgz` 是否在 Node 22/24、Bun 1.3.14、TypeScript 5.4 和 latest 的全部 public entries 上通过。
4. `changeset pack` tarball digest 是否与 smoke-tested artifact 一致，publish 前 workflow 是否显式复核 SHA-256。
5. `changeset publish --from-pack-dir` 配合所选底层 npm/pnpm 与 GitHub OIDC/trusted publishing 时，provenance 是否确实附着到 registry 上的同一 tarball。
6. Oxfmt 对当前 repo 执行 migration 后是否只有可接受的机械 diff；Oxlint 手工规则映射是否保持当前 warning/error semantics。

## 8. 事实对比表

| 候选         | 已有正式能力                                                                                           | 明确缺口/未承诺                                                   | 本地 proof 重点                                     |
| ------------ | ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------- | --------------------------------------------------- |
| pnpm 11      | Node 22/24、text YAML lock、frozen、exact pack path、tarball publish、provenance、Changesets 3 adapter | Corepack experimental/需 enable                                   | 固定版本 bootstrap、artifact+OIDC provenance        |
| npm 12       | bundled ecosystem、JSON lock、`npm ci`、tarball publish、provenance、Changesets 3 adapter              | Corepack 不默认固定 npm shim                                      | 明确安装 exact npm、artifact+OIDC provenance        |
| Bun 1.3      | text lock、`bun ci`、exact tarball publish、独立 version pin                                           | Changesets 3 不支持为 native publish tool；无公开 provenance flag | 仅作为 runtime/consumer，或自建 release glue 的成本 |
| tsdown 0.22  | 分项覆盖所有要求；官方可生成 `.d.cts`                                                                  | `0.x`；目标组合无一体化官方 proof                                 | 四入口 unbundle dual-format declaration prototype   |
| Rollup + tsc | 最低层控制、成熟 output knobs、官方 declarations                                                       | 需要自行同步两套 output graph                                     | 维护复杂度、声明/runtime parity                     |
| Oxlint       | core stable；TS/JS 和主要规则；type-aware stable                                                       | type-aware 绑定 TS7；type-check CLI 仍 experimental               | legacy config 手工映射                              |
| Oxfmt        | 广泛格式、Prettier migration、JS/TS conformance                                                        | beta；无 Prettier plugins                                         | 全仓 diff 与 editor/CI 行为                         |
| Changesets 3 | single-package、pre beta numbering、version/changelog、exact prebuilt tarball artifact flow            | artifact flow 很新；不自行复核 digest；无显式 provenance flag     | exact artifact + provenance release rehearsal       |

## 9. 本地组合 proof

2026-08-12 在可丢弃临时目录使用 tsdown 0.22.14、TypeScript 6.0.3、Node 24.19.0 与 Bun 1.3.14 执行了本项目目标组合 proof。临时文件完成后移入废纸篓，未进入 repository。

已证明：

- `unbundle: true`、`format: ["esm", "cjs"]`、`target: "es2022"`、`dts: true` 与 format-specific `outExtensions` 可同时工作；
- root/client/compat runtime entries 生成 `.js/.cjs/.d.ts/.d.cts`，相对 runtime imports 分别带 `.js/.cjs`；
- type-only build entry 可完整生成 `types/index.d.ts` 与 `types/index.d.cts`；tsdown 0.22.14 同时机械产生 inert types JavaScript，因此正式工具链仍需精确 output normalization 或等价的 tarball exclusion；
- Node 24 与 Bun 1.3.14 都能执行 ESM/CJS outputs；
- 安装本地 tarball 后，TypeScript 5.4.5 与 7.0.2 的 NodeNext ESM/CJS consumers 均通过，`skipLibCheck` 为 false；
- 相同 clean build 连续执行两次后，sorted output manifest 的 aggregate SHA-256 相同。

Proof 同时发现两个配置陷阱并在正式决策中处理：`outExtensions` callback 的 ESM format discriminator 是 `"es"`，不是 config 中使用的 `"esm"`；将 types source 列为 build entry 会额外产生 inert `.js/.cjs`。由于 root 并不公开 `./types` 的全部 Canonical names，不能只依赖 root declaration graph；正式配置保留完整 type entry，并在 build 后验证和精确移除这两个 JavaScript files。

本 proof 只回答 build-tool 组合可行性，不替代真实 v5 source、完整 package export map、Node 22/24 minimum/latest、Bun、bundlers 与发布 provenance rehearsal。

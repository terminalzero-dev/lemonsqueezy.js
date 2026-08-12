# v5 运行时与分发格式兼容边界研究

研究日期：2026-08-11

## 研究问题与边界

本研究回答：LemonSqueezy SDK v5 beta 面向 Node.js 22/24、Bun、ESM、CommonJS、TypeScript 声明、subpath exports、tree-shaking 和可选 Edge 运行时时，有哪些由运行时和工具链决定的客观约束。

本文只记录事实、条件和风险，不选择最终支持矩阵，也不决定 v5 应采用 ESM-only、ESM+CJS、哪些 subpath 或哪个 Edge 提供商。

资料只采用一手来源：Node.js、Bun、TypeScript、npm、webpack、esbuild、Vite、Cloudflare Workers 和 Next.js 官方文档。版本相关事实按研究日期读取；Bun 与 Edge 文档描述的是持续演进的运行时，最终承诺仍需绑定具体最低版本或兼容日期。

## 结论摘要

| 主题 | 已核实的硬约束 | 留给后续决策的变量 |
| --- | --- | --- |
| Node.js 22/24 | 两条版本线都原生支持 ESM 和稳定的 Fetch Web API；但 Node 22 的无 flag `require(ESM)` 从 22.12.0 才开始，22.13.0 才默认不警告，最新 22.x 文档仍标记为 Release candidate。Node 24 到 24.15.0 才把该能力标为非实验。 | 是否覆盖整个大版本、只覆盖受维护的最新次版本，或为 `require()` 提供独立 CJS 文件。 |
| Bun | Bun 原生支持 ESM、CJS、`require(ESM)`、`exports`/subpath/条件解析和 WHATWG `fetch`；Node API 兼容页明确仍在向 100% 兼容推进。 | 最低 Bun 版本，以及是否只承诺 Web API 路径、是否使用 Bun 专用条件。 |
| ESM/CJS | 双入口可以让 `import` 与 `require` 分流，但两个独立实现可能被同一进程同时加载，产生双包实例风险。ESM-only 给 `require()` 使用时受 Node 22 次版本与同步模块图限制。 | ESM-only、双构建，或共享单一实现的 wrapper 方案。 |
| TypeScript 声明 | 当 ESM 与 CJS 指向不同模块种类时，每个入口必须有匹配模块种类的声明；`.d.ts`/`.d.mts` 与 `.d.cts` 不能被当作无差别副本。使用 `exports` 的每个公开 subpath 也必须能解析到类型。 | 最低 TypeScript 版本、声明布局和是否保留旧版 TypeScript fallback。 |
| `exports` | `exports` 一旦存在，就封闭所有未显式映射的深层路径；条件按对象键顺序匹配，`types` 应最先、`default` 应最后。 | 只开放根入口还是增加显式 subpath；是否保留 `main`/`module`/`types` 兼容字段。 |
| Tree-shaking | ESM 的静态结构是主流 bundler tree-shaking 的基础；CJS 不能提供同等保证。`sideEffects: false` 是强断言，错误标注会删除必要代码。 | 可摇树的验收阈值、要覆盖的 bundler、根 barrel 与 subpath 的组合。 |
| Edge | “Edge”不是单一兼容目标。Next.js Edge 禁止直接 `require` 和原生 Node API；Cloudflare Workers 以 Web API 为基础，Node API 兼容需要显式 flag，部分 API 只是 stub。 | 是否承诺 Edge、具体承诺哪些提供商/模式，以及是否单独提供通用 Web 入口。 |

## 1. Node.js 22 与 24

### 1.1 支持周期

- Node.js 官方发布计划显示：22（Jod）自 2025-10-21 进入 Maintenance，计划于 2027-04-30 EOL；24（Krypton）在 2026-10-20 进入 Maintenance，计划于 2028-04-30 EOL。以研究日计算，22 已处于 Maintenance，24 仍处于 Active LTS 阶段。[来源：Node.js Release Working Group `schedule.json`](https://github.com/nodejs/Release/blob/main/schedule.json)
- 因此“支持 Node 22/24”至少包含两个可分离问题：包在这些版本上能否运行，以及项目愿意把已进入 Maintenance 的版本维护到何时。运行时事实不能代替维护策略。

### 1.2 ESM 与 `require(ESM)` 不是同一个承诺

- Node.js 的 ESM 加载器早已可直接加载 `.mjs` 或由 `"type": "module"` 标识的 `.js`；`import` 原生可用。[来源：Node.js 22 ESM 文档](https://nodejs.org/download/release/latest-jod/docs/api/esm.html)
- 在 Node 22 中，同步 `require(ESM)` 于 22.0.0 加入；22.12.0 才不再需要 `--experimental-require-module`；22.13.0 才默认不发实验警告。最新 22.x 文档仍将它标为 `Stability: 1.2 - Release candidate`。[来源：Node.js 22 CommonJS 文档](https://nodejs.org/download/release/latest-jod/docs/api/modules.html#loading-ecmascript-modules-using-require)
- 在 Node 24 文档中，该能力从 24.15.0 起标记为“no longer experimental”。因此，以 `>=24.0.0` 表示的整个 24 大版本与以 `>=24.15.0` 表示的稳定能力边界并不等价。[来源：Node.js 24 CommonJS 文档](https://nodejs.org/download/release/latest-krypton/docs/api/modules.html#loading-ecmascript-modules-using-require)
- `require()` 只能加载“完全同步”的 ESM 模块图；入口或任意传递依赖包含 top-level `await` 时不满足条件。成功时返回的是 Module Namespace Object，而不是传统 CJS 的任意 `module.exports` 值。[来源：Node.js 22 CommonJS 文档](https://nodejs.org/download/release/latest-jod/docs/api/modules.html#loading-ecmascript-modules-using-require)

由此得到的约束是：

- 如果版本声明覆盖 Node 22.0.0 起的整个大版本，并且公共承诺包含无 flag 的 `require("pkg")`，则不能只依赖 Node 的 `require(ESM)`；22.0–22.11 不满足这个前提。
- 如果 ESM-only 包依靠 `require(ESM)` 服务 CJS 调用者，模块图必须保持无 top-level `await`，并且 `require()` 返回形状要作为兼容面验证。
- 如果为 `require` 和 `import` 发布两个独立运行时文件，则绕开上述次版本限制，但会引入第 2.2 节的双包风险。

这些是条件推导，不代表选择了哪一种方案。

### 1.3 SDK 所需的 Web API 基线

- Node 22/24 提供浏览器兼容的全局 `fetch`、`Headers`、`Request`、`Response`；这些 API 自 Node 21.0.0 起标记为 Stable。`URL` 与 `URLSearchParams` 也为稳定全局对象。[来源：Node.js 22 Globals 文档](https://nodejs.org/download/release/latest-jod/docs/api/globals.html#fetch)
- 因而，只依赖这些 Web API 的 HTTP core 在 Node 22/24 上不需要用户安装 fetch polyfill。这个结论只覆盖 API 是否存在，不保证不同运行时的所有扩展选项、错误对象、连接行为完全一致。
- 编译目标只处理语法不等于补齐 API。esbuild 官方明确说明 `target` 转换 JavaScript 语法，不自动注入缺失 API 的 polyfill；默认 target 是 `esnext`。[来源：esbuild `target`](https://esbuild.github.io/api/#target)
- TypeScript 的 `ESNext` target 随 TypeScript 版本变化，官方提示它会降低升级可预测性。[来源：TypeScript `target`](https://www.typescriptlang.org/tsconfig/target.html)

因此，包的构建目标必须显式覆盖所承诺的最低运行时；仅设置 `engines.node` 或源码 `target: ESNext` 不能证明产物兼容。

### 1.4 `engines` 只是元数据

- npm 默认只把 `package.json#engines` 当作提示；除非用户启用 `engine-strict`，不匹配通常只产生 warning。[来源：npm `package.json#engines`](https://docs.npmjs.com/cli/configuring-npm/package-json/#engines)

所以 `engines.node` 应与已测试边界一致，但它本身不是执行时防线，也不会阻止所有不受支持的安装。

## 2. ESM、CJS 与双包风险

### 2.1 条件入口能表达双格式

- Node.js `exports` 的 `import` 与 `require` 条件互斥，可让同一个包名按调用语法解析到不同文件；条件键顺序有优先级。[来源：Node.js Packages 文档](https://nodejs.org/download/release/latest-krypton/docs/api/packages.html#conditional-exports)
- Bun 同样原生支持 ESM 与 CommonJS，`require()` 可加载 ESM；Bun 读取 `exports` 并尊重 subpath、`import`、`require`、`node`、`bun` 和 `default` 等条件，采用对象中第一个匹配项。[来源：Bun Module Resolution](https://bun.sh/docs/runtime/module-resolution)

这说明双格式入口在两类目标运行时都可表达，但不能推导出它们一定具有完全相同的导出形状或实例身份。

### 2.2 两个实现会产生 dual package hazard

- Node.js 官方把“同一进程同时通过 `require` 和 `import` 加载包的两个独立实现”称为 dual package hazard：两个实例不相等，类的 `instanceof` 可能失败，模块级状态也会分叉。[来源：Node.js 22.11 Dual package hazard](https://nodejs.org/download/release/v22.11.0/docs/api/packages.html#dual-package-hazard)
- Node.js 官方列出的规避方向包括让 ESM wrapper 复用 CJS 单一实现，或确保包无共享状态/隔离状态；每种方向都有格式与优化上的代价。[来源：Node.js 22.11 Dual CommonJS/ES module packages](https://nodejs.org/download/release/v22.11.0/docs/api/packages.html#writing-dual-packages-while-avoiding-or-minimizing-hazards)
- webpack 的包导出指南也指出，stateless 双入口可能被加载两次；即使没有模块级可变状态，类身份仍可能不同。[来源：webpack Package exports](https://webpack.js.org/guides/package-exports/#providing-commonjs-and-esm-version-stateless)

因此，“v5 使用实例化 Client”能降低全局配置分叉风险，但不自动消除类身份、错误类、symbol 或缓存对象的双实例问题。是否接受双实现必须由后续票决定。

## 3. TypeScript 声明文件

### 3.1 运行时模块种类与声明模块种类必须匹配

- TypeScript 4.7 为 Node ESM/CJS 增加 `.mts`/`.cts` 和 `.d.mts`/`.d.cts`，并支持按 `exports` 的 `import`/`require` 条件解析类型。[来源：TypeScript 4.7 Release Notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-7.html#type-in-packagejson-and-new-extensions)
- TypeScript 官方明确要求：如果 ESM 与 CJS 是不同入口，每个入口都需要自己的声明文件，即使声明文本相同；声明文件会按扩展名和最近的 `package.json#type` 被解释为 ESM 或 CJS，且必须与对应 JavaScript 的模块种类一致。[来源：TypeScript 4.7 `package.json` Exports](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-7.html#packagejson-exports-imports-and-self-referencing)
- `.d.mts` 总是 ESM，`.d.cts` 总是 CommonJS；在 `"type": "module"` 包中，普通 `.d.ts` 被解释为 ESM。[来源：TypeScript Modules Reference](https://www.typescriptlang.org/docs/handbook/modules/reference.html#module-format-detection)

由此得到：若 `import` 指向 ESM 而 `require` 指向 CJS，类型映射必须分别指向 ESM 声明和 CJS 声明；不能只因为两个文件内容相同就让两种入口共用一个模块种类错误的 `.d.ts`。

### 3.2 `exports` 的类型条件与兼容 fallback

- TypeScript 在 `node16`、`nodenext` 和 `bundler` 模块解析模式下读取 `package.json#exports`；解析条件入口时会匹配 `types`，并按调用上下文选择 `import` 或 `require`。[来源：TypeScript Modules Reference](https://www.typescriptlang.org/docs/handbook/modules/reference.html#packagejson-exports)
- Node.js 的社区条件定义要求 `types` 条件放在条件对象最前面；`default` 是通用 fallback，应放在最后。[来源：Node.js Community Conditions Definitions](https://nodejs.org/download/release/latest-krypton/docs/api/packages.html#community-conditions-definitions)
- TypeScript 4.7 的官方双格式示例在每个 `import`/`require` 分支内分别设置 `types`，并保留顶层 `types` 作为旧版 TypeScript fallback。[来源：TypeScript 4.7 `package.json` Exports](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-7.html#packagejson-exports-imports-and-self-referencing)

因此，每个公开 subpath 都需要同时验证：

1. ESM 消费者能解析到 ESM JavaScript 与匹配声明；
2. CJS 消费者能解析到 CJS JavaScript（或明确支持的同步 ESM）与匹配声明；
3. `moduleResolution: nodenext` 与 `moduleResolution: bundler` 的消费者都能解析；
4. 若决定支持 TypeScript 4.7 之前或不读取 `exports` 的解析模式，还需要独立 fallback 设计。

最低 TypeScript 版本尚未决定，本文不把 fallback 方案写死。

### 3.3 `nodenext` 与 `bundler` 验证的是不同宿主

- `nodenext` 根据文件格式与 `package.json#type` 判断一条 TypeScript import 最终会发出为 `import` 还是 `require`，再选择对应条件；其行为随最新稳定 Node.js 演进。[来源：TypeScript Modules Reference](https://www.typescriptlang.org/docs/handbook/modules/reference.html#node16-node18-node20-nodenext)
- `bundler` 模式保留 ESM import，并模拟常见 bundler 的解析能力，包括 `exports`/`imports`、extensionless path 和目录模块。[来源：TypeScript Modules Reference](https://www.typescriptlang.org/docs/handbook/modules/reference.html#bundler)

所以只在 SDK 自己的 `moduleResolution: bundler` 下通过类型检查，不能证明 Node CJS/ESM 消费者的声明入口正确；需要消费端 fixture。

### 3.4 公共 Web 类型也有跨 Edge 风险

- TypeScript 的 `lib` 只控制编译时可见的类型库，不代表运行时存在相同 API。[来源：TypeScript `lib`](https://www.typescriptlang.org/tsconfig/lib.html)
- Cloudflare 明确说明 Workers 的 `Request` 类型含平台扩展，与标准 `lib.dom.d.ts` 的 `Request` 并非直接兼容。[来源：Cloudflare Workers `Request` differences](https://developers.cloudflare.com/workers/runtime-apis/request/#differences)

因此，如果公共 API 暴露 `Request`、`RequestInit`、`Headers` 或具体平台 fetch 类型，必须在 Node 类型、DOM 类型和至少一个 Worker 类型环境中编译验证。是否采用结构化的 fetch 接口属于后续 API 设计，不在本文决定。

## 4. npm 包、`exports` 与 subpath

### 4.1 `exports` 封闭未声明路径

- npm 将 `exports` 描述为 `main` 的现代替代：支持多入口与条件解析，并阻止未定义入口；实际解析规则由 Node.js 等宿主实现。[来源：npm `package.json#exports`](https://docs.npmjs.com/cli/configuring-npm/package-json/#exports)
- Node.js 规定：定义 `exports` 后，所有未映射 subpath 都会得到 `ERR_PACKAGE_PATH_NOT_EXPORTED`；`exports` 与 `main` 同时存在时，支持 `exports` 的 Node 版本优先使用 `exports`。[来源：Node.js Package entry points](https://nodejs.org/download/release/latest-krypton/docs/api/packages.html#package-entry-points)
- 因此，v4 用户若曾使用包内深层路径，v5 新增或收紧 `exports` 会切断这些路径。这是公共兼容边界，不是单纯的构建配置变化。

### 4.2 subpath 与条件顺序

- Node.js 建议在公开入口数量较少时显式列出 subpath；大量结构化入口可以用 `*` pattern。pattern 是纯字符串替换，并可用 `null` 排除私有子树。[来源：Node.js Subpath exports](https://nodejs.org/download/release/latest-krypton/docs/api/packages.html#subpath-exports)
- 条件对象的键顺序有语义：先出现的匹配条件优先，应由更具体到更通用排列。[来源：Node.js Conditional exports](https://nodejs.org/download/release/latest-krypton/docs/api/packages.html#conditional-exports)
- Bun 也选择对象中第一个匹配条件并尊重 subpath，因此错误排序会同时影响 Node 与 Bun。[来源：Bun Module Resolution](https://bun.sh/docs/runtime/module-resolution)
- webpack、Rollup 等现代工具支持主流 `exports`、subpath、条件与 `default` 语法，但工具间对边缘语法仍存在差异；webpack 官方维护了逐项兼容表。[来源：webpack Package exports compatibility](https://webpack.js.org/guides/package-exports/#support)

最低风险的客观规则是：公开路径少时优先显式映射；每个映射同时覆盖 runtime 与 types；`types` 在对应条件内最先，`default` 最后；不依赖未测试的自定义条件。具体开放哪些路径仍未决定。

### 4.3 tarball 必须包含映射目标

- npm 的 `files` 字段控制 tarball allowlist；`package.json`、README 和 LICENSE 等有特殊包含规则。[来源：npm `package.json#files`](https://docs.npmjs.com/cli/configuring-npm/package-json/#files)
- npm 官方建议用 `npm pack --dry-run` 查看实际发布内容。[来源：npm publish - Files included in package](https://docs.npmjs.com/cli/publish/#files-included-in-package)

所以入口是否正确不能只检查仓库工作区：所有 `exports`、`main`、`module`、`types` 指向的文件都必须在实际 tarball 中存在，并应从 tarball 安装后验证。

## 5. Tree-shaking 的客观边界

### 5.1 ESM 是必要输入，但不是充分保证

- webpack 通过 ESM 的 `import`/`export` 分析使用的导出，production mode 再执行移除；它把 `usedExports` 与 `sideEffects` 说明为两个不同层级的优化。[来源：webpack Tree Shaking](https://webpack.js.org/guides/tree-shaking/)
- esbuild 明确说明 tree-shaking 依赖 ECMAScript modules；解析到 CommonJS `main` 时不能获得同等 tree-shaking。其 `module` 字段支持源于 bundler 约定，Node 本身忽略顶层 `module`。[来源：esbuild Main fields](https://esbuild.github.io/api/#main-fields)
- Bun bundler默认执行 dead-code elimination 与 tree-shaking，并会读取 `sideEffects`；但它也不会把任意动态代码都安全删除。[来源：Bun Bundler](https://bun.sh/docs/bundler)

因此：

- `import` 消费者必须能解析到 ESM，才有跨 bundler 的静态摇树基础；
- `require` 消费者走 CJS 分支并不构成 tree-shaking 承诺；
- subpath 可减少初始可达代码，但有 subpath 不等于根入口就一定可摇树；根 barrel 和 subpath 都需实测；
- `exports`、`module` 和 bundler 自身条件可能选择不同文件，不能只检查单一产物。

### 5.2 `sideEffects: false` 是正确性断言

- webpack 将 side effect 定义为“模块被导入时，除暴露导出外发生的行为”；`sideEffects: false` 允许 bundler 跳过整个模块及其依赖子树。若少数文件有副作用，应使用列表标记。[来源：webpack Mark the file as side-effect-free](https://webpack.js.org/guides/tree-shaking/#mark-the-file-as-side-effect-free)
- esbuild 警告：错误的 `sideEffects` 标注会让必要代码在 bundle 中被删除；它提供忽略标注的逃生选项，但这只是故障规避。[来源：esbuild Ignore annotations](https://esbuild.github.io/api/#ignore-annotations)

因此，只有在所有发布文件都没有 import-time 注册、全局写入、polyfill、自动配置或其他必要副作用时，才能把整个包声明为 `sideEffects: false`。这要求测试验证，不能从“SDK 大部分是纯函数”推断。

## 6. Bun 的额外约束

- Bun 原生支持 ESM、CJS 与 TypeScript 源码，支持 `require()` 加载 ESM，并尊重 Node 风格的 `exports`/`imports` 和 subpath。[来源：Bun Module Resolution](https://bun.sh/docs/runtime/module-resolution)
- Bun 实现 WHATWG `fetch`，并提供 `Request`、`Response`、`Headers`、`AbortController`、`AbortSignal` 等 Web API。[来源：Bun Fetch](https://bun.sh/docs/runtime/networking/fetch)；[Bun Web APIs](https://bun.sh/docs/runtime/web-apis)
- Bun 的 Node compatibility 页面明确说兼容度仍在接近 100%，并按最新 Bun 持续更新；页面列出的 Node 内建模块仍有部分实现或行为差异。[来源：Bun Node.js Compatibility](https://bun.sh/docs/runtime/nodejs-compat)
- Bun 推荐 TypeScript 项目使用 `moduleResolution: bundler`，但这只是 Bun 项目的类型解析建议，不证明包在 Node 的 `nodenext` 消费端可用。[来源：Bun TypeScript](https://bun.sh/docs/typescript)

所以“在 Node 工作”不能替代 Bun runtime test，“当前 Bun 可用”也不能自动定义最低 Bun 版本。支持声明必须绑定一个明确最低 Bun 版本，并分别验证 `import` 与 `require` 路径。

## 7. 可选 Edge 运行时

### 7.1 “Edge”必须具体化

- Next.js Edge Runtime 支持 `fetch`、`Request`、`Response`、`Headers`、`URL`、`URLSearchParams` 等 Web API，但不支持原生 Node.js API，不允许直接调用 `require`；第三方 `node_modules` 需要是 ESM 且不使用原生 Node API。[来源：Next.js Edge Runtime](https://nextjs.org/docs/app/api-reference/edge)
- Cloudflare Workers 以 Web 标准 API 为基础，提供 `fetch`、`Headers`、`Request`、`Response`、URL、Abort API 等；其 `fetch` 只能在 Request Context 内调用。[来源：Cloudflare Workers Web standards](https://developers.cloudflare.com/workers/runtime-apis/web-standards/)
- Cloudflare 的 Node.js API 是可选兼容层：需要 `nodejs_compat` 和相应 compatibility date；部分模块只是可导入但调用会抛错的 stub。[来源：Cloudflare Workers Node.js compatibility](https://developers.cloudflare.com/workers/runtime-apis/nodejs/)

这三项事实意味着不能只写“支持 Edge”而不说明提供商、兼容日期/模式与测试环境。一个不依赖 Node 内建模块、`process`、`Buffer`、直接 `require` 或动态代码生成的 ESM/Web API 路径，是跨这些环境的共同必要条件，但仍不是充分保证。

### 7.2 包入口对 Edge 的影响

- Node.js 官方建议环境条件存在时提供 `default`，使未知 JavaScript 环境无需伪装成 `node` 或 `browser` 即可获得通用实现。[来源：Node.js Conditional exports](https://nodejs.org/download/release/latest-krypton/docs/api/packages.html#conditional-exports)
- Next.js Edge 明确要求依赖可作为 ESM 使用；因此只有 CJS/`require` 入口不能满足该环境。[来源：Next.js Edge Runtime - Unsupported APIs](https://nextjs.org/docs/app/api-reference/edge#unsupported-apis)
- Cloudflare Workers 推荐 Module Workers，并说明 Node 兼容不是默认能力。[来源：Cloudflare Workers Fetch](https://developers.cloudflare.com/workers/runtime-apis/fetch/)；[Compatibility flags](https://developers.cloudflare.com/workers/configuration/compatibility-flags/#nodejs-compatibility-flag)

如果后续决定承诺 Edge，至少需要一个不经过 Node 专用条件的 ESM `default` 路径，并验证公共声明不强迫消费者安装 Node 类型。是否把该路径与 Node ESM 复用，仍是待决项。

## 8. 发布前必须覆盖的验证矩阵

以下不是最终支持矩阵，而是从上述事实推导出的验证维度。后续选择任一支持范围时，应把相应格子变成可运行的 CI fixture。

| 维度 | 最低验证点 | 证明什么 |
| --- | --- | --- |
| Node 22 ESM | 最低承诺次版本 + 最新 22.x，`import` 根入口及每个 subpath | ESM 语法、API 与条件入口真实可执行。 |
| Node 22 CJS | 最低承诺次版本 + 22.12/22.13 边界 + 最新 22.x，`require` 根入口及每个 subpath | 没有误把后期 `require(ESM)` 行为当作整个 22 大版本能力。 |
| Node 24 | 最低承诺次版本 + 24.15 边界 + 最新 24.x，分别 `import`/`require` | 覆盖 `require(ESM)` 稳定性变化及双入口。 |
| Bun | 最低承诺版本 + 最新稳定版，分别 `import`/`require` | Bun 条件解析、Web API 与导出形状。 |
| TypeScript ESM | 最低承诺 TS + 最新 TS，`module: nodenext` 与 `moduleResolution: bundler` | ESM JavaScript 与声明的匹配、两种宿主解析。 |
| TypeScript CJS | `.cts`/CJS fixture，最低承诺 TS + 最新 TS | `require` 条件与 `.d.cts`/相应声明是否匹配。 |
| subpath | 对每个公开 path 重复 runtime 与 type fixture；对未公开深层路径验证失败 | `exports` 是完整公共 API，而不是仅根入口可用。 |
| tarball | `npm pack --dry-run`，从生成的 `.tgz` 安装后重复 smoke tests | 映射目标确实发布，未依赖仓库残留文件。 |
| tree-shaking | webpack production、esbuild、Vite/Rollup、Bun bundler 各构建“仅使用一个导出”fixture | ESM 分支被选中、无错误副作用标注、未使用模块可删除。 |
| Edge（若承诺） | 至少一个 Next.js Edge build/runtime fixture；Cloudflare Workers 指定 compatibility date，分别记录是否启用 `nodejs_compat` | 将“Edge”承诺绑定到可复现环境。 |

## 9. 仍待 Wayfinder 决定的问题

本研究没有替用户回答以下选择：

1. Node 支持写成大版本级（例如 `>=22`）还是精确到能满足 CJS 行为的最低次版本；
2. v5 是 ESM-only、ESM+CJS 双构建，还是共享单一实现的 wrapper；
3. 是否承诺 CJS 与 ESM 混用时的实例/类身份一致；
4. 最低 TypeScript 与 Bun 版本；
5. 公开哪些 subpath，以及是否为旧版解析器保留 `main`/`module`/顶层 `types`；
6. tree-shaking 的量化验收门槛与 bundler 范围；
7. 是否承诺 Edge；若承诺，具体是 Next.js Edge、Cloudflare Workers 无 `nodejs_compat`、启用兼容层的 Workers，还是另一个明确运行时。

在这些问题被决定前，可以确定的底线是：产物语法必须显式对齐最低运行时；每个公开入口必须同时有可执行文件与匹配声明；所有承诺必须由安装 tarball 后的消费端 fixture 验证。

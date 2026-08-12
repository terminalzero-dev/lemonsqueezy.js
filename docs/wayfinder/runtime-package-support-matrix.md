# v5 运行时与包产物支持矩阵

## 结论

v5 beta 正式支持 Node.js 22、Node.js 24 与 Bun `>=1.3.14 <2`。包从同一 TypeScript 源码发布原生 ESM 与原生 CommonJS，JavaScript 语法目标固定为 `ES2022`，TypeScript declarations 最低支持 5.4。

正式公开入口保持四个：package root、`./client`、`./compat` 与 type-only `./types`。每个承诺必须通过安装生成的 npm tarball 后的消费端 fixture 证明；仓库内直接读取 `dist` 不构成发布验证。

v5 beta 不正式支持抽象的 “Edge”、浏览器或 Worker 环境，也不发布相应条件入口。某个平台碰巧可以加载 ESM 属于 Incidental runtime compatibility，不是 Supported runtime。

## Supported runtime matrix

| Runtime        | 支持范围      | CI 基线                 | 维护承诺                                                    |
| -------------- | ------------- | ----------------------- | ----------------------------------------------------------- |
| Node.js 22     | `^22.0.0`     | `22.0.0` 与最新 22.x    | ESM、CJS、所有 runtime entries 与对应 declarations          |
| Node.js 24     | `^24.0.0`     | `24.0.0` 与最新 24.x    | ESM、CJS、所有 runtime entries 与对应 declarations          |
| Bun            | `>=1.3.14 <2` | `1.3.14` 与最新稳定 1.x | ESM、CJS、exports resolution 与公开 API 行为                |
| TypeScript     | `>=5.4`       | `5.4` 与最新稳定版      | 四个入口在 ESM、CJS、`nodenext` 与 `bundler` context 可解析 |
| Edge / browser | 不正式支持    | 无 fixture              | 不承诺；真实需求必须指定具体平台、模式与版本后重新决定      |

`package.json#engines` 使用：

```json
{
  "engines": {
    "node": "^22.0.0 || ^24.0.0",
    "bun": ">=1.3.14 <2"
  }
}
```

`engines` 是消费提示，不替代 fixture 或运行时防线。未来 Node 26 等大版本只有在相同消费矩阵通过后才进入正式范围。v5 stable 后移除已支持的 Node major、Bun range 或模块格式属于 breaking change；增加验证通过的新 runtime range 可以是向后兼容变更。

这里的 Bun 版本只描述消费者 runtime，不决定仓库使用哪个 package manager。仓库统一使用 pnpm、Node 24 Build host 与 tsdown，完整 lockfile、编译和质量工具规则见 [v5 构建与包管理工具链](./build-package-toolchain.md)。

## JavaScript 产物

### 原生 ESM 与原生 CommonJS

从同一源码构建两个等价公共表面：

- ESM：`.js`，package 保持 `"type": "module"`；
- CommonJS：`.cjs`；
- 两种格式导出相同的命名 runtime symbols；
- 不提供 default export；
- 不让 CJS `require()` 同步加载 ESM wrapper。

原生 CJS 避免把 Node 22 的无 flag `require(ESM)` 次版本变化变成最低运行时限制，因此支持范围可以从 Node 22.0.0 开始。

ESM 与 CJS 是两个可独立加载的 module instances。v5 不承诺同一进程混用两种格式时：

- module object、class、symbol 或 cache identity 相等；
- Default Client 或其他 module-local state 跨格式共享；
- 跨格式 `instanceof` 可靠。

同一 package copy、同一模块格式内，root 与 `./compat` 必须复用同一个 Compatibility facade 和 Default Client。错误识别使用 `isLemonSqueezyError()` 与 `isWebhookError()`，而不是跨格式 `instanceof`。不引入 `globalThis` registry 来伪造跨格式单例。

### 固定 `ES2022` target

发布 JavaScript 的编译目标固定为 `ES2022`，不使用随 TypeScript 或 bundler 版本变化的 `ESNext`。

- 构建工具只负责语法降级，不提供 API polyfill；
- Node 22/24 与 Bun 的 Fetch、URL、Abort 和 crypto 能力由 runtime fixtures 验证；
- 构建工具升级不得在未修改契约的情况下抬高产物语法基线。

## Public export map

### 稳定入口

| Specifier                           | Runtime 作用                                   | ESM | CJS | ESM declarations | CJS declarations |
| ----------------------------------- | ---------------------------------------------- | --- | --- | ---------------- | ---------------- |
| `@terminalzero/lemonsqueezy`        | Client、Webhook receiver、Compatibility root   | 是  | 是  | `.d.ts`          | `.d.cts`         |
| `@terminalzero/lemonsqueezy/client` | Client runtime 与 Client errors，不加载 facade | 是  | 是  | `.d.ts`          | `.d.cts`         |
| `@terminalzero/lemonsqueezy/compat` | Compatibility facade                           | 是  | 是  | `.d.ts`          | `.d.cts`         |
| `@terminalzero/lemonsqueezy/types`  | Canonical 与 Compatibility public types        | 否  | 否  | `.d.ts`          | `.d.cts`         |

`./types` 只支持 type context；`import type` 不产生 runtime。对它执行 ESM runtime import 或 CJS `require()` 必须失败，而不是发布空 JavaScript shim。

不公开 wildcard、default export、`./internal`、runtime resource subpath、transport、middleware、testing、generic request 或 extension 入口。未映射 deep path 必须由 `exports` 拒绝。

### 条件布局

建议的机械形状如下；最终文件名可由工具链票在不改变语义的前提下选择：

```json
{
  "type": "module",
  "exports": {
    ".": {
      "import": {
        "types": "./dist/index.d.ts",
        "default": "./dist/index.js"
      },
      "require": {
        "types": "./dist/index.d.cts",
        "default": "./dist/index.cjs"
      }
    },
    "./client": {
      "import": {
        "types": "./dist/client/index.d.ts",
        "default": "./dist/client/index.js"
      },
      "require": {
        "types": "./dist/client/index.d.cts",
        "default": "./dist/client/index.cjs"
      }
    },
    "./compat": {
      "import": {
        "types": "./dist/compat/index.d.ts",
        "default": "./dist/compat/index.js"
      },
      "require": {
        "types": "./dist/compat/index.d.cts",
        "default": "./dist/compat/index.cjs"
      }
    },
    "./types": {
      "import": {
        "types": "./dist/types/index.d.ts"
      },
      "require": {
        "types": "./dist/types/index.d.cts"
      }
    }
  }
}
```

每个 runtime 分支内的 `types` 必须先于 `default`；`default` 必须是对应分支的最后 fallback。不增加 `node`、`bun`、`browser`、`worker`、`development` 或自定义 conditions。

### Legacy root fields

保留只镜像 root 的传统字段：

```json
{
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts"
}
```

支持 `exports` 的宿主以 `exports` 为权威。这三个字段只帮助仍读取传统字段的工具，不定义第二套实现、不提供 subpath fallback，也不能绕过 export map。所有字段必须指向 tarball 内真实存在且与 root 条件一致的文件。

## TypeScript declaration contract

最低 TypeScript 版本是 5.4，CI 同时验证最新稳定版。公共 declarations 不使用 TypeScript 5.4 之后才支持的语法。

每个 ESM runtime entry 有与其模块种类匹配的 `.d.ts`，每个 CJS runtime entry 有 `.d.cts`。即使两份声明文本相同，也不能让两个模块格式错误地共用同一个 declaration module。

TypeScript 不是 runtime dependency 或 peer dependency；package 不声明 TypeScript peer range。v5 不为 TypeScript 5.4 之前的解析器添加 `typesVersions` 或降级声明。

公共声明只使用 ECMAScript 类型，以及已进入本契约的 `Uint8Array`、`ArrayBuffer`、`URL` 与 `AbortSignal`。不把以下宿主细节暴露为公共参数或返回值：

- Node `Buffer` 或其他 Node-specific types；
- Fetch `Request`、`Response`、`Headers`、`RequestInit`；
- Bun-specific types；
- Next.js、Cloudflare Workers 或其他 Edge platform types。

Node `Buffer` 通过 `Uint8Array` 兼容。Fetch 与 `node:crypto` 是内部实现依赖。消费 fixtures 分别在 Node typings 与 Bun typings 环境验证 declarations；消费者不需要安装额外的 `@types/node` peer dependency、DOM lib 或 Edge typings 才能命名 SDK 公共 API。

## Tree-shaking contract

package 保持 `"sideEffects": false`。这是一项正确性断言：所有发布模块必须没有导入时注册、全局写入、polyfill、自动配置或其他必须保留的副作用。

tree-shaking 只对 ESM 消费路径作结构性承诺：

1. 从 root 只使用 `createClient` 时，Compatibility facade 不进入最终 bundle；
2. 从 `./client` 导入时，compat 与 Default Client 模块不可达；
3. 从 `./types` 的 `import type` 产生零 runtime import；
4. 未使用 resource modules 可以由 bundler module graph 删除；
5. esbuild metafile、Rollup/Vite output、webpack stats 与 Bun build graph 均验证实际选择 ESM 分支和移除未使用模块。

CJS 只承诺执行和导出兼容，不承诺 tree-shaking。v5 不冻结具体 bundle byte size；大小 snapshot 可以作为回归信号，但版本、minifier 与压缩差异不能使非语义字节阈值成为 semver contract。

## Tarball consumer fixtures

所有 package smoke 先生成 npm `.tgz`，安装到隔离消费者，再从 package specifier 加载。fixture 不允许：

- 直接导入仓库路径或 `dist` 相对路径；
- 依赖 workspace symlink、源码、未打包文件或开发环境 module resolution；
- 只检查 `npm pack --dry-run` 列表而不执行安装后的入口。

最低验证矩阵：

| 维度                | Fixture                                                                                     |
| ------------------- | ------------------------------------------------------------------------------------------- |
| Node runtime        | Node 22.0/latest 22、24.0/latest 24；每个 runtime entry 分别 `import` 与 `require`          |
| Bun runtime         | Bun 1.3.14 与最新稳定 1.x；每个 runtime entry 分别 ESM 与 CJS                               |
| TypeScript ESM      | TS 5.4 与最新；`moduleResolution: nodenext` 和 `bundler`                                    |
| TypeScript CJS      | TS 5.4 与最新；`.cts` consumer 解析 `require` conditions 与 `.d.cts`                        |
| Public entries      | root、`./client`、`./compat` runtime/types；`./types` type-only                             |
| Negative exports    | 未公开 deep path 抛 package-path error；`./types` runtime import/require 失败               |
| Tarball integrity   | `exports`、`main`、`module`、`types` 的每个 target 存在于实际 tarball                       |
| Tree-shaking        | esbuild、Rollup/Vite、webpack 与 Bun bundler 的 ESM module graph                            |
| Module identity     | 同一格式 root/compat 共享 Default Client；混用 ESM/CJS 明确不要求共享                       |
| Declaration hygiene | Node 与 Bun type environments 不要求消费者补装未声明的 Node、DOM 或 platform-specific types |

完整 fixture matrix 是每次 PR 的 required check；nightly 与 release 仍使用同一 exact tarball 运行，并在 release 时叠加 Test Mode integration。具体编排与安全边界见 [v5 测试分层与真实 API 安全边界](./test-strategy-safety-boundary.md)。

## Edge 与浏览器边界

v5 beta 不声明 “Edge-compatible” 或 “browser-compatible”，也不发布 `browser`、`worker`、`edge-light` 或 Cloudflare-specific conditions。

- Next.js Edge 与 Cloudflare Workers 的 Node compatibility 模式不同；
- Webhook receiver 使用同步 Node crypto；
- HTTP Core、declarations 与 bundle 只有在具体平台 fixture 中通过，才能形成支持承诺；
- 消费者自行 polyfill 或打包成功不改变维护范围。

后续只有在明确的平台、兼容模式、版本范围和用户需求出现时，才为该平台建立独立决策与 test matrix。当前不为假想 Edge 复用牺牲 Node/Bun 的同步 API 或增加异步公共 surface。

## v5 beta 验收

实施必须满足：

1. `engines.node` 与 `engines.bun` 精确反映 Supported runtime matrix；
2. JavaScript 产物没有高于 ES2022 的语法；
3. ESM/CJS 每个 runtime entry 导出同一 public runtime symbol set；
4. root、`./client`、`./compat` 同时拥有匹配格式的 runtime 与 declaration targets；
5. `./types` 只有 declaration targets，type import 零 runtime，runtime import 失败；
6. `exports` 封闭所有未公开 paths，legacy fields 只镜像 root；
7. tarball 安装后的 Node、Bun 与 TypeScript fixtures 全部通过；
8. ESM tree-shaking 的四类 bundler graph 断言通过，CJS 不计入；
9. `sideEffects: false` 与所有发布模块真实行为一致；
10. 公共 declarations 不泄漏 Node、Fetch、Bun 或 Edge-specific types；
11. 同一格式的 root 与 `./compat` 共享 Default Client；
12. 文档明确 ESM/CJS 混用 identity 与 Edge 均不在保证范围内。

## 明确不采用

### ESM-only + `require(ESM)`

它会把 Node 22 的次版本差异和同步 ESM graph 限制变成 CJS 消费契约，并扩大 v4 迁移成本。v5 保留原生 CJS。

### ESM wrapper 与 CJS 单一实现

该方向可减少双包实例风险，但会让 ESM 消费者以 CJS 为实现核心，削弱静态 tree-shaking 与 Client-only subpath 的价值。v5 接受并文档化跨格式 identity 边界。

### `ESNext` target

其含义随工具版本变化，不能作为可重复的发布语法契约。使用固定 ES2022。

### Runtime JavaScript shim for `./types`

空 shim 会把类型入口伪装成可执行模块并扩大 runtime surface。`./types` 的 runtime failure 是有意边界。

### Wildcard exports、平台条件与 deep import aliases

当前只有四个公开入口。额外 pattern 和 conditions 会扩大 semver surface，并让 Node、Bun、bundler 与潜在 Edge 选择不同代码路径；没有近期 Leverage。

### Bundle-size hard limit

固定字节阈值受 bundler、minifier 与压缩器版本影响。v5 使用 module-graph 正确性断言，size snapshot 仅作信号。

## 原型资产

- [`src/prototypes/runtime-package-support-matrix.prototype.html`](../../src/prototypes/runtime-package-support-matrix.prototype.html)

原型将 runtime、format、entry 与消费模式投射为 resolved artifact、declaration、tree-shaking、identity 和 fixture 状态。它是可丢弃决策资产，不是 production package resolver。

## Evidence

- [v5 runtime and distribution constraints research](https://github.com/terminalzero-dev/lemonsqueezy.js/blob/76241990a404baa6bd66463f31779688b7530730/docs/research/runtime-package-constraints.md)
- [Node.js release schedule](https://github.com/nodejs/Release/blob/main/schedule.json)
- [Node.js packages](https://nodejs.org/docs/latest-v24.x/api/packages.html)
- [TypeScript modules reference](https://www.typescriptlang.org/docs/handbook/modules/reference.html)
- [Bun module resolution](https://bun.sh/docs/runtime/module-resolution)
- [webpack tree shaking](https://webpack.js.org/guides/tree-shaking/)
- [esbuild tree shaking](https://esbuild.github.io/api/#tree-shaking)

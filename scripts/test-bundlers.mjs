import assert from "node:assert/strict";
import { mkdir, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { build as esbuild } from "esbuild";
import { build as viteBuild } from "vite";
import webpack from "webpack";
import { prepareConsumer, run } from "./lib/canonical-artifact.mjs";

const { consumerDirectory } = await prepareConsumer("bundler-smoke");
const outputDirectory = join(consumerDirectory, "bundlers/output");
const entries = ["client.mjs", "client-subpath.mjs"];

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });

for (const entryName of entries) {
  const entry = join(consumerDirectory, "bundlers", entryName);
  const label = entryName.replace(".mjs", "");

  const esbuildResult = await esbuild({
    bundle: true,
    entryPoints: [entry],
    format: "esm",
    metafile: true,
    platform: "node",
    target: "es2022",
    treeShaking: true,
    write: false,
  });
  assert.equal(esbuildResult.outputFiles.length, 1);
  assertTreeShaken(esbuildResult.outputFiles[0].text, `esbuild ${label}`);
  assertGraphExcludesCompatibility(
    Object.entries(esbuildResult.metafile.outputs).flatMap(([, output]) =>
      Object.entries(output.inputs)
        .filter(([, input]) => input.bytesInOutput > 0)
        .map(([path]) => path),
    ),
    `esbuild ${label}`,
  );

  const viteResult = await viteBuild({
    configFile: false,
    logLevel: "error",
    root: consumerDirectory,
    build: {
      minify: false,
      target: "es2022",
      write: false,
      rollupOptions: { external: [/^node:/], input: entry },
    },
  });
  const rollupOutputs = Array.isArray(viteResult) ? viteResult : [viteResult];
  const viteChunks = rollupOutputs.flatMap(({ output }) =>
    output.filter((item) => item.type === "chunk"),
  );
  assert.ok(viteChunks.length > 0, `Vite ${label} emitted no chunks`);
  assertTreeShaken(
    viteChunks.map(({ code }) => code).join("\n"),
    `Vite/Rollup ${label}`,
  );
  assertGraphExcludesCompatibility(
    viteChunks.flatMap(({ modules }) =>
      Object.entries(modules)
        .filter(([, module]) => module.renderedLength > 0)
        .map(([path]) => path),
    ),
    `Vite/Rollup ${label}`,
  );

  const webpackOutput = join(outputDirectory, `webpack-${label}`);
  const stats = await runWebpack({ entry, outputPath: webpackOutput });
  const webpackCode = await readFile(join(webpackOutput, "bundle.mjs"), "utf8");
  assertTreeShaken(webpackCode, `webpack ${label}`);
  const webpackModules = stats.toJson({
    all: false,
    modules: true,
    usedExports: true,
  }).modules;
  const usedWebpackModules = (webpackModules ?? [])
    .filter((module) => module.usedExports !== false)
    .map((module) => module.name ?? "");
  assertGraphExcludesCompatibility(usedWebpackModules, `webpack ${label}`);

  const bunOutput = join(outputDirectory, `bun-${label}.mjs`);
  const bunMetafile = join(outputDirectory, `bun-${label}.json`);
  run("bun", [
    "build",
    entry,
    "--target=node",
    "--format=esm",
    `--outfile=${bunOutput}`,
    `--metafile=${bunMetafile}`,
  ]);
  assertTreeShaken(await readFile(bunOutput, "utf8"), `Bun ${label}`);
  const bunGraph = JSON.parse(await readFile(bunMetafile, "utf8"));
  assertGraphExcludesCompatibility(
    Object.values(bunGraph.outputs).flatMap((output) =>
      Object.entries(output.inputs)
        .filter(([, input]) => input.bytesInOutput > 0)
        .map(([path]) => path),
    ),
    `Bun ${label}`,
  );
}

function assertTreeShaken(code, label) {
  assert.doesNotMatch(code, /invokeDefaultCompatibility/, label);
  assert.doesNotMatch(code, /configureDefaultClient/, label);
  assert.doesNotMatch(code, /lemonSqueezySetup/, label);
}

function assertGraphExcludesCompatibility(paths, label) {
  assert.equal(
    paths.some(
      (path) =>
        path.includes("/dist/compat/") ||
        path.includes("/dist/internal/v5/default-client"),
    ),
    false,
    `${label} retained Compatibility modules:\n${paths.join("\n")}`,
  );
}

function runWebpack({ entry, outputPath }) {
  return new Promise((resolve, reject) => {
    webpack(
      {
        context: consumerDirectory,
        entry,
        experiments: { outputModule: true },
        mode: "production",
        optimization: { concatenateModules: false, minimize: false },
        output: {
          clean: true,
          filename: "bundle.mjs",
          module: true,
          path: outputPath,
        },
        target: "node",
      },
      (error, stats) => {
        if (error) return reject(error);
        if (!stats || stats.hasErrors()) {
          return reject(
            new Error(stats?.toString({ colors: false }) ?? "webpack failed"),
          );
        }
        resolve(stats);
      },
    );
  });
}

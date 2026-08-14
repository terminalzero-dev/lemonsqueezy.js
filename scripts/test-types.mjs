import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { prepareConsumer, root, run } from "./lib/canonical-artifact.mjs";

const { consumerDirectory, installedPackage } =
  await prepareConsumer("type-contract");
const migrationGuide = await readFile(
  join(installedPackage, "MIGRATION.md"),
  "utf8",
);
const fixturePattern =
  /<!-- fixture: ([a-z0-9.-]+) -->\s*\n\s*```(?:ts|typescript)\n([\s\S]*?)\n```/g;
const fixtures = [...migrationGuide.matchAll(fixturePattern)].map(
  ([, name, source]) => ({ name, source }),
);
const compareNames = (left, right) => left.localeCompare(right);
const fixtureNames = fixtures.map(({ name }) => name).sort(compareNames);

assert.deepEqual(fixtureNames, [
  "migration-bundler.ts",
  "migration-cjs.cts",
  "migration-client.mts",
  "migration-compatibility.mts",
]);

for (const { name, source } of fixtures) {
  const globals = [
    "declare const process: { env: Record<string, string | undefined> };",
    "declare const console: { error(...values: unknown[]): void; log(...values: unknown[]): void };",
  ];

  if (name.endsWith(".cts")) {
    globals.push(
      'declare function require(id: "@terminalzero/lemonsqueezy/compat"): typeof import("@terminalzero/lemonsqueezy/compat");',
    );
  }

  await writeFile(
    join(consumerDirectory, "types", name),
    `${globals.join("\n")}\n${source}\n`,
  );
}

const migrationConfigs = [
  {
    name: "tsconfig.migration.nodenext.json",
    extends: "./tsconfig.nodenext.json",
    files: fixtureNames.filter(
      (name) => name.endsWith(".mts") || name.endsWith(".cts"),
    ),
  },
  {
    name: "tsconfig.migration.bundler.json",
    extends: "./tsconfig.bundler.json",
    files: fixtureNames.filter((name) => name.endsWith(".ts")),
  },
];

for (const { name, extends: extendsConfig, files } of migrationConfigs) {
  assert.ok(files.length > 0);
  await writeFile(
    join(consumerDirectory, "types", name),
    `${JSON.stringify({ extends: extendsConfig, files }, null, 2)}\n`,
  );
}

const v4TypeNames = JSON.parse(
  await readFile(
    join(consumerDirectory, "expected-v4-type-exports.json"),
    "utf8",
  ),
);
assert.equal(v4TypeNames.length, 92);
assert.deepEqual(v4TypeNames, [...new Set(v4TypeNames)].sort(compareNames));

for (const [name, packageEntry] of [
  ["v4-root-types.mts", "@terminalzero/lemonsqueezy"],
  ["v4-compat-types.mts", "@terminalzero/lemonsqueezy/compat"],
]) {
  const source = [
    `import type { ${v4TypeNames.join(", ")} } from ${JSON.stringify(packageEntry)};`,
    "",
  ].join("\n");
  await writeFile(join(consumerDirectory, "types", name), source);
}

const compilers = [
  ["TypeScript 5.4", join(root, "node_modules/typescript-5-4/bin/tsc")],
  ["TypeScript 6", join(root, "node_modules/typescript/bin/tsc")],
  ["TypeScript latest", join(root, "node_modules/typescript-latest/bin/tsc")],
];

for (const [label, compiler] of compilers) {
  console.log(label);
  run(process.execPath, [compiler, "--version"], { cwd: consumerDirectory });
  run(process.execPath, [compiler, "-p", "types/tsconfig.nodenext.json"], {
    cwd: consumerDirectory,
  });
  run(process.execPath, [compiler, "-p", "types/tsconfig.bundler.json"], {
    cwd: consumerDirectory,
  });
  run(
    process.execPath,
    [compiler, "-p", "types/tsconfig.migration.nodenext.json"],
    { cwd: consumerDirectory },
  );
  run(
    process.execPath,
    [compiler, "-p", "types/tsconfig.migration.bundler.json"],
    { cwd: consumerDirectory },
  );
}

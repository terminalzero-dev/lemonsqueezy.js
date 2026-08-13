import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

const packageJson = JSON.parse(
  readFileSync(new URL("../../package.json", import.meta.url), "utf8"),
);

test("the repository uses the approved package manager and build host", () => {
  assert.equal(packageJson.packageManager, "pnpm@11.21.0");
  assert.equal(
    readFileSync(new URL("../../.nvmrc", import.meta.url), "utf8"),
    "24\n",
  );
  assert.deepEqual(packageJson.engines, {
    node: "^22.0.0 || ^24.0.0",
    bun: ">=1.3.14 <2",
  });
});

test("pnpm has the repository's only committed dependency lockfile", () => {
  assert.equal(
    existsSync(new URL("../../pnpm-lock.yaml", import.meta.url)),
    true,
  );

  for (const lockfile of [
    "bun.lock",
    "bun.lockb",
    "package-lock.json",
    "npm-shrinkwrap.json",
    "yarn.lock",
  ]) {
    assert.equal(
      existsSync(new URL(`../../${lockfile}`, import.meta.url)),
      false,
      `${lockfile} must not exist`,
    );
  }
});

test("pnpm only permits required dependency build scripts", () => {
  assert.equal(
    readFileSync(new URL("../../pnpm-workspace.yaml", import.meta.url), "utf8"),
    "allowBuilds:\n  esbuild: true\n",
  );
});

test("legacy toolchain dependencies and lifecycle hooks are absent", () => {
  const allDependencies = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  };

  for (const dependency of [
    "@commitlint/cli",
    "@commitlint/config-conventional",
    "@typescript-eslint/eslint-plugin",
    "@typescript-eslint/parser",
    "eslint",
    "lint-staged",
    "prettier",
    "simple-git-hooks",
    "tsup",
  ]) {
    assert.equal(allDependencies[dependency], undefined, dependency);
  }

  for (const hook of [
    "prepare",
    "postinstall",
    "prepack",
    "prepublishOnly",
    "postpack",
  ]) {
    assert.equal(packageJson.scripts[hook], undefined, hook);
  }
});

test("repository scripts do not invoke an unapproved package manager or runner", () => {
  for (const [name, command] of Object.entries(packageJson.scripts)) {
    assert.doesNotMatch(
      command,
      /(?:^|[\s;&|])(bunx?|npm|npx|yarn)(?:[\s;&|]|$)/,
      name,
    );
  }
});

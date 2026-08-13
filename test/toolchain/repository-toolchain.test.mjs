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

test("pnpm enforces the repository dependency policies", () => {
  assert.equal(
    readFileSync(new URL("../../pnpm-workspace.yaml", import.meta.url), "utf8"),
    "allowBuilds:\n  esbuild: true\nminimumReleaseAge: 1440\n",
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

test("package positioning does not claim to be the official SDK", () => {
  const readme = readFileSync(
    new URL("../../README.md", import.meta.url),
    "utf8",
  );
  const prose = readme.replace(/\n>\s*/g, " ");

  assert.match(prose, /Experimental community-maintained/);
  assert.match(prose, /Not affiliated with or endorsed by Lemon Squeezy/);
  assert.doesNotMatch(readme, /official (?:Lemon Squeezy )?JavaScript SDK/i);
});

test("CI installs and records the minimum supported Bun runtime", () => {
  const workflow = readFileSync(
    new URL("../../.github/workflows/check.yml", import.meta.url),
    "utf8",
  );
  const toolVersions = readFileSync(
    new URL("../../scripts/tool-versions.mjs", import.meta.url),
    "utf8",
  );

  assert.match(workflow, /uses: oven-sh\/setup-bun@v2/);
  assert.match(workflow, /bun-version: "1\.3\.14"/);
  assert.match(toolVersions, /run\("bun", \["--version"\]\)/);
});

test("Test Mode integration stays fail-closed until its protected canary exists", () => {
  assert.equal(
    packageJson.scripts["test:integration"],
    "node scripts/test-integration.mjs",
  );
  assert.equal(
    existsSync(new URL("../../vitest.integration.config.ts", import.meta.url)),
    false,
  );
  assert.equal(
    existsSync(new URL("../integration-setup.ts", import.meta.url)),
    false,
  );
});

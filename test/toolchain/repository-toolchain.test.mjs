import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

const readRootText = (path) =>
  readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");
const packageJson = JSON.parse(readRootText("package.json"));

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
  const readme = readRootText("README.md");
  const prose = readme.replace(/\n>\s*/g, " ");

  assert.match(prose, /Experimental community-maintained/);
  assert.match(prose, /Not affiliated with or endorsed by Lemon Squeezy/);
  assert.doesNotMatch(readme, /official (?:Lemon Squeezy )?JavaScript SDK/i);
});

test("migration documentation and release feedback assets are publish-ready", () => {
  const readme = readRootText("README.md");
  const migration = readRootText("MIGRATION.md");
  const changelog = readRootText("CHANGELOG.md");
  const releaseTemplate = readRootText(".github/RELEASE_TEMPLATE.md");
  const feedbackTemplate = readRootText(
    ".github/ISSUE_TEMPLATE/migration-feedback.yml",
  );

  assert.ok(packageJson.files.includes("MIGRATION.md"));
  assert.match(readme, /Greenfield.*Explicit Client/is);
  assert.match(readme, /Compatibility-first/is);
  assert.match(readme, /MIGRATION\.md/);
  assert.match(migration, /Migration Behavior Audit/);
  const migrationLines = migration.split("\n");
  const auditStart = migrationLines.findIndex((line) =>
    line.startsWith("| Correction "),
  );
  const auditEnd = migrationLines.indexOf("", auditStart);
  const auditTable = migrationLines.slice(auditStart, auditEnd);
  assert.equal(auditTable.length, 16);
  for (const row of auditTable) {
    assert.equal(row.replaceAll("\\|", "").split("|").length - 1, 5, row);
  }
  assert.match(
    migration,
    /package\s+rollback cannot undo successful\s+remote/i,
  );
  assert.match(
    changelog,
    /Migration impact: (?:None|Additive|Behavior correction|Breaking beta change)/,
  );
  assert.match(changelog, /Exact rollback:/);
  assert.match(releaseTemplate, /Migration impact:/);
  assert.match(releaseTemplate, /Exact rollback:/);
  assert.match(feedbackTemplate, /Compatibility-first/);
  assert.doesNotMatch(
    feedbackTemplate,
    /API key|License Key|raw Webhook payload/i,
  );
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

test("exact-tarball type fixtures stay outside source-workspace analysis", () => {
  const oxlint = JSON.parse(
    readFileSync(new URL("../../.oxlintrc.json", import.meta.url), "utf8"),
  );
  const tsconfig = JSON.parse(
    readFileSync(new URL("../../tsconfig.json", import.meta.url), "utf8"),
  );

  assert.ok(oxlint.ignorePatterns.includes("test/package/types/**"));
  assert.ok(tsconfig.exclude.includes("test/package/types"));
});

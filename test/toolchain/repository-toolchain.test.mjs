import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { test } from "node:test";

const readRootText = (path) =>
  readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");
const packageJson = JSON.parse(readRootText("package.json"));

void test("the repository uses the approved package manager and build host", () => {
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

void test("pnpm has the repository's only committed dependency lockfile", () => {
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

void test("pnpm enforces the repository dependency policies", () => {
  assert.equal(
    readFileSync(new URL("../../pnpm-workspace.yaml", import.meta.url), "utf8"),
    "allowBuilds:\n  esbuild: true\nminimumReleaseAge: 1440\n",
  );
});

void test("legacy toolchain dependencies and lifecycle hooks are absent", () => {
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

void test("repository scripts do not invoke an unapproved package manager or runner", () => {
  for (const [name, command] of Object.entries(packageJson.scripts)) {
    assert.doesNotMatch(
      command,
      /(?:^|[\s;&|])(bunx?|npm|npx|yarn)(?:[\s;&|]|$)/,
      name,
    );
  }
});

void test("package positioning does not claim to be the official SDK", () => {
  const readme = readRootText("README.md");
  const prose = readme.replace(/\n>\s*/g, " ");

  assert.match(prose, /Experimental community-maintained/);
  assert.match(prose, /Not affiliated with or endorsed by Lemon Squeezy/);
  assert.doesNotMatch(readme, /official (?:Lemon Squeezy )?JavaScript SDK/i);
});

void test("migration documentation and release feedback assets are publish-ready", () => {
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

void test("CI installs and records the minimum supported Bun runtime", () => {
  const workflow = readFileSync(
    new URL("../../.github/workflows/check.yml", import.meta.url),
    "utf8",
  );
  const toolVersions = readFileSync(
    new URL("../../scripts/tool-versions.mjs", import.meta.url),
    "utf8",
  );

  assert.match(
    workflow,
    /uses: oven-sh\/setup-bun@0c5077e51419868618aeaa5fe8019c62421857d6 # v2\.2\.0/,
  );
  assert.match(workflow, /bun-version: "1\.3\.14"/);
  assert.match(toolVersions, /run\("bun", \["--version"\]\)/);
});

void test("artifact uploads use the Node.js 24 action runtime", () => {
  const workflows = readdirSync(
    new URL("../../.github/workflows", import.meta.url),
  ).filter((name) => name.endsWith(".yml"));
  const uploadArtifact =
    /actions\/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a # v7\.0\.1/g;

  let uploadCount = 0;
  for (const workflow of workflows) {
    const source = readRootText(`.github/workflows/${workflow}`);
    uploadCount += source.match(uploadArtifact)?.length ?? 0;
    assert.doesNotMatch(source, /actions\/upload-artifact@(?!043fb46d)/);
  }

  assert.equal(uploadCount, 5);
  assert.equal(
    workflows.reduce(
      (count, workflow) =>
        count +
        (readRootText(`.github/workflows/${workflow}`).match(
          /include-hidden-files: true/g,
        )?.length ?? 0),
      0,
    ),
    uploadCount,
  );
});

void test("Test Mode integration is an exact-tarball, fail-closed protected canary", () => {
  assert.match(packageJson.scripts["test:repository"], /reaper\.test\.mjs/);
  assert.equal(
    packageJson.scripts["test:integration"],
    "node scripts/test-integration.mjs",
  );
  assert.equal(
    existsSync(new URL("../../vitest.integration.config.ts", import.meta.url)),
    true,
  );
  assert.equal(
    existsSync(new URL("../integration/canary.test.mjs", import.meta.url)),
    true,
  );

  const integrationScript = readFileSync(
    new URL("../../scripts/test-integration.mjs", import.meta.url),
    "utf8",
  );
  for (const name of [
    "LEMON_SQUEEZY_API_KEY",
    "LEMON_SQUEEZY_TEST_STORE_ID",
    "LEMON_SQUEEZY_TEST_PRODUCT_ID",
    "LEMON_SQUEEZY_TEST_LICENSE_KEY",
    "LEMON_SQUEEZY_TEST_RUN_ID",
  ]) {
    assert.match(integrationScript, new RegExp(name));
  }
  assert.match(integrationScript, /prepareConsumer\("test-mode-integration"\)/);
  assert.doesNotMatch(integrationScript, /Issue #32 adds/);
  const integrationConfig = readRootText("vitest.integration.config.ts");
  const canary = readRootText("test/integration/canary.test.mjs");
  assert.match(integrationConfig, /testTimeout: 10 \* 60_000/);
  assert.match(
    canary,
    /assert\.equal\(license\.license_key\.test_mode, true\)/,
  );
  assert.equal(
    packageJson.scripts["test:integration:reap"],
    "node scripts/reap-integration-fixtures.mjs",
  );
  const reaper = readFileSync(
    new URL("../integration/reaper.mjs", import.meta.url),
    "utf8",
  );
  const reaperCore = readFileSync(
    new URL("../integration/reaper-core.mjs", import.meta.url),
    "utf8",
  );
  assert.match(reaperCore, /24 \* 60 \* 60 \* 1_000/);
  assert.match(reaperCore, /sdk-ci-/);
  assert.match(reaperCore, /MAX_PAGES = 10/);
  assert.doesNotMatch(reaper, /customers|orders|subscriptions|license-keys/);
  assert.doesNotMatch(
    reaperCore,
    /customers|orders|subscriptions|license-keys/,
  );
});

void test("exact-tarball type fixtures stay outside source-workspace analysis", () => {
  const oxlint = JSON.parse(
    readFileSync(new URL("../../.oxlintrc.json", import.meta.url), "utf8"),
  );
  const tsconfig = JSON.parse(
    readFileSync(new URL("../../tsconfig.json", import.meta.url), "utf8"),
  );

  assert.ok(oxlint.ignorePatterns.includes("test/package/types/**"));
  assert.ok(tsconfig.exclude.includes("test/package/types"));
});

void test("the credential-free gate exercises exact-tarball bundler graphs", () => {
  assert.equal(
    packageJson.scripts["test:bundlers"],
    "node scripts/test-bundlers.mjs",
  );
  assert.match(
    packageJson.scripts.check,
    /pack:artifact.*test:artifact.*test:types.*test:docs.*test:package.*test:bundlers/,
  );
  assert.equal(
    existsSync(new URL("../../scripts/test-bundlers.mjs", import.meta.url)),
    true,
  );
  assert.equal(
    existsSync(new URL("../package/bundlers/client.mjs", import.meta.url)),
    true,
  );
});

void test("the documentation contract is a finite installed-package gate", () => {
  assert.equal(packageJson.scripts["test:docs"], "node scripts/test-docs.mjs");
  assert.match(
    packageJson.scripts["candidate:check"],
    /pack:artifact.*test:artifact.*test:types.*test:docs.*test:bundlers/,
  );
  assert.match(
    packageJson.scripts["test:repository"],
    /docs-contract\.test\.mjs/,
  );
  assert.equal(
    existsSync(new URL("../../scripts/test-docs.mjs", import.meta.url)),
    true,
  );
  assert.equal(
    existsSync(new URL("../../docs/usage/getting-started.md", import.meta.url)),
    true,
  );

  const testDocs = readRootText("scripts/test-docs.mjs");
  const contributing = readRootText("CONTRIBUTING.md");
  assert.match(testDocs, /prepareConsumer\("docs"\)/);
  assert.doesNotMatch(
    testDocs,
    /vitepress|docusaurus|typedoc|createServer|\bwatch\b/,
  );
  assert.match(contributing, /test:docs/);

  const allDependencies = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  };
  for (const dependency of [
    "@docusaurus/core",
    "docusaurus",
    "typedoc",
    "vitepress",
    "nextra",
  ]) {
    assert.equal(allDependencies[dependency], undefined, dependency);
  }
});

void test("package installation is independent from the consumer runtime", () => {
  const packageSmoke = readRootText("scripts/test-package.mjs");
  assert.match(packageSmoke, /PACKAGE_SMOKE_NODE_BINARY/);
  assert.match(packageSmoke, /PACKAGE_SMOKE_BUN_BINARY/);
  assert.match(packageSmoke, /prepareConsumer\("package-smoke"\)/);
});

void test("credentialed v4 tests have exactly one migrated destination", () => {
  for (const path of [
    "test/checkouts/index.test.ts",
    "test/customers/index.test.ts",
    "test/discountRedemptions/index.test.ts",
    "test/discounts/index.test.ts",
    "test/files/index.test.ts",
    "test/internal/fetch.test.ts",
    "test/license/index.test.ts",
    "test/licenseKeyInstances/index.test.ts",
    "test/licenseKeys/index.test.ts",
    "test/orderItems/index.test.ts",
    "test/orders/index.test.ts",
    "test/prices/index.test.ts",
    "test/products/index.test.ts",
    "test/stores/index.test.ts",
    "test/subscriptionInvoices/index.test.ts",
    "test/subscriptionItems/index.test.ts",
    "test/subscriptions/index.test.ts",
    "test/usageRecords/index.test.ts",
    "test/users/index.test.ts",
    "test/variants/index.test.ts",
    "test/webhooks/index.test.ts",
  ]) {
    assert.equal(
      existsSync(new URL(`../../${path}`, import.meta.url)),
      false,
      path,
    );
  }
  const vitestConfig = readRootText("vitest.config.ts");
  assert.doesNotMatch(vitestConfig, /\.skip|skipIf|LEMON_SQUEEZY_/);
});

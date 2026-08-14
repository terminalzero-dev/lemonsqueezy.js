import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { readFileSync } from "node:fs";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { test } from "node:test";

const execute = promisify(execFile);
const readRootText = (path) =>
  readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");
const packageJson = JSON.parse(readRootText("package.json"));

void test("release governance is part of the default credential-free gate", () => {
  assert.match(
    packageJson.scripts["test:repository"],
    /release-governance\.test\.mjs/,
  );
  assert.equal(
    packageJson.scripts["governance:apply"],
    "node scripts/apply-github-governance.mjs",
  );
  assert.equal(
    packageJson.scripts["candidate:create"],
    "node scripts/create-release-candidate.mjs",
  );
  assert.equal(
    packageJson.scripts["candidate:verify"],
    "node scripts/verify-release-candidate.mjs",
  );
  assert.equal(
    (packageJson.scripts["candidate:check"].match(/pnpm build/g) ?? []).length,
    1,
  );
  assert.equal(
    (packageJson.scripts["candidate:check"].match(/pnpm pack:artifact/g) ?? [])
      .length,
    1,
  );
  assert.doesNotMatch(
    packageJson.scripts["candidate:check"],
    /build:reproducible|test:package/,
  );
});

void test("ordinary CI is a read-only credential-free gate on protected branches", () => {
  const workflow = readRootText(".github/workflows/check.yml");

  assert.match(workflow, /branches:\n\s+- main\n\s+- release\/v5-beta/);
  assert.match(workflow, /permissions:\n\s+contents: read/);
  assert.match(workflow, /name: Credential-free gate/);
  assert.match(workflow, /run: pnpm check/);
  assert.doesNotMatch(workflow, /\bsecrets\b|pull_request_target/);

  const actionReferences = [...workflow.matchAll(/uses: ([^\s]+)/g)].map(
    ([, reference]) => reference,
  );
  assert.ok(actionReferences.length > 0);
  for (const reference of actionReferences) {
    assert.match(reference, /@[0-9a-f]{40}$/);
  }
});

void test("Test Mode runs only on trusted refs through its protected environment", () => {
  const workflow = readRootText(".github/workflows/test-mode.yml");

  assert.match(workflow, /schedule:/);
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /github\.ref == 'refs\/heads\/main'/);
  assert.match(workflow, /github\.ref == 'refs\/heads\/release\/v5-beta'/);
  assert.match(workflow, /environment: test-mode/);
  assert.match(workflow, /group: v5-release/);
  assert.match(workflow, /cancel-in-progress: false/);
  assert.match(workflow, /run: pnpm check/);
  assert.match(workflow, /run: pnpm test:integration:reap/);
  assert.match(workflow, /run: pnpm test:integration/);
  assert.match(workflow, /if: always\(\)/);
  assert.doesNotMatch(workflow, /pull_request_target|NPM_TOKEN/);

  for (const [, reference] of workflow.matchAll(/uses: ([^\s]+)/g)) {
    assert.match(reference, /@[0-9a-f]{40}$/);
  }
});

void test("a release candidate binds the exact artifact to source and gate evidence", async () => {
  const artifactDirectory = await mkdtemp(
    join(tmpdir(), "lemonsqueezy-release-candidate-"),
  );
  await mkdir(join(artifactDirectory, "packages"));
  await writeFile(
    join(artifactDirectory, "packages/candidate.tgz"),
    "canonical artifact",
  );
  await writeFile(
    join(artifactDirectory, "artifact.json"),
    `${JSON.stringify(
      {
        file: "packages/candidate.tgz",
        sha256:
          "6afd85145af55d8d60cd9e698a762bb95bc3d37f6fab6c60a132e12fca3ffd34",
      },
      null,
      2,
    )}\n`,
  );
  await writeFile(
    join(artifactDirectory, "publish-plan.json"),
    `${JSON.stringify(
      {
        version: 1,
        plan: [
          [
            {
              kind: "publish",
              name: "@terminalzero/lemonsqueezy",
              version: "5.0.0-beta.0",
              access: "public",
              tag: "beta",
              tarball: {
                path: "packages/candidate.tgz",
                integrity:
                  "sha256-av2FFFr1XY1gzZ5pinYruVvD039vq2xgoTLhL8o//TQ=",
              },
            },
          ],
        ],
      },
      null,
      2,
    )}\n`,
  );

  await execute(process.execPath, [
    new URL("../../scripts/create-release-candidate.mjs", import.meta.url)
      .pathname,
    "--artifact-directory",
    artifactDirectory,
    "--expected-version",
    "5.0.0-beta.0",
    "--expected-commit",
    "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    "--repository",
    "terminalzero-dev/lemonsqueezy.js",
    "--run-id",
    "12345",
    "--run-attempt",
    "2",
    "--workflow-ref",
    "terminalzero-dev/lemonsqueezy.js/.github/workflows/release-candidate.yml@refs/heads/release/v5-beta",
  ]);

  assert.deepEqual(
    JSON.parse(await readFile(join(artifactDirectory, "candidate.json"))),
    {
      schemaVersion: 1,
      package: "@terminalzero/lemonsqueezy",
      version: "5.0.0-beta.0",
      sourceCommit: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      artifact: {
        file: "packages/candidate.tgz",
        sha256:
          "6afd85145af55d8d60cd9e698a762bb95bc3d37f6fab6c60a132e12fca3ffd34",
        sha512:
          "9f4901cc6217bdcf9fa55d159940452b72bd4ce8bea0b40adbca0d9a7435f3c59c1b0462913aee2388f2460279661dc24917660dfc7b8752539ef49fe02b9440",
        integrity:
          "sha512-n0kBzGIXvc+fpV0VmUBFK3K9TOi+oLQK28oNmnQ188WcGwRikTruI4jyRgJ5Zh3CSRdmDfx7h1JTnvSf4CuUQA==",
      },
      publishPlan: {
        file: "publish-plan.json",
        sha256:
          "6dd6a8d35f4710b851824f7d7e3dba1d23d99e89d1696517df03fcd9962f7fd1",
      },
      gates: {
        credentialFree: "passed",
        runtimeMatrix: "passed",
        testMode: "passed",
      },
      workflow: {
        repository: "terminalzero-dev/lemonsqueezy.js",
        runId: "12345",
        runAttempt: "2",
        workflowRef:
          "terminalzero-dev/lemonsqueezy.js/.github/workflows/release-candidate.yml@refs/heads/release/v5-beta",
      },
    },
  );
});

void test("pre-publish verification rejects changed candidate bytes", async () => {
  const artifactDirectory = await mkdtemp(
    join(tmpdir(), "lemonsqueezy-release-verification-"),
  );
  await mkdir(join(artifactDirectory, "packages"));
  await writeFile(
    join(artifactDirectory, "packages/candidate.tgz"),
    "changed artifact",
  );
  await writeFile(
    join(artifactDirectory, "artifact.json"),
    `${JSON.stringify(
      {
        file: "packages/candidate.tgz",
        sha256:
          "6afd85145af55d8d60cd9e698a762bb95bc3d37f6fab6c60a132e12fca3ffd34",
      },
      null,
      2,
    )}\n`,
  );
  await writeFile(
    join(artifactDirectory, "publish-plan.json"),
    `${JSON.stringify(
      {
        version: 1,
        plan: [
          [
            {
              kind: "publish",
              name: "@terminalzero/lemonsqueezy",
              version: "5.0.0-beta.0",
              access: "public",
              tag: "beta",
              tarball: {
                path: "packages/candidate.tgz",
                integrity:
                  "sha256-av2FFFr1XY1gzZ5pinYruVvD039vq2xgoTLhL8o//TQ=",
              },
            },
          ],
        ],
      },
      null,
      2,
    )}\n`,
  );
  await writeFile(
    join(artifactDirectory, "candidate.json"),
    `${JSON.stringify(
      {
        schemaVersion: 1,
        package: "@terminalzero/lemonsqueezy",
        version: "5.0.0-beta.0",
        sourceCommit: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        artifact: {
          file: "packages/candidate.tgz",
          sha256:
            "6afd85145af55d8d60cd9e698a762bb95bc3d37f6fab6c60a132e12fca3ffd34",
          sha512:
            "9f4901cc6217bdcf9fa55d159940452b72bd4ce8bea0b40adbca0d9a7435f3c59c1b0462913aee2388f2460279661dc24917660dfc7b8752539ef49fe02b9440",
          integrity:
            "sha512-n0kBzGIXvc+fpV0VmUBFK3K9TOi+oLQK28oNmnQ188WcGwRikTruI4jyRgJ5Zh3CSRdmDfx7h1JTnvSf4CuUQA==",
        },
        publishPlan: {
          file: "publish-plan.json",
          sha256:
            "6dd6a8d35f4710b851824f7d7e3dba1d23d99e89d1696517df03fcd9962f7fd1",
        },
        gates: {
          credentialFree: "passed",
          runtimeMatrix: "passed",
          testMode: "passed",
        },
        workflow: {
          repository: "terminalzero-dev/lemonsqueezy.js",
          runId: "12345",
          runAttempt: "2",
          workflowRef:
            "terminalzero-dev/lemonsqueezy.js/.github/workflows/release-candidate.yml@refs/heads/release/v5-beta",
        },
      },
      null,
      2,
    )}\n`,
  );

  await assert.rejects(
    execute(process.execPath, [
      new URL("../../scripts/verify-release-candidate.mjs", import.meta.url)
        .pathname,
      "--artifact-directory",
      artifactDirectory,
      "--expected-version",
      "5.0.0-beta.0",
      "--expected-commit",
      "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      "--skip-registry-check",
    ]),
    /candidate artifact SHA-256 changed/,
  );
});

void test("manual Release Candidates reuse one artifact without registry mutation", () => {
  const workflow = readRootText(".github/workflows/release-candidate.yml");

  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /expected_version:/);
  assert.match(workflow, /expected_commit:/);
  assert.match(workflow, /group: v5-release/);
  assert.match(workflow, /cancel-in-progress: false/);
  assert.match(workflow, /github\.actor == vars\.RELEASE_MAINTAINER/);
  assert.match(workflow, /environment: test-mode/);
  assert.doesNotMatch(workflow, /environment: npm-release/);
  assert.match(workflow, /run: pnpm candidate:check/);
  assert.match(workflow, /run: pnpm test:integration/);
  assert.match(workflow, /node-version: \$\{\{ matrix\.node-version \}\}/);
  assert.match(
    workflow,
    /node-version: \["22\.0\.0", "22", "24\.0\.0", "24"\]/,
  );
  assert.match(workflow, /bun-version: \["1\.3\.14", "1\.x"\]/);
  assert.match(workflow, /PACKAGE_SMOKE_RUNTIME: node/);
  assert.match(workflow, /PACKAGE_SMOKE_RUNTIME: bun/);
  assert.match(workflow, /create-release-candidate\.mjs/);
  assert.match(workflow, /verify-release-candidate\.mjs/);
  assert.match(workflow, /actions\/upload-artifact@[0-9a-f]{40}/);
  assert.match(workflow, /actions\/download-artifact@[0-9a-f]{40}/);
  assert.doesNotMatch(
    workflow,
    /(?:pnpm|npm|changeset) publish|NPM_TOKEN|pull_request_target/,
  );
  assert.equal((workflow.match(/pnpm pack:artifact/g) ?? []).length, 0);
  assert.equal((workflow.match(/run: pnpm candidate:check/g) ?? []).length, 1);

  for (const [, reference] of workflow.matchAll(/uses: ([^\s]+)/g)) {
    assert.match(reference, /@[0-9a-f]{40}$/);
  }
});

void test("repository governance protects release refs without a review quorum", () => {
  const governance = JSON.parse(
    readRootText(".github/governance/repository.json"),
  );
  const byName = new Map(
    governance.rulesets.map((ruleset) => [ruleset.name, ruleset]),
  );
  const branches = byName.get("Protect v5 branches");
  assert.deepEqual(branches.conditions.ref_name.include, [
    "refs/heads/main",
    "refs/heads/release/v5-beta",
  ]);
  assert.deepEqual(branches.bypass_actors, []);
  assert.deepEqual(
    branches.rules.map(({ type }) => type),
    ["pull_request", "required_status_checks", "non_fast_forward", "deletion"],
  );
  assert.equal(branches.rules[0].parameters.required_approving_review_count, 0);
  assert.equal(
    branches.rules[0].parameters.required_review_thread_resolution,
    true,
  );
  assert.equal(
    branches.rules[1].parameters.required_status_checks[0].context,
    "Credential-free gate",
  );

  const tagCreation = byName.get("Controlled v5 tag creation");
  assert.deepEqual(tagCreation.rules, [{ type: "creation" }]);
  assert.deepEqual(tagCreation.bypass_actors, [
    {
      actor_id: 15368,
      actor_type: "Integration",
      bypass_mode: "always",
    },
  ]);
  const tagImmutability = byName.get("Immutable v5 tags");
  assert.deepEqual(tagImmutability.bypass_actors, []);
  assert.deepEqual(
    tagImmutability.rules.map(({ type }) => type),
    ["update", "deletion"],
  );

  assert.deepEqual(
    governance.environments.map(({ name, branches }) => ({ name, branches })),
    [
      { name: "test-mode", branches: ["main", "release/v5-beta"] },
      { name: "npm-release", branches: ["main", "release/v5-beta"] },
    ],
  );
  assert.equal(governance.actions.sha_pinning_required, true);
  assert.equal(
    governance.workflowPermissions.default_workflow_permissions,
    "read",
  );
  assert.equal(governance.variables.RELEASE_MAINTAINER, "keyding");
});

void test("repository governance has an auditable dry-run before mutation", async () => {
  const { stdout } = await execute(process.execPath, [
    new URL("../../scripts/apply-github-governance.mjs", import.meta.url)
      .pathname,
    "--repository",
    "terminalzero-dev/lemonsqueezy.js",
    "--dry-run",
  ]);

  assert.deepEqual(
    JSON.parse(stdout),
    JSON.parse(readRootText(".github/governance/repository.json")),
  );
});

void test("beta.1 runbooks preserve the bootstrap and version-PR boundaries", () => {
  const betaBranch = readRootText("docs/release/beta-branch.md");
  const bootstrap = readRootText("docs/release/bootstrap-beta-1.md");
  const readiness = readRootText("docs/release/beta-1-readiness.md");

  assert.match(betaBranch, /release\/v5-beta/);
  assert.match(betaBranch, /changeset pre enter beta/);
  assert.match(betaBranch, /separate pull request/i);
  assert.match(betaBranch, /5\.0\.0-beta\.0.*must not be published/is);
  assert.match(bootstrap, /exact.*\.tgz/is);
  assert.match(bootstrap, /SHA-256/);
  assert.match(bootstrap, /--tag beta/);
  assert.match(bootstrap, /remove.*latest/is);
  assert.match(bootstrap, /Trusted Publisher/);
  assert.match(bootstrap, /revoke/is);
  assert.doesNotMatch(bootstrap, /NPM_TOKEN|recovery code:|OTP:/i);
  assert.match(readiness, /GitHub organization 2FA enforcement\s+\| Not ready/);
  assert.match(readiness, /npm scope ownership\s+\| Unverified/);
  assert.match(readiness, /Registry package absence\s+\| Verified/);
  assert.match(
    readiness,
    /Recovery materials\s+\| Maintainer confirmation required/,
  );

  const packageSmoke = readRootText("scripts/test-package.mjs");
  assert.doesNotMatch(packageSmoke, /5\.0\.0-beta\.0/);
  assert.match(packageSmoke, /PACKAGE_SMOKE_RUNTIME/);
});

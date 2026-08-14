import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash, generateKeyPairSync, verify } from "node:crypto";
import { readFileSync } from "node:fs";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { once } from "node:events";
import { promisify } from "node:util";
import { test } from "node:test";
import {
  assertReleaseIdentitySecret,
  assertReleaseInstallation,
  resolveRulesetBypassActors,
  selectReleaseActionsIntegration,
} from "../../scripts/lib/github-governance.mjs";

const execute = promisify(execFile);
const readRootText = (path) =>
  readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");
const packageJson = JSON.parse(readRootText("package.json"));
const bootstrapVersion = "5.0.0-beta.1";
const createPublishPlan = (version = packageJson.version) =>
  `${JSON.stringify(
    {
      version: 1,
      plan: [
        [
          {
            kind: "publish",
            name: "@terminalzero/lemonsqueezy",
            version,
            access: "public",
            tag: "beta",
            tarball: {
              path: "packages/candidate.tgz",
              integrity: "sha256-av2FFFr1XY1gzZ5pinYruVvD039vq2xgoTLhL8o//TQ=",
            },
          },
        ],
      ],
    },
    null,
    2,
  )}\n`;

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
  const publishPlan = createPublishPlan();
  await writeFile(join(artifactDirectory, "publish-plan.json"), publishPlan);

  await execute(process.execPath, [
    new URL("../../scripts/create-release-candidate.mjs", import.meta.url)
      .pathname,
    "--artifact-directory",
    artifactDirectory,
    "--expected-version",
    packageJson.version,
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
      version: packageJson.version,
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
        sha256: createHash("sha256").update(publishPlan).digest("hex"),
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
  const publishPlan = createPublishPlan();
  await writeFile(join(artifactDirectory, "publish-plan.json"), publishPlan);
  await writeFile(
    join(artifactDirectory, "candidate.json"),
    `${JSON.stringify(
      {
        schemaVersion: 1,
        package: "@terminalzero/lemonsqueezy",
        version: packageJson.version,
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
          sha256: createHash("sha256").update(publishPlan).digest("hex"),
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
      packageJson.version,
      "--expected-commit",
      "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      "--skip-registry-check",
    ]),
    /candidate artifact SHA-256 changed/,
  );
});

void test("post-publish verification binds registry bytes to the Candidate", async () => {
  const artifactDirectory = await mkdtemp(
    join(tmpdir(), "lemonsqueezy-registry-verification-"),
  );
  await mkdir(join(artifactDirectory, "packages"));
  const tarball = Buffer.from("canonical artifact");
  await writeFile(join(artifactDirectory, "packages/candidate.tgz"), tarball);
  await writeFile(
    join(artifactDirectory, "artifact.json"),
    `${JSON.stringify(
      {
        file: "packages/candidate.tgz",
        sha256: createHash("sha256").update(tarball).digest("hex"),
      },
      null,
      2,
    )}\n`,
  );
  const publishPlan = createPublishPlan(bootstrapVersion);
  await writeFile(join(artifactDirectory, "publish-plan.json"), publishPlan);
  const sha256 = createHash("sha256").update(tarball).digest("hex");
  const integrity = `sha512-${createHash("sha512").update(tarball).digest("base64")}`;
  await writeFile(
    join(artifactDirectory, "candidate.json"),
    `${JSON.stringify(
      {
        schemaVersion: 1,
        package: "@terminalzero/lemonsqueezy",
        version: bootstrapVersion,
        sourceCommit: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        artifact: {
          file: "packages/candidate.tgz",
          sha256,
          sha512: createHash("sha512").update(tarball).digest("hex"),
          integrity,
        },
        publishPlan: {
          file: "publish-plan.json",
          sha256: createHash("sha256").update(publishPlan).digest("hex"),
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

  const releaseIdentity = join(artifactDirectory, "release-identity.json");
  await writeFile(
    releaseIdentity,
    `${JSON.stringify(
      {
        schemaVersion: 1,
        package: "@terminalzero/lemonsqueezy",
        version: bootstrapVersion,
        sourceCommit: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        sha256,
        sha512: createHash("sha512").update(tarball).digest("hex"),
        integrity,
        candidateRunId: "12345",
      },
      null,
      2,
    )}\n`,
  );

  const server = createServer((request, response) => {
    if (request.url === "/tarball.tgz") {
      response.end(tarball);
      return;
    }
    if (request.url === "/-/package/%40terminalzero%2Flemonsqueezy/dist-tags") {
      response.setHeader("content-type", "application/json");
      response.end(JSON.stringify({ beta: bootstrapVersion }));
      return;
    }
    if (
      request.url ===
      "/repos/terminalzero-dev/lemonsqueezy.js/actions/runs/12345"
    ) {
      response.setHeader("content-type", "application/json");
      response.end(
        JSON.stringify({
          id: 12345,
          name: "Release Candidate",
          path: ".github/workflows/release-candidate.yml",
          event: "workflow_dispatch",
          status: "completed",
          conclusion: "success",
          head_sha: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          head_branch: "release/v5-beta",
        }),
      );
      return;
    }
    response.setHeader("content-type", "application/json");
    response.end(
      JSON.stringify({
        name: "@terminalzero/lemonsqueezy",
        version: bootstrapVersion,
        dist: {
          integrity,
          tarball: `http://127.0.0.1:${server.address().port}/tarball.tgz`,
        },
      }),
    );
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");

  try {
    await execute(process.execPath, [
      new URL("../../scripts/verify-registry-release.mjs", import.meta.url)
        .pathname,
      "--artifact-directory",
      artifactDirectory,
      "--expected-version",
      bootstrapVersion,
      "--expected-commit",
      "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      "--expected-sha256",
      sha256,
      "--expected-run-id",
      "12345",
      "--repository",
      "terminalzero-dev/lemonsqueezy.js",
      "--registry",
      `http://127.0.0.1:${server.address().port}`,
      "--github-api",
      `http://127.0.0.1:${server.address().port}`,
      "--release-identity",
      releaseIdentity,
    ]);
  } finally {
    server.close();
    await once(server, "close");
  }

  const evidence = JSON.parse(
    await readFile(join(artifactDirectory, "registry-evidence.json")),
  );
  assert.equal(evidence.registry.integrity, integrity);
  assert.equal(evidence.registry.downloadedSha256, sha256);
  assert.deepEqual(evidence.registry.distTags, { beta: bootstrapVersion });
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
  assert.match(workflow, /Use Node\.js 24 as the install host/);
  assert.match(workflow, /PACKAGE_SMOKE_INSTALL_NODE/);
  assert.match(workflow, /PACKAGE_SMOKE_NODE_BINARY="\$runtime_node"/);
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

void test("protected bootstrap closeout verifies the registry before publishing an immutable prerelease", () => {
  const workflow = readRootText(".github/workflows/registry-release.yml");

  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /candidate_run_id:/);
  assert.match(workflow, /expected_version:/);
  assert.match(workflow, /expected_commit:/);
  assert.match(workflow, /expected_sha256:/);
  assert.match(workflow, /group: v5-release/);
  assert.match(workflow, /cancel-in-progress: false/);
  assert.match(workflow, /github\.actor == vars\.RELEASE_MAINTAINER/);
  assert.match(workflow, /environment: npm-release/);
  assert.match(
    workflow,
    /verify:[\s\S]*permissions:\n\s+actions: read\n\s+contents: read/,
  );
  assert.match(
    workflow,
    /tag:[\s\S]*needs: verify[\s\S]*permissions:\n\s+contents: read/,
  );
  assert.match(
    workflow,
    /finalize:[\s\S]*needs: tag[\s\S]*permissions:\n\s+actions: read\n\s+contents: write/,
  );
  assert.match(workflow, /contents: write/);
  assert.match(workflow, /run-id: \$\{\{ inputs\.candidate_run_id \}\}/);
  assert.match(workflow, /github-token: \$\{\{ github\.token \}\}/);
  assert.match(workflow, /verify-registry-release\.mjs/);
  assert.match(workflow, /PACKAGE_SMOKE_SPEC/);
  assert.match(workflow, /PACKAGE_SMOKE_EXPECTED_VERSION/);
  assert.match(workflow, /run: pnpm test:package/);
  assert.match(workflow, /gh release create/);
  assert.match(workflow, /Create or verify the protected release tag/);
  assert.match(workflow, /git push origin/);
  assert.match(workflow, /actions\/create-github-app-token@[0-9a-f]{40}/);
  assert.match(workflow, /RELEASE_GITHUB_APP_PRIVATE_KEY/);
  assert.match(workflow, /RELEASE_GITHUB_APP_CLIENT_ID/);
  assert.match(workflow, /permission-contents: write/);
  assert.match(workflow, /permission-metadata: read/);
  assert.match(workflow, /owner: \$\{\{ github\.repository_owner \}\}/);
  assert.match(workflow, /steps\.audit-token\.outputs\.token/);
  assert.match(workflow, /steps\.audit-token\.outputs\.installation-id/);
  assert.match(workflow, /steps\.audit-token\.outputs\.app-slug/);
  assert.match(workflow, /verify-release-installation\.mjs/);
  assert.match(workflow, /persist-credentials: true/);
  assert.equal(workflow.match(/RELEASE_GITHUB_APP_PRIVATE_KEY/g)?.length, 4);
  assert.equal(
    workflow.match(/actions\/create-github-app-token@[0-9a-f]{40}/g)?.length,
    2,
  );
  assert.match(
    workflow,
    /tag:[\s\S]*persist-credentials: true[\s\S]*finalize:[\s\S]*persist-credentials: false/,
  );
  assert.match(workflow, /--verify-tag/);
  assert.match(workflow, /--target "\$EXPECTED_COMMIT"/);
  assert.match(workflow, /--draft/);
  assert.match(workflow, /--prerelease/);
  assert.match(workflow, /--latest=false/);
  assert.match(workflow, /Create or resume the draft prerelease/);
  assert.match(workflow, /gh release upload/);
  assert.match(workflow, /missing=\(\)/);
  assert.match(workflow, /already_published/);
  assert.match(workflow, /Verify every retained evidence asset byte/);
  assert.match(workflow, /sha256sum/);
  assert.doesNotMatch(workflow, /--release-identity/);
  assert.doesNotMatch(
    workflow,
    /(?:pnpm|npm|changeset) publish|NPM_TOKEN|pull_request_target/,
  );

  for (const [, reference] of workflow.matchAll(/uses: ([^\s]+)/g)) {
    assert.match(reference, /@[0-9a-f]{40}$/);
  }

  const bootstrap = readRootText("docs/release/bootstrap-beta-1.md");
  assert.match(bootstrap, /registry-release\.yml/);
  assert.deepEqual(
    JSON.parse(readRootText("docs/release/beta-1-candidate.json")),
    {
      schemaVersion: 1,
      package: "@terminalzero/lemonsqueezy",
      version: "5.0.0-beta.1",
      sourceCommit: "adb3c2b02d511ed997752a5085dca361e61bb030",
      sha256:
        "5ed08363370dddfb5b81d0f1b5aca4a30335237e680078f1cc23a6bb699f4662",
      sha512:
        "2029ca7ceba203e894d91368791d3f8914a3866a83821946d6378dc334b2700ef7eafc334eb2cb32e51569c3da86cf475cdf6d7c68e88cc90874c81b8e15d4b4",
      integrity:
        "sha512-ICnKfOuiA+iU2RNoeR0/iRSjhmqDghlG1jeNwzSycA736vwzTrLLMuUVacPahs9HXN9tfGjojMkIdMgbjhXUtA==",
      candidateRunId: "31786097596",
    },
  );
  const packageSmoke = readRootText("scripts/test-package.mjs");
  assert.match(packageSmoke, /PACKAGE_SMOKE_EXPECTED_VERSION/);
  assert.match(
    readRootText("scripts/lib/canonical-artifact.mjs"),
    /PACKAGE_SMOKE_SPEC/,
  );
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
      actor_id: "$releaseActionsIntegration",
      actor_type: "Integration",
      bypass_mode: "always",
    },
  ]);
  assert.deepEqual(governance.releaseIdentity, {
    actionsIntegration: {
      id: 4593139,
      slug: "lemonsqueezy-v5-release",
      clientId: "Iv23liKrkrIVKfLtmUk6",
      installationId: 153681769,
      environment: "npm-release",
      privateKeySecret: "RELEASE_GITHUB_APP_PRIVATE_KEY",
      permissions: { contents: "write", metadata: "read" },
      events: [],
      repositorySelection: "selected",
      repositories: ["terminalzero-dev/lemonsqueezy.js"],
    },
    team: {
      name: "v5-release-managers",
      slug: "v5-release-managers",
      privacy: "closed",
      repository_permission: "push",
      members: [{ username: "keyding", role: "maintainer" }],
    },
  });
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
  assert.equal(
    governance.variables.RELEASE_GITHUB_APP_CLIENT_ID,
    "Iv23liKrkrIVKfLtmUk6",
  );
  assert.equal(governance.immutableReleases, true);
  assert.match(
    readRootText("scripts/apply-github-governance.mjs"),
    /immutable-releases/,
  );
});

void test("release governance pins and resolves its GitHub App identity", () => {
  const desired = {
    id: 4593139,
    slug: "lemonsqueezy-v5-release",
    clientId: "Iv23liKrkrIVKfLtmUk6",
    installationId: 153681769,
    environment: "npm-release",
    privateKeySecret: "RELEASE_GITHUB_APP_PRIVATE_KEY",
    permissions: { contents: "write", metadata: "read" },
    events: [],
    repositorySelection: "selected",
    repositories: ["terminalzero-dev/lemonsqueezy.js"],
  };
  const integration = {
    id: desired.id,
    slug: desired.slug,
    client_id: desired.clientId,
    owner: { login: "terminalzero-dev" },
    permissions: desired.permissions,
    events: desired.events,
  };

  assert.equal(
    selectReleaseActionsIntegration(integration, desired, "terminalzero-dev"),
    integration,
  );
  assert.throws(
    () =>
      selectReleaseActionsIntegration(
        { ...integration, client_id: "wrong" },
        desired,
        "terminalzero-dev",
      ),
    /client id/,
  );
  assert.throws(
    () =>
      selectReleaseActionsIntegration(
        { ...integration, owner: { login: "another-owner" } },
        desired,
        "terminalzero-dev",
      ),
    /owner/,
  );
  assert.throws(
    () =>
      selectReleaseActionsIntegration(
        { ...integration, permissions: { contents: "write" } },
        desired,
        "terminalzero-dev",
      ),
    /permissions/,
  );
  assert.deepEqual(
    resolveRulesetBypassActors(
      [
        {
          actor_id: "$releaseActionsIntegration",
          actor_type: "Integration",
          bypass_mode: "always",
        },
      ],
      { releaseIdentityTeamId: 7, releaseActionsIntegrationId: desired.id },
    ),
    [
      {
        actor_id: desired.id,
        actor_type: "Integration",
        bypass_mode: "always",
      },
    ],
  );
  assert.doesNotThrow(() =>
    assertReleaseIdentitySecret(
      [{ name: "RELEASE_GITHUB_APP_PRIVATE_KEY" }],
      desired,
    ),
  );
  assert.throws(
    () => assertReleaseIdentitySecret([], desired),
    /environment secret/,
  );

  const identity = {
    installationId: desired.installationId,
    appSlug: desired.slug,
  };
  const installation = {
    id: desired.installationId,
    app_id: desired.id,
    app_slug: desired.slug,
    account: { login: "terminalzero-dev" },
    suspended_at: null,
    repository_selection: desired.repositorySelection,
    permissions: desired.permissions,
    events: desired.events,
  };
  const repositories = {
    total_count: 1,
    repositories: [{ full_name: "terminalzero-dev/lemonsqueezy.js" }],
  };
  assert.doesNotThrow(() =>
    assertReleaseInstallation(
      installation,
      identity,
      repositories,
      desired,
      "terminalzero-dev",
    ),
  );
  assert.throws(
    () =>
      assertReleaseInstallation(
        installation,
        identity,
        {
          total_count: 2,
          repositories: [
            ...repositories.repositories,
            { full_name: "terminalzero-dev/another-repository" },
          ],
        },
        desired,
        "terminalzero-dev",
      ),
    /2 !== 1/,
  );
  assert.throws(
    () =>
      assertReleaseInstallation(
        installation,
        { ...identity, appSlug: "wrong-app" },
        repositories,
        desired,
        "terminalzero-dev",
      ),
    /installation app slug/,
  );
  assert.throws(
    () =>
      assertReleaseInstallation(
        { ...installation, repository_selection: "all" },
        identity,
        repositories,
        desired,
        "terminalzero-dev",
      ),
    /installation repository selection/,
  );
});

void test("release installation verifier audits the owner-wide token scope", async () => {
  const requests = [];
  const server = createServer((request, response) => {
    requests.push({
      url: request.url,
      authorization: request.headers.authorization,
    });
    response.setHeader("content-type", "application/json");
    const body = request.url?.startsWith("/app/installations/")
      ? {
          id: 153681769,
          app_id: 4593139,
          app_slug: "lemonsqueezy-v5-release",
          account: { login: "terminalzero-dev" },
          suspended_at: null,
          repository_selection: "selected",
          permissions: { contents: "write", metadata: "read" },
          events: [],
        }
      : {
          total_count: 1,
          repositories: [{ full_name: "terminalzero-dev/lemonsqueezy.js" }],
        };
    response.end(JSON.stringify(body));
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const { privateKey, publicKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
  });

  try {
    const { stdout } = await execute(
      process.execPath,
      [
        new URL(
          "../../scripts/verify-release-installation.mjs",
          import.meta.url,
        ).pathname,
        "--repository",
        "terminalzero-dev/lemonsqueezy.js",
        "--installation-id",
        "153681769",
        "--app-slug",
        "lemonsqueezy-v5-release",
        "--github-api",
        `http://127.0.0.1:${server.address().port}`,
      ],
      {
        env: {
          ...process.env,
          GITHUB_TOKEN: "test-token",
          RELEASE_GITHUB_APP_PRIVATE_KEY: privateKey.export({
            format: "pem",
            type: "pkcs8",
          }),
        },
      },
    );
    assert.match(stdout, /Verified release App installation 153681769/);
  } finally {
    server.close();
    await once(server, "close");
  }

  assert.equal(requests.length, 2);
  assert.equal(requests[0].url, "/app/installations/153681769");
  assert.match(requests[0].authorization, /^Bearer eyJ/);
  const jwt = requests[0].authorization.slice("Bearer ".length);
  const [encodedHeader, encodedPayload, encodedSignature] = jwt.split(".");
  assert.deepEqual(JSON.parse(Buffer.from(encodedHeader, "base64url")), {
    alg: "RS256",
    typ: "JWT",
  });
  const payload = JSON.parse(Buffer.from(encodedPayload, "base64url"));
  const now = Math.floor(Date.now() / 1000);
  assert.equal(payload.iss, "Iv23liKrkrIVKfLtmUk6");
  assert.ok(payload.iat <= now);
  assert.ok(payload.iat >= now - 120);
  assert.equal(payload.exp - payload.iat, 600);
  assert.ok(payload.exp <= now + 600);
  assert.equal(
    verify(
      "RSA-SHA256",
      Buffer.from(`${encodedHeader}.${encodedPayload}`),
      publicKey,
      Buffer.from(encodedSignature, "base64url"),
    ),
    true,
  );
  assert.deepEqual(requests[1], {
    url: "/installation/repositories?per_page=100",
    authorization: "Bearer test-token",
  });
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

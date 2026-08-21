import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash, generateKeyPairSync, verify } from "node:crypto";
import { readFileSync } from "node:fs";
import { chmod, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
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

void test("post-publish verification binds registry bytes, provenance, and recommended tags to the Candidate", async () => {
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

  const provenanceStatement = {
    _type: "https://in-toto.io/Statement/v1",
    subject: [
      {
        name: `pkg:npm/%40terminalzero/lemonsqueezy@${bootstrapVersion}`,
        digest: {
          sha512: createHash("sha512").update(tarball).digest("hex"),
        },
      },
    ],
    predicateType: "https://slsa.dev/provenance/v1",
    predicate: {
      buildDefinition: {
        externalParameters: {
          workflow: {
            ref: "refs/heads/release/v5-beta",
            repository: "https://github.com/terminalzero-dev/lemonsqueezy.js",
            path: ".github/workflows/registry-release.yml",
          },
        },
        resolvedDependencies: [
          {
            uri: "git+https://github.com/terminalzero-dev/lemonsqueezy.js@refs/heads/release/v5-beta",
            digest: {
              gitCommit: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            },
          },
        ],
      },
      runDetails: {
        builder: {
          id: "https://github.com/actions/runner/github-hosted",
        },
      },
    },
  };
  const provenanceEvidence = join(artifactDirectory, "provenance-audit.json");
  await writeFile(
    provenanceEvidence,
    `${JSON.stringify(
      {
        invalid: [],
        missing: [],
        verified: [
          {
            name: "@terminalzero/lemonsqueezy",
            version: bootstrapVersion,
            attestations: {
              provenance: {
                predicateType: "https://slsa.dev/provenance/v1",
              },
            },
            attestationBundles: [
              {
                predicateType: "https://slsa.dev/provenance/v1",
                bundle: {
                  dsseEnvelope: {
                    payload: Buffer.from(
                      JSON.stringify(provenanceStatement),
                    ).toString("base64"),
                  },
                },
              },
            ],
          },
        ],
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
      response.end(
        JSON.stringify({ beta: bootstrapVersion, latest: bootstrapVersion }),
      );
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
      "--expected-beta-version",
      bootstrapVersion,
      "--expected-latest-version",
      bootstrapVersion,
      "--repository",
      "terminalzero-dev/lemonsqueezy.js",
      "--registry",
      `http://127.0.0.1:${server.address().port}`,
      "--github-api",
      `http://127.0.0.1:${server.address().port}`,
      "--provenance-evidence",
      provenanceEvidence,
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
  assert.deepEqual(evidence.registry.distTags, {
    beta: bootstrapVersion,
    latest: bootstrapVersion,
  });
  assert.deepEqual(evidence.registry.provenance, {
    verified: true,
    subject: `pkg:npm/%40terminalzero/lemonsqueezy@${bootstrapVersion}`,
    sha512: createHash("sha512").update(tarball).digest("hex"),
    repository: "https://github.com/terminalzero-dev/lemonsqueezy.js",
    workflow: ".github/workflows/registry-release.yml",
    ref: "refs/heads/release/v5-beta",
    commit: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    builder: "https://github.com/actions/runner/github-hosted",
  });
});

void test("interactive npm 2FA dist-tag drill is complete and independently verifiable", async () => {
  const evidenceDirectory = await mkdtemp(
    join(tmpdir(), "lemonsqueezy-dist-tag-drill-"),
  );
  const currentVersion = "5.0.0-beta.2";
  const lastKnownGoodVersion = "5.0.0-beta.1";
  const sourceCommit = "a".repeat(40);
  const artifactSha256 = "b".repeat(64);
  const registryReleaseRunId = "98765";
  const npmActor = "npm-maintainer";
  const statePath = join(evidenceDirectory, "tags.json");
  const logPath = join(evidenceDirectory, "npm.jsonl");
  const npmPath = join(evidenceDirectory, "fake-npm.mjs");
  const npmUserconfig = join(evidenceDirectory, "npmrc");
  const evidencePath = join(evidenceDirectory, "evidence.json");
  const failedEvidencePath = join(evidenceDirectory, "failed.json");
  const staleStatePath = join(evidenceDirectory, "stale-tags.json");
  const staleRemainingPath = join(evidenceDirectory, "stale-remaining");
  await writeFile(npmUserconfig, "");
  await writeFile(
    statePath,
    JSON.stringify({ beta: currentVersion, latest: lastKnownGoodVersion }),
  );
  await writeFile(
    npmPath,
    `#!/usr/bin/env node
import { appendFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
const args = process.argv.slice(2);
appendFileSync(process.env.FAKE_NPM_LOG, JSON.stringify(args) + "\\n");
const tags = JSON.parse(readFileSync(process.env.FAKE_NPM_STATE, "utf8"));
if (args[0] === "view") {
  if (process.env.FAKE_NPM_STALE_STATE && existsSync(process.env.FAKE_NPM_STALE_REMAINING)) {
    const remaining = Number(readFileSync(process.env.FAKE_NPM_STALE_REMAINING, "utf8"));
    if (remaining > 0) {
      writeFileSync(process.env.FAKE_NPM_STALE_REMAINING, String(remaining - 1));
      process.stdout.write(readFileSync(process.env.FAKE_NPM_STALE_STATE, "utf8"));
      process.exit(0);
    }
  }
  process.stdout.write(JSON.stringify(tags));
  process.exit(0);
}
if (args[0] === "dist-tag" && args[1] === "add") {
  if (args[2] === process.env.FAKE_NPM_SIGNAL_SPEC && !existsSync(process.env.FAKE_NPM_SIGNAL_MARKER)) {
    writeFileSync(process.env.FAKE_NPM_SIGNAL_MARKER, "signalled once");
    process.kill(process.ppid, "SIGINT");
    process.exit(130);
  }
  if (args[2] === process.env.FAKE_NPM_FAIL_SPEC && !existsSync(process.env.FAKE_NPM_FAIL_MARKER)) {
    writeFileSync(process.env.FAKE_NPM_FAIL_MARKER, "failed once");
    process.exit(1);
  }
  const spec = args[2];
  const version = spec.slice(spec.lastIndexOf("@") + 1);
  if (process.env.FAKE_NPM_STALE_STATE) {
    writeFileSync(process.env.FAKE_NPM_STALE_STATE, JSON.stringify(tags));
    writeFileSync(process.env.FAKE_NPM_STALE_REMAINING, "1");
  }
  tags[args[3]] = version;
  writeFileSync(process.env.FAKE_NPM_STATE, JSON.stringify(tags));
  process.exit(0);
}
process.exit(2);
`,
  );
  await chmod(npmPath, 0o755);

  await execute(
    process.execPath,
    [
      new URL("../../scripts/exercise-dist-tags.mjs", import.meta.url).pathname,
      "--package",
      "@terminalzero/lemonsqueezy",
      "--current-version",
      currentVersion,
      "--last-known-good-version",
      lastKnownGoodVersion,
      "--source-commit",
      sourceCommit,
      "--artifact-sha256",
      artifactSha256,
      "--registry-release-run-id",
      registryReleaseRunId,
      "--npm-actor",
      npmActor,
      "--account-recovery-confirmed",
      "--npm-command",
      npmPath,
      "--npm-userconfig",
      npmUserconfig,
      "--tag-read-attempts",
      "3",
      "--tag-read-delay-ms",
      "0",
      "--evidence",
      evidencePath,
    ],
    {
      env: {
        ...process.env,
        FAKE_NPM_LOG: logPath,
        FAKE_NPM_STATE: statePath,
        FAKE_NPM_STALE_STATE: staleStatePath,
        FAKE_NPM_STALE_REMAINING: staleRemainingPath,
      },
    },
  );

  assert.deepEqual(JSON.parse(await readFile(statePath)), {
    beta: currentVersion,
    latest: currentVersion,
  });
  const evidence = JSON.parse(await readFile(evidencePath));
  assert.equal(evidence.status, "completed");
  assert.deepEqual(
    evidence.states.map(({ phase, beta, latest }) => ({ phase, beta, latest })),
    [
      {
        phase: "published",
        beta: currentVersion,
        latest: lastKnownGoodVersion,
      },
      { phase: "promoted", beta: currentVersion, latest: currentVersion },
      {
        phase: "rolled-back",
        beta: lastKnownGoodVersion,
        latest: lastKnownGoodVersion,
      },
      { phase: "restored", beta: currentVersion, latest: currentVersion },
    ],
  );
  assert.equal(evidence.auth, "interactive-npm-cli-2fa");
  assert.equal(evidence.accountRecovery.confirmed, true);
  assert.equal(evidence.registryReleaseRunId, registryReleaseRunId);
  assert.equal(evidence.npmActor, npmActor);
  assert.doesNotMatch(JSON.stringify(evidence), /token|recovery code/i);

  await writeFile(
    statePath,
    JSON.stringify({ beta: currentVersion, latest: lastKnownGoodVersion }),
  );
  await assert.rejects(
    execute(
      process.execPath,
      [
        new URL("../../scripts/exercise-dist-tags.mjs", import.meta.url)
          .pathname,
        "--package",
        "@terminalzero/lemonsqueezy",
        "--current-version",
        currentVersion,
        "--last-known-good-version",
        lastKnownGoodVersion,
        "--source-commit",
        sourceCommit,
        "--artifact-sha256",
        artifactSha256,
        "--registry-release-run-id",
        registryReleaseRunId,
        "--npm-actor",
        npmActor,
        "--account-recovery-confirmed",
        "--npm-command",
        npmPath,
        "--npm-userconfig",
        npmUserconfig,
        "--evidence",
        failedEvidencePath,
      ],
      {
        env: {
          ...process.env,
          FAKE_NPM_FAIL_MARKER: join(evidenceDirectory, "failed-once"),
          FAKE_NPM_FAIL_SPEC: `@terminalzero/lemonsqueezy@${lastKnownGoodVersion}`,
          FAKE_NPM_LOG: logPath,
          FAKE_NPM_STATE: statePath,
        },
      },
    ),
  );
  assert.deepEqual(JSON.parse(await readFile(statePath)), {
    beta: currentVersion,
    latest: currentVersion,
  });
  const failedEvidence = JSON.parse(await readFile(failedEvidencePath));
  assert.equal(failedEvidence.status, "failed");
  assert.equal(failedEvidence.states.at(-1).phase, "restored-after-failure");

  const resumeArgs = [
    new URL("../../scripts/exercise-dist-tags.mjs", import.meta.url).pathname,
    "--package",
    "@terminalzero/lemonsqueezy",
    "--current-version",
    currentVersion,
    "--last-known-good-version",
    lastKnownGoodVersion,
    "--source-commit",
    sourceCommit,
    "--artifact-sha256",
    artifactSha256,
    "--registry-release-run-id",
    registryReleaseRunId,
    "--npm-actor",
    npmActor,
    "--account-recovery-confirmed",
    "--npm-command",
    npmPath,
    "--npm-userconfig",
    npmUserconfig,
    "--resume-evidence",
    failedEvidencePath,
    "--evidence",
    failedEvidencePath,
  ];
  const archivePathFor = (source) =>
    join(
      evidenceDirectory,
      `dist-tag-interactive-failed-${registryReleaseRunId}-${createHash("sha256").update(source).digest("hex")}.json`,
    );

  const firstFailedSource = await readFile(failedEvidencePath, "utf8");
  await assert.rejects(
    execute(process.execPath, resumeArgs, {
      env: {
        ...process.env,
        FAKE_NPM_FAIL_MARKER: join(evidenceDirectory, "resume-failed-once"),
        FAKE_NPM_FAIL_SPEC: `@terminalzero/lemonsqueezy@${lastKnownGoodVersion}`,
        FAKE_NPM_LOG: logPath,
        FAKE_NPM_STATE: statePath,
      },
    }),
  );
  assert.equal(
    await readFile(archivePathFor(firstFailedSource), "utf8"),
    firstFailedSource,
  );

  const secondFailedSource = await readFile(failedEvidencePath, "utf8");
  await assert.rejects(
    execute(process.execPath, resumeArgs, {
      env: {
        ...process.env,
        FAKE_NPM_FAIL_MARKER: join(evidenceDirectory, "resume-failed-twice"),
        FAKE_NPM_FAIL_SPEC: `@terminalzero/lemonsqueezy@${lastKnownGoodVersion}`,
        FAKE_NPM_LOG: logPath,
        FAKE_NPM_STATE: statePath,
      },
    }),
  );
  assert.equal(
    await readFile(archivePathFor(firstFailedSource), "utf8"),
    firstFailedSource,
  );
  assert.equal(
    await readFile(archivePathFor(secondFailedSource), "utf8"),
    secondFailedSource,
  );

  const thirdFailedSource = await readFile(failedEvidencePath, "utf8");
  await execute(process.execPath, resumeArgs, {
    env: {
      ...process.env,
      FAKE_NPM_LOG: logPath,
      FAKE_NPM_STATE: statePath,
    },
  });
  assert.equal(
    await readFile(archivePathFor(thirdFailedSource), "utf8"),
    thirdFailedSource,
  );
  const resumedEvidence = JSON.parse(await readFile(failedEvidencePath));
  assert.equal(resumedEvidence.status, "completed");
  assert.deepEqual(
    resumedEvidence.states.map(({ phase, beta, latest }) => ({
      phase,
      beta,
      latest,
    })),
    [
      {
        phase: "published",
        beta: currentVersion,
        latest: lastKnownGoodVersion,
      },
      { phase: "promoted", beta: currentVersion, latest: currentVersion },
      {
        phase: "rolled-back",
        beta: lastKnownGoodVersion,
        latest: lastKnownGoodVersion,
      },
      { phase: "restored", beta: currentVersion, latest: currentVersion },
    ],
  );

  for (const [option, value, message] of [
    ["--tag-read-attempts", "121", /must be at most 120/],
    ["--tag-read-delay-ms", "10001", /must be at most 10000/],
  ]) {
    await assert.rejects(
      execute(process.execPath, [...resumeArgs, option, value]),
      message,
    );
  }
  assert.deepEqual(
    resumedEvidence.timeline.map(({ tag, version }) => ({ tag, version })),
    [
      { tag: "latest", version: currentVersion },
      { tag: "latest", version: lastKnownGoodVersion },
      { tag: "beta", version: lastKnownGoodVersion },
      { tag: "beta", version: currentVersion },
      { tag: "latest", version: currentVersion },
    ],
  );

  const firstArchivePath = archivePathFor(firstFailedSource);
  const validateArchiveArgs = [
    new URL(
      "../../scripts/validate-failed-dist-tag-evidence.mjs",
      import.meta.url,
    ).pathname,
    "--evidence",
    firstArchivePath,
    "--package",
    "@terminalzero/lemonsqueezy",
    "--current-version",
    currentVersion,
    "--last-known-good-version",
    lastKnownGoodVersion,
    "--source-commit",
    sourceCommit,
    "--artifact-sha256",
    artifactSha256,
    "--registry-release-run-id",
    registryReleaseRunId,
    "--npm-actor",
    npmActor,
  ];
  await execute(process.execPath, validateArchiveArgs);
  await writeFile(firstArchivePath, `${firstFailedSource}\n`);
  await assert.rejects(
    execute(process.execPath, validateArchiveArgs),
    /filename must match its SHA-256/,
  );

  await writeFile(
    statePath,
    JSON.stringify({ beta: currentVersion, latest: lastKnownGoodVersion }),
  );
  const signalEvidencePath = join(evidenceDirectory, "signal.json");
  await assert.rejects(
    execute(
      process.execPath,
      [
        new URL("../../scripts/exercise-dist-tags.mjs", import.meta.url)
          .pathname,
        "--package",
        "@terminalzero/lemonsqueezy",
        "--current-version",
        currentVersion,
        "--last-known-good-version",
        lastKnownGoodVersion,
        "--source-commit",
        sourceCommit,
        "--artifact-sha256",
        artifactSha256,
        "--registry-release-run-id",
        registryReleaseRunId,
        "--npm-actor",
        npmActor,
        "--account-recovery-confirmed",
        "--npm-command",
        npmPath,
        "--npm-userconfig",
        npmUserconfig,
        "--evidence",
        signalEvidencePath,
      ],
      {
        env: {
          ...process.env,
          FAKE_NPM_LOG: logPath,
          FAKE_NPM_SIGNAL_MARKER: join(evidenceDirectory, "signalled-once"),
          FAKE_NPM_SIGNAL_SPEC: `@terminalzero/lemonsqueezy@${lastKnownGoodVersion}`,
          FAKE_NPM_STATE: statePath,
        },
      },
    ),
    /interrupted by SIGINT/,
  );
  assert.deepEqual(JSON.parse(await readFile(statePath)), {
    beta: currentVersion,
    latest: currentVersion,
  });
  const signalEvidence = JSON.parse(await readFile(signalEvidencePath));
  assert.equal(signalEvidence.status, "failed");
  assert.equal(signalEvidence.states.at(-1).phase, "restored-after-failure");

  const server = createServer((request, response) => {
    response.setHeader("content-type", "application/json");
    if (request.url === "/-/package/%40terminalzero%2Flemonsqueezy/dist-tags") {
      response.end(
        JSON.stringify({ beta: currentVersion, latest: currentVersion }),
      );
      return;
    }
    if (request.url === "/%40terminalzero%2Flemonsqueezy") {
      response.end(JSON.stringify({ maintainers: [{ name: npmActor }] }));
      return;
    }
    if (
      request.url ===
      "/repos/terminalzero-dev/lemonsqueezy.js/issues/comments/123456"
    ) {
      response.end(
        JSON.stringify({
          id: 123456,
          html_url:
            "https://github.com/terminalzero-dev/lemonsqueezy.js/issues/35#issuecomment-123456",
          issue_url: `${origin}/repos/terminalzero-dev/lemonsqueezy.js/issues/35`,
          user: { login: "release-maintainer" },
          body: `Interactive dist-tag evidence\n\n\`\`\`json\n${JSON.stringify(evidence)}\n\`\`\``,
        }),
      );
      return;
    }
    if (
      request.url ===
      `/repos/terminalzero-dev/lemonsqueezy.js/actions/runs/${registryReleaseRunId}`
    ) {
      response.end(
        JSON.stringify({
          id: Number(registryReleaseRunId),
          name: "Registry Release",
          path: ".github/workflows/registry-release.yml",
          event: "workflow_dispatch",
          conclusion: "success",
          head_sha: sourceCommit,
          head_branch: "release/v5-beta",
        }),
      );
      return;
    }
    if (
      request.url ===
      `/repos/terminalzero-dev/lemonsqueezy.js/actions/runs/${registryReleaseRunId}/artifacts`
    ) {
      response.end(
        JSON.stringify({
          artifacts: [
            {
              name: `registry-release-verified-${currentVersion}-${artifactSha256}`,
              expired: false,
            },
          ],
        }),
      );
      return;
    }
    response.statusCode = 404;
    response.end(JSON.stringify({ error: "not found" }));
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const origin = `http://127.0.0.1:${server.address().port}`;

  try {
    await execute(process.execPath, [
      new URL("../../scripts/verify-dist-tag-evidence.mjs", import.meta.url)
        .pathname,
      "--comment-id",
      "123456",
      "--issue",
      "35",
      "--expected-author",
      "release-maintainer",
      "--package",
      "@terminalzero/lemonsqueezy",
      "--current-version",
      currentVersion,
      "--last-known-good-version",
      lastKnownGoodVersion,
      "--source-commit",
      sourceCommit,
      "--artifact-sha256",
      artifactSha256,
      "--repository",
      "terminalzero-dev/lemonsqueezy.js",
      "--registry",
      origin,
      "--github-api",
      origin,
      "--output",
      join(evidenceDirectory, "verified.json"),
    ]);
  } finally {
    server.close();
    await once(server, "close");
  }
  const verified = JSON.parse(
    await readFile(join(evidenceDirectory, "verified.json")),
  );
  assert.equal(verified.github.commentId, "123456");
  assert.equal(verified.github.author, "release-maintainer");
  assert.equal(verified.verifiedRegistryReleaseRunId, registryReleaseRunId);
  assert.deepEqual(verified.verifiedTags, {
    beta: currentVersion,
    latest: currentVersion,
  });
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

void test("release wizard retries a transient read before continuing", async () => {
  const fixtureDirectory = await mkdtemp(join(tmpdir(), "release-retry-"));
  const commandPath = join(fixtureDirectory, "transient-read.sh");
  const markerPath = join(fixtureDirectory, "attempted");

  await writeFile(
    commandPath,
    `#!/usr/bin/env bash
set -euo pipefail
if [[ ! -f "$RETRY_MARKER" ]]; then
  touch "$RETRY_MARKER"
  printf '%s' partial
  printf '%s\n' 'Get "https://api.github.com/example": EOF' >&2
  exit 1
fi
printf '%s\n' success
`,
  );
  await chmod(commandPath, 0o755);

  const { stdout, stderr } = await execute(
    "bash",
    [
      "-c",
      'source "$1"; retry_command 3 "$2"',
      "release-retry-test",
      new URL("../../scripts/lib/retry-command.sh", import.meta.url).pathname,
      commandPath,
    ],
    {
      env: {
        ...process.env,
        RETRY_DELAY_SECONDS: "0",
        RETRY_MARKER: markerPath,
      },
    },
  );

  assert.equal(stdout, "success\n");
  assert.match(stderr, /Retrying read-only command \(2\/3\)/);
});

void test("protected release dispatch accepts Candidate ancestors and rejects unrelated commits", async () => {
  const repository = await mkdtemp(
    join(tmpdir(), "lemonsqueezy-release-dispatch-"),
  );
  const markerPath = join(repository, "release.txt");
  const verifierPath = new URL(
    "../../scripts/verify-release-dispatch.sh",
    import.meta.url,
  ).pathname;
  const git = (...args) => execute("git", args, { cwd: repository });

  await git("init", "--initial-branch=release/v5-beta");
  await git("config", "user.name", "Release Test");
  await git("config", "user.email", "release@example.com");
  await writeFile(markerPath, "candidate\n");
  await git("add", "release.txt");
  await git("commit", "-m", "candidate");
  const candidate = (await git("rev-parse", "HEAD")).stdout.trim();

  await git("switch", "-c", "unrelated");
  await writeFile(markerPath, "unrelated\n");
  await git("commit", "-am", "unrelated");
  const unrelated = (await git("rev-parse", "HEAD")).stdout.trim();

  await git("switch", "release/v5-beta");
  await writeFile(markerPath, "dispatch\n");
  await git("commit", "-am", "dispatch tooling fix");
  const dispatch = (await git("rev-parse", "HEAD")).stdout.trim();

  await execute(
    "bash",
    [verifierPath, dispatch, dispatch, "false", "refs/heads/main"],
    { cwd: repository },
  );
  await assert.rejects(
    execute(
      "bash",
      [
        verifierPath,
        candidate,
        dispatch,
        "false",
        "refs/heads/release/v5-beta",
      ],
      { cwd: repository },
    ),
    /Fresh publication must be dispatched from the exact Candidate commit/,
  );
  await execute(
    "bash",
    [verifierPath, candidate, dispatch, "true", "refs/heads/release/v5-beta"],
    {
      cwd: repository,
    },
  );
  await assert.rejects(
    execute(
      "bash",
      [verifierPath, candidate, dispatch, "true", "refs/heads/main"],
      { cwd: repository },
    ),
    /Candidate recovery must use the protected release branch/,
  );
  await assert.rejects(
    execute(
      "bash",
      [verifierPath, unrelated, dispatch, "true", "refs/heads/release/v5-beta"],
      { cwd: repository },
    ),
    /Candidate must be an ancestor of the protected dispatch commit/,
  );
  await assert.rejects(
    execute(
      "bash",
      [
        verifierPath,
        candidate,
        unrelated,
        "true",
        "refs/heads/release/v5-beta",
      ],
      { cwd: repository },
    ),
    /HEAD must match the protected dispatch commit/,
  );
});

void test("recurring beta OIDC release remains Candidate-bound and recoverable", () => {
  const workflow = readRootText(".github/workflows/registry-release.yml");
  const wizard = readRootText("scripts/release-dist-tags-wizard.sh");
  const recurringOperations = readRootText(
    "docs/release/recurring-beta-operations.md",
  );

  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /candidate_run_id:/);
  assert.match(workflow, /expected_version:/);
  assert.match(workflow, /expected_commit:/);
  assert.match(workflow, /expected_sha256:/);
  assert.match(workflow, /last_known_good_version:/);
  assert.match(workflow, /dist_tag_evidence_issue_number:/);
  assert.match(workflow, /dist_tag_evidence_comment_id:/);
  assert.match(workflow, /group: v5-release/);
  assert.match(workflow, /cancel-in-progress: false/);
  assert.match(workflow, /github\.actor == vars\.RELEASE_MAINTAINER/);
  assert.match(workflow, /verify-release-dispatch\.sh/);
  assert.match(workflow, /fetch-depth: 0/);
  assert.match(workflow, /environment: npm-release/);
  assert.match(
    workflow,
    /stage:[\s\S]*permissions:\n\s+actions: read\n\s+contents: read/,
  );
  assert.match(
    workflow,
    /publish:[\s\S]*needs: stage[\s\S]*environment: npm-release[\s\S]*permissions:\n\s+contents: read\n\s+id-token: write/,
  );
  assert.doesNotMatch(
    workflow.match(/publish:[\s\S]*?\n  verify:/)?.[0] ?? "",
    /actions: read|contents: write/,
  );
  assert.match(
    workflow,
    /verify:[\s\S]*needs: publish[\s\S]*permissions:\n\s+actions: read\n\s+contents: read/,
  );
  assert.match(
    workflow,
    /manual_evidence:[\s\S]*needs: verify[\s\S]*issues: read/,
  );
  assert.match(
    workflow,
    /tag:[\s\S]*needs: manual_evidence[\s\S]*permissions:\n\s+contents: read/,
  );
  assert.match(
    workflow,
    /finalize:[\s\S]*needs: tag[\s\S]*permissions:\n\s+actions: read\n\s+contents: read/,
  );
  assert.match(workflow, /contents: write/);
  assert.match(workflow, /run-id: \$\{\{ inputs\.candidate_run_id \}\}/);
  assert.match(workflow, /github-token: \$\{\{ github\.token \}\}/);
  assert.match(workflow, /verify-registry-release\.mjs/);
  assert.match(workflow, /verify-release-candidate\.mjs/);
  assert.match(
    workflow,
    /pnpm publish "\$tarball" --tag beta --access public --provenance --no-git-checks/,
  );
  assert.match(workflow, /npm audit signatures --json --include-attestations/);
  assert.match(workflow, /verify-dist-tag-evidence\.mjs/);
  assert.match(workflow, /--issue "\$DIST_TAG_EVIDENCE_ISSUE_NUMBER"/);
  assert.match(
    workflow,
    /DIST_TAG_EVIDENCE_ISSUE_NUMBER: \$\{\{ inputs\.dist_tag_evidence_issue_number \}\}/,
  );
  assert.match(workflow, /--expected-beta-version "\$EXPECTED_VERSION"/);
  assert.match(
    workflow,
    /--expected-latest-version "\$EXPECTED_LATEST_VERSION"/,
  );
  assert.match(workflow, /dist-tag-interactive-evidence\.json/);
  assert.doesNotMatch(
    workflow,
    /exercise-dist-tags\.mjs|oidc\/token\/exchange/,
  );
  assert.match(workflow, /inputs\.resume_published == true/);
  assert.match(
    workflow,
    /inputs\.resume_published == true &&\s+inputs\.dist_tag_evidence_comment_id != ''/,
  );
  assert.match(
    workflow,
    /inputs\.resume_published &&\s*inputs\.dist_tag_evidence_comment_id != '' &&\s*inputs\.expected_version \|\| inputs\.last_known_good_version/,
  );
  assert.match(wizard, /REGISTRY_RELEASE_RUN_ID/);
  assert.match(wizard, /registry-release-verified-/);
  assert.match(wizard, /NPM_CONFIG_USERCONFIG="\$WIZARD_TEMP\/npmrc"/);
  assert.match(wizard, /npm login --auth-type=web --registry="\$REGISTRY_URL"/);
  assert.match(wizard, /https:\/\/registry\.npmjs\.org\//);
  assert.match(wizard, /\.artifacts\/manual-dist-tag/);
  assert.match(
    wizard,
    /dist-tag-interactive-failed-"\$REGISTRY_RELEASE_RUN_ID"-\*\.json/,
  );
  assert.match(wizard, /DRILL_RESUME_ARGS=\(--resume-evidence/);
  assert.match(wizard, /Prior failed attempt retained for recovery audit/);
  assert.match(wizard, /validate-failed-dist-tag-evidence\.mjs/);
  assert.match(
    wizard,
    /cat "\$BODY_PATH"[\s\S]*confirm "Post this complete evidence chain to Issue #\$RELEASE_ISSUE_NUMBER\?"/,
  );
  assert.match(wizard, /issues\/\$RELEASE_ISSUE_NUMBER\/comments/);
  assert.match(
    wizard,
    /dist_tag_evidence_issue_number="\$RELEASE_ISSUE_NUMBER"/,
  );
  assert.match(
    wizard,
    /EXPECTED_ARTIFACT_NAME="release-candidate-\$CURRENT_VERSION-\$RUN_COMMIT"/,
  );
  assert.doesNotMatch(wizard, /5\.0\.0-beta\.[12]|Issue #35/);
  assert.match(
    wizard,
    /wait_for_public_tags "\$CURRENT_VERSION" "\$LAST_KNOWN_GOOD_VERSION"/,
  );
  assert.match(
    wizard,
    /wait_for_public_tags "\$CURRENT_VERSION" "\$CURRENT_VERSION"/,
  );
  assert.match(wizard, /source "\$ROOT\/scripts\/lib\/retry-command\.sh"/);
  assert.match(
    wizard,
    /ARTIFACTS=\$\(retry_command 3 gh api[\s\S]*actions\/runs\/\$CANDIDATE_RUN_ID\/artifacts/,
  );
  assert.match(
    wizard,
    /git merge-base --is-ancestor "\$SOURCE_COMMIT" origin\/release\/v5-beta/,
  );
  assert.match(
    wizard,
    /git merge-base --is-ancestor "\$SOURCE_COMMIT" "\$REGISTRY_RUN_COMMIT"/,
  );
  assert.match(workflow, /PACKAGE_SMOKE_SPEC/);
  assert.match(
    workflow,
    /PACKAGE_SMOKE_SPEC: "\$\{\{ inputs\.expected_version \}\}"/,
  );
  assert.doesNotMatch(
    workflow,
    /PACKAGE_SMOKE_SPEC: "@terminalzero\/lemonsqueezy@/,
  );
  assert.match(workflow, /PACKAGE_SMOKE_EXPECTED_VERSION/);
  assert.match(workflow, /run: pnpm test:package/);
  assert.match(workflow, /gh release create/);
  assert.equal(
    workflow.includes(
      'release_notes="docs/release/${release_suffix//./-}-release-notes.md"',
    ),
    true,
  );
  assert.doesNotMatch(workflow, /beta-2-release-notes\.md/);
  assert.match(workflow, /expected_notes=\$\(cat "\$release_notes"\)/);
  assert.match(
    workflow,
    /test "\$\(printf '%s' "\$release" \| jq -r \.body\)" = "\$expected_notes"/,
  );
  assert.match(recurringOperations, /Stable Readiness/);
  assert.match(recurringOperations, /reset.*unchanged.*soak/is);
  assert.match(workflow, /Create or verify the protected release tag/);
  assert.match(workflow, /git push origin/);
  assert.match(
    workflow,
    /if existing_tag_ref=\$\(gh api[\s\S]*tag_ref=\$existing_tag_ref[\s\S]*fi/,
  );
  assert.doesNotMatch(
    workflow,
    /git\/ref\/tags\/\$tag" 2>\/dev\/null \|\| true/,
  );
  assert.match(workflow, /actions\/create-github-app-token@[0-9a-f]{40}/);
  assert.match(workflow, /RELEASE_GITHUB_APP_PRIVATE_KEY/);
  assert.match(workflow, /RELEASE_GITHUB_APP_CLIENT_ID/);
  assert.match(workflow, /permission-contents: write/);
  assert.match(workflow, /permission-workflows: write/);
  assert.match(workflow, /permission-metadata: read/);
  assert.match(workflow, /owner: \$\{\{ github\.repository_owner \}\}/);
  assert.match(workflow, /steps\.audit-token\.outputs\.token/);
  assert.match(workflow, /steps\.audit-token\.outputs\.installation-id/);
  assert.match(workflow, /steps\.audit-token\.outputs\.app-slug/);
  assert.match(workflow, /verify-release-installation\.mjs/);
  assert.match(workflow, /persist-credentials: true/);
  assert.match(
    workflow,
    /Checkout with the repository-only release identity[\s\S]*ref: \$\{\{ inputs\.expected_commit \}\}/,
  );
  const finalizeWorkflow = workflow.slice(workflow.indexOf("\n  finalize:"));
  assert.match(
    finalizeWorkflow,
    /Mint the repository-only Release identity[\s\S]*permission-contents: write[\s\S]*permission-workflows: write/,
  );
  assert.doesNotMatch(finalizeWorkflow, /GH_TOKEN: \$\{\{ github\.token \}\}/);
  assert.match(
    finalizeWorkflow,
    /GH_TOKEN: \$\{\{ steps\.release-token\.outputs\.token \}\}/,
  );
  assert.equal(workflow.match(/RELEASE_GITHUB_APP_PRIVATE_KEY/g)?.length, 5);
  assert.equal(
    workflow.match(/actions\/create-github-app-token@[0-9a-f]{40}/g)?.length,
    3,
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
  assert.match(workflow, /--provenance-evidence/);
  assert.doesNotMatch(
    workflow,
    /NPM_TOKEN|NODE_AUTH_TOKEN|_authToken|pull_request_target/,
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
      permissions: {
        contents: "write",
        metadata: "read",
        workflows: "write",
      },
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
    permissions: {
      contents: "write",
      metadata: "read",
      workflows: "write",
    },
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
          permissions: {
            contents: "write",
            metadata: "read",
            workflows: "write",
          },
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
  assert.match(bootstrap, /latest.*current recommended release/is);
  assert.match(bootstrap, /latest.*beta.*same exact verified version/is);
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

void test("beta.2 records recoverable release and Stable Readiness evidence", () => {
  const operations = readRootText("docs/release/beta-2-operations.md");
  const notes = readRootText("docs/release/beta-2-release-notes.md");

  assert.match(operations, /publish succeeded.*finalization failed/is);
  assert.match(operations, /deprecat/i);
  assert.match(operations, /unpublish policy/i);
  assert.match(operations, /first Stable.*without.*Last Known Good/is);
  assert.match(operations, /resume_published/);
  assert.match(operations, /never\s+republish/i);
  assert.match(operations, /latest.*beta.*5\.0\.0-beta\.1/is);
  assert.match(operations, /latest.*beta.*5\.0\.0-beta\.2/is);
  assert.match(operations, /dist-tag-interactive-evidence\.json/);
  assert.match(operations, /npm login --auth-type=web/);
  assert.match(operations, /provenance-audit\.json/);
  assert.match(operations, /account recovery/i);
  assert.doesNotMatch(operations, /NPM_TOKEN|NODE_AUTH_TOKEN|recovery code:/i);

  assert.match(notes, /Migration impact: (?:Additive|Behavior correction)/);
  assert.match(notes, /5\.0\.0-beta\.1/);
  assert.match(notes, /OIDC\s+Trusted\s+Publishing/);
  assert.match(notes, /latest.*beta/is);
});

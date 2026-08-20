import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { parseArgs } from "node:util";

const { values } = parseArgs({
  options: {
    package: { type: "string" },
    "current-version": { type: "string" },
    "last-known-good-version": { type: "string" },
    "source-commit": { type: "string" },
    "artifact-sha256": { type: "string" },
    "registry-release-run-id": { type: "string" },
    "npm-actor": { type: "string" },
    "account-recovery-confirmed": { type: "boolean", default: false },
    registry: {
      type: "string",
      default: "https://registry.npmjs.org/",
    },
    evidence: { type: "string" },
    "npm-command": { type: "string", default: "npm" },
    "npm-userconfig": { type: "string" },
  },
  strict: true,
});

for (const name of [
  "package",
  "current-version",
  "last-known-good-version",
  "source-commit",
  "artifact-sha256",
  "registry-release-run-id",
  "npm-actor",
  "evidence",
  "npm-userconfig",
]) {
  assert.ok(values[name]?.trim(), `Missing --${name}`);
}
assert.notEqual(values["current-version"], values["last-known-good-version"]);
assert.match(values["source-commit"], /^[0-9a-f]{40}$/);
assert.match(values["artifact-sha256"], /^[0-9a-f]{64}$/);
assert.match(values["registry-release-run-id"], /^[1-9][0-9]*$/);
assert.match(values["npm-actor"], /^[A-Za-z0-9_-]+$/);
assert.equal(
  values["account-recovery-confirmed"],
  true,
  "Account recovery availability must be confirmed without recording recovery material",
);
assert.equal(process.env.NPM_TOKEN, undefined, "NPM_TOKEN is not allowed");
assert.equal(
  process.env.NODE_AUTH_TOKEN,
  undefined,
  "NODE_AUTH_TOKEN is not allowed",
);
const registry = new URL(values.registry);
assert.equal(
  registry.origin,
  "https://registry.npmjs.org",
  "dist-tag drill is pinned to the public npm registry",
);
assert.equal(registry.pathname, "/");

const states = [];
const timeline = [];
const accountRecoveryAt = new Date().toISOString();
let mutationStarted = false;
let interruptedSignal;
let recovering = false;
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    interruptedSignal ??= signal;
  });
}

try {
  await recordState("published", {
    beta: values["current-version"],
    latest: values["last-known-good-version"],
  });

  mutationStarted = true;
  await setTag("latest", values["current-version"]);
  await recordState("promoted", {
    beta: values["current-version"],
    latest: values["current-version"],
  });

  await setTag("latest", values["last-known-good-version"]);
  await setTag("beta", values["last-known-good-version"]);
  await recordState("rolled-back", {
    beta: values["last-known-good-version"],
    latest: values["last-known-good-version"],
  });

  await setTag("beta", values["current-version"]);
  await setTag("latest", values["current-version"]);
  await recordState("restored", {
    beta: values["current-version"],
    latest: values["current-version"],
  });
} catch (error) {
  recovering = true;
  if (mutationStarted) {
    try {
      await restoreCurrent();
      await recordState("restored-after-failure", {
        beta: values["current-version"],
        latest: values["current-version"],
      });
    } catch (recoveryError) {
      await writeEvidence("failed");
      throw new AggregateError(
        [error, recoveryError],
        "dist-tag drill failed and automatic restore also failed",
      );
    }
  }
  await writeEvidence("failed");
  throw error;
}

await writeEvidence("completed");
console.log(`Exercised and restored ${values.package} dist-tags.`);

async function writeEvidence(status) {
  const evidence = {
    schemaVersion: 1,
    status,
    package: values.package,
    currentVersion: values["current-version"],
    lastKnownGoodVersion: values["last-known-good-version"],
    sourceCommit: values["source-commit"],
    artifactSha256: values["artifact-sha256"],
    registryReleaseRunId: values["registry-release-run-id"],
    npmActor: values["npm-actor"],
    auth: "interactive-npm-cli-2fa",
    accountRecovery: {
      confirmed: true,
      at: accountRecoveryAt,
    },
    states,
    timeline,
  };
  await mkdir(dirname(values.evidence), { recursive: true });
  await writeFile(values.evidence, `${JSON.stringify(evidence, null, 2)}\n`);
}

function runNpm(args, stdio) {
  throwIfInterrupted();
  const result = spawnSync(values["npm-command"], args, {
    encoding: "utf8",
    env: {
      ...process.env,
      NPM_CONFIG_USERCONFIG: values["npm-userconfig"],
    },
    stdio,
  });
  interruptedSignal ??=
    result.signal ??
    (result.status === 130
      ? "SIGINT"
      : result.status === 143
        ? "SIGTERM"
        : undefined);
  throwIfInterrupted();
  assert.equal(
    result.status,
    0,
    `npm ${args.slice(0, 2).join(" ")} failed${result.stderr ? `: ${result.stderr.trim()}` : ""}`,
  );
  return result.stdout;
}

function throwIfInterrupted() {
  if (interruptedSignal && !recovering) {
    throw new Error(`dist-tag drill interrupted by ${interruptedSignal}`);
  }
}

async function readTags() {
  const stdout = runNpm(
    [
      "view",
      values.package,
      "dist-tags",
      "--json",
      `--registry=${values.registry}`,
    ],
    ["ignore", "pipe", "pipe"],
  );
  return JSON.parse(stdout);
}

async function setTag(tag, version) {
  runNpm(
    [
      "dist-tag",
      "add",
      `${values.package}@${version}`,
      tag,
      `--registry=${values.registry}`,
    ],
    "inherit",
  );
  timeline.push({ tag, version, at: new Date().toISOString() });
}

async function recordState(phase, expected) {
  const actual = recommendedTags(await readTags());
  assert.deepEqual(actual, expected, `${phase} dist-tags do not match`);
  states.push({ phase, ...actual, at: new Date().toISOString() });
}

async function restoreCurrent() {
  await setTag("beta", values["current-version"]);
  await setTag("latest", values["current-version"]);
  const restored = recommendedTags(await readTags());
  assert.deepEqual(restored, {
    beta: values["current-version"],
    latest: values["current-version"],
  });
}

function recommendedTags(tags) {
  return { beta: tags.beta, latest: tags.latest };
}

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { parseArgs } from "node:util";
import {
  preserveFailedDistTagEvidence,
  readFailedDistTagEvidence,
} from "./lib/dist-tag-evidence.mjs";

const MAX_TAG_READ_ATTEMPTS = 120;
const MAX_TAG_READ_DELAY_MS = 10_000;

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
    "resume-evidence": { type: "string" },
    "tag-read-attempts": { type: "string", default: "30" },
    "tag-read-delay-ms": { type: "string", default: "3000" },
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
assert.match(values["tag-read-attempts"], /^[1-9][0-9]*$/);
assert.match(values["tag-read-delay-ms"], /^(?:0|[1-9][0-9]*)$/);
const tagReadAttempts = Number(values["tag-read-attempts"]);
const tagReadDelayMs = Number(values["tag-read-delay-ms"]);
assert.ok(
  Number.isSafeInteger(tagReadAttempts) &&
    tagReadAttempts <= MAX_TAG_READ_ATTEMPTS,
  `--tag-read-attempts must be at most ${MAX_TAG_READ_ATTEMPTS}`,
);
assert.ok(
  Number.isSafeInteger(tagReadDelayMs) &&
    tagReadDelayMs <= MAX_TAG_READ_DELAY_MS,
  `--tag-read-delay-ms must be at most ${MAX_TAG_READ_DELAY_MS}`,
);
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
const resumeEvidence = values["resume-evidence"]
  ? await readFailedDistTagEvidence(values["resume-evidence"], {
      package: values.package,
      currentVersion: values["current-version"],
      lastKnownGoodVersion: values["last-known-good-version"],
      sourceCommit: values["source-commit"],
      artifactSha256: values["artifact-sha256"],
      registryReleaseRunId: values["registry-release-run-id"],
      npmActor: values["npm-actor"],
    })
  : undefined;
if (resumeEvidence) {
  await preserveFailedDistTagEvidence(
    resumeEvidence.source,
    values.evidence,
    values["registry-release-run-id"],
  );
}
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
  if (resumeEvidence) {
    states.push(resumeEvidence.evidence.states[0]);
    timeline.push(resumeEvidence.evidence.timeline[0]);
    await recordState("promoted", {
      beta: values["current-version"],
      latest: values["current-version"],
    });
    mutationStarted = true;
  } else {
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
  }

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
      "--prefer-online",
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
  const actual = await waitForTags(expected, `${phase} dist-tags do not match`);
  states.push({ phase, ...actual, at: new Date().toISOString() });
}

async function restoreCurrent() {
  await setTag("beta", values["current-version"]);
  await setTag("latest", values["current-version"]);
  await waitForTags(
    {
      beta: values["current-version"],
      latest: values["current-version"],
    },
    "restored dist-tags do not match",
  );
}

async function waitForTags(expected, message) {
  let actual;
  for (let attempt = 1; attempt <= tagReadAttempts; attempt += 1) {
    actual = recommendedTags(await readTags());
    if (actual.beta === expected.beta && actual.latest === expected.latest) {
      return actual;
    }
    if (attempt < tagReadAttempts) {
      console.warn(
        `Waiting for public npm dist-tags to converge (${attempt}/${tagReadAttempts})...`,
      );
      await new Promise((resolve) => setTimeout(resolve, tagReadDelayMs));
      throwIfInterrupted();
    }
  }
  assert.deepEqual(actual, expected, message);
}

function recommendedTags(tags) {
  return { beta: tags.beta, latest: tags.latest };
}

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";

const TOP_LEVEL_KEYS = [
  "accountRecovery",
  "artifactSha256",
  "auth",
  "currentVersion",
  "lastKnownGoodVersion",
  "npmActor",
  "package",
  "registryReleaseRunId",
  "schemaVersion",
  "sourceCommit",
  "states",
  "status",
  "timeline",
];
const STATE_KEYS = ["at", "beta", "latest", "phase"];
const EVENT_KEYS = ["at", "tag", "version"];
const FAILED_PHASES = new Set([
  "published",
  "promoted",
  "rolled-back",
  "restored",
  "restored-after-failure",
]);

export async function readFailedDistTagEvidence(path, expected) {
  const source = await readFile(path, "utf8");
  const evidence = JSON.parse(source);
  assertExactKeys(evidence, TOP_LEVEL_KEYS, "failed evidence");
  assert.equal(evidence.schemaVersion, 1);
  assert.equal(evidence.status, "failed");
  assert.equal(evidence.package, expected.package);
  assert.equal(evidence.currentVersion, expected.currentVersion);
  assert.equal(evidence.lastKnownGoodVersion, expected.lastKnownGoodVersion);
  assert.equal(evidence.sourceCommit, expected.sourceCommit);
  assert.equal(evidence.artifactSha256, expected.artifactSha256);
  assert.equal(evidence.registryReleaseRunId, expected.registryReleaseRunId);
  assert.equal(evidence.npmActor, expected.npmActor);
  assert.equal(evidence.auth, "interactive-npm-cli-2fa");
  assertExactKeys(
    evidence.accountRecovery,
    ["at", "confirmed"],
    "account recovery evidence",
  );
  assert.equal(evidence.accountRecovery.confirmed, true);
  assertIso(evidence.accountRecovery.at);

  assert.ok(Array.isArray(evidence.states) && evidence.states.length > 0);
  for (const state of evidence.states) {
    assertExactKeys(state, STATE_KEYS, "failed evidence state");
    assert.ok(FAILED_PHASES.has(state.phase));
    assertVersion(state.beta, expected);
    assertVersion(state.latest, expected);
    assertIso(state.at);
  }
  assert.deepEqual(select(evidence.states[0], ["phase", "beta", "latest"]), {
    phase: "published",
    beta: expected.currentVersion,
    latest: expected.lastKnownGoodVersion,
  });

  assert.ok(Array.isArray(evidence.timeline) && evidence.timeline.length > 0);
  for (const event of evidence.timeline) {
    assertExactKeys(event, EVENT_KEYS, "failed evidence event");
    assert.ok(event.tag === "beta" || event.tag === "latest");
    assertVersion(event.version, expected);
    assertIso(event.at);
  }
  assert.deepEqual(select(evidence.timeline[0], ["tag", "version"]), {
    tag: "latest",
    version: expected.currentVersion,
  });
  return { evidence, source };
}

export async function preserveFailedDistTagEvidence(
  source,
  evidencePath,
  registryReleaseRunId,
) {
  const archivePath = failedEvidenceArchivePath(
    source,
    evidencePath,
    registryReleaseRunId,
  );
  await mkdir(dirname(archivePath), { recursive: true });
  try {
    await writeFile(archivePath, source, { flag: "wx" });
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
    assert.equal(
      await readFile(archivePath, "utf8"),
      source,
      "Archived failed evidence must be immutable",
    );
  }
  return archivePath;
}

export async function validateFailedDistTagEvidenceArchive(path, expected) {
  const result = await readFailedDistTagEvidence(path, expected);
  assert.equal(
    basename(path),
    basename(
      failedEvidenceArchivePath(
        result.source,
        path,
        expected.registryReleaseRunId,
      ),
    ),
    "Archived failed evidence filename must match its SHA-256",
  );
  return result;
}

function failedEvidenceArchivePath(source, evidencePath, runId) {
  const hash = createHash("sha256").update(source).digest("hex");
  return join(
    dirname(evidencePath),
    `dist-tag-interactive-failed-${runId}-${hash}.json`,
  );
}

function assertExactKeys(value, keys, label) {
  assert.ok(value && typeof value === "object" && !Array.isArray(value));
  const compare = (left, right) => left.localeCompare(right);
  assert.deepEqual(
    Object.keys(value).sort(compare),
    [...keys].sort(compare),
    `${label} keys`,
  );
}

function assertVersion(value, expected) {
  assert.ok(
    value === expected.currentVersion ||
      value === expected.lastKnownGoodVersion,
  );
}

function assertIso(value) {
  assert.equal(typeof value, "string");
  assert.equal(new Date(value).toISOString(), value);
}

function select(value, keys) {
  return Object.fromEntries(keys.map((key) => [key, value[key]]));
}

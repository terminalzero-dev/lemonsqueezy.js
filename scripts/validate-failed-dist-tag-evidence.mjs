import assert from "node:assert/strict";
import { parseArgs } from "node:util";
import { validateFailedDistTagEvidenceArchive } from "./lib/dist-tag-evidence.mjs";

const { values } = parseArgs({
  options: {
    evidence: { type: "string" },
    package: { type: "string" },
    "current-version": { type: "string" },
    "last-known-good-version": { type: "string" },
    "source-commit": { type: "string" },
    "artifact-sha256": { type: "string" },
    "registry-release-run-id": { type: "string" },
    "npm-actor": { type: "string" },
  },
  strict: true,
});

for (const name of [
  "evidence",
  "package",
  "current-version",
  "last-known-good-version",
  "source-commit",
  "artifact-sha256",
  "registry-release-run-id",
  "npm-actor",
]) {
  assert.ok(values[name]?.trim(), `Missing --${name}`);
}
assert.match(values["source-commit"], /^[0-9a-f]{40}$/);
assert.match(values["artifact-sha256"], /^[0-9a-f]{64}$/);
assert.match(values["registry-release-run-id"], /^[1-9][0-9]*$/);
assert.match(values["npm-actor"], /^[A-Za-z0-9_-]+$/);

await validateFailedDistTagEvidenceArchive(values.evidence, {
  package: values.package,
  currentVersion: values["current-version"],
  lastKnownGoodVersion: values["last-known-good-version"],
  sourceCommit: values["source-commit"],
  artifactSha256: values["artifact-sha256"],
  registryReleaseRunId: values["registry-release-run-id"],
  npmActor: values["npm-actor"],
});
console.log(`Validated failed dist-tag evidence: ${values.evidence}`);

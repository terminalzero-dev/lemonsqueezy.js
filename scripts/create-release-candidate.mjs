import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { fileURLToPath } from "node:url";
import { inspectReleaseArtifact } from "./lib/release-candidate.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const { values } = parseArgs({
  options: {
    "artifact-directory": { type: "string", default: ".artifacts/package" },
    "expected-version": { type: "string" },
    "expected-commit": { type: "string" },
    repository: { type: "string" },
    "run-id": { type: "string" },
    "run-attempt": { type: "string" },
    "workflow-ref": { type: "string" },
  },
  strict: true,
});

for (const name of [
  "expected-version",
  "expected-commit",
  "repository",
  "run-id",
  "run-attempt",
  "workflow-ref",
]) {
  assert.ok(values[name]?.trim(), `Missing --${name}`);
}
assert.match(values["expected-commit"], /^[0-9a-f]{40}$/);
assert.match(values["run-id"], /^[1-9][0-9]*$/);
assert.match(values["run-attempt"], /^[1-9][0-9]*$/);

const artifactDirectory = resolve(root, values["artifact-directory"]);
const packageJson = JSON.parse(await readFile(resolve(root, "package.json")));
assert.equal(packageJson.version, values["expected-version"]);

const evidence = await inspectReleaseArtifact({
  artifactDirectory,
  packageName: packageJson.name,
  version: values["expected-version"],
});
const candidate = {
  schemaVersion: 1,
  package: packageJson.name,
  version: values["expected-version"],
  sourceCommit: values["expected-commit"],
  artifact: evidence.artifact,
  publishPlan: evidence.publishPlan,
  gates: {
    credentialFree: "passed",
    runtimeMatrix: "passed",
    testMode: "passed",
  },
  workflow: {
    repository: values.repository,
    runId: values["run-id"],
    runAttempt: values["run-attempt"],
    workflowRef: values["workflow-ref"],
  },
};

await writeFile(
  resolve(artifactDirectory, "candidate.json"),
  `${JSON.stringify(candidate, null, 2)}\n`,
);
console.log(`Release Candidate: ${candidate.package}@${candidate.version}`);
console.log(`SHA-256: ${candidate.artifact.sha256}`);
console.log(`SHA-512 integrity: ${candidate.artifact.integrity}`);

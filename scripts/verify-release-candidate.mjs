import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
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
    "expected-sha256": { type: "string" },
    "skip-registry-check": { type: "boolean", default: false },
    "registry-state": { type: "string", default: "absent" },
  },
  strict: true,
});

for (const name of ["expected-version", "expected-commit"]) {
  assert.ok(values[name]?.trim(), `Missing --${name}`);
}
assert.match(values["expected-commit"], /^[0-9a-f]{40}$/);
if (values["expected-sha256"]) {
  assert.match(values["expected-sha256"], /^[0-9a-f]{64}$/);
}
assert.match(values["registry-state"], /^(?:absent|matching)$/);

const artifactDirectory = resolve(root, values["artifact-directory"]);
const candidate = JSON.parse(
  await readFile(resolve(artifactDirectory, "candidate.json")),
);
assert.equal(candidate.schemaVersion, 1);
assert.equal(candidate.version, values["expected-version"]);
assert.equal(candidate.sourceCommit, values["expected-commit"]);
assert.equal(candidate.gates.credentialFree, "passed");
assert.equal(candidate.gates.runtimeMatrix, "passed");
assert.equal(candidate.gates.testMode, "passed");
if (values["expected-sha256"]) {
  assert.equal(candidate.artifact.sha256, values["expected-sha256"]);
}

const evidence = await inspectReleaseArtifact({
  artifactDirectory,
  packageName: candidate.package,
  version: candidate.version,
});
assert.deepEqual(evidence.artifact, candidate.artifact);
assert.deepEqual(evidence.publishPlan, candidate.publishPlan);

if (!values["skip-registry-check"]) {
  const registry = new URL(
    process.env.npm_config_registry ?? "https://registry.npmjs.org/",
  );
  const versionUrl = new URL(
    `${encodeURIComponent(candidate.package)}/${encodeURIComponent(candidate.version)}`,
    registry,
  );
  const response = await fetch(versionUrl, { redirect: "error" });
  if (values["registry-state"] === "absent") {
    assert.equal(
      response.status,
      404,
      response.ok
        ? `${candidate.package}@${candidate.version} already exists`
        : `registry preflight failed with HTTP ${response.status}`,
    );
  } else {
    assert.equal(
      response.status,
      200,
      `registry metadata returned HTTP ${response.status}`,
    );
    const metadata = await response.json();
    assert.equal(metadata.name, candidate.package);
    assert.equal(metadata.version, candidate.version);
    assert.equal(metadata.dist?.integrity, candidate.artifact.integrity);
    assert.ok(metadata.dist?.tarball, "registry metadata omitted dist.tarball");
    const tarballResponse = await fetch(metadata.dist.tarball, {
      redirect: "error",
    });
    assert.equal(
      tarballResponse.status,
      200,
      `registry tarball returned HTTP ${tarballResponse.status}`,
    );
    const bytes = Buffer.from(await tarballResponse.arrayBuffer());
    assert.equal(
      createHash("sha256").update(bytes).digest("hex"),
      candidate.artifact.sha256,
    );
  }
}

console.log(
  `Verified Release Candidate: ${candidate.package}@${candidate.version}`,
);
console.log(`SHA-256: ${candidate.artifact.sha256}`);

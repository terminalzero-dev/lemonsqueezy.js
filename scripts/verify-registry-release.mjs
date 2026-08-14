import assert from "node:assert/strict";
import { createHash } from "node:crypto";
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
    "expected-sha256": { type: "string" },
    "expected-run-id": { type: "string" },
    repository: { type: "string" },
    registry: {
      type: "string",
      default: process.env.npm_config_registry ?? "https://registry.npmjs.org",
    },
    "github-api": {
      type: "string",
      default: process.env.GITHUB_API_URL ?? "https://api.github.com",
    },
    "release-identity": {
      type: "string",
      default: "docs/release/beta-1-candidate.json",
    },
  },
  strict: true,
});

for (const name of [
  "expected-version",
  "expected-commit",
  "expected-sha256",
  "expected-run-id",
  "repository",
]) {
  assert.ok(values[name]?.trim(), `Missing --${name}`);
}
assert.match(values["expected-commit"], /^[0-9a-f]{40}$/);
assert.match(values["expected-sha256"], /^[0-9a-f]{64}$/);
assert.match(values["expected-run-id"], /^[1-9][0-9]*$/);
assert.match(
  values.repository,
  /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/,
  "--repository must be owner/name",
);

const artifactDirectory = resolve(root, values["artifact-directory"]);
const releaseIdentity = JSON.parse(
  await readFile(resolve(root, values["release-identity"])),
);
const candidate = JSON.parse(
  await readFile(resolve(artifactDirectory, "candidate.json")),
);
assert.equal(candidate.schemaVersion, 1);
assert.equal(releaseIdentity.schemaVersion, 1);
assert.equal(candidate.package, releaseIdentity.package);
assert.equal(candidate.version, releaseIdentity.version);
assert.equal(candidate.sourceCommit, releaseIdentity.sourceCommit);
assert.equal(candidate.artifact.sha256, releaseIdentity.sha256);
assert.equal(candidate.artifact.sha512, releaseIdentity.sha512);
assert.equal(candidate.artifact.integrity, releaseIdentity.integrity);
assert.equal(candidate.workflow.runId, releaseIdentity.candidateRunId);
assert.equal(candidate.version, values["expected-version"]);
assert.equal(candidate.sourceCommit, values["expected-commit"]);
assert.equal(candidate.artifact.sha256, values["expected-sha256"]);
assert.equal(candidate.workflow.runId, values["expected-run-id"]);
assert.equal(candidate.workflow.repository, values.repository);
assert.equal(candidate.gates.credentialFree, "passed");
assert.equal(candidate.gates.runtimeMatrix, "passed");
assert.equal(candidate.gates.testMode, "passed");

const githubApi = new URL(
  values["github-api"].endsWith("/")
    ? values["github-api"]
    : `${values["github-api"]}/`,
);
const runUrl = new URL(
  `repos/${values.repository}/actions/runs/${values["expected-run-id"]}`,
  githubApi,
);
const runHeaders = { accept: "application/vnd.github+json" };
if (process.env.GITHUB_TOKEN) {
  runHeaders.authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
}
const runResponse = await fetch(runUrl, {
  headers: runHeaders,
  redirect: "error",
});
assert.equal(
  runResponse.status,
  200,
  `Candidate workflow run returned HTTP ${runResponse.status}`,
);
const run = await runResponse.json();
assert.equal(String(run.id), values["expected-run-id"]);
assert.equal(run.name, "Release Candidate");
assert.equal(run.path, ".github/workflows/release-candidate.yml");
assert.equal(run.event, "workflow_dispatch");
assert.equal(run.status, "completed");
assert.equal(run.conclusion, "success");
assert.equal(run.head_sha, candidate.sourceCommit);
assert.match(run.head_branch, /^(?:main|release\/v5-beta)$/);
assert.equal(
  candidate.workflow.workflowRef,
  `${values.repository}/${run.path}@refs/heads/${run.head_branch}`,
);

const localEvidence = await inspectReleaseArtifact({
  artifactDirectory,
  packageName: candidate.package,
  version: candidate.version,
});
assert.deepEqual(localEvidence.artifact, candidate.artifact);
assert.deepEqual(localEvidence.publishPlan, candidate.publishPlan);

const registry = new URL(
  values.registry.endsWith("/") ? values.registry : `${values.registry}/`,
);
const versionUrl = new URL(
  `${encodeURIComponent(candidate.package)}/${encodeURIComponent(candidate.version)}`,
  registry,
);
const metadataResponse = await fetch(versionUrl, { redirect: "error" });
assert.equal(
  metadataResponse.status,
  200,
  `registry metadata returned HTTP ${metadataResponse.status}`,
);
const metadata = await metadataResponse.json();
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
const registryTarball = Buffer.from(await tarballResponse.arrayBuffer());
const downloadedSha256 = createHash("sha256")
  .update(registryTarball)
  .digest("hex");
const downloadedIntegrity = `sha512-${createHash("sha512")
  .update(registryTarball)
  .digest("base64")}`;
assert.equal(downloadedSha256, candidate.artifact.sha256);
assert.equal(downloadedIntegrity, candidate.artifact.integrity);

const distTagsUrl = new URL(
  `-/package/${encodeURIComponent(candidate.package)}/dist-tags`,
  registry,
);
const distTagsResponse = await fetch(distTagsUrl, { redirect: "error" });
assert.equal(
  distTagsResponse.status,
  200,
  `registry dist-tags returned HTTP ${distTagsResponse.status}`,
);
const distTags = await distTagsResponse.json();
assert.equal(distTags.beta, candidate.version);
assert.equal(
  "latest" in distTags,
  false,
  "latest must not resolve to a prerelease",
);

const evidence = {
  schemaVersion: 1,
  package: candidate.package,
  version: candidate.version,
  sourceCommit: candidate.sourceCommit,
  candidate: {
    runId: candidate.workflow.runId,
    artifact: candidate.artifact,
  },
  registry: {
    integrity: metadata.dist.integrity,
    downloadedSha256,
    downloadedIntegrity,
    distTags,
    provenance: "bootstrap-exception",
  },
};
await writeFile(
  resolve(artifactDirectory, "registry-evidence.json"),
  `${JSON.stringify(evidence, null, 2)}\n`,
);

console.log(
  `Verified registry release: ${candidate.package}@${candidate.version}`,
);
console.log(`SHA-256: ${downloadedSha256}`);

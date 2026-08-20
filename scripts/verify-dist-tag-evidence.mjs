import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { parseArgs } from "node:util";

const { values } = parseArgs({
  options: {
    "comment-id": { type: "string" },
    issue: { type: "string" },
    "expected-author": { type: "string" },
    package: { type: "string" },
    "current-version": { type: "string" },
    "last-known-good-version": { type: "string" },
    "source-commit": { type: "string" },
    "artifact-sha256": { type: "string" },
    repository: { type: "string" },
    registry: {
      type: "string",
      default: "https://registry.npmjs.org/",
    },
    "github-api": {
      type: "string",
      default: process.env.GITHUB_API_URL ?? "https://api.github.com",
    },
    output: { type: "string" },
  },
  strict: true,
});

for (const name of [
  "comment-id",
  "issue",
  "expected-author",
  "package",
  "current-version",
  "last-known-good-version",
  "source-commit",
  "artifact-sha256",
  "repository",
  "output",
]) {
  assert.ok(values[name]?.trim(), `Missing --${name}`);
}
assert.match(values["comment-id"], /^[1-9][0-9]*$/);
assert.match(values.issue, /^[1-9][0-9]*$/);
assert.match(values["source-commit"], /^[0-9a-f]{40}$/);
assert.match(values["artifact-sha256"], /^[0-9a-f]{64}$/);
assert.match(values.repository, /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/);

const githubApi = new URL(
  values["github-api"].endsWith("/")
    ? values["github-api"]
    : `${values["github-api"]}/`,
);
const commentUrl = new URL(
  `repos/${values.repository}/issues/comments/${values["comment-id"]}`,
  githubApi,
);
const headers = { accept: "application/vnd.github+json" };
if (process.env.GITHUB_TOKEN) {
  headers.authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
}
const response = await fetch(commentUrl, { headers, redirect: "error" });
assert.equal(
  response.status,
  200,
  `Issue comment returned HTTP ${response.status}`,
);
const comment = await response.json();
assert.equal(comment.user?.login, values["expected-author"]);
assert.match(comment.issue_url ?? "", new RegExp(`/issues/${values.issue}$`));

const match = comment.body?.match(/```json\s*([\s\S]*?)```/i);
assert.ok(match, "Issue comment must contain one fenced JSON evidence object");
const evidence = JSON.parse(match[1]);
assert.equal(evidence.schemaVersion, 1);
assert.equal(evidence.status, "completed");
assert.equal(evidence.package, values.package);
assert.equal(evidence.currentVersion, values["current-version"]);
assert.equal(evidence.lastKnownGoodVersion, values["last-known-good-version"]);
assert.equal(evidence.sourceCommit, values["source-commit"]);
assert.equal(evidence.artifactSha256, values["artifact-sha256"]);
assert.match(evidence.registryReleaseRunId ?? "", /^[1-9][0-9]*$/);
assert.match(evidence.npmActor ?? "", /^[A-Za-z0-9_-]+$/);
assert.equal(evidence.auth, "interactive-npm-cli-2fa");
assert.equal(evidence.accountRecovery?.confirmed, true);
assertIso(evidence.accountRecovery?.at);

const current = values["current-version"];
const lkg = values["last-known-good-version"];
assert.deepEqual(
  evidence.states.map(({ phase, beta, latest }) => ({ phase, beta, latest })),
  [
    { phase: "published", beta: current, latest: lkg },
    { phase: "promoted", beta: current, latest: current },
    { phase: "rolled-back", beta: lkg, latest: lkg },
    { phase: "restored", beta: current, latest: current },
  ],
);
for (const state of evidence.states) assertIso(state.at);
assert.deepEqual(
  evidence.timeline.map(({ tag, version }) => ({ tag, version })),
  [
    { tag: "latest", version: current },
    { tag: "latest", version: lkg },
    { tag: "beta", version: lkg },
    { tag: "beta", version: current },
    { tag: "latest", version: current },
  ],
);
for (const event of evidence.timeline) assertIso(event.at);

const releaseRunUrl = new URL(
  `repos/${values.repository}/actions/runs/${evidence.registryReleaseRunId}`,
  githubApi,
);
const releaseRunResponse = await fetch(releaseRunUrl, {
  headers,
  redirect: "error",
});
assert.equal(
  releaseRunResponse.status,
  200,
  `Registry Release run returned HTTP ${releaseRunResponse.status}`,
);
const releaseRun = await releaseRunResponse.json();
assert.equal(releaseRun.name, "Registry Release");
assert.equal(releaseRun.path, ".github/workflows/registry-release.yml");
assert.equal(releaseRun.event, "workflow_dispatch");
assert.equal(releaseRun.conclusion, "success");
assert.equal(releaseRun.head_sha, values["source-commit"]);
assert.match(releaseRun.head_branch, /^(?:main|release\/v5-beta)$/);

const artifactsUrl = new URL(
  `repos/${values.repository}/actions/runs/${evidence.registryReleaseRunId}/artifacts`,
  githubApi,
);
const artifactsResponse = await fetch(artifactsUrl, {
  headers,
  redirect: "error",
});
assert.equal(
  artifactsResponse.status,
  200,
  `Registry Release artifacts returned HTTP ${artifactsResponse.status}`,
);
const artifacts = await artifactsResponse.json();
const expectedArtifactName = `registry-release-verified-${values["current-version"]}-${values["artifact-sha256"]}`;
const verifiedArtifact = artifacts.artifacts?.find(
  ({ name }) => name === expectedArtifactName,
);
assert.ok(
  verifiedArtifact,
  "Registry Release omitted its exact verified artifact",
);
assert.equal(verifiedArtifact.expired, false);

const registry = new URL(
  values.registry.endsWith("/") ? values.registry : `${values.registry}/`,
);
const tagsUrl = new URL(
  `-/package/${encodeURIComponent(values.package)}/dist-tags`,
  registry,
);
const tagsResponse = await fetch(tagsUrl, { redirect: "error" });
assert.equal(
  tagsResponse.status,
  200,
  `npm dist-tags returned HTTP ${tagsResponse.status}`,
);
const tags = await tagsResponse.json();
assert.deepEqual(
  { beta: tags.beta, latest: tags.latest },
  { beta: current, latest: current },
);
const packageResponse = await fetch(
  new URL(encodeURIComponent(values.package), registry),
  { redirect: "error" },
);
assert.equal(
  packageResponse.status,
  200,
  `npm package metadata returned HTTP ${packageResponse.status}`,
);
const packageMetadata = await packageResponse.json();
assert.ok(
  packageMetadata.maintainers?.some(({ name }) => name === evidence.npmActor),
  `npm actor ${evidence.npmActor} is not a package maintainer`,
);

const verified = {
  ...evidence,
  github: {
    commentId: String(comment.id),
    url: comment.html_url,
    author: comment.user.login,
    issue: Number(values.issue),
  },
  verifiedTags: { beta: tags.beta, latest: tags.latest },
  verifiedRegistryReleaseRunId: evidence.registryReleaseRunId,
};
await mkdir(dirname(values.output), { recursive: true });
await writeFile(values.output, `${JSON.stringify(verified, null, 2)}\n`);
console.log(
  `Verified interactive dist-tag evidence from comment ${values["comment-id"]}.`,
);

function assertIso(value) {
  assert.equal(typeof value, "string");
  assert.equal(new Date(value).toISOString(), value);
}

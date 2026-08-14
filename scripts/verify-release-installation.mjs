import assert from "node:assert/strict";
import { sign } from "node:crypto";
import { readFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { fileURLToPath } from "node:url";
import { assertReleaseInstallation } from "./lib/github-governance.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const { values } = parseArgs({
  options: {
    repository: { type: "string" },
    "installation-id": { type: "string" },
    "app-slug": { type: "string" },
    "github-api": { type: "string", default: "https://api.github.com" },
  },
  strict: true,
});
assert.match(
  values.repository ?? "",
  /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/,
  "--repository must be owner/name",
);
assert.ok(process.env.GITHUB_TOKEN, "GITHUB_TOKEN is required");
assert.ok(
  process.env.RELEASE_GITHUB_APP_PRIVATE_KEY,
  "RELEASE_GITHUB_APP_PRIVATE_KEY is required",
);
assert.match(values["installation-id"] ?? "", /^\d+$/, "installation id");
assert.match(values["app-slug"] ?? "", /^[A-Za-z0-9-]+$/, "app slug");

const governance = JSON.parse(
  await readFile(`${root}/.github/governance/repository.json`, "utf8"),
);
const desired = governance.releaseIdentity.actionsIntegration;
assert.deepEqual(desired.repositories, [values.repository]);
const [owner] = values.repository.split("/");
const appJwt = createAppJwt(
  desired.clientId,
  process.env.RELEASE_GITHUB_APP_PRIVATE_KEY,
);
const installation = await request(
  `/app/installations/${desired.installationId}`,
  appJwt,
);
const repositories = await request(
  "/installation/repositories?per_page=100",
  process.env.GITHUB_TOKEN,
);
const identity = {
  installationId: Number(values["installation-id"]),
  appSlug: values["app-slug"],
};
assertReleaseInstallation(installation, identity, repositories, desired, owner);
console.log(
  `Verified release App installation ${identity.installationId} for ${values.repository}.`,
);

function createAppJwt(clientId, privateKey) {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(
    JSON.stringify({ alg: "RS256", typ: "JWT" }),
  ).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({ iat: now - 60, exp: now + 540, iss: clientId }),
  ).toString("base64url");
  const unsignedToken = `${header}.${payload}`;
  const signature = sign(
    "RSA-SHA256",
    Buffer.from(unsignedToken),
    privateKey,
  ).toString("base64url");
  return `${unsignedToken}.${signature}`;
}

async function request(path, token) {
  const response = await fetch(new URL(path, values["github-api"]), {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2026-03-10",
    },
  });
  assert.equal(response.status, 200, `GitHub ${path} status`);
  return response.json();
}

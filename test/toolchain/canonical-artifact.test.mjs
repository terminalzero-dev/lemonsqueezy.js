import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { basename, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const artifactDirectory = fileURLToPath(
  new URL("../../.artifacts/package/", import.meta.url),
);
const files = readdirSync(artifactDirectory).sort();
const packageFiles = readdirSync(join(artifactDirectory, "packages")).sort();

void test("pack produces one canonical tarball and one publish plan", () => {
  assert.equal(packageFiles.filter((file) => file.endsWith(".tgz")).length, 1);
  assert.equal(files.includes("publish-plan.json"), true);
  assert.equal(files.includes("artifact.json"), true);
});

void test("the publish plan uses the explicit beta dist-tag", () => {
  const publishPlan = JSON.parse(
    readFileSync(join(artifactDirectory, "publish-plan.json"), "utf8"),
  );
  const operations = publishPlan.plan.flat();

  assert.equal(operations.length, 1);
  assert.match(operations[0].version, /-beta\./);
  assert.equal(operations[0].tag, "beta");
});

void test("the recorded canonical artifact digest matches the exact tarball", () => {
  const identity = JSON.parse(
    readFileSync(join(artifactDirectory, "artifact.json"), "utf8"),
  );
  const tarball = packageFiles.find((file) => file.endsWith(".tgz"));
  const tarballPath = join(artifactDirectory, "packages", tarball);
  const digest = createHash("sha256")
    .update(readFileSync(tarballPath))
    .digest("hex");

  assert.equal(identity.file, join("packages", basename(tarball)));
  assert.equal(identity.sha256, digest);
  assert.match(identity.sha256, /^[a-f0-9]{64}$/);
});

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { isAbsolute, relative, resolve, sep } from "node:path";

export async function inspectReleaseArtifact({
  artifactDirectory,
  packageName,
  version,
}) {
  const artifactIdentity = JSON.parse(
    await readFile(resolve(artifactDirectory, "artifact.json")),
  );
  const publishPlanBytes = await readFile(
    resolve(artifactDirectory, "publish-plan.json"),
  );
  const publishPlan = JSON.parse(publishPlanBytes);
  const operations = publishPlan.plan.flat();
  assert.equal(operations.length, 1, "candidate must contain one publish plan");
  const [operation] = operations;

  assert.equal(operation.kind, "publish");
  assert.equal(operation.name, packageName);
  assert.equal(operation.version, version);
  assert.equal(operation.access, "public");
  assert.equal(operation.tag, version.includes("-beta.") ? "beta" : "latest");
  assert.equal(operation.tarball.path, artifactIdentity.file);

  const tarball = resolve(artifactDirectory, artifactIdentity.file);
  const localPath = relative(artifactDirectory, tarball);
  assert.equal(
    localPath !== ".." &&
      !localPath.startsWith(`..${sep}`) &&
      !isAbsolute(localPath),
    true,
    "artifact path escapes its directory",
  );
  const tarballBytes = await readFile(tarball);
  const sha256Hash = createHash("sha256").update(tarballBytes);
  const sha256 = sha256Hash.copy().digest("hex");
  assert.equal(
    artifactIdentity.sha256,
    sha256,
    "candidate artifact SHA-256 changed",
  );
  assert.equal(
    operation.tarball.integrity,
    `sha256-${sha256Hash.digest("base64")}`,
  );

  const sha512Hash = createHash("sha512").update(tarballBytes);
  return {
    artifact: {
      file: artifactIdentity.file,
      sha256,
      sha512: sha512Hash.copy().digest("hex"),
      integrity: `sha512-${sha512Hash.digest("base64")}`,
    },
    publishPlan: {
      file: "publish-plan.json",
      sha256: createHash("sha256").update(publishPlanBytes).digest("hex"),
    },
  };
}

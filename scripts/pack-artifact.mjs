import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  chmod,
  mkdir,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { join, relative } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repositoryRoot = fileURLToPath(new URL("..", import.meta.url));

export async function packArtifact(root, environment = process.env) {
  const outputDirectory = join(root, ".artifacts/package");
  const packagesDirectory = join(outputDirectory, "packages");
  const shimDirectory = join(root, ".artifacts/.pnpm-shim");
  const pnpmShim = join(shimDirectory, "pnpm");
  const inputPublishPlanPath = join(shimDirectory, "publish-plan.json");
  const packageJson = JSON.parse(
    await readFile(join(root, "package.json"), "utf8"),
  );
  const releaseTag = packageJson.version.includes("-beta.") ? "beta" : "latest";

  await rm(outputDirectory, { recursive: true, force: true });
  await mkdir(shimDirectory, { recursive: true });
  await writeFile(pnpmShim, '#!/bin/sh\nexec corepack pnpm "$@"\n');
  await chmod(pnpmShim, 0o755);
  await writeFile(
    inputPublishPlanPath,
    `${JSON.stringify(
      {
        version: 1,
        plan: [
          [
            {
              kind: "publish",
              name: packageJson.name,
              version: packageJson.version,
              access: packageJson.publishConfig?.access ?? "public",
              tag: releaseTag,
            },
          ],
        ],
      },
      null,
      2,
    )}\n`,
  );

  const result = spawnSync(
    process.execPath,
    [
      join(repositoryRoot, "node_modules/@changesets/cli/bin.js"),
      "pack",
      "--from-publish-plan",
      inputPublishPlanPath,
      "--out-dir",
      outputDirectory,
    ],
    {
      cwd: root,
      encoding: "utf8",
      stdio: "inherit",
      env: { ...environment, PATH: `${shimDirectory}:${environment.PATH}` },
    },
  );
  assert.equal(result.status, 0, "changeset pack failed");

  const publishPlanPath = join(outputDirectory, "publish-plan.json");
  const publishPlan = JSON.parse(await readFile(publishPlanPath));
  const operations = publishPlan.plan.flat();
  assert.equal(operations.length, 1, "pack must produce one publish operation");
  const [operation] = operations;
  assert.equal(operation.kind, "publish");
  assert.equal(operation.name, packageJson.name);
  assert.equal(operation.version, packageJson.version);
  assert.equal(operation.tag, releaseTag);
  await writeFile(publishPlanPath, `${JSON.stringify(publishPlan, null, 2)}\n`);

  const tarballs = (await readdir(packagesDirectory)).filter((file) =>
    file.endsWith(".tgz"),
  );
  assert.equal(tarballs.length, 1, "pack must produce exactly one tarball");

  const tarballPath = join(packagesDirectory, tarballs[0]);
  const sha256 = createHash("sha256")
    .update(await readFile(tarballPath))
    .digest("hex");

  await writeFile(
    join(outputDirectory, "artifact.json"),
    `${JSON.stringify(
      { file: relative(outputDirectory, tarballPath), sha256 },
      null,
      2,
    )}\n`,
  );

  console.log(`Canonical Package Artifact: ${tarballPath}`);
  console.log(`SHA-256: ${sha256}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await packArtifact(repositoryRoot);
}

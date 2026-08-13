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

const root = fileURLToPath(new URL("..", import.meta.url));
const outputDirectory = join(root, ".artifacts/package");
const packagesDirectory = join(outputDirectory, "packages");
const shimDirectory = join(root, ".artifacts/.pnpm-shim");
const pnpmShim = join(shimDirectory, "pnpm");

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(shimDirectory, { recursive: true });
await writeFile(pnpmShim, '#!/bin/sh\nexec corepack pnpm "$@"\n');
await chmod(pnpmShim, 0o755);

const result = spawnSync(
  process.execPath,
  [
    join(root, "node_modules/@changesets/cli/bin.js"),
    "pack",
    "--out-dir",
    outputDirectory,
  ],
  {
    cwd: root,
    encoding: "utf8",
    stdio: "inherit",
    env: { ...process.env, PATH: `${shimDirectory}:${process.env.PATH}` },
  },
);
assert.equal(result.status, 0, "changeset pack failed");

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

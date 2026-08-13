import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { root, run } from "./lib/canonical-artifact.mjs";

async function buildManifest() {
  const dist = join(root, "dist");
  const files = (await readdir(dist, { recursive: true, withFileTypes: true }))
    .filter((entry) => entry.isFile())
    .map((entry) => relative(dist, join(entry.parentPath, entry.name)))
    .sort();
  const entries = [];

  for (const file of files) {
    const sha256 = createHash("sha256")
      .update(await readFile(join(dist, file)))
      .digest("hex");
    entries.push({ file, sha256 });
  }

  const sha256 = createHash("sha256")
    .update(entries.map((entry) => `${entry.sha256}  ${entry.file}`).join("\n"))
    .digest("hex");

  return { sha256, files: entries };
}

run("corepack", ["pnpm", "build"]);
const first = await buildManifest();
run("corepack", ["pnpm", "build"]);
const second = await buildManifest();

assert.deepEqual(second, first, "two clean builds produced different output");

const outputDirectory = join(root, ".artifacts");
await mkdir(outputDirectory, { recursive: true });
await writeFile(
  join(outputDirectory, "build-manifest.json"),
  `${JSON.stringify(second, null, 2)}\n`,
);
console.log(`Reproducible build SHA-256: ${second.sha256}`);

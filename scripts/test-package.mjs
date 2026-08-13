import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  prepareConsumer,
  readCanonicalArtifact,
  run,
} from "./lib/canonical-artifact.mjs";

const { consumerDirectory, installedPackage } = await prepareConsumer(
  "package-smoke",
);
const packageJson = JSON.parse(
  await readFile(join(installedPackage, "package.json"), "utf8"),
);
const topLevelFiles = (await readdir(installedPackage)).sort();

assert.deepEqual(topLevelFiles, ["LICENSE", "README.md", "dist", "package.json"]);
assert.equal(packageJson.name, "@terminalzero/lemonsqueezy");
assert.equal(packageJson.version, "5.0.0-beta.0");

const distFiles = await readdir(join(installedPackage, "dist"), {
  recursive: true,
});
assert.equal(distFiles.some((file) => file.endsWith(".map")), false);
assert.equal(distFiles.includes("types/index.js"), false);
assert.equal(distFiles.includes("types/index.cjs"), false);

for (const conditions of Object.values(packageJson.exports)) {
  for (const moduleKind of Object.values(conditions)) {
    for (const target of Object.values(moduleKind)) {
      assert.equal(
        distFiles.includes(target.replace("./dist/", "")),
        true,
        target,
      );
    }
  }
}

for (const runtime of ["node", "bun"]) {
  run(runtime, ["runtime-smoke.mjs"], { cwd: consumerDirectory });
  run(runtime, ["runtime-smoke.cjs"], { cwd: consumerDirectory });
}

await readCanonicalArtifact();

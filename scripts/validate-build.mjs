import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { extname } from "node:path";

const dist = new URL("../dist/", import.meta.url);
const packageJson = JSON.parse(
  await readFile(new URL("../package.json", import.meta.url), "utf8"),
);
const files = (await readdir(dist, { recursive: true }))
  .filter((file) => typeof file === "string")
  .sort();

for (const entry of ["index", "client/index", "compat/index"]) {
  for (const extension of [".js", ".cjs", ".d.ts", ".d.cts"]) {
    assert(files.includes(`${entry}${extension}`), `${entry}${extension} is missing`);
  }
}

for (const typeEntry of ["types/index.d.ts", "types/index.d.cts"]) {
  assert(files.includes(typeEntry), `${typeEntry} is missing`);
}
assert(!files.includes("types/index.js"), "types/index.js must be removed");
assert(!files.includes("types/index.cjs"), "types/index.cjs must be removed");
assert.deepEqual(files.filter((file) => extname(file) === ".map"), []);

for (const conditions of Object.values(packageJson.exports)) {
  for (const moduleKind of Object.values(conditions)) {
    for (const target of Object.values(moduleKind)) {
      const output = target.replace("./dist/", "");
      assert(files.includes(output), `${target} does not exist`);
    }
  }
}

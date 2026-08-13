import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { extname, join, relative } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../..", import.meta.url));
const dist = join(root, "dist");
const packageJson = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));

const files = readdirSync(dist, { recursive: true, withFileTypes: true })
  .filter((entry) => entry.isFile())
  .map((entry) => relative(dist, join(entry.parentPath, entry.name)))
  .sort();

test("all public build entries have matching runtime and declaration output", () => {
  for (const entry of ["index", "client/index", "compat/index"]) {
    for (const extension of [".js", ".cjs", ".d.ts", ".d.cts"]) {
      assert.equal(files.includes(`${entry}${extension}`), true, `${entry}${extension}`);
    }
  }

  assert.equal(files.includes("types/index.d.ts"), true);
  assert.equal(files.includes("types/index.d.cts"), true);
  assert.equal(files.includes("types/index.js"), false);
  assert.equal(files.includes("types/index.cjs"), false);
});

test("the package export map only targets files in the build", () => {
  const targets = [];

  for (const conditions of Object.values(packageJson.exports)) {
    for (const moduleKind of Object.values(conditions)) {
      for (const target of Object.values(moduleKind)) {
        targets.push(target.replace("./dist/", ""));
      }
    }
  }

  for (const target of targets) {
    assert.equal(files.includes(target), true, target);
  }
});

test("published output has no source or declaration maps", () => {
  assert.deepEqual(files.filter((file) => extname(file) === ".map"), []);

  for (const file of files.filter((candidate) => /\.(?:js|cjs)$/.test(candidate))) {
    assert.doesNotMatch(readFileSync(join(dist, file), "utf8"), /sourceMappingURL/);
  }
});

test("the type-only entry cannot be executed", async () => {
  assert.equal(existsSync(join(dist, "types/index.js")), false);
  assert.equal(existsSync(join(dist, "types/index.cjs")), false);
});

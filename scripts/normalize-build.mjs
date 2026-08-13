import assert from "node:assert/strict";
import { unlink } from "node:fs/promises";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const esmPath = new URL("../dist/types/index.js", import.meta.url);
const cjsPath = new URL("../dist/types/index.cjs", import.meta.url);
const require = createRequire(import.meta.url);

const esm = await import(`${esmPath.href}?normalize`);
const cjs = require(fileURLToPath(cjsPath));

assert.deepEqual(
  Object.keys(esm),
  [],
  "the type entry emitted ESM runtime exports",
);
assert.deepEqual(
  Object.keys(cjs),
  [],
  "the type entry emitted CJS runtime exports",
);

await Promise.all([unlink(esmPath), unlink(cjsPath)]);

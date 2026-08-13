const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const client = require("@terminalzero/lemonsqueezy/client");
const compat = require("@terminalzero/lemonsqueezy/compat");
const root = require("@terminalzero/lemonsqueezy");

const expected = JSON.parse(
  readFileSync(join(__dirname, "expected-runtime-exports.json"), "utf8"),
);

assert.deepEqual(Object.keys(root).sort(), expected);
assert.deepEqual(Object.keys(compat).sort(), expected);
assert.deepEqual(Object.keys(client), []);
assert.equal(
  root.lemonSqueezySetup({ apiKey: "package-smoke" }).apiKey,
  "package-smoke",
);

const isClosedExportError = (error) =>
  ["ERR_PACKAGE_PATH_NOT_EXPORTED", "MODULE_NOT_FOUND"].includes(error.code);

assert.throws(
  () => require("@terminalzero/lemonsqueezy/types"),
  isClosedExportError,
);
assert.throws(
  () => require("@terminalzero/lemonsqueezy/internal"),
  isClosedExportError,
);

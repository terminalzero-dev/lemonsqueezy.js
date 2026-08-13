import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as client from "@terminalzero/lemonsqueezy/client";
import * as compat from "@terminalzero/lemonsqueezy/compat";
import * as root from "@terminalzero/lemonsqueezy";

const expected = JSON.parse(
  readFileSync(new URL("./expected-runtime-exports.json", import.meta.url), "utf8"),
);

assert.deepEqual(Object.keys(root).sort(), expected);
assert.deepEqual(Object.keys(compat).sort(), expected);
assert.deepEqual(Object.keys(client), []);
assert.equal(root.lemonSqueezySetup({ apiKey: "package-smoke" }).apiKey, "package-smoke");

const isClosedExportError = (error) =>
  ["ERR_PACKAGE_PATH_NOT_EXPORTED", "ERR_MODULE_NOT_FOUND"].includes(error.code);

await assert.rejects(
  import("@terminalzero/lemonsqueezy/types"),
  isClosedExportError,
);
await assert.rejects(
  import("@terminalzero/lemonsqueezy/internal"),
  isClosedExportError,
);

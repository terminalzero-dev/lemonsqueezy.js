import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import * as client from "@terminalzero/lemonsqueezy/client";
import * as compat from "@terminalzero/lemonsqueezy/compat";
import * as root from "@terminalzero/lemonsqueezy";

const expected = JSON.parse(
  readFileSync(
    new URL("./expected-runtime-exports.json", import.meta.url),
    "utf8",
  ),
);
const expectedClient = [
  "LemonSqueezyError",
  "createClient",
  "isLemonSqueezyError",
];
const compareNames = (left, right) => left.localeCompare(right);

assert.deepEqual(
  Object.keys(root).sort(compareNames),
  [...expected, ...expectedClient].sort(compareNames),
);
assert.deepEqual(Object.keys(compat).sort(), expected);
assert.deepEqual(
  Object.keys(client).sort(compareNames),
  [...expectedClient].sort(compareNames),
);
assert.equal(
  root.lemonSqueezySetup({ apiKey: "package-smoke" }).apiKey,
  "package-smoke",
);
const explicit = client.createClient({ apiKey: "package-smoke" });
assert.equal(Object.isFrozen(explicit), true);
assert.equal(Object.isFrozen(explicit.users), true);

const require = createRequire(import.meta.url);
const cjsRoot = require("@terminalzero/lemonsqueezy");
const esmError = new root.LemonSqueezyError("cross-format", "network");
assert.equal(cjsRoot.isLemonSqueezyError(esmError), true);

const isClosedExportError = (error) =>
  ["ERR_PACKAGE_PATH_NOT_EXPORTED", "ERR_MODULE_NOT_FOUND"].includes(
    error.code,
  );

await assert.rejects(
  import("@terminalzero/lemonsqueezy/types"),
  isClosedExportError,
);
await assert.rejects(
  import("@terminalzero/lemonsqueezy/internal"),
  isClosedExportError,
);
await assert.rejects(
  import("@terminalzero/lemonsqueezy/testing"),
  isClosedExportError,
);

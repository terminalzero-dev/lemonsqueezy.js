const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const client = require("@terminalzero/lemonsqueezy/client");
const compat = require("@terminalzero/lemonsqueezy/compat");
const root = require("@terminalzero/lemonsqueezy");

const expected = JSON.parse(
  readFileSync(join(__dirname, "expected-runtime-exports.json"), "utf8"),
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
for (const namespace of [
  "users",
  "stores",
  "products",
  "variants",
  "prices",
  "files",
  "affiliates",
  "customers",
  "checkouts",
  "orders",
  "orderItems",
]) {
  assert.equal(Object.isFrozen(explicit[namespace]), true);
}
assert.deepEqual(Object.keys(explicit.orders).sort(), [
  "generateInvoice",
  "get",
  "list",
  "refund",
]);
assert.deepEqual(Object.keys(explicit.orderItems).sort(), ["get", "list"]);
assert.deepEqual(Object.keys(explicit.customers).sort(), [
  "archive",
  "create",
  "get",
  "list",
  "update",
]);
assert.deepEqual(Object.keys(explicit.checkouts).sort(), [
  "create",
  "get",
  "list",
]);
for (const namespace of [
  "stores",
  "products",
  "variants",
  "prices",
  "files",
  "affiliates",
]) {
  assert.deepEqual(Object.keys(explicit[namespace]).sort(), ["get", "list"]);
}

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
assert.throws(
  () => require("@terminalzero/lemonsqueezy/testing"),
  isClosedExportError,
);

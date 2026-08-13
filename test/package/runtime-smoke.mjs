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

const installedRequests = [];
const orderResource = (type) => ({
  type,
  id: "1",
  attributes: { future_field: "preserved" },
  relationships: {},
  links: { self: `https://api.lemonsqueezy.com/v1/${type}/1` },
});
const singleResponse = (type) => ({
  jsonapi: { version: "1.0" },
  links: { self: `https://api.lemonsqueezy.com/v1/${type}/1` },
  data: orderResource(type),
});
const listResponse = (type) => ({
  jsonapi: { version: "1.0" },
  links: {
    first: "https://example.com/first",
    last: "https://example.com/last",
  },
  meta: {
    page: {
      current_page: 1,
      from: 1,
      last_page: 1,
      per_page: 10,
      to: 1,
      total: 1,
    },
  },
  data: [orderResource(type)],
});
const invoiceResponse = {
  jsonapi: { version: "1.0" },
  meta: { urls: { download_invoice: "https://example.com/invoice.pdf" } },
};

globalThis.fetch = async (request) => {
  installedRequests.push(request);
  const url = new URL(request.url);
  if (url.pathname.endsWith("/generate-invoice")) {
    return Response.json(invoiceResponse);
  }

  const type = url.pathname.includes("/order-items") ? "order-items" : "orders";
  return Response.json(
    url.pathname === `/v1/${type}` ? listResponse(type) : singleResponse(type),
  );
};

await explicit.orders.get(1, { include: ["affiliate"] });
await explicit.orders.list({ filter: { orderNumber: 42 } });
assert.deepEqual(await explicit.orders.generateInvoice(1), invoiceResponse);
await explicit.orders.refund(1);
await explicit.orders.refund(1, { amount: 250 });
await explicit.orderItems.get(1, { include: ["product"] });
await explicit.orderItems.list({ filter: { orderId: 1, variantId: 2 } });
await assert.rejects(explicit.orders.refund(1, { amount: 0 }), {
  code: "validation",
});

const compatibilityResults = await Promise.all([
  root.getOrder(1, { include: ["affiliate"] }),
  root.listOrders({ filter: { orderNumber: 42 } }),
  root.generateOrderInvoice(1),
  root.issueOrderRefund(1),
  root.issueOrderRefund(1, 250),
  root.getOrderItem(1, { include: ["product"] }),
  root.listOrderItems({ filter: { orderId: 1, variantId: 2 } }),
]);
for (const result of compatibilityResults) {
  assert.equal(result.statusCode, 200);
  assert.notEqual(result.data, null);
  assert.equal(result.error, null);
}
await assert.rejects(root.issueOrderRefund(1, 0), { code: "validation" });

const orderLists = installedRequests.filter(
  (request) => new URL(request.url).pathname === "/v1/orders",
);
assert.equal(orderLists.length, 2);
for (const request of orderLists) {
  assert.equal(
    new URL(request.url).searchParams.get("filter[order_number]"),
    "42",
  );
  assert.equal(
    new URL(request.url).searchParams.has("filter[affiliate_id]"),
    false,
  );
}
const orderItemLists = installedRequests.filter(
  (request) => new URL(request.url).pathname === "/v1/order-items",
);
assert.equal(orderItemLists.length, 2);
for (const request of orderItemLists) {
  const url = new URL(request.url);
  assert.equal(url.searchParams.get("filter[order_id]"), "1");
  assert.equal(url.searchParams.get("filter[variant_id]"), "2");
}
const invoiceRequests = installedRequests.filter((request) =>
  new URL(request.url).pathname.endsWith("/generate-invoice"),
);
assert.equal(invoiceRequests.length, 2);
for (const request of invoiceRequests) {
  assert.equal(new URL(request.url).search, "");
}
const refundBodies = await Promise.all(
  installedRequests
    .filter((request) => new URL(request.url).pathname.endsWith("/refund"))
    .map((request) => request.clone().json()),
);
assert.deepEqual(refundBodies, [
  { data: { type: "orders", id: "1", attributes: {} } },
  { data: { type: "orders", id: "1", attributes: { amount: 250 } } },
  { data: { type: "orders", id: "1", attributes: {} } },
  { data: { type: "orders", id: "1", attributes: { amount: 250 } } },
]);

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

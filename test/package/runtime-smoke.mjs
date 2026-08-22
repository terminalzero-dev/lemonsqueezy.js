import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
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
const closedRuntimePaths = JSON.parse(
  readFileSync(new URL("./closed-runtime-paths.json", import.meta.url), "utf8"),
);
const expectedClient = [
  "LemonSqueezyError",
  "createClient",
  "isLemonSqueezyError",
];
const expectedWebhookReceiver = [
  "WebhookError",
  "isWebhookError",
  "parseWebhookEvent",
];
const compareNames = (left, right) => left.localeCompare(right);

assert.deepEqual(
  Object.keys(root).sort(compareNames),
  [...expected, ...expectedClient, ...expectedWebhookReceiver].sort(
    compareNames,
  ),
);
assert.deepEqual(Object.keys(compat).sort(), expected);
assert.equal(root.lemonSqueezySetup, compat.lemonSqueezySetup);
assert.equal(root.getAuthenticatedUser, compat.getAuthenticatedUser);
assert.deepEqual(
  Object.keys(client).sort(compareNames),
  [...expectedClient].sort(compareNames),
);
const webhookBody = JSON.stringify({
  meta: { event_name: "order_created" },
  data: { type: "orders", id: "installed-package" },
});
assert.deepEqual(
  root.parseWebhookEvent({
    secret: "package-smoke-secret",
    rawBody: webhookBody,
    signature: createHmac("sha256", "package-smoke-secret")
      .update(webhookBody)
      .digest("hex"),
  }),
  {
    known: true,
    eventName: "order_created",
    meta: { event_name: "order_created" },
    data: { type: "orders", id: "installed-package" },
  },
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
  "subscriptions",
  "subscriptionInvoices",
  "subscriptionItems",
  "usageRecords",
  "discounts",
  "discountRedemptions",
  "licenseKeys",
  "licenseKeyInstances",
  "license",
  "webhooks",
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
assert.deepEqual(Object.keys(explicit.subscriptions).sort(), [
  "cancel",
  "get",
  "list",
  "update",
]);
assert.deepEqual(Object.keys(explicit.subscriptionInvoices).sort(), [
  "generateInvoice",
  "get",
  "list",
  "refund",
]);
assert.deepEqual(Object.keys(explicit.subscriptionItems).sort(), [
  "currentUsage",
  "get",
  "list",
  "update",
]);
assert.deepEqual(Object.keys(explicit.usageRecords).sort(), [
  "create",
  "get",
  "list",
]);
assert.deepEqual(Object.keys(explicit.discounts).sort(), [
  "create",
  "delete",
  "get",
  "list",
]);
assert.deepEqual(Object.keys(explicit.discountRedemptions).sort(), [
  "get",
  "list",
]);
assert.deepEqual(Object.keys(explicit.licenseKeys).sort(), [
  "get",
  "list",
  "update",
]);
assert.deepEqual(Object.keys(explicit.licenseKeyInstances).sort(), [
  "get",
  "list",
]);
assert.deepEqual(Object.keys(explicit.license).sort(), [
  "activate",
  "deactivate",
  "validate",
]);
assert.deepEqual(Object.keys(explicit.webhooks).sort(), [
  "create",
  "delete",
  "get",
  "list",
  "update",
]);
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
      currentPage: 1,
      from: 1,
      lastPage: 1,
      perPage: 10,
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
const currentUsageResponse = {
  jsonapi: { version: "1.0" },
  meta: {
    period_start: "2026-08-01T00:00:00.000000Z",
    period_end: "2026-09-01T00:00:00.000000Z",
    quantity: 5,
    interval_unit: "month",
    interval_quantity: 1,
  },
};

globalThis.fetch = async (request) => {
  installedRequests.push(request);
  const url = new URL(request.url);
  if (
    request.method === "DELETE" &&
    (url.pathname.startsWith("/v1/discounts/") ||
      url.pathname.startsWith("/v1/webhooks/"))
  ) {
    return new Response(null, { status: 204 });
  }
  if (url.pathname.endsWith("/generate-invoice")) {
    return Response.json(invoiceResponse);
  }
  if (url.pathname.endsWith("/current-usage")) {
    return Response.json(currentUsageResponse);
  }

  const type = url.pathname.includes("/discount-redemptions")
    ? "discount-redemptions"
    : url.pathname.includes("/webhooks")
      ? "webhooks"
      : url.pathname.includes("/discounts")
        ? "discounts"
        : url.pathname.includes("/subscription-invoices")
          ? "subscription-invoices"
          : url.pathname.includes("/subscription-items")
            ? "subscription-items"
            : url.pathname.includes("/usage-records")
              ? "usage-records"
              : url.pathname.includes("/order-items")
                ? "order-items"
                : url.pathname.includes("/subscriptions")
                  ? "subscriptions"
                  : "orders";
  return Response.json(
    request.method === "GET" && url.pathname === `/v1/${type}`
      ? listResponse(type)
      : singleResponse(type),
  );
};

await explicit.orders.get(1, { include: ["affiliate"] });
await explicit.orders.list({ filter: { orderNumber: 42 } });
assert.deepEqual(await explicit.orders.generateInvoice(1), invoiceResponse);
await explicit.orders.refund(1);
await explicit.orders.refund(1, { amount: 250 });
await explicit.orderItems.get(1, { include: ["product"] });
await explicit.orderItems.list({ filter: { orderId: 1, variantId: 2 } });
await explicit.subscriptions.get(1, { include: ["subscription-items"] });
await explicit.subscriptions.list({
  filter: { storeId: 1, userEmail: "", status: "active" },
});
await explicit.subscriptions.update(1, {
  pause: null,
  cancelled: false,
  billingAnchor: 0,
});
await explicit.subscriptions.cancel(1);
await explicit.subscriptionInvoices.get(1, { include: ["affiliate"] });
await explicit.subscriptionInvoices.list({
  filter: {
    storeId: 1,
    status: "partial_refund",
    refunded: false,
    subscriptionId: 2,
  },
});
assert.deepEqual(
  await explicit.subscriptionInvoices.generateInvoice(1),
  invoiceResponse,
);
await explicit.subscriptionInvoices.refund(1);
await explicit.subscriptionInvoices.refund(1, { amount: 250 });
await explicit.subscriptionItems.get(1, { include: ["price"] });
await explicit.subscriptionItems.list({ filter: { subscriptionId: 2 } });
await explicit.subscriptionItems.update(1, { quantity: 3 });
assert.deepEqual(
  await explicit.subscriptionItems.currentUsage(1),
  currentUsageResponse,
);
await explicit.usageRecords.create({
  subscriptionItemId: 1,
  quantity: 5,
  action: "set",
});
await explicit.usageRecords.get(1, { include: ["subscription-item"] });
await explicit.usageRecords.list({ filter: { subscriptionItemId: 1 } });
await explicit.discounts.create({
  storeId: 1,
  name: "Ten percent off",
  code: "TENOFF",
  amount: 10,
  amountType: "percent",
});
await explicit.discounts.get(1, { include: ["variants"] });
await explicit.discounts.list({ filter: { storeId: 1 } });
assert.equal(await explicit.discounts.delete(1), undefined);
await explicit.discountRedemptions.get(1, { include: ["order"] });
await explicit.discountRedemptions.list({
  filter: { discountId: 1, orderId: 2 },
});
await explicit.webhooks.create({
  storeId: 1,
  url: "https://example.com/webhooks",
  events: ["order_created", "affiliate_activated"],
  secret: "signing-secret",
  testMode: true,
});
await explicit.webhooks.get(1, { include: ["store"] });
await explicit.webhooks.update(1, { events: ["customer_updated"] });
await explicit.webhooks.list({ filter: { storeId: 1 } });
assert.equal(await explicit.webhooks.delete(1), undefined);
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
  root.getSubscription(1, { include: ["subscription-items"] }),
  root.listSubscriptions({
    filter: { storeId: 1, userEmail: "", status: "active" },
  }),
  root.updateSubscription(1, {
    pause: null,
    cancelled: false,
    billingAnchor: 0,
  }),
  root.cancelSubscription(1),
  root.getSubscriptionInvoice(1, { include: ["affiliate"] }),
  root.listSubscriptionInvoices({
    filter: {
      storeId: 1,
      status: "partial_refund",
      refunded: false,
      subscriptionId: 2,
    },
  }),
  root.generateSubscriptionInvoice(1),
  root.issueSubscriptionInvoiceRefund(1),
  root.issueSubscriptionInvoiceRefund(1, 250),
  root.getSubscriptionItem(1, { include: ["price"] }),
  root.listSubscriptionItems({ filter: { subscriptionId: 2 } }),
  root.updateSubscriptionItem(1, 3),
  root.updateSubscriptionItem(1, {
    quantity: 4,
    disableProrations: false,
  }),
  root.getSubscriptionItemCurrentUsage(1),
  root.createUsageRecord({
    subscriptionItemId: 1,
    quantity: 5,
    action: "set",
  }),
  root.getUsageRecord(1, { include: ["subscription-item"] }),
  root.listUsageRecords({ filter: { subscriptionItemId: 1 } }),
  root.createDiscount({
    storeId: 1,
    name: "Ten percent off",
    code: "TENOFF",
    amount: 10,
    amountType: "percent",
  }),
  root.getDiscount(1, { include: ["variants"] }),
  root.listDiscounts({ filter: { storeId: 1 } }),
  root.getDiscountRedemption(1, { include: ["order"] }),
  root.listDiscountRedemptions({
    filter: { discountId: 1, orderId: 2 },
  }),
  root.createWebhook(1, {
    url: "https://example.com/webhooks",
    events: ["order_created", "affiliate_activated"],
    secret: "signing-secret",
    testMode: true,
  }),
  root.getWebhook(1, { include: ["store"] }),
  root.updateWebhook(1, { events: ["customer_updated"] }),
  root.listWebhooks({ filter: { storeId: 1 } }),
]);
for (const result of compatibilityResults) {
  assert.equal(result.statusCode, 200);
  assert.notEqual(result.data, null);
  assert.equal(result.error, null);
}
assert.deepEqual(await root.deleteDiscount(1), {
  statusCode: 204,
  data: null,
  error: null,
});
assert.deepEqual(await root.deleteWebhook(1), {
  statusCode: 204,
  data: null,
  error: null,
});
await assert.rejects(root.issueOrderRefund(1, 0), { code: "validation" });
await assert.rejects(root.issueSubscriptionInvoiceRefund(1, 0), {
  code: "validation",
});

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
assert.equal(invoiceRequests.length, 4);
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
  { data: { type: "subscription-invoices", id: "1", attributes: {} } },
  {
    data: {
      type: "subscription-invoices",
      id: "1",
      attributes: { amount: 250 },
    },
  },
  { data: { type: "orders", id: "1", attributes: {} } },
  { data: { type: "orders", id: "1", attributes: { amount: 250 } } },
  { data: { type: "subscription-invoices", id: "1", attributes: {} } },
  {
    data: {
      type: "subscription-invoices",
      id: "1",
      attributes: { amount: 250 },
    },
  },
]);

const subscriptionInvoiceLists = installedRequests.filter(
  (request) => new URL(request.url).pathname === "/v1/subscription-invoices",
);
assert.equal(subscriptionInvoiceLists.length, 2);
for (const request of subscriptionInvoiceLists) {
  const url = new URL(request.url);
  assert.equal(url.searchParams.get("filter[status]"), "partial_refund");
  assert.equal(url.searchParams.get("filter[refunded]"), "false");
  assert.equal(url.searchParams.get("filter[subscription_id]"), "2");
}

const subscriptionRequests = installedRequests.filter((request) =>
  new URL(request.url).pathname.startsWith("/v1/subscriptions"),
);
assert.equal(subscriptionRequests.length, 8);
assert.equal(
  subscriptionRequests.filter((request) => request.method === "DELETE").length,
  2,
);
const subscriptionUpdates = subscriptionRequests.filter(
  (request) => request.method === "PATCH",
);
assert.equal(subscriptionUpdates.length, 2);
for (const request of subscriptionUpdates) {
  assert.deepEqual(await request.clone().json(), {
    data: {
      type: "subscriptions",
      id: "1",
      attributes: {
        pause: null,
        cancelled: false,
        billing_anchor: 0,
      },
    },
  });
}

const subscriptionItemUpdates = installedRequests.filter(
  (request) =>
    new URL(request.url).pathname === "/v1/subscription-items/1" &&
    request.method === "PATCH",
);
assert.deepEqual(
  await Promise.all(
    subscriptionItemUpdates.map((request) => request.clone().json()),
  ),
  [
    {
      data: {
        type: "subscription-items",
        id: "1",
        attributes: { quantity: 3 },
      },
    },
    {
      data: {
        type: "subscription-items",
        id: "1",
        attributes: { quantity: 3 },
      },
    },
    {
      data: {
        type: "subscription-items",
        id: "1",
        attributes: { quantity: 4, disable_prorations: false },
      },
    },
  ],
);

const usageRecordCreates = installedRequests.filter(
  (request) =>
    new URL(request.url).pathname === "/v1/usage-records" &&
    request.method === "POST",
);
assert.equal(usageRecordCreates.length, 2);
for (const request of usageRecordCreates) {
  assert.deepEqual(await request.clone().json(), {
    data: {
      type: "usage-records",
      attributes: { quantity: 5, action: "set" },
      relationships: {
        "subscription-item": {
          data: { type: "subscription-items", id: "1" },
        },
      },
    },
  });
}

const discountCreates = installedRequests.filter(
  (request) =>
    new URL(request.url).pathname === "/v1/discounts" &&
    request.method === "POST",
);
assert.equal(discountCreates.length, 2);
for (const request of discountCreates) {
  assert.deepEqual(await request.clone().json(), {
    data: {
      type: "discounts",
      attributes: {
        name: "Ten percent off",
        code: "TENOFF",
        amount: 10,
        amount_type: "percent",
        is_limited_to_products: false,
        is_limited_redemptions: false,
        max_redemptions: 0,
        starts_at: null,
        expires_at: null,
        duration: "once",
        duration_in_months: 1,
      },
      relationships: {
        store: { data: { type: "stores", id: "1" } },
      },
    },
  });
}

const require = createRequire(import.meta.url);
const cjsRoot = require("@terminalzero/lemonsqueezy");
const esmError = new root.LemonSqueezyError("cross-format", "network");
assert.equal(cjsRoot.isLemonSqueezyError(esmError), true);

const isClosedExportError = (error) =>
  ["ERR_PACKAGE_PATH_NOT_EXPORTED", "ERR_MODULE_NOT_FOUND"].includes(
    error.code,
  );

for (const packagePath of closedRuntimePaths) {
  await assert.rejects(import(packagePath), isClosedExportError);
}

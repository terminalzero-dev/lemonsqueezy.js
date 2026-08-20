import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { join, posix } from "node:path";

export const PUBLIC_PACKAGE_ENTRIES = Object.freeze([
  "@terminalzero/lemonsqueezy",
  "@terminalzero/lemonsqueezy/client",
  "@terminalzero/lemonsqueezy/compat",
  "@terminalzero/lemonsqueezy/types",
]);

export const REQUIRED_USAGE_GUIDES = Object.freeze([
  "docs/usage/catalog-checkout.md",
  "docs/usage/client-api.md",
  "docs/usage/client.md",
  "docs/usage/compatibility-api.md",
  "docs/usage/discounts-licensing.md",
  "docs/usage/getting-started.md",
  "docs/usage/orders-subscriptions.md",
  "docs/usage/webhooks.md",
]);

export const LEMONSQUEEZY_ERROR_CODES = Object.freeze([
  "aborted",
  "configuration",
  "http",
  "invalid_response",
  "network",
  "timeout",
  "validation",
]);

export const CATALOG_CHECKOUT_OPERATIONS = Object.freeze([
  "affiliates.get",
  "affiliates.list",
  "checkouts.create",
  "checkouts.get",
  "checkouts.list",
  "customers.archive",
  "customers.create",
  "customers.get",
  "customers.list",
  "customers.update",
  "files.get",
  "files.list",
  "prices.get",
  "prices.list",
  "products.get",
  "products.list",
  "stores.get",
  "stores.list",
  "users.getAuthenticated",
  "variants.get",
  "variants.list",
]);

export const ORDERS_SUBSCRIPTIONS_OPERATIONS = Object.freeze([
  "orderItems.get",
  "orderItems.list",
  "orders.generateInvoice",
  "orders.get",
  "orders.list",
  "orders.refund",
  "subscriptionInvoices.generateInvoice",
  "subscriptionInvoices.get",
  "subscriptionInvoices.list",
  "subscriptionInvoices.refund",
  "subscriptionItems.currentUsage",
  "subscriptionItems.get",
  "subscriptionItems.list",
  "subscriptionItems.update",
  "subscriptions.cancel",
  "subscriptions.get",
  "subscriptions.list",
  "subscriptions.update",
  "usageRecords.create",
  "usageRecords.get",
  "usageRecords.list",
]);

export const DISCOUNTS_LICENSING_OPERATIONS = Object.freeze([
  "discountRedemptions.get",
  "discountRedemptions.list",
  "discounts.create",
  "discounts.delete",
  "discounts.get",
  "discounts.list",
  "license.activate",
  "license.deactivate",
  "license.validate",
  "licenseKeyInstances.get",
  "licenseKeyInstances.list",
  "licenseKeys.get",
  "licenseKeys.list",
  "licenseKeys.update",
]);

export const WEBHOOK_MANAGEMENT_OPERATIONS = Object.freeze([
  "webhooks.create",
  "webhooks.delete",
  "webhooks.get",
  "webhooks.list",
  "webhooks.update",
]);

export const KNOWN_WEBHOOK_EVENT_NAMES = Object.freeze([
  "affiliate_activated",
  "customer_updated",
  "license_key_created",
  "license_key_updated",
  "order_created",
  "order_refunded",
  "subscription_cancelled",
  "subscription_created",
  "subscription_expired",
  "subscription_paused",
  "subscription_payment_failed",
  "subscription_payment_recovered",
  "subscription_payment_refunded",
  "subscription_payment_success",
  "subscription_resumed",
  "subscription_unpaused",
  "subscription_updated",
]);

export const REQUIRED_OFFICIAL_REFERENCE_LINKS = Object.freeze({
  "docs/usage/client.md": Object.freeze([
    "https://docs.lemonsqueezy.com/api",
    "https://docs.lemonsqueezy.com/api/getting-started/requests",
    "https://docs.lemonsqueezy.com/api/getting-started/responses",
  ]),
  "docs/usage/catalog-checkout.md": Object.freeze([
    "https://docs.lemonsqueezy.com/api/affiliates/list-all-affiliates",
    "https://docs.lemonsqueezy.com/api/affiliates/retrieve-affiliate",
    "https://docs.lemonsqueezy.com/api/checkouts/create-checkout",
    "https://docs.lemonsqueezy.com/api/checkouts/list-all-checkouts",
    "https://docs.lemonsqueezy.com/api/checkouts/retrieve-checkout",
    "https://docs.lemonsqueezy.com/api/customers/create-customer",
    "https://docs.lemonsqueezy.com/api/customers/list-all-customers",
    "https://docs.lemonsqueezy.com/api/customers/retrieve-customer",
    "https://docs.lemonsqueezy.com/api/customers/update-customer",
    "https://docs.lemonsqueezy.com/api/files/list-all-files",
    "https://docs.lemonsqueezy.com/api/files/retrieve-file",
    "https://docs.lemonsqueezy.com/api/prices/list-all-prices",
    "https://docs.lemonsqueezy.com/api/prices/retrieve-price",
    "https://docs.lemonsqueezy.com/api/products/list-all-products",
    "https://docs.lemonsqueezy.com/api/products/retrieve-product",
    "https://docs.lemonsqueezy.com/api/stores/list-all-stores",
    "https://docs.lemonsqueezy.com/api/stores/retrieve-store",
    "https://docs.lemonsqueezy.com/api/users/retrieve-user",
    "https://docs.lemonsqueezy.com/api/variants/list-all-variants",
    "https://docs.lemonsqueezy.com/api/variants/retrieve-variant",
    "https://docs.lemonsqueezy.com/help/getting-started/test-mode",
  ]),
  "docs/usage/orders-subscriptions.md": Object.freeze([
    "https://docs.lemonsqueezy.com/api/order-items/list-all-order-items",
    "https://docs.lemonsqueezy.com/api/order-items/retrieve-order-item",
    "https://docs.lemonsqueezy.com/api/orders/generate-order-invoice",
    "https://docs.lemonsqueezy.com/api/orders/issue-refund",
    "https://docs.lemonsqueezy.com/api/orders/list-all-orders",
    "https://docs.lemonsqueezy.com/api/orders/retrieve-order",
    "https://docs.lemonsqueezy.com/api/subscription-invoices/generate-subscription-invoice",
    "https://docs.lemonsqueezy.com/api/subscription-invoices/issue-refund",
    "https://docs.lemonsqueezy.com/api/subscription-invoices/list-all-subscription-invoices",
    "https://docs.lemonsqueezy.com/api/subscription-invoices/retrieve-subscription-invoice",
    "https://docs.lemonsqueezy.com/api/subscription-items/list-all-subscription-items",
    "https://docs.lemonsqueezy.com/api/subscription-items/retrieve-subscription-item",
    "https://docs.lemonsqueezy.com/api/subscription-items/retrieve-subscription-item-current-usage",
    "https://docs.lemonsqueezy.com/api/subscription-items/update-subscription-item",
    "https://docs.lemonsqueezy.com/api/subscriptions/cancel-subscription",
    "https://docs.lemonsqueezy.com/api/subscriptions/list-all-subscriptions",
    "https://docs.lemonsqueezy.com/api/subscriptions/retrieve-subscription",
    "https://docs.lemonsqueezy.com/api/subscriptions/update-subscription",
    "https://docs.lemonsqueezy.com/api/usage-records/create-usage-record",
    "https://docs.lemonsqueezy.com/api/usage-records/list-all-usage-records",
    "https://docs.lemonsqueezy.com/api/usage-records/retrieve-usage-record",
    "https://docs.lemonsqueezy.com/help/getting-started/test-mode",
  ]),
  "docs/usage/discounts-licensing.md": Object.freeze([
    "https://docs.lemonsqueezy.com/api/discount-redemptions/list-all-discount-redemptions",
    "https://docs.lemonsqueezy.com/api/discount-redemptions/retrieve-discount-redemption",
    "https://docs.lemonsqueezy.com/api/discounts/create-discount",
    "https://docs.lemonsqueezy.com/api/discounts/delete-discount",
    "https://docs.lemonsqueezy.com/api/discounts/list-all-discounts",
    "https://docs.lemonsqueezy.com/api/discounts/retrieve-discount",
    "https://docs.lemonsqueezy.com/api/license-api/activate-license-key",
    "https://docs.lemonsqueezy.com/api/license-api/deactivate-license-key",
    "https://docs.lemonsqueezy.com/api/license-api/validate-license-key",
    "https://docs.lemonsqueezy.com/api/license-key-instances/list-all-license-key-instances",
    "https://docs.lemonsqueezy.com/api/license-key-instances/retrieve-license-key-instance",
    "https://docs.lemonsqueezy.com/api/license-keys/list-all-license-keys",
    "https://docs.lemonsqueezy.com/api/license-keys/retrieve-license-key",
    "https://docs.lemonsqueezy.com/api/license-keys/update-license-key",
    "https://docs.lemonsqueezy.com/help/getting-started/test-mode",
  ]),
  "docs/usage/webhooks.md": Object.freeze([
    "https://docs.lemonsqueezy.com/api/webhooks/create-webhook",
    "https://docs.lemonsqueezy.com/api/webhooks/delete-webhook",
    "https://docs.lemonsqueezy.com/api/webhooks/list-all-webhooks",
    "https://docs.lemonsqueezy.com/api/webhooks/retrieve-webhook",
    "https://docs.lemonsqueezy.com/api/webhooks/update-webhook",
    "https://docs.lemonsqueezy.com/help/getting-started/test-mode",
    "https://docs.lemonsqueezy.com/help/webhooks/event-types",
    "https://docs.lemonsqueezy.com/help/webhooks/signing-requests",
    "https://docs.lemonsqueezy.com/help/webhooks/simulate-webhook-events",
    "https://docs.lemonsqueezy.com/help/webhooks/webhook-requests",
  ]),
});

const extraOfficialReferenceLinks = Object.freeze([
  "https://docs.lemonsqueezy.com/api",
  "https://docs.lemonsqueezy.com/api/affiliates/the-affiliate-object",
  "https://docs.lemonsqueezy.com/api/checkouts/the-checkout-object",
  "https://docs.lemonsqueezy.com/api/customers/the-customer-object",
  "https://docs.lemonsqueezy.com/api/discount-redemptions/the-discount-redemption-object",
  "https://docs.lemonsqueezy.com/api/discounts/the-discount-object",
  "https://docs.lemonsqueezy.com/api/files/the-file-object",
  "https://docs.lemonsqueezy.com/api/getting-started/requests",
  "https://docs.lemonsqueezy.com/api/getting-started/responses",
  "https://docs.lemonsqueezy.com/api/license-key-instances/the-license-key-instance-object",
  "https://docs.lemonsqueezy.com/api/license-keys/the-license-key-object",
  "https://docs.lemonsqueezy.com/api/order-items/the-order-item-object",
  "https://docs.lemonsqueezy.com/api/orders/the-order-object",
  "https://docs.lemonsqueezy.com/api/prices/the-price-object",
  "https://docs.lemonsqueezy.com/api/products/the-product-object",
  "https://docs.lemonsqueezy.com/api/stores/the-store-object",
  "https://docs.lemonsqueezy.com/api/subscription-invoices/the-subscription-invoice-object",
  "https://docs.lemonsqueezy.com/api/subscription-items/the-subscription-item-object",
  "https://docs.lemonsqueezy.com/api/subscriptions/the-subscription-object",
  "https://docs.lemonsqueezy.com/api/usage-records/the-usage-record-object",
  "https://docs.lemonsqueezy.com/api/users/the-user-object",
  "https://docs.lemonsqueezy.com/api/variants/the-variant-object",
  "https://docs.lemonsqueezy.com/api/webhooks/the-webhook-object",
  "https://docs.lemonsqueezy.com/guides/developer-guide/testing-going-live",
  "https://docs.lemonsqueezy.com/help/getting-started/test-mode",
]);

const allowedOfficialReferenceLinks = new Set([
  ...extraOfficialReferenceLinks,
  ...Object.values(REQUIRED_OFFICIAL_REFERENCE_LINKS).flat(),
]);

const publicPackageEntries = new Set(PUBLIC_PACKAGE_ENTRIES);
const fencedCodePattern =
  /```(?:ts|typescript|js|javascript|mts|cts)\n([\s\S]*?)\n```/g;
const fixtureExamplePattern =
  /<!-- fixture: ([a-z0-9][a-z0-9./-]*)(?:\s+(execute|compile))? -->\s*\n\s*```(?:ts|typescript|js|javascript|mts|cts)\n([\s\S]*?)\n```/g;
const importSpecifierPattern =
  /\b(?:from\s+|import\s*\(\s*|require\s*\(\s*|import\s+)["']([^"']+)["']/g;
const markdownLinkPattern = /(?<!!)\[(?:[^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
const headingPattern = /^(#{1,6})\s+(.+?)\s*$/gm;
const requiredLandingRoutes = [
  { href: "#installation", label: "Installation" },
  { href: "docs/usage/getting-started.md", label: "Getting Started" },
  { href: "docs/usage/client.md", label: "API usage" },
  { href: "docs/usage/client-api.md", label: "Client API" },
  {
    href: "docs/usage/catalog-checkout.md",
    label: "catalog, customers, and checkouts",
  },
  {
    href: "docs/usage/orders-subscriptions.md",
    label: "orders, subscriptions, and metering",
  },
  {
    href: "docs/usage/discounts-licensing.md",
    label: "discounts and licensing",
  },
  { href: "docs/usage/webhooks.md", label: "webhook management" },
  { href: "docs/usage/compatibility-api.md", label: "Compatibility API" },
  {
    href: "#existing-v4-applications-compatibility-first",
    label: "Compatibility-first",
  },
  { href: "#inbound-webhooks", label: "webhooks" },
  {
    href: "docs/usage/webhooks.md#known-inbound-webhook-events",
    label: "webhook events",
  },
  { href: "MIGRATION.md", label: "migration" },
  { href: "https://docs.lemonsqueezy.com/api", label: "official API" },
];

export function collectMarkdownCodeBlocks(markdown) {
  fencedCodePattern.lastIndex = 0;
  return [...markdown.matchAll(fencedCodePattern)].map((match) => ({
    source: match[1],
  }));
}

export function extractDocumentationExamples(markdown, origin) {
  fixtureExamplePattern.lastIndex = 0;
  return [...markdown.matchAll(fixtureExamplePattern)].map((match) => ({
    name: match[1],
    origin,
    execute: match[2] === "execute",
    source: match[3],
  }));
}

export function collectImportSpecifiers(source) {
  importSpecifierPattern.lastIndex = 0;
  return [...source.matchAll(importSpecifierPattern)].map((match) => match[1]);
}

export function assertSupportedPackageImports(source, origin) {
  for (const specifier of collectImportSpecifiers(source)) {
    assert.equal(
      publicPackageEntries.has(specifier),
      true,
      `${origin} imports unsupported package path ${specifier}`,
    );
  }
}

export function githubHeadingAnchor(heading) {
  return heading
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]/gu, "")
    .replace(/\s+/g, "-");
}

export function collectHeadingAnchors(markdown) {
  headingPattern.lastIndex = 0;
  const seen = new Map();
  const anchors = new Set();
  for (const match of markdown.matchAll(headingPattern)) {
    const slug = githubHeadingAnchor(match[2]);
    const count = seen.get(slug) ?? 0;
    anchors.add(count === 0 ? slug : `${slug}-${count}`);
    seen.set(slug, count + 1);
  }
  return anchors;
}

function isRemoteHref(href) {
  return /^(?:[a-z]+:)?\/\//i.test(href) || href.startsWith("mailto:");
}

export function resolveDocumentationHref(fromPath, href) {
  const hashIndex = href.indexOf("#");
  const filePart = hashIndex === -1 ? href : href.slice(0, hashIndex);
  const anchor = hashIndex === -1 ? undefined : href.slice(hashIndex + 1);
  if (!filePart) {
    return { path: fromPath, anchor };
  }

  const resolved = filePart.startsWith("/")
    ? filePart.slice(1)
    : posix.normalize(posix.join(posix.dirname(fromPath), filePart));
  return { path: resolved.replace(/^\.\//, ""), anchor };
}

export function assertLocalDocumentationLinks(markdown, fromPath, root) {
  markdownLinkPattern.lastIndex = 0;
  for (const match of markdown.matchAll(markdownLinkPattern)) {
    const href = match[1];
    if (isRemoteHref(href)) continue;

    const target = resolveDocumentationHref(fromPath, href);
    const absolutePath = join(root, target.path);
    assert.equal(
      existsSync(absolutePath),
      true,
      `${fromPath} links to missing file ${target.path}`,
    );

    if (!target.anchor) continue;

    const anchors = collectHeadingAnchors(readFileSync(absolutePath, "utf8"));
    assert.equal(
      anchors.has(target.anchor),
      true,
      `${fromPath} links to missing heading #${target.anchor} in ${target.path}`,
    );
  }
}

export function assertDocumentationSafety(markdown, origin) {
  assert.doesNotMatch(
    markdown,
    /sk_(?:live|test)_[a-zA-Z0-9]{8,}/,
    `${origin} contains a realistic API credential`,
  );
  assert.doesNotMatch(
    markdown,
    /\bapiKey\s*:\s*["'][^"']+["']/,
    `${origin} hard-codes an API credential`,
  );
  assert.doesNotMatch(
    markdown,
    /\blicenseKey\s*:\s*["'][^"']+["']/,
    `${origin} hard-codes a License Key`,
  );
  assert.doesNotMatch(
    markdown,
    /\binstanceId\s*:\s*["'][^"']+["']/,
    `${origin} hard-codes a License API instance identifier`,
  );
  assert.doesNotMatch(
    markdown,
    /\bsecret\s*:\s*["'][^"']{16,}["']/,
    `${origin} hard-codes a long secret literal`,
  );
  assert.doesNotMatch(
    markdown,
    /\bBearer\s+(?:sk_|eyJ|[A-Za-z0-9._~+/-]{16,})/,
    `${origin} embeds an authorization header`,
  );
  assert.doesNotMatch(
    markdown,
    /window\.[A-Z0-9_]*API_KEY|window\.[A-Z0-9_]*SECRET/i,
    `${origin} exposes a credential to browser code`,
  );
  assert.doesNotMatch(
    markdown,
    /console\.(?:log|error|info|debug|warn)\([^;]{0,200}(?:licenseKey|license_key|instanceId|instance_id|\.secret\b|apiKey)/,
    `${origin} logs a secret-like value`,
  );
  assert.doesNotMatch(
    markdown,
    /(?<!\bnot )(?<!\bnever )use (?:these |this )?(?:examples?|samples?) (?:in|against|with) (?:live mode|production)/i,
    `${origin} recommends Live Mode or production sample usage`,
  );
}

export function assertNoParseBeforeVerify(markdown, origin) {
  for (const block of collectMarkdownCodeBlocks(markdown)) {
    const parseIndex = block.source.search(/JSON\.parse\s*\(/);
    const verifyIndex = block.source.search(/\bparseWebhookEvent\s*\(/);
    if (parseIndex !== -1 && (verifyIndex === -1 || parseIndex < verifyIndex)) {
      assert.fail(
        `${origin} parses JSON before webhook signature verification`,
      );
    }
  }
  assert.doesNotMatch(
    markdown,
    /parse(?:s| the)? (?:the )?(?:JSON|body|payload).{0,60}(?:then|before).{0,40}(?:verif|authenticat|signatur)/i,
    `${origin} recommends parsing before signature verification`,
  );
}

export function assertLandingPageRoutes(readme) {
  for (const { href, label } of requiredLandingRoutes) {
    assert.equal(
      readme.includes(href),
      true,
      `README must route readers to ${label} via ${href}`,
    );
  }
}

export function collectOfficialReferenceHrefs(markdown) {
  markdownLinkPattern.lastIndex = 0;
  const hrefs = [];
  for (const match of markdown.matchAll(markdownLinkPattern)) {
    const href = match[1];
    if (href.startsWith("https://docs.lemonsqueezy.com/")) {
      hrefs.push(href);
    }
  }
  return hrefs;
}

export function assertRequiredTokens(markdown, origin, tokens) {
  for (const token of tokens) {
    assert.equal(
      markdown.includes(token),
      true,
      `${origin} is missing required token ${token}`,
    );
  }
}

export function allowAdditionalOfficialReferenceLinks(urls) {
  for (const url of urls) {
    allowedOfficialReferenceLinks.add(url);
  }
}

export function assertRequiredOfficialReferenceLinks(markdown, origin) {
  const required = REQUIRED_OFFICIAL_REFERENCE_LINKS[origin];
  if (required) {
    assertRequiredTokens(markdown, origin, required);
  }

  for (const href of collectOfficialReferenceHrefs(markdown)) {
    assert.equal(
      allowedOfficialReferenceLinks.has(href),
      true,
      `${origin} links to unknown official reference ${href}`,
    );
  }
}

export function assertClientGuideContract(markdown, origin) {
  assertRequiredTokens(markdown, origin, [
    ...PUBLIC_PACKAGE_ENTRIES.slice(1),
    ...LEMONSQUEEZY_ERROR_CODES.map((code) => `\`${code}\``),
    "timeoutMs",
    "AbortSignal",
    "does not retry",
    "currentPage",
    "Compatibility facade",
  ]);
  assert.match(
    markdown,
    /@terminalzero\/lemonsqueezy(?!\/)/,
    `${origin} must introduce the root package entry`,
  );
  assertRequiredOfficialReferenceLinks(markdown, origin);
}

export function assertCatalogCheckoutGuideContract(markdown, origin) {
  assertRequiredTokens(markdown, origin, [
    ...CATALOG_CHECKOUT_OPERATIONS.map((operation) => `\`${operation}\``),
    "checkoutData.custom",
    "Opaque user data",
  ]);
  assertRequiredOfficialReferenceLinks(markdown, origin);
}

export function assertOrdersSubscriptionsGuideContract(markdown, origin) {
  assertRequiredTokens(markdown, origin, [
    ...ORDERS_SUBSCRIPTIONS_OPERATIONS.map((operation) => `\`${operation}\``),
    "currentPage",
    "download_invoice",
    "period_start",
    "Test Mode",
  ]);
  assertRequiredOfficialReferenceLinks(markdown, origin);
}

export function assertDiscountsLicensingGuideContract(markdown, origin) {
  assertRequiredTokens(markdown, origin, [
    ...DISCOUNTS_LICENSING_OPERATIONS.map((operation) => `\`${operation}\``),
    "application/x-www-form-urlencoded",
    "activated",
    "deactivated",
    ".valid",
    "Test Mode",
  ]);
  assertRequiredOfficialReferenceLinks(markdown, origin);
}

function collectHeadingTitles(markdown) {
  headingPattern.lastIndex = 0;
  return [...markdown.matchAll(headingPattern)].map((match) =>
    match[2].replaceAll("`", "").trim(),
  );
}

function collectIndexTableRows(markdown) {
  return [...markdown.matchAll(/^\| `([^`]+)`[^|]*\|(.*)$/gm)].map((match) => ({
    key: match[1],
    row: match[0],
  }));
}

function usageGuideHref(path) {
  return `./${path.replace(/^docs\/usage\//, "")}`;
}

function sortedStrings(values) {
  return [...values].sort((left, right) => left.localeCompare(right));
}

export function assertCatalogCoverage(catalog) {
  assert.equal(catalog.namespaces.length, 21);
  assert.equal(catalog.operations.length, 61);
  assert.equal(
    new Set(catalog.operations.map((operation) => operation.key)).size,
    61,
  );
  assert.equal(Object.keys(catalog.compatibility).length, 59);
  assert.equal(new Set(Object.values(catalog.compatibility)).size, 59);
  assert.equal(catalog.webhookEvents.length, 17);

  const operationKeys = new Set(
    catalog.operations.map((operation) => operation.key),
  );
  assert.deepEqual(
    sortedStrings([
      ...CATALOG_CHECKOUT_OPERATIONS,
      ...ORDERS_SUBSCRIPTIONS_OPERATIONS,
      ...DISCOUNTS_LICENSING_OPERATIONS,
      ...WEBHOOK_MANAGEMENT_OPERATIONS,
    ]),
    sortedStrings(operationKeys),
    "task guides must cover the canonical operation catalog",
  );
  assert.deepEqual(
    sortedStrings(KNOWN_WEBHOOK_EVENT_NAMES),
    sortedStrings(catalog.webhookEvents.map((event) => event.name)),
    "webhook guide events must match the canonical event catalog",
  );

  for (const operation of catalog.operations) {
    assert.equal(
      typeof operation.officialEndpoint,
      "string",
      `${operation.key} is missing an official endpoint`,
    );
    assert.equal(
      typeof operation.taskGuide,
      "string",
      `${operation.key} is missing a task guide`,
    );
  }
  for (const [facade, clientKey] of Object.entries(catalog.compatibility)) {
    assert.equal(
      operationKeys.has(clientKey),
      true,
      `${facade} maps to unknown Client operation ${clientKey}`,
    );
  }
  for (const event of catalog.webhookEvents) {
    assert.equal(
      typeof event.taskGuide,
      "string",
      `${event.name} is missing a task guide`,
    );
    assert.equal(
      event.officialReference,
      "https://docs.lemonsqueezy.com/help/webhooks/event-types",
    );
  }
}

export function assertClientApiIndexContract(markdown, origin, catalog) {
  const headings = collectHeadingTitles(markdown).filter((title) =>
    catalog.namespaces.includes(title),
  );
  assert.deepEqual(
    sortedStrings(headings),
    sortedStrings(catalog.namespaces),
    `${origin} must heading-index every public namespace`,
  );

  const rows = collectIndexTableRows(markdown).filter((row) =>
    row.key.includes("."),
  );
  assert.deepEqual(
    sortedStrings(rows.map((row) => row.key)),
    sortedStrings(catalog.operations.map((operation) => operation.key)),
    `${origin} Client method coverage`,
  );

  const operationsByKey = new Map(
    catalog.operations.map((operation) => [operation.key, operation]),
  );
  for (const row of rows) {
    const operation = operationsByKey.get(row.key);
    assert.ok(operation, `${origin} indexes unknown operation ${row.key}`);
    const guideHref = usageGuideHref(operation.taskGuide);
    assert.equal(
      row.row.includes(guideHref),
      true,
      `${origin} ${row.key} is missing task guide ${guideHref}`,
    );
    assert.equal(
      row.row.includes(operation.officialEndpoint),
      true,
      `${origin} ${row.key} is missing official reference ${operation.officialEndpoint}`,
    );
  }
}

export function assertCompatibilityApiIndexContract(markdown, origin, catalog) {
  assert.match(
    markdown,
    /lemonSqueezySetup/,
    `${origin} must document lemonSqueezySetup as special Default Client behavior`,
  );

  const operationsByKey = new Map(
    catalog.operations.map((operation) => [operation.key, operation]),
  );
  const rows = collectIndexTableRows(markdown).filter(
    (row) => !row.key.includes("."),
  );
  assert.deepEqual(
    sortedStrings(rows.map((row) => row.key)),
    sortedStrings(Object.keys(catalog.compatibility)),
    `${origin} Compatibility facade coverage`,
  );

  for (const row of rows) {
    const clientKey = catalog.compatibility[row.key];
    assert.equal(
      typeof clientKey,
      "string",
      `${origin} indexes unknown facade function ${row.key}`,
    );
    assert.equal(
      row.row.includes(`\`${clientKey}\``),
      true,
      `${origin} ${row.key} must map to ${clientKey}`,
    );
    const operation = operationsByKey.get(clientKey);
    assert.ok(operation, `${origin} ${row.key} maps to unknown ${clientKey}`);
    const guideHref = usageGuideHref(operation.taskGuide);
    assert.equal(
      row.row.includes(guideHref),
      true,
      `${origin} ${row.key} is missing task guide ${guideHref}`,
    );
    assert.equal(
      row.row.includes(operation.officialEndpoint),
      true,
      `${origin} ${row.key} is missing official reference ${operation.officialEndpoint}`,
    );
  }
}

export function assertWebhookEventIndexContract(markdown, origin, catalog) {
  assert.match(
    markdown,
    /authenticated unknown events remain supported/i,
    `${origin} must state that authenticated unknown events remain supported`,
  );

  const rows = collectIndexTableRows(markdown).filter((row) =>
    row.key.includes("_"),
  );
  assert.deepEqual(
    sortedStrings(rows.map((row) => row.key)),
    sortedStrings(catalog.webhookEvents.map((event) => event.name)),
    `${origin} webhook event coverage`,
  );

  const eventsByName = new Map(
    catalog.webhookEvents.map((event) => [event.name, event]),
  );
  for (const row of rows) {
    const event = eventsByName.get(row.key);
    assert.ok(event, `${origin} indexes unknown event ${row.key}`);
    assert.equal(
      row.row.includes(`\`${event.resourceType}\``),
      true,
      `${origin} ${row.key} is missing resource type ${event.resourceType}`,
    );
    const guideHref = usageGuideHref(event.taskGuide);
    assert.equal(
      row.row.includes(guideHref),
      true,
      `${origin} ${row.key} is missing task guide ${guideHref}`,
    );
    assert.equal(
      row.row.includes(event.officialReference),
      true,
      `${origin} ${row.key} is missing official reference ${event.officialReference}`,
    );
  }
}

export function assertWebhookGuideContract(markdown, origin) {
  assertRequiredTokens(markdown, origin, [
    ...WEBHOOK_MANAGEMENT_OPERATIONS.map((operation) => `\`${operation}\``),
    ...KNOWN_WEBHOOK_EVENT_NAMES.map((eventName) => `\`${eventName}\``),
    "parseWebhookEvent",
    "HMAC-SHA256",
    "X-Signature",
    "invalid_signature",
    "invalid_payload",
    "Test Mode",
  ]);
  assert.match(
    markdown,
    /\bknown:\s*false\b|\bknown\s*===\s*false\b|!\s*\w+\.known|\.known\s*===\s*false/,
    `${origin} must show how authenticated unknown events remain representable`,
  );
  assertNoParseBeforeVerify(markdown, origin);
  assertRequiredOfficialReferenceLinks(markdown, origin);
}

export async function listDocumentationFiles(root) {
  const files = ["README.md"];
  const usageDirectory = join(root, "docs/usage");
  if (!existsSync(usageDirectory)) {
    return files;
  }

  const usageFiles = (await readdir(usageDirectory, { recursive: true }))
    .filter((file) => file.endsWith(".md"))
    .map((file) => posix.join("docs/usage", file.split("\\").join("/")))
    .sort((left, right) => left.localeCompare(right));
  return [...files, ...usageFiles];
}

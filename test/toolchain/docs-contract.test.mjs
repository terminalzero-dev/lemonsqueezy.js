import assert from "node:assert/strict";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import {
  loadCanonicalDocumentationCatalog,
  parseCompatibilityOperationCatalog,
  parseKnownWebhookEventCatalog,
  parseNamespaceOperations,
} from "../../scripts/lib/docs-catalog.mjs";
import {
  assertCatalogCheckoutGuideContract,
  assertCatalogCoverage,
  assertClientApiIndexContract,
  assertClientGuideContract,
  assertCompatibilityApiIndexContract,
  assertDiscountsLicensingGuideContract,
  assertDocumentationSafety,
  assertLandingPageRoutes,
  assertLocalDocumentationLinks,
  assertNoParseBeforeVerify,
  assertOrdersSubscriptionsGuideContract,
  assertSupportedPackageImports,
  assertWebhookEventIndexContract,
  assertWebhookGuideContract,
  CATALOG_CHECKOUT_OPERATIONS,
  collectMarkdownCodeBlocks,
  collectOfficialReferenceHrefs,
  DISCOUNTS_LICENSING_OPERATIONS,
  extractDocumentationExamples,
  KNOWN_WEBHOOK_EVENT_NAMES,
  LEMONSQUEEZY_ERROR_CODES,
  listDocumentationFiles,
  ORDERS_SUBSCRIPTIONS_OPERATIONS,
  PUBLIC_PACKAGE_ENTRIES,
  REQUIRED_USAGE_GUIDES,
  WEBHOOK_MANAGEMENT_OPERATIONS,
} from "../../scripts/lib/docs-contract.mjs";

const repoRoot = fileURLToPath(new URL("../..", import.meta.url));

void test("public package entries are the four documented specifiers", () => {
  assert.deepEqual(
    [...PUBLIC_PACKAGE_ENTRIES],
    [
      "@terminalzero/lemonsqueezy",
      "@terminalzero/lemonsqueezy/client",
      "@terminalzero/lemonsqueezy/compat",
      "@terminalzero/lemonsqueezy/types",
    ],
  );
});

void test("fixture comments extract compile and execute examples", () => {
  const markdown = [
    "<!-- fixture: getting-started.ts execute -->",
    "",
    "```ts",
    'import { createClient } from "@terminalzero/lemonsqueezy/client";',
    "```",
    "",
    "<!-- fixture: readme-client.ts -->",
    "",
    "```typescript",
    'import { createClient } from "@terminalzero/lemonsqueezy/client";',
    "```",
    "",
  ].join("\n");

  assert.deepEqual(extractDocumentationExamples(markdown, "README.md"), [
    {
      name: "getting-started.ts",
      origin: "README.md",
      execute: true,
      source:
        'import { createClient } from "@terminalzero/lemonsqueezy/client";',
    },
    {
      name: "readme-client.ts",
      origin: "README.md",
      execute: false,
      source:
        'import { createClient } from "@terminalzero/lemonsqueezy/client";',
    },
  ]);
});

void test("documentation examples may import only public package entries", () => {
  assert.doesNotThrow(() => {
    assertSupportedPackageImports(
      'import { createClient } from "@terminalzero/lemonsqueezy/client";',
      "ok",
    );
  });
  assert.doesNotThrow(() => {
    assertSupportedPackageImports(
      'import type { User } from "@terminalzero/lemonsqueezy/types";',
      "ok-types",
    );
  });

  assert.throws(
    () =>
      assertSupportedPackageImports(
        'import { createClient } from "../src/client/index.ts";',
        "source-import.md",
      ),
    /source-import\.md.*unsupported package path \.\.\/src\/client\/index\.ts/,
  );
  assert.throws(
    () =>
      assertSupportedPackageImports(
        'import { createClient } from "@terminalzero/lemonsqueezy/dist/client/index.js";',
        "dist-import.md",
      ),
    /dist-import\.md.*unsupported package path @terminalzero\/lemonsqueezy\/dist\/client\/index\.js/,
  );
  assert.throws(
    () =>
      assertSupportedPackageImports(
        'await import("@terminalzero/lemonsqueezy/namespaces/orders/contract");',
        "deep-import.md",
      ),
    /deep-import\.md.*unsupported package path @terminalzero\/lemonsqueezy\/namespaces\/orders\/contract/,
  );
});

void test("code fences without fixture comments are still import-checked", () => {
  const markdown = [
    "```ts",
    'import { createClient } from "@terminalzero/lemonsqueezy/internal";',
    "```",
    "",
  ].join("\n");
  const [block] = collectMarkdownCodeBlocks(markdown);

  assert.equal(extractDocumentationExamples(markdown, "README.md").length, 0);
  assert.throws(
    () => assertSupportedPackageImports(block.source, "README.md"),
    /unsupported package path @terminalzero\/lemonsqueezy\/internal/,
  );
});

void test("local documentation links must resolve to files and headings", async () => {
  const directory = await mkdtemp(join(tmpdir(), "lemonsqueezy-docs-links-"));
  await writeFile(
    join(directory, "README.md"),
    [
      "# Lemon Squeezy JavaScript SDK",
      "",
      "## Installation",
      "",
      "[Getting Started](./docs/usage/getting-started.md#create-a-client)",
      "",
    ].join("\n"),
  );
  await mkdir(join(directory, "docs/usage"), { recursive: true });
  await writeFile(
    join(directory, "docs/usage/getting-started.md"),
    ["# Getting Started", "", "## Create a client", ""].join("\n"),
  );

  assert.doesNotThrow(() => {
    assertLocalDocumentationLinks(
      [
        "[Install](#installation)",
        "[Getting Started](./docs/usage/getting-started.md#create-a-client)",
        "[Official API](https://docs.lemonsqueezy.com/api)",
      ].join("\n"),
      "README.md",
      directory,
    );
  });

  assert.throws(
    () =>
      assertLocalDocumentationLinks(
        "[Missing](./docs/usage/missing.md)",
        "README.md",
        directory,
      ),
    /docs\/usage\/missing\.md/,
  );
  assert.throws(
    () =>
      assertLocalDocumentationLinks(
        "[Missing heading](./docs/usage/getting-started.md#not-a-heading)",
        "README.md",
        directory,
      ),
    /not-a-heading/,
  );
});

void test("documentation safety rejects credential literals and keeps env loading", () => {
  assert.doesNotThrow(() => {
    assertDocumentationSafety(
      "apiKey: process.env.LEMONSQUEEZY_API_KEY",
      "getting-started.md",
    );
  });
  assert.doesNotThrow(() => {
    assertDocumentationSafety(
      "The license namespace does not send a Bearer credential.",
      "docs/usage/client.md",
    );
  });
  assert.doesNotThrow(() => {
    assertDocumentationSafety(
      "Do not use these examples against Live Mode resources.",
      "orders-subscriptions.md",
    );
  });
  assert.throws(
    () =>
      assertDocumentationSafety(
        'apiKey: "sk_test_1234567890abcdef"',
        "getting-started.md",
      ),
    /getting-started\.md/,
  );
  assert.throws(
    () =>
      assertDocumentationSafety(
        'licenseKey: "ABC1-DEF2-GHI3"',
        "discounts-licensing.md",
      ),
    /License Key/,
  );
  assert.throws(
    () =>
      assertDocumentationSafety(
        'instanceId: "instance-42"',
        "discounts-licensing.md",
      ),
    /instance identifier/,
  );
  assert.throws(
    () =>
      assertDocumentationSafety(
        "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9",
        "discounts-licensing.md",
      ),
    /authorization header/,
  );
  assert.throws(
    () =>
      assertDocumentationSafety(
        "Use the API key from window.LEMONSQUEEZY_API_KEY in the browser.",
        "getting-started.md",
      ),
    /getting-started\.md/,
  );
  assert.throws(
    () =>
      assertDocumentationSafety(
        "console.log(result.license_key)",
        "discounts-licensing.md",
      ),
    /secret-like value/,
  );
  assert.throws(
    () =>
      assertDocumentationSafety(
        "Use these examples against Live Mode resources.",
        "orders-subscriptions.md",
      ),
    /Live Mode or production/,
  );
});

void test("the landing page routes readers through the v5 documentation path", () => {
  const readme = [
    "[Installation](#installation)",
    "[Getting Started](./docs/usage/getting-started.md)",
    "[API usage](./docs/usage/client.md)",
    "[Client API](./docs/usage/client-api.md)",
    "[Catalog, customers, and checkouts](./docs/usage/catalog-checkout.md)",
    "[Orders, subscriptions, and metering](./docs/usage/orders-subscriptions.md)",
    "[Discounts and licensing](./docs/usage/discounts-licensing.md)",
    "[Webhook management and inbound delivery](./docs/usage/webhooks.md)",
    "[Compatibility API](./docs/usage/compatibility-api.md)",
    "[Compatibility-first](#existing-v4-applications-compatibility-first)",
    "[Webhooks](#inbound-webhooks)",
    "[Webhook events](./docs/usage/webhooks.md#known-inbound-webhook-events)",
    "[Migration](./MIGRATION.md)",
    "[Official Lemon Squeezy API](https://docs.lemonsqueezy.com/api)",
  ].join("\n");

  assert.doesNotThrow(() => assertLandingPageRoutes(readme));
  assert.throws(
    () => assertLandingPageRoutes("[Installation](#installation)\n"),
    /Getting Started/,
  );
  assert.throws(
    () =>
      assertLandingPageRoutes(
        [
          "[Installation](#installation)",
          "[Getting Started](./docs/usage/getting-started.md)",
          "[API usage](./docs/usage/getting-started.md#make-a-first-request)",
          "[Client API](./docs/usage/client-api.md)",
          "[Compatibility API](./docs/usage/compatibility-api.md)",
          "[Compatibility-first](#existing-v4-applications-compatibility-first)",
          "[Webhooks](#inbound-webhooks)",
          "[Webhook events](./docs/usage/webhooks.md#known-inbound-webhook-events)",
          "[Migration](./MIGRATION.md)",
          "[Official Lemon Squeezy API](https://docs.lemonsqueezy.com/api)",
        ].join("\n"),
      ),
    /docs\/usage\/client\.md/,
  );
});

void test("documentation files include the Getting Started path", async () => {
  const directory = await mkdtemp(join(tmpdir(), "lemonsqueezy-docs-files-"));
  await mkdir(join(directory, "docs/usage"), { recursive: true });
  await writeFile(join(directory, "README.md"), "# README\n");
  await writeFile(
    join(directory, "docs/usage/getting-started.md"),
    "# Getting Started\n",
  );

  assert.deepEqual(await listDocumentationFiles(directory), [
    "README.md",
    "docs/usage/getting-started.md",
  ]);
});

void test("required usage guides cover the documented v5 workflow slices", () => {
  assert.deepEqual(
    [...REQUIRED_USAGE_GUIDES],
    [
      "docs/usage/catalog-checkout.md",
      "docs/usage/client-api.md",
      "docs/usage/client.md",
      "docs/usage/compatibility-api.md",
      "docs/usage/discounts-licensing.md",
      "docs/usage/getting-started.md",
      "docs/usage/orders-subscriptions.md",
      "docs/usage/webhooks.md",
    ],
  );
});

void test("the client guide contract requires public entries, errors, and official links", () => {
  const official = [
    "[API](https://docs.lemonsqueezy.com/api)",
    "[Requests](https://docs.lemonsqueezy.com/api/getting-started/requests)",
    "[Responses](https://docs.lemonsqueezy.com/api/getting-started/responses)",
  ].join("\n");
  const markdown = [
    PUBLIC_PACKAGE_ENTRIES.join("\n"),
    LEMONSQUEEZY_ERROR_CODES.map((code) => `\`${code}\``).join("\n"),
    "timeoutMs",
    "AbortSignal",
    "does not retry",
    "currentPage",
    "Compatibility facade",
    official,
  ].join("\n");

  assert.doesNotThrow(() =>
    assertClientGuideContract(markdown, "docs/usage/client.md"),
  );
  assert.throws(
    () => assertClientGuideContract("timeoutMs", "docs/usage/client.md"),
    /@terminalzero\/lemonsqueezy\/client/,
  );
  assert.throws(
    () =>
      assertClientGuideContract(
        `${markdown}\n[Unknown](https://docs.lemonsqueezy.com/api/missing-page)`,
        "docs/usage/client.md",
      ),
    /unknown official reference/,
  );
});

void test("the catalog-checkout guide contract requires operations and official links", () => {
  const official = [
    "[Affiliates list](https://docs.lemonsqueezy.com/api/affiliates/list-all-affiliates)",
    "[Affiliates get](https://docs.lemonsqueezy.com/api/affiliates/retrieve-affiliate)",
    "[Create checkout](https://docs.lemonsqueezy.com/api/checkouts/create-checkout)",
    "[List checkouts](https://docs.lemonsqueezy.com/api/checkouts/list-all-checkouts)",
    "[Retrieve checkout](https://docs.lemonsqueezy.com/api/checkouts/retrieve-checkout)",
    "[Create customer](https://docs.lemonsqueezy.com/api/customers/create-customer)",
    "[List customers](https://docs.lemonsqueezy.com/api/customers/list-all-customers)",
    "[Retrieve customer](https://docs.lemonsqueezy.com/api/customers/retrieve-customer)",
    "[Update customer](https://docs.lemonsqueezy.com/api/customers/update-customer)",
    "[List files](https://docs.lemonsqueezy.com/api/files/list-all-files)",
    "[Retrieve file](https://docs.lemonsqueezy.com/api/files/retrieve-file)",
    "[List prices](https://docs.lemonsqueezy.com/api/prices/list-all-prices)",
    "[Retrieve price](https://docs.lemonsqueezy.com/api/prices/retrieve-price)",
    "[List products](https://docs.lemonsqueezy.com/api/products/list-all-products)",
    "[Retrieve product](https://docs.lemonsqueezy.com/api/products/retrieve-product)",
    "[List stores](https://docs.lemonsqueezy.com/api/stores/list-all-stores)",
    "[Retrieve store](https://docs.lemonsqueezy.com/api/stores/retrieve-store)",
    "[Retrieve user](https://docs.lemonsqueezy.com/api/users/retrieve-user)",
    "[List variants](https://docs.lemonsqueezy.com/api/variants/list-all-variants)",
    "[Retrieve variant](https://docs.lemonsqueezy.com/api/variants/retrieve-variant)",
    "[Test Mode](https://docs.lemonsqueezy.com/help/getting-started/test-mode)",
  ].join("\n");
  const markdown = [
    CATALOG_CHECKOUT_OPERATIONS.map((operation) => `\`${operation}\``).join(
      "\n",
    ),
    "checkoutData.custom",
    "Opaque user data",
    official,
  ].join("\n");

  assert.doesNotThrow(() =>
    assertCatalogCheckoutGuideContract(
      markdown,
      "docs/usage/catalog-checkout.md",
    ),
  );
  assert.throws(
    () =>
      assertCatalogCheckoutGuideContract(
        "users.getAuthenticated",
        "docs/usage/catalog-checkout.md",
      ),
    /affiliates\.get/,
  );
});

void test("official reference hrefs are collected from markdown links", () => {
  assert.deepEqual(
    collectOfficialReferenceHrefs(
      "[Requests](https://docs.lemonsqueezy.com/api/getting-started/requests) [Local](./client.md)",
    ),
    ["https://docs.lemonsqueezy.com/api/getting-started/requests"],
  );
});

void test("the orders-subscriptions guide contract requires operations and action shapes", () => {
  const official = [
    "[Order items list](https://docs.lemonsqueezy.com/api/order-items/list-all-order-items)",
    "[Order items get](https://docs.lemonsqueezy.com/api/order-items/retrieve-order-item)",
    "[Generate order invoice](https://docs.lemonsqueezy.com/api/orders/generate-order-invoice)",
    "[Order refund](https://docs.lemonsqueezy.com/api/orders/issue-refund)",
    "[List orders](https://docs.lemonsqueezy.com/api/orders/list-all-orders)",
    "[Retrieve order](https://docs.lemonsqueezy.com/api/orders/retrieve-order)",
    "[Generate subscription invoice](https://docs.lemonsqueezy.com/api/subscription-invoices/generate-subscription-invoice)",
    "[Subscription invoice refund](https://docs.lemonsqueezy.com/api/subscription-invoices/issue-refund)",
    "[List subscription invoices](https://docs.lemonsqueezy.com/api/subscription-invoices/list-all-subscription-invoices)",
    "[Retrieve subscription invoice](https://docs.lemonsqueezy.com/api/subscription-invoices/retrieve-subscription-invoice)",
    "[List subscription items](https://docs.lemonsqueezy.com/api/subscription-items/list-all-subscription-items)",
    "[Retrieve subscription item](https://docs.lemonsqueezy.com/api/subscription-items/retrieve-subscription-item)",
    "[Current usage](https://docs.lemonsqueezy.com/api/subscription-items/retrieve-subscription-item-current-usage)",
    "[Update subscription item](https://docs.lemonsqueezy.com/api/subscription-items/update-subscription-item)",
    "[Cancel subscription](https://docs.lemonsqueezy.com/api/subscriptions/cancel-subscription)",
    "[List subscriptions](https://docs.lemonsqueezy.com/api/subscriptions/list-all-subscriptions)",
    "[Retrieve subscription](https://docs.lemonsqueezy.com/api/subscriptions/retrieve-subscription)",
    "[Update subscription](https://docs.lemonsqueezy.com/api/subscriptions/update-subscription)",
    "[Create usage record](https://docs.lemonsqueezy.com/api/usage-records/create-usage-record)",
    "[List usage records](https://docs.lemonsqueezy.com/api/usage-records/list-all-usage-records)",
    "[Retrieve usage record](https://docs.lemonsqueezy.com/api/usage-records/retrieve-usage-record)",
    "[Test Mode](https://docs.lemonsqueezy.com/help/getting-started/test-mode)",
  ].join("\n");
  const markdown = [
    ORDERS_SUBSCRIPTIONS_OPERATIONS.map((operation) => `\`${operation}\``).join(
      "\n",
    ),
    "currentPage",
    "download_invoice",
    "period_start",
    "Test Mode",
    official,
  ].join("\n");

  assert.doesNotThrow(() =>
    assertOrdersSubscriptionsGuideContract(
      markdown,
      "docs/usage/orders-subscriptions.md",
    ),
  );
  assert.throws(
    () =>
      assertOrdersSubscriptionsGuideContract(
        "orders.list",
        "docs/usage/orders-subscriptions.md",
      ),
    /orderItems\.get/,
  );
});

void test("the discounts-licensing guide contract requires operations and License API protocol", () => {
  const official = [
    "[List redemptions](https://docs.lemonsqueezy.com/api/discount-redemptions/list-all-discount-redemptions)",
    "[Retrieve redemption](https://docs.lemonsqueezy.com/api/discount-redemptions/retrieve-discount-redemption)",
    "[Create discount](https://docs.lemonsqueezy.com/api/discounts/create-discount)",
    "[Delete discount](https://docs.lemonsqueezy.com/api/discounts/delete-discount)",
    "[List discounts](https://docs.lemonsqueezy.com/api/discounts/list-all-discounts)",
    "[Retrieve discount](https://docs.lemonsqueezy.com/api/discounts/retrieve-discount)",
    "[Activate](https://docs.lemonsqueezy.com/api/license-api/activate-license-key)",
    "[Deactivate](https://docs.lemonsqueezy.com/api/license-api/deactivate-license-key)",
    "[Validate](https://docs.lemonsqueezy.com/api/license-api/validate-license-key)",
    "[List instances](https://docs.lemonsqueezy.com/api/license-key-instances/list-all-license-key-instances)",
    "[Retrieve instance](https://docs.lemonsqueezy.com/api/license-key-instances/retrieve-license-key-instance)",
    "[List license keys](https://docs.lemonsqueezy.com/api/license-keys/list-all-license-keys)",
    "[Retrieve license key](https://docs.lemonsqueezy.com/api/license-keys/retrieve-license-key)",
    "[Update license key](https://docs.lemonsqueezy.com/api/license-keys/update-license-key)",
    "[Test Mode](https://docs.lemonsqueezy.com/help/getting-started/test-mode)",
  ].join("\n");
  const markdown = [
    DISCOUNTS_LICENSING_OPERATIONS.map((operation) => `\`${operation}\``).join(
      "\n",
    ),
    "application/x-www-form-urlencoded",
    "activated",
    "deactivated",
    ".valid",
    "Test Mode",
    official,
  ].join("\n");

  assert.doesNotThrow(() =>
    assertDiscountsLicensingGuideContract(
      markdown,
      "docs/usage/discounts-licensing.md",
    ),
  );
  assert.throws(
    () =>
      assertDiscountsLicensingGuideContract(
        "discounts.list",
        "docs/usage/discounts-licensing.md",
      ),
    /discountRedemptions\.get/,
  );
});

void test("the webhook guide contract requires management ops, events, and verify-before-parse", () => {
  const official = [
    "[Create webhook](https://docs.lemonsqueezy.com/api/webhooks/create-webhook)",
    "[Delete webhook](https://docs.lemonsqueezy.com/api/webhooks/delete-webhook)",
    "[List webhooks](https://docs.lemonsqueezy.com/api/webhooks/list-all-webhooks)",
    "[Retrieve webhook](https://docs.lemonsqueezy.com/api/webhooks/retrieve-webhook)",
    "[Update webhook](https://docs.lemonsqueezy.com/api/webhooks/update-webhook)",
    "[Test Mode](https://docs.lemonsqueezy.com/help/getting-started/test-mode)",
    "[Event types](https://docs.lemonsqueezy.com/help/webhooks/event-types)",
    "[Signing](https://docs.lemonsqueezy.com/help/webhooks/signing-requests)",
    "[Simulate](https://docs.lemonsqueezy.com/help/webhooks/simulate-webhook-events)",
    "[Requests](https://docs.lemonsqueezy.com/help/webhooks/webhook-requests)",
  ].join("\n");
  const markdown = [
    WEBHOOK_MANAGEMENT_OPERATIONS.map((operation) => `\`${operation}\``).join(
      "\n",
    ),
    KNOWN_WEBHOOK_EVENT_NAMES.map((eventName) => `\`${eventName}\``).join("\n"),
    "parseWebhookEvent",
    "HMAC-SHA256",
    "X-Signature",
    "invalid_signature",
    "invalid_payload",
    "Test Mode",
    "if (!event.known) {",
    official,
  ].join("\n");

  assert.doesNotThrow(() =>
    assertWebhookGuideContract(markdown, "docs/usage/webhooks.md"),
  );
  assert.throws(
    () => assertWebhookGuideContract("webhooks.list", "docs/usage/webhooks.md"),
    /webhooks\.create/,
  );
});

void test("webhook documentation rejects parse-before-verify examples", () => {
  assert.doesNotThrow(() => {
    assertNoParseBeforeVerify(
      [
        "Verify the HMAC-SHA256 signature before parsing JSON.",
        "",
        "```ts",
        "parseWebhookEvent({ secret, rawBody, signature });",
        "```",
        "",
      ].join("\n"),
      "docs/usage/webhooks.md",
    );
  });
  assert.throws(
    () =>
      assertNoParseBeforeVerify(
        [
          "```ts",
          "const payload = JSON.parse(rawBody);",
          "parseWebhookEvent({ secret, rawBody: payload, signature });",
          "```",
        ].join("\n"),
        "docs/usage/webhooks.md",
      ),
    /parses JSON before webhook signature verification/,
  );
  assert.throws(
    () =>
      assertNoParseBeforeVerify(
        "Parse the JSON payload before verifying the signature.",
        "docs/usage/webhooks.md",
      ),
    /recommends parsing before signature verification/,
  );
});

void test("namespace contracts expose operation keys and official evidence", () => {
  const operations = parseNamespaceOperations(
    [
      "const objectEvidence =",
      '  "https://docs.lemonsqueezy.com/api/stores/the-store-object";',
      "const evidence = {",
      '  get: "https://docs.lemonsqueezy.com/api/stores/retrieve-store",',
      "  list:",
      '    "https://docs.lemonsqueezy.com/api/stores/list-all-stores",',
      "} as const;",
      "export const getStoreOperation = {",
      '  key: "stores.get",',
      "  evidence: [evidence.get, objectEvidence],",
      "};",
      "export const listStoresOperation = {",
      '  key: "stores.list",',
      "  evidence: [evidence.list, objectEvidence],",
      "};",
    ].join("\n"),
  );

  assert.deepEqual(
    operations.map((operation) => [
      operation.key,
      operation.officialEndpoint,
      operation.taskGuide,
    ]),
    [
      [
        "stores.get",
        "https://docs.lemonsqueezy.com/api/stores/retrieve-store",
        "docs/usage/catalog-checkout.md",
      ],
      [
        "stores.list",
        "https://docs.lemonsqueezy.com/api/stores/list-all-stores",
        "docs/usage/catalog-checkout.md",
      ],
    ],
  );
});

void test("compatibility and webhook catalogs parse identity maps", () => {
  assert.deepEqual(
    parseCompatibilityOperationCatalog(
      [
        "export const compatibilityOperationCatalog = {",
        '  getStore: "stores.get",',
        '  listStores: "stores.list",',
        "} as const;",
      ].join("\n"),
    ),
    { getStore: "stores.get", listStores: "stores.list" },
  );
  assert.deepEqual(
    parseKnownWebhookEventCatalog(
      [
        "export const knownWebhookEventCatalog = {",
        '  order_created: "orders",',
        '  affiliate_activated: "affiliates",',
        "} as const satisfies {",
      ].join("\n"),
    ),
    [
      {
        name: "order_created",
        resourceType: "orders",
        taskGuide: "docs/usage/orders-subscriptions.md",
        officialReference:
          "https://docs.lemonsqueezy.com/help/webhooks/event-types",
      },
      {
        name: "affiliate_activated",
        resourceType: "affiliates",
        taskGuide: "docs/usage/catalog-checkout.md",
        officialReference:
          "https://docs.lemonsqueezy.com/help/webhooks/event-types",
      },
    ],
  );
});

void test("the repository catalog is 21 namespaces, 61 methods, 59 facade functions, and 17 events", async () => {
  const catalog = await loadCanonicalDocumentationCatalog(repoRoot);
  assertCatalogCoverage(catalog);
});

void test("the Client API index accounts for every catalog namespace and method", () => {
  const catalog = {
    namespaces: ["stores", "users"],
    operations: [
      {
        key: "stores.list",
        namespace: "stores",
        officialEndpoint:
          "https://docs.lemonsqueezy.com/api/stores/list-all-stores",
        taskGuide: "docs/usage/catalog-checkout.md",
      },
      {
        key: "users.getAuthenticated",
        namespace: "users",
        officialEndpoint:
          "https://docs.lemonsqueezy.com/api/users/retrieve-user",
        taskGuide: "docs/usage/catalog-checkout.md",
      },
    ],
    compatibility: {},
    webhookEvents: [],
  };
  const markdown = [
    "## users",
    "",
    "| Method | Task guide | Official API |",
    "| ------ | ---------- | ------------ |",
    "| `users.getAuthenticated` | [Catalog](./catalog-checkout.md) | [Retrieve](https://docs.lemonsqueezy.com/api/users/retrieve-user) |",
    "",
    "## stores",
    "",
    "| Method | Task guide | Official API |",
    "| ------ | ---------- | ------------ |",
    "| `stores.list` | [Catalog](./catalog-checkout.md) | [List](https://docs.lemonsqueezy.com/api/stores/list-all-stores) |",
    "",
  ].join("\n");

  assert.doesNotThrow(() =>
    assertClientApiIndexContract(markdown, "docs/usage/client-api.md", catalog),
  );
  assert.throws(
    () =>
      assertClientApiIndexContract(
        [
          "## users",
          "",
          "| `users.getAuthenticated` | [Catalog](./catalog-checkout.md) | [Retrieve](https://docs.lemonsqueezy.com/api/users/retrieve-user) |",
          "",
          "## stores",
          "",
        ].join("\n"),
        "docs/usage/client-api.md",
        catalog,
      ),
    /stores\.list/,
  );
});

void test("the Compatibility API index maps every facade function to its Client equivalent", () => {
  const markdown = [
    "`lemonSqueezySetup` configures the Default Client.",
    "",
    "| Facade | Explicit Client | Task guide | Official API |",
    "| ------ | --------------- | ---------- | ------------ |",
    "| `getStore` | `stores.get` | [Catalog](./catalog-checkout.md) | [Retrieve](https://docs.lemonsqueezy.com/api/stores/retrieve-store) |",
    "| `listStores` | `stores.list` | [Catalog](./catalog-checkout.md) | [List](https://docs.lemonsqueezy.com/api/stores/list-all-stores) |",
    "",
  ].join("\n");

  const fullCatalog = {
    namespaces: [],
    operations: [
      {
        key: "stores.get",
        namespace: "stores",
        officialEndpoint:
          "https://docs.lemonsqueezy.com/api/stores/retrieve-store",
        taskGuide: "docs/usage/catalog-checkout.md",
      },
      {
        key: "stores.list",
        namespace: "stores",
        officialEndpoint:
          "https://docs.lemonsqueezy.com/api/stores/list-all-stores",
        taskGuide: "docs/usage/catalog-checkout.md",
      },
    ],
    compatibility: { getStore: "stores.get", listStores: "stores.list" },
    webhookEvents: [],
  };

  assert.doesNotThrow(() =>
    assertCompatibilityApiIndexContract(
      markdown,
      "docs/usage/compatibility-api.md",
      fullCatalog,
    ),
  );
  assert.throws(
    () =>
      assertCompatibilityApiIndexContract(
        "`lemonSqueezySetup`\n| `getStore` | `stores.get` | [Catalog](./catalog-checkout.md) | [Retrieve](https://docs.lemonsqueezy.com/api/stores/retrieve-store) |\n",
        "docs/usage/compatibility-api.md",
        fullCatalog,
      ),
    /listStores/,
  );
});

void test("the webhook event index accounts for known names and unknown authenticated events", () => {
  const catalog = {
    namespaces: [],
    operations: [],
    compatibility: {},
    webhookEvents: [
      {
        name: "order_created",
        resourceType: "orders",
        taskGuide: "docs/usage/orders-subscriptions.md",
        officialReference:
          "https://docs.lemonsqueezy.com/help/webhooks/event-types",
      },
      {
        name: "affiliate_activated",
        resourceType: "affiliates",
        taskGuide: "docs/usage/catalog-checkout.md",
        officialReference:
          "https://docs.lemonsqueezy.com/help/webhooks/event-types",
      },
    ],
  };
  const markdown = [
    "Authenticated unknown events remain supported.",
    "",
    "| Event name | Resource type | Task guide | Official |",
    "| ---------- | ------------- | ---------- | -------- |",
    "| `order_created` | `orders` | [Orders](./orders-subscriptions.md) | [Event types](https://docs.lemonsqueezy.com/help/webhooks/event-types) |",
    "| `affiliate_activated` | `affiliates` | [Catalog](./catalog-checkout.md) | [Event types](https://docs.lemonsqueezy.com/help/webhooks/event-types) |",
    "",
  ].join("\n");

  assert.doesNotThrow(() =>
    assertWebhookEventIndexContract(
      markdown,
      "docs/usage/webhooks.md",
      catalog,
    ),
  );
  assert.throws(
    () =>
      assertWebhookEventIndexContract(
        "Authenticated unknown events remain supported.\n| `order_created` | `orders` | [Orders](./orders-subscriptions.md) | [Event types](https://docs.lemonsqueezy.com/help/webhooks/event-types) |\n",
        "docs/usage/webhooks.md",
        catalog,
      ),
    /affiliate_activated/,
  );
});

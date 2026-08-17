import assert from "node:assert/strict";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import {
  assertCatalogCheckoutGuideContract,
  assertClientGuideContract,
  assertDocumentationSafety,
  assertLandingPageRoutes,
  assertLocalDocumentationLinks,
  assertSupportedPackageImports,
  CATALOG_CHECKOUT_OPERATIONS,
  collectMarkdownCodeBlocks,
  collectOfficialReferenceHrefs,
  extractDocumentationExamples,
  LEMONSQUEEZY_ERROR_CODES,
  listDocumentationFiles,
  PUBLIC_PACKAGE_ENTRIES,
  REQUIRED_USAGE_GUIDES,
} from "../../scripts/lib/docs-contract.mjs";

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
        "Use the API key from window.LEMONSQUEEZY_API_KEY in the browser.",
        "getting-started.md",
      ),
    /getting-started\.md/,
  );
});

void test("the landing page routes readers through the v5 documentation path", () => {
  const readme = [
    "[Installation](#installation)",
    "[Getting Started](./docs/usage/getting-started.md)",
    "[API usage](./docs/usage/client.md)",
    "[Catalog, customers, and checkouts](./docs/usage/catalog-checkout.md)",
    "[Compatibility API](#existing-v4-applications-compatibility-first)",
    "[Webhooks](#inbound-webhooks)",
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
          "[Compatibility API](#existing-v4-applications-compatibility-first)",
          "[Webhooks](#inbound-webhooks)",
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

void test("required usage guides cover client and catalog-checkout slices", () => {
  assert.deepEqual(
    [...REQUIRED_USAGE_GUIDES],
    [
      "docs/usage/catalog-checkout.md",
      "docs/usage/client.md",
      "docs/usage/getting-started.md",
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

import assert from "node:assert/strict";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import {
  assertDocumentationSafety,
  assertLandingPageRoutes,
  assertLocalDocumentationLinks,
  assertSupportedPackageImports,
  collectMarkdownCodeBlocks,
  extractDocumentationExamples,
  listDocumentationFiles,
  PUBLIC_PACKAGE_ENTRIES,
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
    "[API usage](./docs/usage/getting-started.md#make-a-first-request)",
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

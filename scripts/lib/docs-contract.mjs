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
  "docs/usage/client.md",
  "docs/usage/getting-started.md",
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
});

const extraOfficialReferenceLinks = Object.freeze([
  "https://docs.lemonsqueezy.com/api",
  "https://docs.lemonsqueezy.com/api/affiliates/the-affiliate-object",
  "https://docs.lemonsqueezy.com/api/checkouts/the-checkout-object",
  "https://docs.lemonsqueezy.com/api/customers/the-customer-object",
  "https://docs.lemonsqueezy.com/api/files/the-file-object",
  "https://docs.lemonsqueezy.com/api/getting-started/requests",
  "https://docs.lemonsqueezy.com/api/getting-started/responses",
  "https://docs.lemonsqueezy.com/api/prices/the-price-object",
  "https://docs.lemonsqueezy.com/api/products/the-product-object",
  "https://docs.lemonsqueezy.com/api/stores/the-store-object",
  "https://docs.lemonsqueezy.com/api/users/the-user-object",
  "https://docs.lemonsqueezy.com/api/variants/the-variant-object",
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
  {
    href: "docs/usage/catalog-checkout.md",
    label: "catalog, customers, and checkouts",
  },
  {
    href: "#existing-v4-applications-compatibility-first",
    label: "Compatibility API",
  },
  { href: "#inbound-webhooks", label: "webhooks" },
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
    /window\.[A-Z0-9_]*API_KEY|window\.[A-Z0-9_]*SECRET/i,
    `${origin} exposes a credential to browser code`,
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

export function assertRequiredOfficialReferenceLinks(markdown, origin) {
  const required = REQUIRED_OFFICIAL_REFERENCE_LINKS[origin];
  if (!required) return;

  assertRequiredTokens(markdown, origin, required);

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

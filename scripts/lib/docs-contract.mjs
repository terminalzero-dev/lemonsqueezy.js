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
  {
    href: "docs/usage/getting-started.md#make-a-first-request",
    label: "API usage",
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

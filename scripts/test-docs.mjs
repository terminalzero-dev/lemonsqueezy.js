import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { prepareConsumer, root, run } from "./lib/canonical-artifact.mjs";
import {
  assertCatalogCheckoutGuideContract,
  assertClientGuideContract,
  assertDiscountsLicensingGuideContract,
  assertDocumentationSafety,
  assertLandingPageRoutes,
  assertLocalDocumentationLinks,
  assertOrdersSubscriptionsGuideContract,
  assertSupportedPackageImports,
  assertWebhookGuideContract,
  collectMarkdownCodeBlocks,
  extractDocumentationExamples,
  listDocumentationFiles,
  REQUIRED_USAGE_GUIDES,
} from "./lib/docs-contract.mjs";

const documentationFiles = await listDocumentationFiles(root);
assert.deepEqual(
  documentationFiles.filter((file) => REQUIRED_USAGE_GUIDES.includes(file)),
  [...REQUIRED_USAGE_GUIDES],
);

const examples = [];
for (const relativePath of documentationFiles) {
  const markdown = await readFile(join(root, relativePath), "utf8");
  assertDocumentationSafety(markdown, relativePath);
  assertLocalDocumentationLinks(markdown, relativePath, root);
  if (relativePath === "docs/usage/client.md") {
    assertClientGuideContract(markdown, relativePath);
  }
  if (relativePath === "docs/usage/catalog-checkout.md") {
    assertCatalogCheckoutGuideContract(markdown, relativePath);
  }
  if (relativePath === "docs/usage/orders-subscriptions.md") {
    assertOrdersSubscriptionsGuideContract(markdown, relativePath);
  }
  if (relativePath === "docs/usage/discounts-licensing.md") {
    assertDiscountsLicensingGuideContract(markdown, relativePath);
  }
  if (relativePath === "docs/usage/webhooks.md") {
    assertWebhookGuideContract(markdown, relativePath);
  }
  for (const block of collectMarkdownCodeBlocks(markdown)) {
    assertSupportedPackageImports(block.source, `${relativePath} example`);
  }
  examples.push(...extractDocumentationExamples(markdown, relativePath));
}

assertLandingPageRoutes(await readFile(join(root, "README.md"), "utf8"));
assert.ok(
  examples.some((example) => example.execute),
  "documentation must include at least one credential-free executable example",
);

const { consumerDirectory, installedPackage } = await prepareConsumer("docs");
assert.equal(
  installedPackage.startsWith(join(consumerDirectory, "node_modules")),
  true,
  "documentation consumer must install the canonical package artifact",
);

const exampleDirectory = join(consumerDirectory, "docs-examples");
await mkdir(exampleDirectory, { recursive: true });

const exampleGlobals = [
  "declare const process: { readonly env: Record<string, string | undefined> };",
  "declare const console: { error(...values: unknown[]): void; log(...values: unknown[]): void };",
  'declare class AbortSignal { readonly aborted: boolean; readonly reason: unknown; addEventListener(type: "abort", listener: () => void): void; removeEventListener(type: "abort", listener: () => void): void; }',
  "declare class AbortController { readonly signal: AbortSignal; abort(reason?: unknown): void; }",
].join("\n");

for (const example of examples) {
  await writeFile(
    join(exampleDirectory, example.name),
    `${exampleGlobals}\n${example.source}\n`,
  );
}

const exampleFiles = examples.map((example) => example.name);
await writeFile(
  join(exampleDirectory, "tsconfig.nodenext.json"),
  `${JSON.stringify(
    {
      compilerOptions: {
        lib: ["ES2022"],
        module: "NodeNext",
        moduleResolution: "NodeNext",
        noEmit: true,
        skipLibCheck: false,
        strict: true,
        target: "ES2022",
        types: [],
      },
      files: exampleFiles,
    },
    null,
    2,
  )}\n`,
);
await writeFile(
  join(exampleDirectory, "tsconfig.bundler.json"),
  `${JSON.stringify(
    {
      compilerOptions: {
        lib: ["ES2022"],
        module: "ESNext",
        moduleResolution: "Bundler",
        noEmit: true,
        skipLibCheck: false,
        strict: true,
        target: "ES2022",
        types: [],
      },
      files: exampleFiles,
    },
    null,
    2,
  )}\n`,
);

const executeFiles = examples
  .filter((example) => example.execute)
  .map((example) => example.name);
await writeFile(
  join(exampleDirectory, "tsconfig.emit.json"),
  `${JSON.stringify(
    {
      compilerOptions: {
        lib: ["ES2022"],
        module: "NodeNext",
        moduleResolution: "NodeNext",
        noEmit: false,
        outDir: "../docs-examples-out",
        rootDir: ".",
        skipLibCheck: false,
        strict: true,
        target: "ES2022",
        types: [],
      },
      files: executeFiles,
    },
    null,
    2,
  )}\n`,
);

await writeFile(
  join(consumerDirectory, "docs-runtime.mjs"),
  [
    'import { resolve } from "node:path";',
    'import { pathToFileURL } from "node:url";',
    "",
    "globalThis.fetch = async () => {",
    '  throw new Error("documentation examples must not make network requests");',
    "};",
    "",
    "const examplePath = process.argv[2];",
    "if (!examplePath) {",
    '  throw new Error("missing documentation example path");',
    "}",
    "",
    "await import(pathToFileURL(resolve(examplePath)).href);",
    "",
  ].join("\n"),
);

const compilers = [
  ["TypeScript 5.4", join(root, "node_modules/typescript-5-4/bin/tsc")],
  ["TypeScript 6", join(root, "node_modules/typescript/bin/tsc")],
  ["TypeScript latest", join(root, "node_modules/typescript-latest/bin/tsc")],
];

for (const [label, compiler] of compilers) {
  console.log(label);
  run(process.execPath, [compiler, "--version"], { cwd: consumerDirectory });
  run(
    process.execPath,
    [compiler, "-p", "docs-examples/tsconfig.nodenext.json"],
    {
      cwd: consumerDirectory,
    },
  );
  run(
    process.execPath,
    [compiler, "-p", "docs-examples/tsconfig.bundler.json"],
    {
      cwd: consumerDirectory,
    },
  );
}

run(
  process.execPath,
  [
    join(root, "node_modules/typescript/bin/tsc"),
    "-p",
    "docs-examples/tsconfig.emit.json",
  ],
  { cwd: consumerDirectory },
);

const requestedRuntime = process.env.PACKAGE_SMOKE_RUNTIME ?? "all";
assert.match(requestedRuntime, /^(?:all|node|bun)$/);
const runtimes = [];
if (requestedRuntime === "all" || requestedRuntime === "node") {
  runtimes.push(["Node", process.env.PACKAGE_SMOKE_NODE_BINARY ?? "node"]);
}
if (requestedRuntime === "all" || requestedRuntime === "bun") {
  runtimes.push(["Bun", process.env.PACKAGE_SMOKE_BUN_BINARY ?? "bun"]);
}

const credentialFreeEnv = { ...process.env };
for (const key of Object.keys(credentialFreeEnv)) {
  if (
    /LEMON/i.test(key) &&
    /(?:API_KEY|SECRET|TOKEN|PASSWORD|LICENSE_KEY)/i.test(key)
  ) {
    delete credentialFreeEnv[key];
  }
}

for (const [label, binary] of runtimes) {
  assert.ok(binary, `${label} runtime binary must not be empty`);
  console.log(label);
  run(binary, ["--version"], { cwd: consumerDirectory });
  for (const file of executeFiles) {
    const emitted = join(
      "docs-examples-out",
      file.replace(/\.tsx?$/, ".js").replace(/\.mts$/, ".js"),
    );
    run(binary, ["docs-runtime.mjs", emitted], {
      cwd: consumerDirectory,
      env: credentialFreeEnv,
    });
  }
}

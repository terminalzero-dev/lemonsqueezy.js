import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const objectPagePattern = /\/the-[a-z0-9-]+-object$/;

export const NAMESPACE_TASK_GUIDES = Object.freeze({
  affiliates: "docs/usage/catalog-checkout.md",
  checkouts: "docs/usage/catalog-checkout.md",
  customers: "docs/usage/catalog-checkout.md",
  files: "docs/usage/catalog-checkout.md",
  prices: "docs/usage/catalog-checkout.md",
  products: "docs/usage/catalog-checkout.md",
  stores: "docs/usage/catalog-checkout.md",
  users: "docs/usage/catalog-checkout.md",
  variants: "docs/usage/catalog-checkout.md",
  orderItems: "docs/usage/orders-subscriptions.md",
  orders: "docs/usage/orders-subscriptions.md",
  subscriptionInvoices: "docs/usage/orders-subscriptions.md",
  subscriptionItems: "docs/usage/orders-subscriptions.md",
  subscriptions: "docs/usage/orders-subscriptions.md",
  usageRecords: "docs/usage/orders-subscriptions.md",
  discountRedemptions: "docs/usage/discounts-licensing.md",
  discounts: "docs/usage/discounts-licensing.md",
  license: "docs/usage/discounts-licensing.md",
  licenseKeyInstances: "docs/usage/discounts-licensing.md",
  licenseKeys: "docs/usage/discounts-licensing.md",
  webhooks: "docs/usage/webhooks.md",
});

export const WEBHOOK_EVENT_TASK_GUIDES = Object.freeze({
  affiliate_activated: "docs/usage/catalog-checkout.md",
  customer_updated: "docs/usage/catalog-checkout.md",
  license_key_created: "docs/usage/discounts-licensing.md",
  license_key_updated: "docs/usage/discounts-licensing.md",
  order_created: "docs/usage/orders-subscriptions.md",
  order_refunded: "docs/usage/orders-subscriptions.md",
  subscription_cancelled: "docs/usage/orders-subscriptions.md",
  subscription_created: "docs/usage/orders-subscriptions.md",
  subscription_expired: "docs/usage/orders-subscriptions.md",
  subscription_paused: "docs/usage/orders-subscriptions.md",
  subscription_payment_failed: "docs/usage/orders-subscriptions.md",
  subscription_payment_recovered: "docs/usage/orders-subscriptions.md",
  subscription_payment_refunded: "docs/usage/orders-subscriptions.md",
  subscription_payment_success: "docs/usage/orders-subscriptions.md",
  subscription_resumed: "docs/usage/orders-subscriptions.md",
  subscription_unpaused: "docs/usage/orders-subscriptions.md",
  subscription_updated: "docs/usage/orders-subscriptions.md",
});

export const WEBHOOK_EVENT_OFFICIAL_REFERENCE =
  "https://docs.lemonsqueezy.com/help/webhooks/event-types";

export function officialEndpointUrl(evidence) {
  return evidence.find((url) => !objectPagePattern.test(url));
}

export function parseStringConstants(source) {
  const constants = {};
  for (const match of source.matchAll(
    /(?:const|let)\s+(\w+)\s*=\s*"(https:\/\/docs\.lemonsqueezy\.com[^"]+)"/g,
  )) {
    constants[match[1]] = match[2];
  }

  const evidenceBlock = source.match(
    /const evidence = \{([\s\S]*?)\} as const;/,
  );
  if (!evidenceBlock) {
    return constants;
  }

  for (const entry of evidenceBlock[1].matchAll(
    /(\w+):\s*\n?\s*"(https:\/\/docs\.lemonsqueezy\.com[^"]+)"/g,
  )) {
    constants[entry[1]] = entry[2];
    constants[`evidence.${entry[1]}`] = entry[2];
  }
  return constants;
}

function resolveEvidenceItem(item, constants) {
  const trimmed = item.trim();
  const quoted = trimmed.match(/^"(https:\/\/docs\.lemonsqueezy\.com[^"]+)"$/);
  if (quoted) return quoted[1];
  if (constants[trimmed]) return constants[trimmed];
  return undefined;
}

export function parseNamespaceOperations(source) {
  const constants = parseStringConstants(source);
  const operations = [];
  const blocks = source.split(/export const \w+Operation = \{/);
  for (const block of blocks.slice(1)) {
    const key = block.match(/key:\s*"([^"]+)"/)?.[1];
    const evidenceSection = block.match(/evidence:\s*\[([\s\S]*?)\]/)?.[1];
    if (!key || evidenceSection === undefined) continue;

    const evidence = evidenceSection
      .split(",")
      .map((item) => resolveEvidenceItem(item, constants))
      .filter((url) => typeof url === "string");

    const [namespace, method] = key.split(".");
    operations.push({
      key,
      namespace,
      method,
      evidence,
      officialEndpoint: officialEndpointUrl(evidence),
      taskGuide: NAMESPACE_TASK_GUIDES[namespace],
    });
  }
  return operations;
}

export function parseCompatibilityOperationCatalog(source) {
  const match = source.match(
    /export const compatibilityOperationCatalog = \{([\s\S]*?)\n\} as const;/,
  );
  if (!match) {
    throw new Error("compatibilityOperationCatalog was not found");
  }

  const entries = {};
  for (const line of match[1].matchAll(
    /^\s*([A-Za-z]+):\s*"([^"]+)",?\s*$/gm,
  )) {
    entries[line[1]] = line[2];
  }
  return entries;
}

export function parseKnownWebhookEventCatalog(source) {
  const match = source.match(
    /export const knownWebhookEventCatalog = \{([\s\S]*?)\n\} as const satisfies/,
  );
  if (!match) {
    throw new Error("knownWebhookEventCatalog was not found");
  }

  return [...match[1].matchAll(/^\s*([a-z_]+):\s*"([^"]+)",?\s*$/gm)].map(
    (entry) => ({
      name: entry[1],
      resourceType: entry[2],
      taskGuide: WEBHOOK_EVENT_TASK_GUIDES[entry[1]],
      officialReference: WEBHOOK_EVENT_OFFICIAL_REFERENCE,
    }),
  );
}

export async function loadCanonicalDocumentationCatalog(root) {
  const namespacesDirectory = join(root, "src/namespaces");
  const operations = [];
  if (existsSync(namespacesDirectory)) {
    const namespaceEntries = await readdir(namespacesDirectory, {
      withFileTypes: true,
    });
    for (const entry of namespaceEntries) {
      if (!entry.isDirectory()) continue;
      const contractPath = join(namespacesDirectory, entry.name, "contract.ts");
      if (!existsSync(contractPath)) continue;
      operations.push(
        ...parseNamespaceOperations(await readFile(contractPath, "utf8")),
      );
    }
  }

  operations.sort((left, right) => left.key.localeCompare(right.key));
  const namespaces = [
    ...new Set(operations.map((operation) => operation.namespace)),
  ].sort((left, right) => left.localeCompare(right));

  const compatibility = parseCompatibilityOperationCatalog(
    await readFile(join(root, "src/internal/v5/contract-catalog.ts"), "utf8"),
  );
  const webhookEvents = parseKnownWebhookEventCatalog(
    await readFile(
      join(root, "src/webhook-receiver/parse-webhook-event.ts"),
      "utf8",
    ),
  );

  return {
    namespaces,
    operations,
    compatibility,
    webhookEvents,
  };
}

export function collectCatalogOfficialReferenceLinks(catalog) {
  const links = new Set();
  for (const operation of catalog.operations) {
    for (const url of operation.evidence) {
      links.add(url);
    }
  }
  for (const event of catalog.webhookEvents) {
    links.add(event.officialReference);
  }
  return [...links];
}

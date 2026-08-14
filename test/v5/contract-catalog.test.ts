import { describe, expect, it } from "vitest";
import { createClient } from "../../src/client";
import {
  compatibilityOperationCatalog,
  operationCatalog,
} from "../../src/internal/v5/contract-catalog";
import * as compatibility from "../../src/compat";
import { webhookSubscriptionEventNames } from "../../src/namespaces/webhooks/types";
import { knownWebhookEventCatalog } from "../../src/webhook-receiver/parse-webhook-event";

const readArgs = ["catalog-id", {}] as const;
const listArgs = [{}] as const;
const sampleArguments: Record<string, readonly unknown[]> = {
  "affiliates.get": readArgs,
  "affiliates.list": listArgs,
  "checkouts.create": [{ storeId: 1, variantId: 2 }],
  "checkouts.get": readArgs,
  "checkouts.list": listArgs,
  "customers.archive": ["catalog-id"],
  "customers.create": [
    { storeId: 1, name: "Catalog", email: "catalog@example.com" },
  ],
  "customers.get": readArgs,
  "customers.list": listArgs,
  "customers.update": ["catalog-id", { name: "Catalog" }],
  "discountRedemptions.get": readArgs,
  "discountRedemptions.list": listArgs,
  "discounts.create": [
    { storeId: 1, name: "Catalog", amount: 10, amountType: "percent" },
  ],
  "discounts.delete": ["catalog-id"],
  "discounts.get": readArgs,
  "discounts.list": listArgs,
  "files.get": readArgs,
  "files.list": listArgs,
  "license.activate": [
    { licenseKey: "catalog-key", instanceName: "Catalog instance" },
  ],
  "license.deactivate": [
    { licenseKey: "catalog-key", instanceId: "catalog-instance" },
  ],
  "license.validate": [{ licenseKey: "catalog-key" }],
  "licenseKeyInstances.get": readArgs,
  "licenseKeyInstances.list": listArgs,
  "licenseKeys.get": readArgs,
  "licenseKeys.list": listArgs,
  "licenseKeys.update": ["catalog-id", { disabled: false }],
  "orderItems.get": readArgs,
  "orderItems.list": listArgs,
  "orders.generateInvoice": ["catalog-id", undefined],
  "orders.get": readArgs,
  "orders.list": listArgs,
  "orders.refund": ["catalog-id", undefined],
  "prices.get": readArgs,
  "prices.list": listArgs,
  "products.get": readArgs,
  "products.list": listArgs,
  "stores.get": readArgs,
  "stores.list": listArgs,
  "subscriptionInvoices.generateInvoice": ["catalog-id", undefined],
  "subscriptionInvoices.get": readArgs,
  "subscriptionInvoices.list": listArgs,
  "subscriptionInvoices.refund": ["catalog-id", undefined],
  "subscriptionItems.currentUsage": ["catalog-id"],
  "subscriptionItems.get": readArgs,
  "subscriptionItems.list": listArgs,
  "subscriptionItems.update": ["catalog-id", { quantity: 1 }],
  "subscriptions.cancel": ["catalog-id"],
  "subscriptions.get": readArgs,
  "subscriptions.list": listArgs,
  "subscriptions.update": ["catalog-id", { cancelled: false }],
  "usageRecords.create": [{ subscriptionItemId: 1, quantity: 1 }],
  "usageRecords.get": readArgs,
  "usageRecords.list": listArgs,
  "users.getAuthenticated": [],
  "variants.get": readArgs,
  "variants.list": listArgs,
  "webhooks.create": [
    {
      storeId: 1,
      url: "https://example.com/catalog",
      events: ["order_created"],
      secret: "catalog-secret",
    },
  ],
  "webhooks.delete": ["catalog-id"],
  "webhooks.get": readArgs,
  "webhooks.list": listArgs,
  "webhooks.update": ["catalog-id", { events: ["order_created"] }],
};

describe("v5 structural contract catalog", () => {
  it("locks all public namespaces and Operation Contracts", () => {
    const client = createClient();
    const namespaces = Object.keys(client).sort();
    const operationKeys = operationCatalog.map(
      ({ operation }) => operation.key,
    );

    expect(namespaces).toHaveLength(21);
    expect(operationCatalog).toHaveLength(61);
    expect(new Set(operationKeys).size).toBe(61);
    expect(
      [...new Set(operationKeys.map((key) => key.split(".")[0]))].sort(),
    ).toEqual(namespaces);
    for (const namespace of namespaces) {
      const catalogMethods = operationKeys
        .filter((key) => key.startsWith(`${namespace}.`))
        .map((key) => key.slice(namespace.length + 1))
        .sort();
      expect(
        Object.keys(client[namespace as keyof typeof client]).sort(),
      ).toEqual(catalogMethods);
    }
    expect(
      operationCatalog.every(
        ({ operation }) =>
          operation.evidence.length > 0 &&
          operation.evidence.every((pointer) =>
            pointer.startsWith("https://docs.lemonsqueezy.com/"),
          ),
      ),
    ).toBe(true);
    expect(Object.keys(sampleArguments).sort()).toEqual(operationKeys.sort());

    for (const { operation, request } of operationCatalog) {
      const compiled = (
        operation.compile as (args: readonly unknown[]) => {
          readonly protocol: string;
          readonly method: string;
          readonly path: string;
        }
      )(sampleArguments[operation.key]!);

      expect(
        [compiled.protocol, compiled.method, compiled.path],
        operation.key,
      ).toEqual([
        request.protocol,
        request.method,
        request.path.replace(":id", "catalog-id"),
      ]);
    }
  });

  it("locks every Compatibility facade resource projection", () => {
    const facadeNames = Object.keys(compatibility)
      .filter((name) => name !== "lemonSqueezySetup")
      .sort();
    const mappedNames = Object.keys(compatibilityOperationCatalog).sort();
    const operationKeys = new Set(
      operationCatalog.map(({ operation }) => operation.key),
    );

    expect(facadeNames).toHaveLength(59);
    expect(mappedNames).toEqual(facadeNames);
    expect(new Set(Object.values(compatibilityOperationCatalog)).size).toBe(59);
    expect(
      Object.values(compatibilityOperationCatalog).every((key) =>
        operationKeys.has(key),
      ),
    ).toBe(true);
  });

  it("locks all known Inbound Webhook event routes", () => {
    expect(webhookSubscriptionEventNames).toHaveLength(17);
    expect(Object.keys(knownWebhookEventCatalog).sort()).toEqual(
      [...webhookSubscriptionEventNames].sort(),
    );
    expect(
      Object.values(knownWebhookEventCatalog).every(
        (resourceType) =>
          typeof resourceType === "string" && resourceType.length > 0,
      ),
    ).toBe(true);
  });
});

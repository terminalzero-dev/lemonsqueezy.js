import { existsSync } from "node:fs";
import type { LemonSqueezyClient } from "../../src/client";
import type { SuccessContract } from "../../src/internal/v5/types";
import {
  getAffiliateOperation,
  listAffiliatesOperation,
} from "../../src/namespaces/affiliates/contract";
import {
  createCheckoutOperation,
  getCheckoutOperation,
  listCheckoutsOperation,
} from "../../src/namespaces/checkouts/contract";
import {
  archiveCustomerOperation,
  createCustomerOperation,
  getCustomerOperation,
  listCustomersOperation,
  updateCustomerOperation,
} from "../../src/namespaces/customers/contract";
import {
  getDiscountRedemptionOperation,
  listDiscountRedemptionsOperation,
} from "../../src/namespaces/discount-redemptions/contract";
import {
  createDiscountOperation,
  deleteDiscountOperation,
  getDiscountOperation,
  listDiscountsOperation,
} from "../../src/namespaces/discounts/contract";
import {
  getFileOperation,
  listFilesOperation,
} from "../../src/namespaces/files/contract";
import {
  getLicenseKeyInstanceOperation,
  listLicenseKeyInstancesOperation,
} from "../../src/namespaces/license-key-instances/contract";
import {
  getLicenseKeyOperation,
  listLicenseKeysOperation,
  updateLicenseKeyOperation,
} from "../../src/namespaces/license-keys/contract";
import {
  activateLicenseOperation,
  deactivateLicenseOperation,
  validateLicenseOperation,
} from "../../src/namespaces/license/contract";
import {
  getOrderItemOperation,
  listOrderItemsOperation,
} from "../../src/namespaces/order-items/contract";
import {
  generateOrderInvoiceOperation,
  getOrderOperation,
  listOrdersOperation,
  refundOrderOperation,
} from "../../src/namespaces/orders/contract";
import {
  getPriceOperation,
  listPricesOperation,
} from "../../src/namespaces/prices/contract";
import {
  getProductOperation,
  listProductsOperation,
} from "../../src/namespaces/products/contract";
import {
  getStoreOperation,
  listStoresOperation,
} from "../../src/namespaces/stores/contract";
import {
  generateSubscriptionInvoiceOperation,
  getSubscriptionInvoiceOperation,
  listSubscriptionInvoicesOperation,
  refundSubscriptionInvoiceOperation,
} from "../../src/namespaces/subscription-invoices/contract";
import {
  getSubscriptionItemCurrentUsageOperation,
  getSubscriptionItemOperation,
  listSubscriptionItemsOperation,
  updateSubscriptionItemOperation,
} from "../../src/namespaces/subscription-items/contract";
import {
  cancelSubscriptionOperation,
  getSubscriptionOperation,
  listSubscriptionsOperation,
  updateSubscriptionOperation,
} from "../../src/namespaces/subscriptions/contract";
import {
  createUsageRecordOperation,
  getUsageRecordOperation,
  listUsageRecordsOperation,
} from "../../src/namespaces/usage-records/contract";
import { getAuthenticatedUserOperation } from "../../src/namespaces/users/contract";
import {
  getVariantOperation,
  listVariantsOperation,
} from "../../src/namespaces/variants/contract";
import {
  createWebhookOperation,
  deleteWebhookOperation,
  getWebhookOperation,
  listWebhooksOperation,
  updateWebhookOperation,
} from "../../src/namespaces/webhooks/contract";

export interface CatalogOperation {
  readonly key: `${string}.${string}`;
  readonly success: SuccessContract;
  readonly evidence: readonly string[];
}

export interface NamespaceCatalogEntry {
  readonly name: string;
  readonly methods: readonly {
    readonly name: string;
    readonly operation: CatalogOperation;
  }[];
}

export interface CompatibilityCatalogEntry {
  readonly name: string;
  readonly operation: CatalogOperation;
  readonly parityEvidence: `test/${string}.test.ts`;
}

export interface ContractCatalog {
  readonly namespaces: readonly NamespaceCatalogEntry[];
  readonly compatibility: readonly CompatibilityCatalogEntry[];
}

function namespace<Name extends keyof LemonSqueezyClient>(
  name: Name,
  methods: Record<
    Extract<keyof LemonSqueezyClient[Name], string>,
    CatalogOperation
  >,
): NamespaceCatalogEntry {
  return {
    name,
    methods: (Object.entries(methods) as [string, CatalogOperation][]).map(
      ([methodName, operation]) => ({
        name: methodName,
        operation,
      }),
    ),
  };
}

type CompatibilityName = Exclude<
  keyof typeof import("../../src/compat"),
  "lemonSqueezySetup"
>;

function compatibility(
  name: CompatibilityName,
  operation: CatalogOperation,
  parityEvidence: CompatibilityCatalogEntry["parityEvidence"],
): CompatibilityCatalogEntry {
  return { name, operation, parityEvidence };
}

const namespaces = [
  namespace("users", { getAuthenticated: getAuthenticatedUserOperation }),
  namespace("stores", {
    get: getStoreOperation,
    list: listStoresOperation,
  }),
  namespace("products", {
    get: getProductOperation,
    list: listProductsOperation,
  }),
  namespace("variants", {
    get: getVariantOperation,
    list: listVariantsOperation,
  }),
  namespace("prices", {
    get: getPriceOperation,
    list: listPricesOperation,
  }),
  namespace("files", { get: getFileOperation, list: listFilesOperation }),
  namespace("affiliates", {
    get: getAffiliateOperation,
    list: listAffiliatesOperation,
  }),
  namespace("customers", {
    create: createCustomerOperation,
    get: getCustomerOperation,
    list: listCustomersOperation,
    update: updateCustomerOperation,
    archive: archiveCustomerOperation,
  }),
  namespace("checkouts", {
    create: createCheckoutOperation,
    get: getCheckoutOperation,
    list: listCheckoutsOperation,
  }),
  namespace("orders", {
    generateInvoice: generateOrderInvoiceOperation,
    get: getOrderOperation,
    list: listOrdersOperation,
    refund: refundOrderOperation,
  }),
  namespace("orderItems", {
    get: getOrderItemOperation,
    list: listOrderItemsOperation,
  }),
  namespace("subscriptions", {
    get: getSubscriptionOperation,
    cancel: cancelSubscriptionOperation,
    update: updateSubscriptionOperation,
    list: listSubscriptionsOperation,
  }),
  namespace("subscriptionInvoices", {
    list: listSubscriptionInvoicesOperation,
    get: getSubscriptionInvoiceOperation,
    generateInvoice: generateSubscriptionInvoiceOperation,
    refund: refundSubscriptionInvoiceOperation,
  }),
  namespace("subscriptionItems", {
    update: updateSubscriptionItemOperation,
    list: listSubscriptionItemsOperation,
    get: getSubscriptionItemOperation,
    currentUsage: getSubscriptionItemCurrentUsageOperation,
  }),
  namespace("usageRecords", {
    list: listUsageRecordsOperation,
    get: getUsageRecordOperation,
    create: createUsageRecordOperation,
  }),
  namespace("discounts", {
    get: getDiscountOperation,
    list: listDiscountsOperation,
    create: createDiscountOperation,
    delete: deleteDiscountOperation,
  }),
  namespace("discountRedemptions", {
    get: getDiscountRedemptionOperation,
    list: listDiscountRedemptionsOperation,
  }),
  namespace("licenseKeys", {
    get: getLicenseKeyOperation,
    update: updateLicenseKeyOperation,
    list: listLicenseKeysOperation,
  }),
  namespace("licenseKeyInstances", {
    get: getLicenseKeyInstanceOperation,
    list: listLicenseKeyInstancesOperation,
  }),
  namespace("license", {
    activate: activateLicenseOperation,
    deactivate: deactivateLicenseOperation,
    validate: validateLicenseOperation,
  }),
  namespace("webhooks", {
    get: getWebhookOperation,
    update: updateWebhookOperation,
    create: createWebhookOperation,
    list: listWebhooksOperation,
    delete: deleteWebhookOperation,
  }),
] as const;

const readOnlyCatalogEvidence =
  "test/v5/compat-read-only-catalog.test.ts" as const;
const customerCheckoutEvidence =
  "test/v5/compat-customer-checkout.test.ts" as const;
const orderEvidence = "test/v5/compat-orders.test.ts" as const;
const subscriptionEvidence = "test/v5/compat-subscriptions.test.ts" as const;
const subscriptionInvoiceEvidence =
  "test/v5/compat-subscription-invoices.test.ts" as const;
const subscriptionItemEvidence =
  "test/v5/compat-subscription-items-usage-records.test.ts" as const;
const discountEvidence =
  "test/v5/compat-discounts-redemptions.test.ts" as const;
const licenseManagementEvidence =
  "test/v5/compat-license-management.test.ts" as const;
const licenseApiEvidence = "test/v5/compat-license-api.test.ts" as const;
const webhookEvidence = "test/v5/compat-webhooks.test.ts" as const;

const compatibilityMappings = [
  compatibility(
    "activateLicense",
    activateLicenseOperation,
    licenseApiEvidence,
  ),
  compatibility(
    "archiveCustomer",
    archiveCustomerOperation,
    customerCheckoutEvidence,
  ),
  compatibility(
    "cancelSubscription",
    cancelSubscriptionOperation,
    subscriptionEvidence,
  ),
  compatibility(
    "createCheckout",
    createCheckoutOperation,
    customerCheckoutEvidence,
  ),
  compatibility(
    "createCustomer",
    createCustomerOperation,
    customerCheckoutEvidence,
  ),
  compatibility("createDiscount", createDiscountOperation, discountEvidence),
  compatibility(
    "createUsageRecord",
    createUsageRecordOperation,
    subscriptionItemEvidence,
  ),
  compatibility("createWebhook", createWebhookOperation, webhookEvidence),
  compatibility(
    "deactivateLicense",
    deactivateLicenseOperation,
    licenseApiEvidence,
  ),
  compatibility("deleteDiscount", deleteDiscountOperation, discountEvidence),
  compatibility("deleteWebhook", deleteWebhookOperation, webhookEvidence),
  compatibility(
    "generateOrderInvoice",
    generateOrderInvoiceOperation,
    orderEvidence,
  ),
  compatibility(
    "generateSubscriptionInvoice",
    generateSubscriptionInvoiceOperation,
    subscriptionInvoiceEvidence,
  ),
  compatibility(
    "getAuthenticatedUser",
    getAuthenticatedUserOperation,
    "test/v5/compat-users.test.ts",
  ),
  compatibility("getCheckout", getCheckoutOperation, customerCheckoutEvidence),
  compatibility("getCustomer", getCustomerOperation, customerCheckoutEvidence),
  compatibility("getDiscount", getDiscountOperation, discountEvidence),
  compatibility(
    "getDiscountRedemption",
    getDiscountRedemptionOperation,
    discountEvidence,
  ),
  compatibility("getFile", getFileOperation, readOnlyCatalogEvidence),
  compatibility(
    "getLicenseKey",
    getLicenseKeyOperation,
    licenseManagementEvidence,
  ),
  compatibility(
    "getLicenseKeyInstance",
    getLicenseKeyInstanceOperation,
    licenseManagementEvidence,
  ),
  compatibility("getOrder", getOrderOperation, orderEvidence),
  compatibility("getOrderItem", getOrderItemOperation, orderEvidence),
  compatibility("getPrice", getPriceOperation, readOnlyCatalogEvidence),
  compatibility("getProduct", getProductOperation, readOnlyCatalogEvidence),
  compatibility("getStore", getStoreOperation, readOnlyCatalogEvidence),
  compatibility(
    "getSubscription",
    getSubscriptionOperation,
    subscriptionEvidence,
  ),
  compatibility(
    "getSubscriptionInvoice",
    getSubscriptionInvoiceOperation,
    subscriptionInvoiceEvidence,
  ),
  compatibility(
    "getSubscriptionItem",
    getSubscriptionItemOperation,
    subscriptionItemEvidence,
  ),
  compatibility(
    "getSubscriptionItemCurrentUsage",
    getSubscriptionItemCurrentUsageOperation,
    subscriptionItemEvidence,
  ),
  compatibility(
    "getUsageRecord",
    getUsageRecordOperation,
    subscriptionItemEvidence,
  ),
  compatibility("getVariant", getVariantOperation, readOnlyCatalogEvidence),
  compatibility("getWebhook", getWebhookOperation, webhookEvidence),
  compatibility("issueOrderRefund", refundOrderOperation, orderEvidence),
  compatibility(
    "issueSubscriptionInvoiceRefund",
    refundSubscriptionInvoiceOperation,
    subscriptionInvoiceEvidence,
  ),
  compatibility(
    "listCheckouts",
    listCheckoutsOperation,
    customerCheckoutEvidence,
  ),
  compatibility(
    "listCustomers",
    listCustomersOperation,
    customerCheckoutEvidence,
  ),
  compatibility(
    "listDiscountRedemptions",
    listDiscountRedemptionsOperation,
    discountEvidence,
  ),
  compatibility("listDiscounts", listDiscountsOperation, discountEvidence),
  compatibility("listFiles", listFilesOperation, readOnlyCatalogEvidence),
  compatibility(
    "listLicenseKeyInstances",
    listLicenseKeyInstancesOperation,
    licenseManagementEvidence,
  ),
  compatibility(
    "listLicenseKeys",
    listLicenseKeysOperation,
    licenseManagementEvidence,
  ),
  compatibility("listOrderItems", listOrderItemsOperation, orderEvidence),
  compatibility("listOrders", listOrdersOperation, orderEvidence),
  compatibility("listPrices", listPricesOperation, readOnlyCatalogEvidence),
  compatibility("listProducts", listProductsOperation, readOnlyCatalogEvidence),
  compatibility("listStores", listStoresOperation, readOnlyCatalogEvidence),
  compatibility(
    "listSubscriptionInvoices",
    listSubscriptionInvoicesOperation,
    subscriptionInvoiceEvidence,
  ),
  compatibility(
    "listSubscriptionItems",
    listSubscriptionItemsOperation,
    subscriptionItemEvidence,
  ),
  compatibility(
    "listSubscriptions",
    listSubscriptionsOperation,
    subscriptionEvidence,
  ),
  compatibility(
    "listUsageRecords",
    listUsageRecordsOperation,
    subscriptionItemEvidence,
  ),
  compatibility("listVariants", listVariantsOperation, readOnlyCatalogEvidence),
  compatibility("listWebhooks", listWebhooksOperation, webhookEvidence),
  compatibility(
    "updateCustomer",
    updateCustomerOperation,
    customerCheckoutEvidence,
  ),
  compatibility(
    "updateLicenseKey",
    updateLicenseKeyOperation,
    licenseManagementEvidence,
  ),
  compatibility(
    "updateSubscription",
    updateSubscriptionOperation,
    subscriptionEvidence,
  ),
  compatibility(
    "updateSubscriptionItem",
    updateSubscriptionItemOperation,
    subscriptionItemEvidence,
  ),
  compatibility("updateWebhook", updateWebhookOperation, webhookEvidence),
  compatibility(
    "validateLicense",
    validateLicenseOperation,
    licenseApiEvidence,
  ),
] as const;

export const contractCatalog: ContractCatalog = {
  namespaces,
  compatibility: compatibilityMappings,
};

export function getContractCatalogIssues(
  catalog: ContractCatalog,
  client: object,
  compatibilityFacade: object,
): readonly string[] {
  const issues: string[] = [];
  const actualNamespaces = Object.keys(client);
  const catalogNamespaces = catalog.namespaces.map(({ name }) => name);

  addCountIssue(issues, "namespace", catalogNamespaces.length, 21);
  addDuplicates(issues, catalogNamespaces, "namespace");
  addSetDifferences(issues, actualNamespaces, catalogNamespaces, "namespace");

  const catalogClient = client as Record<string, object | undefined>;
  const allMethods = catalog.namespaces.flatMap((namespaceEntry) => {
    const actualMethods = Object.keys(catalogClient[namespaceEntry.name] ?? {});
    const catalogMethods = namespaceEntry.methods.map(({ name }) => name);
    addDuplicates(
      issues,
      catalogMethods.map((name) => `${namespaceEntry.name}.${name}`),
      "Canonical method",
    );
    addSetDifferences(
      issues,
      actualMethods.map((name) => `${namespaceEntry.name}.${name}`),
      catalogMethods.map((name) => `${namespaceEntry.name}.${name}`),
      "Canonical method",
    );
    return namespaceEntry.methods.map((method) => ({
      namespace: namespaceEntry.name,
      ...method,
    }));
  });

  addCountIssue(issues, "Operation Contract", allMethods.length, 61);
  const operationKeys = allMethods.map(({ operation }) => operation.key);
  addDuplicates(issues, operationKeys, "Operation Contract key");

  for (const method of allMethods) {
    const expectedKey = `${method.namespace}.${method.name}`;
    if (method.operation.key !== expectedKey) {
      issues.push(`missing Operation Contract key: ${expectedKey}`);
      issues.push(`extra Operation Contract key: ${method.operation.key}`);
    }
    if (method.operation.evidence.length === 0) {
      issues.push(
        `missing Operation Contract evidence: ${method.operation.key}`,
      );
    }
    if (
      method.operation.evidence.some(
        (pointer) => !pointer.startsWith("https://docs.lemonsqueezy.com/"),
      )
    ) {
      issues.push(
        `invalid Operation Contract evidence: ${method.operation.key}`,
      );
    }
    if (!method.operation.success?.kind) {
      issues.push(
        `missing Operation Contract success kind: ${method.operation.key}`,
      );
    }
  }

  const actualCompatibility = Object.keys(compatibilityFacade).filter(
    (name) => name !== "lemonSqueezySetup",
  );
  const mappedCompatibility = catalog.compatibility.map(({ name }) => name);
  addCountIssue(
    issues,
    "Compatibility mapping",
    mappedCompatibility.length,
    59,
  );
  addDuplicates(issues, mappedCompatibility, "Compatibility mapping");
  addSetDifferences(
    issues,
    actualCompatibility,
    mappedCompatibility,
    "Compatibility mapping",
  );

  const mappedOperationKeys = catalog.compatibility.map(
    ({ operation }) => operation.key,
  );
  addDuplicates(
    issues,
    mappedOperationKeys,
    "Compatibility Operation Contract",
  );
  const operationKeySet = new Set(operationKeys);
  for (const mapping of catalog.compatibility) {
    if (!operationKeySet.has(mapping.operation.key)) {
      issues.push(
        `unknown Compatibility Operation Contract: ${mapping.operation.key}`,
      );
    }
    if (
      !existsSync(new URL(`../../${mapping.parityEvidence}`, import.meta.url))
    ) {
      issues.push(`missing Compatibility parity evidence: ${mapping.name}`);
    }
  }

  return issues;
}

function addCountIssue(
  issues: string[],
  label: string,
  actual: number,
  expected: number,
): void {
  if (actual !== expected) {
    issues.push(`expected ${expected} ${label}s, received ${actual}`);
  }
}

function addDuplicates(
  issues: string[],
  values: readonly string[],
  label: string,
): void {
  const seen = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) issues.push(`duplicate ${label}: ${value}`);
    seen.add(value);
  }
}

function addSetDifferences(
  issues: string[],
  expected: readonly string[],
  actual: readonly string[],
  label: string,
): void {
  const expectedSet = new Set(expected);
  const actualSet = new Set(actual);
  for (const value of expectedSet) {
    if (!actualSet.has(value)) issues.push(`missing ${label}: ${value}`);
  }
  for (const value of actualSet) {
    if (!expectedSet.has(value)) issues.push(`extra ${label}: ${value}`);
  }
}

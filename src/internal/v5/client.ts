import type { LemonSqueezyClient } from "../../client";
import { createUsersNamespace } from "../../namespaces/users/namespace";
import { createStoresNamespace } from "../../namespaces/stores/namespace";
import { createProductsNamespace } from "../../namespaces/products/namespace";
import { createVariantsNamespace } from "../../namespaces/variants/namespace";
import { createPricesNamespace } from "../../namespaces/prices/namespace";
import { createFilesNamespace } from "../../namespaces/files/namespace";
import { createAffiliatesNamespace } from "../../namespaces/affiliates/namespace";
import { createCustomersNamespace } from "../../namespaces/customers/namespace";
import { createCheckoutsNamespace } from "../../namespaces/checkouts/namespace";
import { createOrdersNamespace } from "../../namespaces/orders/namespace";
import { createOrderItemsNamespace } from "../../namespaces/order-items/namespace";
import { createSubscriptionsNamespace } from "../../namespaces/subscriptions/namespace";
import { createSubscriptionInvoicesNamespace } from "../../namespaces/subscription-invoices/namespace";
import { createSubscriptionItemsNamespace } from "../../namespaces/subscription-items/namespace";
import { createUsageRecordsNamespace } from "../../namespaces/usage-records/namespace";
import { createDiscountsNamespace } from "../../namespaces/discounts/namespace";
import { createDiscountRedemptionsNamespace } from "../../namespaces/discount-redemptions/namespace";
import { createLicenseKeysNamespace } from "../../namespaces/license-keys/namespace";
import { createLicenseKeyInstancesNamespace } from "../../namespaces/license-key-instances/namespace";
import { createResourceRuntime } from "./runtime";
import {
  DEFAULT_TIMEOUT_MS,
  type ClientOptions,
  type TransportAdapter,
} from "./types";

export function createClientWithTransport(
  options: ClientOptions,
  transport: TransportAdapter,
): LemonSqueezyClient {
  const runtime = createResourceRuntime(
    {
      apiKey: options.apiKey,
      timeoutMs: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    },
    transport,
  );

  return Object.freeze({
    users: createUsersNamespace(runtime),
    stores: createStoresNamespace(runtime),
    products: createProductsNamespace(runtime),
    variants: createVariantsNamespace(runtime),
    prices: createPricesNamespace(runtime),
    files: createFilesNamespace(runtime),
    affiliates: createAffiliatesNamespace(runtime),
    customers: createCustomersNamespace(runtime),
    checkouts: createCheckoutsNamespace(runtime),
    orders: createOrdersNamespace(runtime),
    orderItems: createOrderItemsNamespace(runtime),
    subscriptions: createSubscriptionsNamespace(runtime),
    subscriptionInvoices: createSubscriptionInvoicesNamespace(runtime),
    subscriptionItems: createSubscriptionItemsNamespace(runtime),
    usageRecords: createUsageRecordsNamespace(runtime),
    discounts: createDiscountsNamespace(runtime),
    discountRedemptions: createDiscountRedemptionsNamespace(runtime),
    licenseKeys: createLicenseKeysNamespace(runtime),
    licenseKeyInstances: createLicenseKeyInstancesNamespace(runtime),
  });
}

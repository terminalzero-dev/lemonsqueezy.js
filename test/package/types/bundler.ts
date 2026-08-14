import {
  activateLicense,
  lemonSqueezySetup,
} from "@terminalzero/lemonsqueezy/compat";
import { createClient } from "@terminalzero/lemonsqueezy/client";
import type {
  AffiliateListResponse,
  CheckoutResponse,
  CustomerResponse,
  OrderListResponse,
  OrderItemListResponse,
  SubscriptionListResponse,
  SubscriptionInvoiceListResponse,
  SubscriptionItemListResponse,
  UsageRecordListResponse,
  DiscountListResponse,
  DiscountRedemptionListResponse,
  LicenseKeyListResponse,
  LicenseKeyInstanceListResponse,
  ActivateLicenseResponse,
  Flatten,
  UserResponse,
  WebhookListResponse,
} from "@terminalzero/lemonsqueezy/types";

const config = lemonSqueezySetup({ apiKey: "type-contract" });
const value: Flatten<{ value: string }> = { value: config.apiKey ?? "" };
const response: Promise<UserResponse> = createClient({
  apiKey: "type-contract",
}).users.getAuthenticated();
const affiliates: Promise<AffiliateListResponse> = createClient({
  apiKey: "type-contract",
}).affiliates.list();
const customer: Promise<CustomerResponse> = createClient({
  apiKey: "type-contract",
}).customers.archive(1);
const checkout: Promise<CheckoutResponse> = createClient({
  apiKey: "type-contract",
}).checkouts.create({
  storeId: 1,
  variantId: 2,
  checkoutData: { custom: { camelCase: "preserved" } },
});
const orders: Promise<OrderListResponse> = createClient({
  apiKey: "type-contract",
}).orders.list({ filter: { orderNumber: 42 } });
const orderItems: Promise<OrderItemListResponse> = createClient({
  apiKey: "type-contract",
}).orderItems.list({ filter: { orderId: 42 } });
const subscriptions: Promise<SubscriptionListResponse> = createClient({
  apiKey: "type-contract",
}).subscriptions.list({}, { timeoutMs: 1_000 });
const subscriptionInvoices: Promise<SubscriptionInvoiceListResponse> =
  createClient({ apiKey: "type-contract" }).subscriptionInvoices.list(
    { filter: { status: "paid", refunded: false } },
    { timeoutMs: 1_000 },
  );
const subscriptionItems: Promise<SubscriptionItemListResponse> = createClient({
  apiKey: "type-contract",
}).subscriptionItems.list({ filter: { subscriptionId: 1 } });
const usageRecords: Promise<UsageRecordListResponse> = createClient({
  apiKey: "type-contract",
}).usageRecords.list({ filter: { subscriptionItemId: 1 } });
const discounts: Promise<DiscountListResponse> = createClient({
  apiKey: "type-contract",
}).discounts.list({ filter: { storeId: 1 } });
const discountRedemptions: Promise<DiscountRedemptionListResponse> =
  createClient({ apiKey: "type-contract" }).discountRedemptions.list({
    filter: { discountId: 1, orderId: 2 },
  });
const licenseKeys: Promise<LicenseKeyListResponse> = createClient({
  apiKey: "type-contract",
}).licenseKeys.list({ filter: { status: "active" } });
const licenseKeyInstances: Promise<LicenseKeyInstanceListResponse> =
  createClient({ apiKey: "type-contract" }).licenseKeyInstances.list({
    filter: { licenseKeyId: 1 },
  });
const webhooks: Promise<WebhookListResponse> = createClient({
  apiKey: "type-contract",
}).webhooks.list({ filter: { storeId: 1 } });
const activatedLicense: Promise<ActivateLicenseResponse> = createClient(
  {},
).license.activate(
  { licenseKey: "business-license-key", instanceName: "Work laptop" },
  { timeoutMs: 1_000 },
);
const activatedLicenseEnvelope = activateLicense(
  "business-license-key",
  "Work laptop",
);

void value;
void response;
void affiliates;
void customer;
void checkout;
void orders;
void orderItems;
void subscriptions;
void subscriptionInvoices;
void subscriptionItems;
void usageRecords;
void discounts;
void discountRedemptions;
void licenseKeys;
void licenseKeyInstances;
void webhooks;
void activatedLicense;
void activatedLicenseEnvelope;

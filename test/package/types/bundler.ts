import { lemonSqueezySetup } from "@terminalzero/lemonsqueezy/compat";
import { createClient } from "@terminalzero/lemonsqueezy/client";
import type {
  AffiliateListResponse,
  CheckoutResponse,
  CustomerResponse,
  OrderListResponse,
  OrderItemListResponse,
  SubscriptionListResponse,
  SubscriptionInvoiceListResponse,
  Flatten,
  UserResponse,
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

void value;
void response;
void affiliates;
void customer;
void checkout;
void orders;
void orderItems;
void subscriptions;
void subscriptionInvoices;

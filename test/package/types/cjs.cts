import sdk = require("@terminalzero/lemonsqueezy");
import clientEntry = require("@terminalzero/lemonsqueezy/client");
import type { LemonSqueezyError, User } from "@terminalzero/lemonsqueezy";
import type {
  ListCustomersParams,
  UserResponse,
  AffiliateResponse,
  CheckoutResponse,
  CustomerResponse,
  GenerateOrderInvoiceResponse,
  OrderItemResponse,
  OrderResponse,
  SubscriptionResponse,
  GenerateSubscriptionInvoiceResponse,
  SubscriptionInvoiceResponse,
} from "@terminalzero/lemonsqueezy/types";

type UserEnvelope =
  | {
      readonly statusCode: number;
      readonly data: User | null;
      readonly error: null;
    }
  | {
      readonly statusCode: number | null;
      readonly data: null;
      readonly error: LemonSqueezyError;
    };

const userPromise: Promise<UserEnvelope> = sdk.getAuthenticatedUser();
const client = clientEntry.createClient({ apiKey: "type-contract" });
const directUser: Promise<UserResponse> = client.users.getAuthenticated();
const affiliate: Promise<AffiliateResponse> = client.affiliates.get(1);
const customer: Promise<CustomerResponse> = client.customers.update(1, {
  city: null,
});
const checkout: Promise<CheckoutResponse> = client.checkouts.get(1);
const filters: ListCustomersParams = { filter: { storeId: 1 } };
const order: Promise<OrderResponse> = client.orders.refund(1);
const invoice: Promise<GenerateOrderInvoiceResponse> =
  client.orders.generateInvoice(1);
const orderItem: Promise<OrderItemResponse> = client.orderItems.get(1);
const subscription: Promise<SubscriptionResponse> = client.subscriptions.cancel(
  1,
  { timeoutMs: 1_000 },
);
const subscriptionInvoice: Promise<SubscriptionInvoiceResponse> =
  client.subscriptionInvoices.refund(1);
const generatedSubscriptionInvoice: Promise<GenerateSubscriptionInvoiceResponse> =
  client.subscriptionInvoices.generateInvoice(1);
const subscriptionInvoiceEnvelope = sdk.generateSubscriptionInvoice(1);
const fullSubscriptionInvoiceRefundEnvelope =
  sdk.issueSubscriptionInvoiceRefund(1);

void userPromise;
void directUser;
void affiliate;
void customer;
void checkout;
void filters;
void order;
void invoice;
void orderItem;
void subscription;
void subscriptionInvoice;
void generatedSubscriptionInvoice;
void subscriptionInvoiceEnvelope;
void fullSubscriptionInvoiceRefundEnvelope;

// @ts-expect-error internal package paths are closed
import("@terminalzero/lemonsqueezy/internal");
// @ts-expect-error Compatibility facade returns an envelope, not a direct body
const directFacadeBody: Promise<UserResponse> = sdk.getAuthenticatedUser();
void directFacadeBody;

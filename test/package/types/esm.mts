import {
  createClient,
  generateSubscriptionInvoice,
  getAuthenticatedUser,
  issueSubscriptionInvoiceRefund,
  isLemonSqueezyError,
  updateSubscriptionItem,
  type LemonSqueezyError,
  type User,
  type AffiliateResponse,
} from "@terminalzero/lemonsqueezy";
import type {
  AffiliateStatus,
  CheckoutResponse,
  CreateCheckoutInput,
  CreateCustomerInput,
  CustomerResponse,
  CustomerRelationships,
  GenerateOrderInvoiceResponse,
  OrderItemListResponse,
  OrderItemResponse,
  OrderListResponse,
  OrderResponse,
  OrderStatus,
  RefundOrderInput,
  SubscriptionListResponse,
  SubscriptionInvoiceBillingReason,
  SubscriptionInvoiceListResponse,
  SubscriptionInvoiceResponse,
  SubscriptionInvoiceStatus,
  GenerateSubscriptionInvoiceResponse,
  RefundSubscriptionInvoiceInput,
  SubscriptionPaymentProcessor,
  SubscriptionResponse,
  SubscriptionItemCurrentUsageResponse,
  SubscriptionItemListResponse,
  SubscriptionItemResponse,
  UsageRecordListResponse,
  UsageRecordResponse,
  FileListResponse,
  FileResponse,
  JSONValue,
  ListCustomersParams,
  PriceListResponse,
  PriceResponse,
  ProductListResponse,
  ProductResponse,
  StoreListResponse,
  StoreResponse,
  UserResponse,
  VariantListResponse,
  VariantResponse,
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

const userPromise: Promise<UserEnvelope> = getAuthenticatedUser();
const client = createClient({ apiKey: "type-contract", timeoutMs: 1_000 });
const directUser: Promise<UserResponse> = client.users.getAuthenticated();
const store: Promise<StoreResponse> = client.stores.get(1);
const stores: Promise<StoreListResponse> = client.stores.list();
const product: Promise<ProductResponse> = client.products.get(
  1,
  {},
  { timeoutMs: 1_000 },
);
const products: Promise<ProductListResponse> = client.products.list();
const variant: Promise<VariantResponse> = client.variants.get(1);
const variants: Promise<VariantListResponse> = client.variants.list();
const price: Promise<PriceResponse> = client.prices.get(1);
const prices: Promise<PriceListResponse> = client.prices.list();
const file: Promise<FileResponse> = client.files.get(1);
const files: Promise<FileListResponse> = client.files.list();
const affiliate: Promise<AffiliateResponse> = client.affiliates.get(1, {
  include: ["store", "user"],
});
const affiliates = client.affiliates.list({
  filter: { storeId: 1, userEmail: "affiliate@example.com" },
  page: { number: 1, size: 10 },
});
const createCustomerInput: CreateCustomerInput = {
  storeId: 1,
  name: "Ada",
  email: "ada@example.com",
};
const customer: Promise<CustomerResponse> =
  client.customers.create(createCustomerInput);
const customers = client.customers.list({
  filter: { storeId: 1, email: "" },
  include: ["affiliates"],
});
const archived: Promise<CustomerResponse> = client.customers.archive(1);
const createCheckoutInput: CreateCheckoutInput = {
  storeId: 1,
  variantId: 2,
  checkoutOptions: { embed: false, locale: "en" },
  checkoutData: {
    custom: { userId: 1, snake_case: true, nested: { camelCase: "kept" } },
  },
  expiresAt: null,
};
const checkout: Promise<CheckoutResponse> =
  client.checkouts.create(createCheckoutInput);
const checkouts = client.checkouts.list({
  filter: { storeId: 1, variantId: 2 },
});
const order: Promise<OrderResponse> = client.orders.get(1, {
  include: ["affiliate"],
});
const orders: Promise<OrderListResponse> = client.orders.list({
  filter: { storeId: 1, userEmail: "", orderNumber: 42 },
});
const invoice: Promise<GenerateOrderInvoiceResponse> =
  client.orders.generateInvoice(1);
const refundInput: RefundOrderInput = { amount: 250 };
const refund: Promise<OrderResponse> = client.orders.refund(1, refundInput);
const orderItem: Promise<OrderItemResponse> = client.orderItems.get(1, {
  include: ["order", "product", "variant"],
});
const orderItems: Promise<OrderItemListResponse> = client.orderItems.list({
  filter: { orderId: 1, productId: 2, variantId: 3 },
});
const subscription: Promise<SubscriptionResponse> = client.subscriptions.get(
  1,
  { include: ["subscription-items"] },
  { timeoutMs: 1_000 },
);
const subscriptions: Promise<SubscriptionListResponse> =
  client.subscriptions.list(
    { filter: { status: "active" } },
    { timeoutMs: 1_000 },
  );
const updatedSubscription: Promise<SubscriptionResponse> =
  client.subscriptions.update(
    1,
    { pause: null, cancelled: false, billingAnchor: 0 },
    { timeoutMs: 1_000 },
  );
const cancelledSubscription: Promise<SubscriptionResponse> =
  client.subscriptions.cancel(1, { timeoutMs: 1_000 });
const subscriptionItem: Promise<SubscriptionItemResponse> =
  client.subscriptionItems.get(1, { include: ["price"] });
const subscriptionItems: Promise<SubscriptionItemListResponse> =
  client.subscriptionItems.list({ filter: { subscriptionId: 1, priceId: 2 } });
const currentUsage: Promise<SubscriptionItemCurrentUsageResponse> =
  client.subscriptionItems.currentUsage(1, { timeoutMs: 1_000 });
const updatedSubscriptionItem: Promise<SubscriptionItemResponse> =
  client.subscriptionItems.update(1, { quantity: 3 });
const numericSubscriptionItemEnvelope = updateSubscriptionItem(1, 3);
const objectSubscriptionItemEnvelope = updateSubscriptionItem(1, {
  quantity: 3,
  invoiceImmediately: false,
});
const usageRecord: Promise<UsageRecordResponse> = client.usageRecords.create({
  subscriptionItemId: 1,
  quantity: 5,
  action: "set",
});
const usageRecords: Promise<UsageRecordListResponse> = client.usageRecords.list(
  {
    filter: { subscriptionItemId: 1 },
  },
);
const subscriptionInvoice: Promise<SubscriptionInvoiceResponse> =
  client.subscriptionInvoices.get(1, { include: ["affiliate"] });
const subscriptionInvoices: Promise<SubscriptionInvoiceListResponse> =
  client.subscriptionInvoices.list(
    {
      filter: {
        storeId: 1,
        status: "partial_refund",
        refunded: false,
        subscriptionId: 2,
      },
      page: { number: 1, size: 10 },
    },
    { timeoutMs: 1_000 },
  );
const generatedSubscriptionInvoice: Promise<GenerateSubscriptionInvoiceResponse> =
  client.subscriptionInvoices.generateInvoice(1);
const refundSubscriptionInvoiceInput: RefundSubscriptionInvoiceInput = {
  amount: 250,
};
const refundedSubscriptionInvoice: Promise<SubscriptionInvoiceResponse> =
  client.subscriptionInvoices.refund(1, refundSubscriptionInvoiceInput);
const generatedSubscriptionInvoiceEnvelope = generateSubscriptionInvoice(1);
const fullSubscriptionInvoiceRefundEnvelope = issueSubscriptionInvoiceRefund(1);
const futureSubscriptionInvoiceStatus: SubscriptionInvoiceStatus =
  "future_status";
const futureSubscriptionInvoiceBillingReason: SubscriptionInvoiceBillingReason =
  "future_reason";
declare const subscriptionInvoiceResponse: SubscriptionInvoiceResponse;
const subscriptionInvoiceAffiliateId: number | null =
  subscriptionInvoiceResponse.data.attributes.affiliate_id;
const subscriptionInvoiceReferralAmount: number | null =
  subscriptionInvoiceResponse.data.attributes.referral_amount;
const subscriptionInvoiceAffiliate =
  subscriptionInvoiceResponse.data.relationships.affiliate;
const futurePaymentProcessor: SubscriptionPaymentProcessor = "future_processor";
const futureOrderStatus: OrderStatus = "future_status";
declare const customerRelationships: CustomerRelationships;
const affiliateRelationship = customerRelationships.affiliates;
const futureAffiliateStatus: AffiliateStatus = "reviewing";
declare const affiliateResponse: AffiliateResponse;
const affiliateProducts: JSONValue | null =
  affiliateResponse.data.attributes.products;
type AffiliateProducts =
  (typeof affiliateResponse)["data"]["attributes"]["products"];
const _user: User | undefined = undefined;
const filters: ListCustomersParams = { filter: { email: "test@example.com" } };

void userPromise;
void directUser;
void store;
void stores;
void product;
void products;
void variant;
void variants;
void price;
void prices;
void file;
void files;
void affiliate;
void affiliates;
void customer;
void customers;
void archived;
void checkout;
void checkouts;
void order;
void orders;
void invoice;
void refund;
void orderItem;
void orderItems;
void subscription;
void subscriptions;
void updatedSubscription;
void cancelledSubscription;
void subscriptionItem;
void subscriptionItems;
void currentUsage;
void updatedSubscriptionItem;
void numericSubscriptionItemEnvelope;
void objectSubscriptionItemEnvelope;
void usageRecord;
void usageRecords;
void subscriptionInvoice;
void subscriptionInvoices;
void generatedSubscriptionInvoice;
void refundedSubscriptionInvoice;
void generatedSubscriptionInvoiceEnvelope;
void fullSubscriptionInvoiceRefundEnvelope;
void futureSubscriptionInvoiceStatus;
void futureSubscriptionInvoiceBillingReason;
void subscriptionInvoiceAffiliateId;
void subscriptionInvoiceReferralAmount;
void subscriptionInvoiceAffiliate;
void futurePaymentProcessor;
void futureOrderStatus;
void affiliateRelationship;
void futureAffiliateStatus;
void affiliateProducts;
void filters;
void isLemonSqueezyError;

// @ts-expect-error users.getAuthenticated does not accept a user ID
client.users.getAuthenticated("1");
// @ts-expect-error Client namespaces are readonly
client.users = client.users;
// @ts-expect-error Affiliates is read-only and has no create operation
client.affiliates.create({});
// @ts-expect-error Affiliate includes are limited to reviewed relationships
client.affiliates.get(1, { include: ["products"] });
// @ts-expect-error Variant request status is a closed documented enum
client.variants.list({ filter: { status: "archived" } });
// @ts-expect-error Customer creation owns its store relationship
client.customers.create({ name: "Ada", email: "ada@example.com" });
// @ts-expect-error Customer updates accept only reviewed attributes
client.customers.update(1, { arbitrary: true });
// @ts-expect-error Checkout creation owns both relationship IDs
client.checkouts.create({ storeId: 1 });
// @ts-expect-error Checkout input has no generic JSON:API body escape hatch
client.checkouts.create({ storeId: 1, variantId: 2, body: {} });
client.checkouts.create({
  storeId: 1,
  variantId: 2,
  // @ts-expect-error Checkout locale is a closed request enum
  checkoutOptions: { locale: "xx" },
});
// @ts-expect-error Orders expose only reviewed operations
client.orders.create({});
// @ts-expect-error Order filters do not infer affiliateId
client.orders.list({ filter: { affiliateId: 1 } });
// @ts-expect-error Order Item includes are limited to reviewed relationships
client.orderItems.get(1, { include: ["store"] });
// @ts-expect-error Subscription request status is a closed documented enum
client.subscriptions.list({ filter: { status: "future_status" } });
client.subscriptions.update(1, {
  // @ts-expect-error Subscription pause mode is a closed request enum
  pause: { mode: "hold" },
});
// @ts-expect-error Subscription Invoice request status is a closed documented enum
client.subscriptionInvoices.list({ filter: { status: "future_status" } });
// @ts-expect-error Subscription Invoice includes are limited to reviewed relationships
client.subscriptionInvoices.get(1, { include: ["future-relationship"] });
// @ts-expect-error RequestOptions remain in the final position
client.subscriptionInvoices.get(1, { timeoutMs: 1_000 });
// @ts-expect-error RequestOptions remain in the final position
client.subscriptions.get(1, { timeoutMs: 1_000 });
// @ts-expect-error Canonical Subscription Item updates require object input
client.subscriptionItems.update(1, 3);
client.usageRecords.create({
  subscriptionItemId: 1,
  quantity: 5,
  // @ts-expect-error Usage Record create has no generic attributes escape hatch
  attributes: { arbitrary: true },
});
client.usageRecords.create({
  subscriptionItemId: 1,
  quantity: 5,
  // @ts-expect-error Usage Record action is a closed request enum
  action: "replace",
});
client.prices.get(1, {
  include: ["variant", "subscription-items", "usage-records"],
});
// @ts-expect-error Affiliate products are JSON values or null, not functions
const functionProducts: AffiliateProducts = () => undefined;
// @ts-expect-error Affiliate products are present and cannot be undefined
const undefinedProducts: AffiliateProducts = undefined;
void functionProducts;
void undefinedProducts;
// @ts-expect-error Internal contracts are not public package entries
import("@terminalzero/lemonsqueezy/namespaces/affiliates/contract");
// @ts-expect-error Compatibility facade returns an envelope, not a direct body
const directFacadeBody: Promise<UserResponse> = getAuthenticatedUser();
void directFacadeBody;

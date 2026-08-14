import {
  getAffiliateOperation,
  listAffiliatesOperation,
} from "../../namespaces/affiliates/contract";
import {
  createCheckoutOperation,
  getCheckoutOperation,
  listCheckoutsOperation,
} from "../../namespaces/checkouts/contract";
import {
  archiveCustomerOperation,
  createCustomerOperation,
  getCustomerOperation,
  listCustomersOperation,
  updateCustomerOperation,
} from "../../namespaces/customers/contract";
import {
  getDiscountRedemptionOperation,
  listDiscountRedemptionsOperation,
} from "../../namespaces/discount-redemptions/contract";
import {
  createDiscountOperation,
  deleteDiscountOperation,
  getDiscountOperation,
  listDiscountsOperation,
} from "../../namespaces/discounts/contract";
import {
  getFileOperation,
  listFilesOperation,
} from "../../namespaces/files/contract";
import {
  getLicenseKeyInstanceOperation,
  listLicenseKeyInstancesOperation,
} from "../../namespaces/license-key-instances/contract";
import {
  getLicenseKeyOperation,
  listLicenseKeysOperation,
  updateLicenseKeyOperation,
} from "../../namespaces/license-keys/contract";
import {
  activateLicenseOperation,
  deactivateLicenseOperation,
  validateLicenseOperation,
} from "../../namespaces/license/contract";
import {
  getOrderItemOperation,
  listOrderItemsOperation,
} from "../../namespaces/order-items/contract";
import {
  generateOrderInvoiceOperation,
  getOrderOperation,
  listOrdersOperation,
  refundOrderOperation,
} from "../../namespaces/orders/contract";
import {
  getPriceOperation,
  listPricesOperation,
} from "../../namespaces/prices/contract";
import {
  getProductOperation,
  listProductsOperation,
} from "../../namespaces/products/contract";
import {
  getStoreOperation,
  listStoresOperation,
} from "../../namespaces/stores/contract";
import {
  generateSubscriptionInvoiceOperation,
  getSubscriptionInvoiceOperation,
  listSubscriptionInvoicesOperation,
  refundSubscriptionInvoiceOperation,
} from "../../namespaces/subscription-invoices/contract";
import {
  getSubscriptionItemCurrentUsageOperation,
  getSubscriptionItemOperation,
  listSubscriptionItemsOperation,
  updateSubscriptionItemOperation,
} from "../../namespaces/subscription-items/contract";
import {
  cancelSubscriptionOperation,
  getSubscriptionOperation,
  listSubscriptionsOperation,
  updateSubscriptionOperation,
} from "../../namespaces/subscriptions/contract";
import {
  createUsageRecordOperation,
  getUsageRecordOperation,
  listUsageRecordsOperation,
} from "../../namespaces/usage-records/contract";
import { getAuthenticatedUserOperation } from "../../namespaces/users/contract";
import {
  getVariantOperation,
  listVariantsOperation,
} from "../../namespaces/variants/contract";
import {
  createWebhookOperation,
  deleteWebhookOperation,
  getWebhookOperation,
  listWebhooksOperation,
  updateWebhookOperation,
} from "../../namespaces/webhooks/contract";

type CatalogOperation = {
  readonly key: `${string}.${string}`;
  readonly compile: (args: never) => unknown;
  readonly evidence: readonly string[];
};

function entry<const Operation extends CatalogOperation>(
  operation: Operation,
  protocol: "jsonapi" | "license",
  method: "GET" | "POST" | "PATCH" | "DELETE",
  path: `/v1/${string}`,
) {
  return { operation, request: { protocol, method, path } } as const;
}

export const operationCatalog = [
  entry(getAuthenticatedUserOperation, "jsonapi", "GET", "/v1/users/me"),
  entry(getStoreOperation, "jsonapi", "GET", "/v1/stores/:id"),
  entry(listStoresOperation, "jsonapi", "GET", "/v1/stores"),
  entry(getProductOperation, "jsonapi", "GET", "/v1/products/:id"),
  entry(listProductsOperation, "jsonapi", "GET", "/v1/products"),
  entry(getVariantOperation, "jsonapi", "GET", "/v1/variants/:id"),
  entry(listVariantsOperation, "jsonapi", "GET", "/v1/variants"),
  entry(getPriceOperation, "jsonapi", "GET", "/v1/prices/:id"),
  entry(listPricesOperation, "jsonapi", "GET", "/v1/prices"),
  entry(getFileOperation, "jsonapi", "GET", "/v1/files/:id"),
  entry(listFilesOperation, "jsonapi", "GET", "/v1/files"),
  entry(getAffiliateOperation, "jsonapi", "GET", "/v1/affiliates/:id"),
  entry(listAffiliatesOperation, "jsonapi", "GET", "/v1/affiliates"),
  entry(createCustomerOperation, "jsonapi", "POST", "/v1/customers"),
  entry(getCustomerOperation, "jsonapi", "GET", "/v1/customers/:id"),
  entry(listCustomersOperation, "jsonapi", "GET", "/v1/customers"),
  entry(updateCustomerOperation, "jsonapi", "PATCH", "/v1/customers/:id"),
  entry(archiveCustomerOperation, "jsonapi", "PATCH", "/v1/customers/:id"),
  entry(createCheckoutOperation, "jsonapi", "POST", "/v1/checkouts"),
  entry(getCheckoutOperation, "jsonapi", "GET", "/v1/checkouts/:id"),
  entry(listCheckoutsOperation, "jsonapi", "GET", "/v1/checkouts"),
  entry(
    generateOrderInvoiceOperation,
    "jsonapi",
    "POST",
    "/v1/orders/:id/generate-invoice",
  ),
  entry(getOrderOperation, "jsonapi", "GET", "/v1/orders/:id"),
  entry(listOrdersOperation, "jsonapi", "GET", "/v1/orders"),
  entry(refundOrderOperation, "jsonapi", "POST", "/v1/orders/:id/refund"),
  entry(getOrderItemOperation, "jsonapi", "GET", "/v1/order-items/:id"),
  entry(listOrderItemsOperation, "jsonapi", "GET", "/v1/order-items"),
  entry(getSubscriptionOperation, "jsonapi", "GET", "/v1/subscriptions/:id"),
  entry(
    cancelSubscriptionOperation,
    "jsonapi",
    "DELETE",
    "/v1/subscriptions/:id",
  ),
  entry(
    updateSubscriptionOperation,
    "jsonapi",
    "PATCH",
    "/v1/subscriptions/:id",
  ),
  entry(listSubscriptionsOperation, "jsonapi", "GET", "/v1/subscriptions"),
  entry(
    listSubscriptionInvoicesOperation,
    "jsonapi",
    "GET",
    "/v1/subscription-invoices",
  ),
  entry(
    getSubscriptionInvoiceOperation,
    "jsonapi",
    "GET",
    "/v1/subscription-invoices/:id",
  ),
  entry(
    generateSubscriptionInvoiceOperation,
    "jsonapi",
    "POST",
    "/v1/subscription-invoices/:id/generate-invoice",
  ),
  entry(
    refundSubscriptionInvoiceOperation,
    "jsonapi",
    "POST",
    "/v1/subscription-invoices/:id/refund",
  ),
  entry(
    updateSubscriptionItemOperation,
    "jsonapi",
    "PATCH",
    "/v1/subscription-items/:id",
  ),
  entry(
    listSubscriptionItemsOperation,
    "jsonapi",
    "GET",
    "/v1/subscription-items",
  ),
  entry(
    getSubscriptionItemOperation,
    "jsonapi",
    "GET",
    "/v1/subscription-items/:id",
  ),
  entry(
    getSubscriptionItemCurrentUsageOperation,
    "jsonapi",
    "GET",
    "/v1/subscription-items/:id/current-usage",
  ),
  entry(listUsageRecordsOperation, "jsonapi", "GET", "/v1/usage-records"),
  entry(getUsageRecordOperation, "jsonapi", "GET", "/v1/usage-records/:id"),
  entry(createUsageRecordOperation, "jsonapi", "POST", "/v1/usage-records"),
  entry(getDiscountOperation, "jsonapi", "GET", "/v1/discounts/:id"),
  entry(listDiscountsOperation, "jsonapi", "GET", "/v1/discounts"),
  entry(createDiscountOperation, "jsonapi", "POST", "/v1/discounts"),
  entry(deleteDiscountOperation, "jsonapi", "DELETE", "/v1/discounts/:id"),
  entry(
    getDiscountRedemptionOperation,
    "jsonapi",
    "GET",
    "/v1/discount-redemptions/:id",
  ),
  entry(
    listDiscountRedemptionsOperation,
    "jsonapi",
    "GET",
    "/v1/discount-redemptions",
  ),
  entry(getLicenseKeyOperation, "jsonapi", "GET", "/v1/license-keys/:id"),
  entry(updateLicenseKeyOperation, "jsonapi", "PATCH", "/v1/license-keys/:id"),
  entry(listLicenseKeysOperation, "jsonapi", "GET", "/v1/license-keys"),
  entry(
    getLicenseKeyInstanceOperation,
    "jsonapi",
    "GET",
    "/v1/license-key-instances/:id",
  ),
  entry(
    listLicenseKeyInstancesOperation,
    "jsonapi",
    "GET",
    "/v1/license-key-instances",
  ),
  entry(activateLicenseOperation, "license", "POST", "/v1/licenses/activate"),
  entry(
    deactivateLicenseOperation,
    "license",
    "POST",
    "/v1/licenses/deactivate",
  ),
  entry(validateLicenseOperation, "license", "POST", "/v1/licenses/validate"),
  entry(getWebhookOperation, "jsonapi", "GET", "/v1/webhooks/:id"),
  entry(updateWebhookOperation, "jsonapi", "PATCH", "/v1/webhooks/:id"),
  entry(createWebhookOperation, "jsonapi", "POST", "/v1/webhooks"),
  entry(listWebhooksOperation, "jsonapi", "GET", "/v1/webhooks"),
  entry(deleteWebhookOperation, "jsonapi", "DELETE", "/v1/webhooks/:id"),
] as const;

export const compatibilityOperationCatalog = {
  activateLicense: "license.activate",
  archiveCustomer: "customers.archive",
  cancelSubscription: "subscriptions.cancel",
  createCheckout: "checkouts.create",
  createCustomer: "customers.create",
  createDiscount: "discounts.create",
  createUsageRecord: "usageRecords.create",
  createWebhook: "webhooks.create",
  deactivateLicense: "license.deactivate",
  deleteDiscount: "discounts.delete",
  deleteWebhook: "webhooks.delete",
  generateOrderInvoice: "orders.generateInvoice",
  generateSubscriptionInvoice: "subscriptionInvoices.generateInvoice",
  getAuthenticatedUser: "users.getAuthenticated",
  getCheckout: "checkouts.get",
  getCustomer: "customers.get",
  getDiscount: "discounts.get",
  getDiscountRedemption: "discountRedemptions.get",
  getFile: "files.get",
  getLicenseKey: "licenseKeys.get",
  getLicenseKeyInstance: "licenseKeyInstances.get",
  getOrder: "orders.get",
  getOrderItem: "orderItems.get",
  getPrice: "prices.get",
  getProduct: "products.get",
  getStore: "stores.get",
  getSubscription: "subscriptions.get",
  getSubscriptionInvoice: "subscriptionInvoices.get",
  getSubscriptionItem: "subscriptionItems.get",
  getSubscriptionItemCurrentUsage: "subscriptionItems.currentUsage",
  getUsageRecord: "usageRecords.get",
  getVariant: "variants.get",
  getWebhook: "webhooks.get",
  issueOrderRefund: "orders.refund",
  issueSubscriptionInvoiceRefund: "subscriptionInvoices.refund",
  listCheckouts: "checkouts.list",
  listCustomers: "customers.list",
  listDiscountRedemptions: "discountRedemptions.list",
  listDiscounts: "discounts.list",
  listFiles: "files.list",
  listLicenseKeyInstances: "licenseKeyInstances.list",
  listLicenseKeys: "licenseKeys.list",
  listOrderItems: "orderItems.list",
  listOrders: "orders.list",
  listPrices: "prices.list",
  listProducts: "products.list",
  listStores: "stores.list",
  listSubscriptionInvoices: "subscriptionInvoices.list",
  listSubscriptionItems: "subscriptionItems.list",
  listSubscriptions: "subscriptions.list",
  listUsageRecords: "usageRecords.list",
  listVariants: "variants.list",
  listWebhooks: "webhooks.list",
  updateCustomer: "customers.update",
  updateLicenseKey: "licenseKeys.update",
  updateSubscription: "subscriptions.update",
  updateSubscriptionItem: "subscriptionItems.update",
  updateWebhook: "webhooks.update",
  validateLicense: "license.validate",
} as const;

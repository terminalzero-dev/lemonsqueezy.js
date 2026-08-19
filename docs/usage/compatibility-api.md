# Compatibility API

The Compatibility facade preserves the supported v4 function names,
argument shapes, and `{ statusCode, data, error }` envelope. It shares
Operation Contracts with the Explicit Client. This index accounts for
exactly 59 supported facade functions.

`lemonSqueezySetup` is not one of those 59 functions. It configures the
Default Client used only by facade functions loaded through the same
package format. It does not mutate Explicit Clients. Import the facade
from `@terminalzero/lemonsqueezy` or `@terminalzero/lemonsqueezy/compat`.

`affiliates.get` and `affiliates.list` have no facade equivalent. Use
the [Client API](./client-api.md) for those methods.

<!-- fixture: compatibility-api-mapping.ts -->

```ts
import { createClient } from "@terminalzero/lemonsqueezy/client";
import { getStore, lemonSqueezySetup } from "@terminalzero/lemonsqueezy/compat";

lemonSqueezySetup({
  apiKey: process.env.LEMONSQUEEZY_API_KEY,
});

export async function readStoreBothWays(id: string) {
  const envelope = await getStore(id);
  const client = createClient({
    apiKey: process.env.LEMONSQUEEZY_API_KEY,
  });
  const body = await client.stores.get(id);
  return { envelope, body };
}
```

## Facade functions

| Facade                            | Explicit Client                        | Task guide                                                       | Official API                                                                                                                              |
| --------------------------------- | -------------------------------------- | ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `activateLicense`                 | `license.activate`                     | [Discounts and licensing](./discounts-licensing.md)              | [Activate license key](https://docs.lemonsqueezy.com/api/license-api/activate-license-key)                                                |
| `archiveCustomer`                 | `customers.archive`                    | [Catalog, customers, and checkouts](./catalog-checkout.md)       | [Update customer](https://docs.lemonsqueezy.com/api/customers/update-customer)                                                            |
| `cancelSubscription`              | `subscriptions.cancel`                 | [Orders, subscriptions, and metering](./orders-subscriptions.md) | [Cancel subscription](https://docs.lemonsqueezy.com/api/subscriptions/cancel-subscription)                                                |
| `createCheckout`                  | `checkouts.create`                     | [Catalog, customers, and checkouts](./catalog-checkout.md)       | [Create checkout](https://docs.lemonsqueezy.com/api/checkouts/create-checkout)                                                            |
| `createCustomer`                  | `customers.create`                     | [Catalog, customers, and checkouts](./catalog-checkout.md)       | [Create customer](https://docs.lemonsqueezy.com/api/customers/create-customer)                                                            |
| `createDiscount`                  | `discounts.create`                     | [Discounts and licensing](./discounts-licensing.md)              | [Create discount](https://docs.lemonsqueezy.com/api/discounts/create-discount)                                                            |
| `createUsageRecord`               | `usageRecords.create`                  | [Orders, subscriptions, and metering](./orders-subscriptions.md) | [Create usage record](https://docs.lemonsqueezy.com/api/usage-records/create-usage-record)                                                |
| `createWebhook`                   | `webhooks.create`                      | [Webhook management](./webhooks.md)                              | [Create webhook](https://docs.lemonsqueezy.com/api/webhooks/create-webhook)                                                               |
| `deactivateLicense`               | `license.deactivate`                   | [Discounts and licensing](./discounts-licensing.md)              | [Deactivate license key](https://docs.lemonsqueezy.com/api/license-api/deactivate-license-key)                                            |
| `deleteDiscount`                  | `discounts.delete`                     | [Discounts and licensing](./discounts-licensing.md)              | [Delete discount](https://docs.lemonsqueezy.com/api/discounts/delete-discount)                                                            |
| `deleteWebhook`                   | `webhooks.delete`                      | [Webhook management](./webhooks.md)                              | [Delete webhook](https://docs.lemonsqueezy.com/api/webhooks/delete-webhook)                                                               |
| `generateOrderInvoice`            | `orders.generateInvoice`               | [Orders, subscriptions, and metering](./orders-subscriptions.md) | [Generate order invoice](https://docs.lemonsqueezy.com/api/orders/generate-order-invoice)                                                 |
| `generateSubscriptionInvoice`     | `subscriptionInvoices.generateInvoice` | [Orders, subscriptions, and metering](./orders-subscriptions.md) | [Generate subscription invoice](https://docs.lemonsqueezy.com/api/subscription-invoices/generate-subscription-invoice)                    |
| `getAuthenticatedUser`            | `users.getAuthenticated`               | [Catalog, customers, and checkouts](./catalog-checkout.md)       | [Retrieve user](https://docs.lemonsqueezy.com/api/users/retrieve-user)                                                                    |
| `getCheckout`                     | `checkouts.get`                        | [Catalog, customers, and checkouts](./catalog-checkout.md)       | [Retrieve checkout](https://docs.lemonsqueezy.com/api/checkouts/retrieve-checkout)                                                        |
| `getCustomer`                     | `customers.get`                        | [Catalog, customers, and checkouts](./catalog-checkout.md)       | [Retrieve customer](https://docs.lemonsqueezy.com/api/customers/retrieve-customer)                                                        |
| `getDiscount`                     | `discounts.get`                        | [Discounts and licensing](./discounts-licensing.md)              | [Retrieve discount](https://docs.lemonsqueezy.com/api/discounts/retrieve-discount)                                                        |
| `getDiscountRedemption`           | `discountRedemptions.get`              | [Discounts and licensing](./discounts-licensing.md)              | [Retrieve discount redemption](https://docs.lemonsqueezy.com/api/discount-redemptions/retrieve-discount-redemption)                       |
| `getFile`                         | `files.get`                            | [Catalog, customers, and checkouts](./catalog-checkout.md)       | [Retrieve file](https://docs.lemonsqueezy.com/api/files/retrieve-file)                                                                    |
| `getLicenseKey`                   | `licenseKeys.get`                      | [Discounts and licensing](./discounts-licensing.md)              | [Retrieve license key](https://docs.lemonsqueezy.com/api/license-keys/retrieve-license-key)                                               |
| `getLicenseKeyInstance`           | `licenseKeyInstances.get`              | [Discounts and licensing](./discounts-licensing.md)              | [Retrieve license key instance](https://docs.lemonsqueezy.com/api/license-key-instances/retrieve-license-key-instance)                    |
| `getOrder`                        | `orders.get`                           | [Orders, subscriptions, and metering](./orders-subscriptions.md) | [Retrieve order](https://docs.lemonsqueezy.com/api/orders/retrieve-order)                                                                 |
| `getOrderItem`                    | `orderItems.get`                       | [Orders, subscriptions, and metering](./orders-subscriptions.md) | [Retrieve order item](https://docs.lemonsqueezy.com/api/order-items/retrieve-order-item)                                                  |
| `getPrice`                        | `prices.get`                           | [Catalog, customers, and checkouts](./catalog-checkout.md)       | [Retrieve price](https://docs.lemonsqueezy.com/api/prices/retrieve-price)                                                                 |
| `getProduct`                      | `products.get`                         | [Catalog, customers, and checkouts](./catalog-checkout.md)       | [Retrieve product](https://docs.lemonsqueezy.com/api/products/retrieve-product)                                                           |
| `getStore`                        | `stores.get`                           | [Catalog, customers, and checkouts](./catalog-checkout.md)       | [Retrieve store](https://docs.lemonsqueezy.com/api/stores/retrieve-store)                                                                 |
| `getSubscription`                 | `subscriptions.get`                    | [Orders, subscriptions, and metering](./orders-subscriptions.md) | [Retrieve subscription](https://docs.lemonsqueezy.com/api/subscriptions/retrieve-subscription)                                            |
| `getSubscriptionInvoice`          | `subscriptionInvoices.get`             | [Orders, subscriptions, and metering](./orders-subscriptions.md) | [Retrieve subscription invoice](https://docs.lemonsqueezy.com/api/subscription-invoices/retrieve-subscription-invoice)                    |
| `getSubscriptionItem`             | `subscriptionItems.get`                | [Orders, subscriptions, and metering](./orders-subscriptions.md) | [Retrieve subscription item](https://docs.lemonsqueezy.com/api/subscription-items/retrieve-subscription-item)                             |
| `getSubscriptionItemCurrentUsage` | `subscriptionItems.currentUsage`       | [Orders, subscriptions, and metering](./orders-subscriptions.md) | [Retrieve subscription item current usage](https://docs.lemonsqueezy.com/api/subscription-items/retrieve-subscription-item-current-usage) |
| `getUsageRecord`                  | `usageRecords.get`                     | [Orders, subscriptions, and metering](./orders-subscriptions.md) | [Retrieve usage record](https://docs.lemonsqueezy.com/api/usage-records/retrieve-usage-record)                                            |
| `getVariant`                      | `variants.get`                         | [Catalog, customers, and checkouts](./catalog-checkout.md)       | [Retrieve variant](https://docs.lemonsqueezy.com/api/variants/retrieve-variant)                                                           |
| `getWebhook`                      | `webhooks.get`                         | [Webhook management](./webhooks.md)                              | [Retrieve webhook](https://docs.lemonsqueezy.com/api/webhooks/retrieve-webhook)                                                           |
| `issueOrderRefund`                | `orders.refund`                        | [Orders, subscriptions, and metering](./orders-subscriptions.md) | [Issue refund](https://docs.lemonsqueezy.com/api/orders/issue-refund)                                                                     |
| `issueSubscriptionInvoiceRefund`  | `subscriptionInvoices.refund`          | [Orders, subscriptions, and metering](./orders-subscriptions.md) | [Issue refund](https://docs.lemonsqueezy.com/api/subscription-invoices/issue-refund)                                                      |
| `listCheckouts`                   | `checkouts.list`                       | [Catalog, customers, and checkouts](./catalog-checkout.md)       | [List all checkouts](https://docs.lemonsqueezy.com/api/checkouts/list-all-checkouts)                                                      |
| `listCustomers`                   | `customers.list`                       | [Catalog, customers, and checkouts](./catalog-checkout.md)       | [List all customers](https://docs.lemonsqueezy.com/api/customers/list-all-customers)                                                      |
| `listDiscountRedemptions`         | `discountRedemptions.list`             | [Discounts and licensing](./discounts-licensing.md)              | [List all discount redemptions](https://docs.lemonsqueezy.com/api/discount-redemptions/list-all-discount-redemptions)                     |
| `listDiscounts`                   | `discounts.list`                       | [Discounts and licensing](./discounts-licensing.md)              | [List all discounts](https://docs.lemonsqueezy.com/api/discounts/list-all-discounts)                                                      |
| `listFiles`                       | `files.list`                           | [Catalog, customers, and checkouts](./catalog-checkout.md)       | [List all files](https://docs.lemonsqueezy.com/api/files/list-all-files)                                                                  |
| `listLicenseKeyInstances`         | `licenseKeyInstances.list`             | [Discounts and licensing](./discounts-licensing.md)              | [List all license key instances](https://docs.lemonsqueezy.com/api/license-key-instances/list-all-license-key-instances)                  |
| `listLicenseKeys`                 | `licenseKeys.list`                     | [Discounts and licensing](./discounts-licensing.md)              | [List all license keys](https://docs.lemonsqueezy.com/api/license-keys/list-all-license-keys)                                             |
| `listOrderItems`                  | `orderItems.list`                      | [Orders, subscriptions, and metering](./orders-subscriptions.md) | [List all order items](https://docs.lemonsqueezy.com/api/order-items/list-all-order-items)                                                |
| `listOrders`                      | `orders.list`                          | [Orders, subscriptions, and metering](./orders-subscriptions.md) | [List all orders](https://docs.lemonsqueezy.com/api/orders/list-all-orders)                                                               |
| `listPrices`                      | `prices.list`                          | [Catalog, customers, and checkouts](./catalog-checkout.md)       | [List all prices](https://docs.lemonsqueezy.com/api/prices/list-all-prices)                                                               |
| `listProducts`                    | `products.list`                        | [Catalog, customers, and checkouts](./catalog-checkout.md)       | [List all products](https://docs.lemonsqueezy.com/api/products/list-all-products)                                                         |
| `listStores`                      | `stores.list`                          | [Catalog, customers, and checkouts](./catalog-checkout.md)       | [List all stores](https://docs.lemonsqueezy.com/api/stores/list-all-stores)                                                               |
| `listSubscriptionInvoices`        | `subscriptionInvoices.list`            | [Orders, subscriptions, and metering](./orders-subscriptions.md) | [List all subscription invoices](https://docs.lemonsqueezy.com/api/subscription-invoices/list-all-subscription-invoices)                  |
| `listSubscriptionItems`           | `subscriptionItems.list`               | [Orders, subscriptions, and metering](./orders-subscriptions.md) | [List all subscription items](https://docs.lemonsqueezy.com/api/subscription-items/list-all-subscription-items)                           |
| `listSubscriptions`               | `subscriptions.list`                   | [Orders, subscriptions, and metering](./orders-subscriptions.md) | [List all subscriptions](https://docs.lemonsqueezy.com/api/subscriptions/list-all-subscriptions)                                          |
| `listUsageRecords`                | `usageRecords.list`                    | [Orders, subscriptions, and metering](./orders-subscriptions.md) | [List all usage records](https://docs.lemonsqueezy.com/api/usage-records/list-all-usage-records)                                          |
| `listVariants`                    | `variants.list`                        | [Catalog, customers, and checkouts](./catalog-checkout.md)       | [List all variants](https://docs.lemonsqueezy.com/api/variants/list-all-variants)                                                         |
| `listWebhooks`                    | `webhooks.list`                        | [Webhook management](./webhooks.md)                              | [List all webhooks](https://docs.lemonsqueezy.com/api/webhooks/list-all-webhooks)                                                         |
| `updateCustomer`                  | `customers.update`                     | [Catalog, customers, and checkouts](./catalog-checkout.md)       | [Update customer](https://docs.lemonsqueezy.com/api/customers/update-customer)                                                            |
| `updateLicenseKey`                | `licenseKeys.update`                   | [Discounts and licensing](./discounts-licensing.md)              | [Update license key](https://docs.lemonsqueezy.com/api/license-keys/update-license-key)                                                   |
| `updateSubscription`              | `subscriptions.update`                 | [Orders, subscriptions, and metering](./orders-subscriptions.md) | [Update subscription](https://docs.lemonsqueezy.com/api/subscriptions/update-subscription)                                                |
| `updateSubscriptionItem`          | `subscriptionItems.update`             | [Orders, subscriptions, and metering](./orders-subscriptions.md) | [Update subscription item](https://docs.lemonsqueezy.com/api/subscription-items/update-subscription-item)                                 |
| `updateWebhook`                   | `webhooks.update`                      | [Webhook management](./webhooks.md)                              | [Update webhook](https://docs.lemonsqueezy.com/api/webhooks/update-webhook)                                                               |
| `validateLicense`                 | `license.validate`                     | [Discounts and licensing](./discounts-licensing.md)              | [Validate license key](https://docs.lemonsqueezy.com/api/license-api/validate-license-key)                                                |

## Next guides

- [Client API](./client-api.md) for the 21 namespaces and 61 methods
- [Explicit Client](./client.md) for construction and failures
- [Compatibility-first migration](../../MIGRATION.md) for package
  adoption
- [Existing v4 applications](../../README.md#existing-v4-applications-compatibility-first)
  for the five-minute facade path
- [Official Lemon Squeezy API](https://docs.lemonsqueezy.com/api) for
  resource fields and business rules

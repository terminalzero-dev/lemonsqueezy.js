# Client API

This index is the canonical Explicit Client reference for the v5 beta
operation set: 21 public namespaces and 61 methods. Method arguments,
pagination, timeouts, and failures are documented in the
[Explicit Client](./client.md) guide. Resource fields and business rules
remain in the official Lemon Squeezy API pages linked from each method.

`affiliates.get` and `affiliates.list` exist only on the Explicit
Client. They have no Compatibility facade projection. `customers.archive`
is an SDK convenience over the customer update operation.

<!-- fixture: client-api-namespaces.ts execute -->

```ts
import { createClient } from "@terminalzero/lemonsqueezy/client";

const client = createClient();
console.log(Object.keys(client).length);
```

## users

| Method                   | Task guide                                                 | Official API                                                           |
| ------------------------ | ---------------------------------------------------------- | ---------------------------------------------------------------------- |
| `users.getAuthenticated` | [Catalog, customers, and checkouts](./catalog-checkout.md) | [Retrieve user](https://docs.lemonsqueezy.com/api/users/retrieve-user) |

## stores

| Method        | Task guide                                                 | Official API                                                                |
| ------------- | ---------------------------------------------------------- | --------------------------------------------------------------------------- |
| `stores.get`  | [Catalog, customers, and checkouts](./catalog-checkout.md) | [Retrieve store](https://docs.lemonsqueezy.com/api/stores/retrieve-store)   |
| `stores.list` | [Catalog, customers, and checkouts](./catalog-checkout.md) | [List all stores](https://docs.lemonsqueezy.com/api/stores/list-all-stores) |

## products

| Method          | Task guide                                                 | Official API                                                                      |
| --------------- | ---------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `products.get`  | [Catalog, customers, and checkouts](./catalog-checkout.md) | [Retrieve product](https://docs.lemonsqueezy.com/api/products/retrieve-product)   |
| `products.list` | [Catalog, customers, and checkouts](./catalog-checkout.md) | [List all products](https://docs.lemonsqueezy.com/api/products/list-all-products) |

## variants

| Method          | Task guide                                                 | Official API                                                                      |
| --------------- | ---------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `variants.get`  | [Catalog, customers, and checkouts](./catalog-checkout.md) | [Retrieve variant](https://docs.lemonsqueezy.com/api/variants/retrieve-variant)   |
| `variants.list` | [Catalog, customers, and checkouts](./catalog-checkout.md) | [List all variants](https://docs.lemonsqueezy.com/api/variants/list-all-variants) |

## prices

| Method        | Task guide                                                 | Official API                                                                |
| ------------- | ---------------------------------------------------------- | --------------------------------------------------------------------------- |
| `prices.get`  | [Catalog, customers, and checkouts](./catalog-checkout.md) | [Retrieve price](https://docs.lemonsqueezy.com/api/prices/retrieve-price)   |
| `prices.list` | [Catalog, customers, and checkouts](./catalog-checkout.md) | [List all prices](https://docs.lemonsqueezy.com/api/prices/list-all-prices) |

## files

| Method       | Task guide                                                 | Official API                                                             |
| ------------ | ---------------------------------------------------------- | ------------------------------------------------------------------------ |
| `files.get`  | [Catalog, customers, and checkouts](./catalog-checkout.md) | [Retrieve file](https://docs.lemonsqueezy.com/api/files/retrieve-file)   |
| `files.list` | [Catalog, customers, and checkouts](./catalog-checkout.md) | [List all files](https://docs.lemonsqueezy.com/api/files/list-all-files) |

## affiliates

| Method            | Task guide                                                 | Official API                                                                            |
| ----------------- | ---------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `affiliates.get`  | [Catalog, customers, and checkouts](./catalog-checkout.md) | [Retrieve affiliate](https://docs.lemonsqueezy.com/api/affiliates/retrieve-affiliate)   |
| `affiliates.list` | [Catalog, customers, and checkouts](./catalog-checkout.md) | [List all affiliates](https://docs.lemonsqueezy.com/api/affiliates/list-all-affiliates) |

## customers

| Method                                            | Task guide                                                 | Official API                                                                         |
| ------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `customers.archive` (SDK convenience over update) | [Catalog, customers, and checkouts](./catalog-checkout.md) | [Update customer](https://docs.lemonsqueezy.com/api/customers/update-customer)       |
| `customers.create`                                | [Catalog, customers, and checkouts](./catalog-checkout.md) | [Create customer](https://docs.lemonsqueezy.com/api/customers/create-customer)       |
| `customers.get`                                   | [Catalog, customers, and checkouts](./catalog-checkout.md) | [Retrieve customer](https://docs.lemonsqueezy.com/api/customers/retrieve-customer)   |
| `customers.list`                                  | [Catalog, customers, and checkouts](./catalog-checkout.md) | [List all customers](https://docs.lemonsqueezy.com/api/customers/list-all-customers) |
| `customers.update`                                | [Catalog, customers, and checkouts](./catalog-checkout.md) | [Update customer](https://docs.lemonsqueezy.com/api/customers/update-customer)       |

## checkouts

| Method             | Task guide                                                 | Official API                                                                         |
| ------------------ | ---------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `checkouts.create` | [Catalog, customers, and checkouts](./catalog-checkout.md) | [Create checkout](https://docs.lemonsqueezy.com/api/checkouts/create-checkout)       |
| `checkouts.get`    | [Catalog, customers, and checkouts](./catalog-checkout.md) | [Retrieve checkout](https://docs.lemonsqueezy.com/api/checkouts/retrieve-checkout)   |
| `checkouts.list`   | [Catalog, customers, and checkouts](./catalog-checkout.md) | [List all checkouts](https://docs.lemonsqueezy.com/api/checkouts/list-all-checkouts) |

## orders

| Method                   | Task guide                                                       | Official API                                                                              |
| ------------------------ | ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `orders.generateInvoice` | [Orders, subscriptions, and metering](./orders-subscriptions.md) | [Generate order invoice](https://docs.lemonsqueezy.com/api/orders/generate-order-invoice) |
| `orders.get`             | [Orders, subscriptions, and metering](./orders-subscriptions.md) | [Retrieve order](https://docs.lemonsqueezy.com/api/orders/retrieve-order)                 |
| `orders.list`            | [Orders, subscriptions, and metering](./orders-subscriptions.md) | [List all orders](https://docs.lemonsqueezy.com/api/orders/list-all-orders)               |
| `orders.refund`          | [Orders, subscriptions, and metering](./orders-subscriptions.md) | [Issue refund](https://docs.lemonsqueezy.com/api/orders/issue-refund)                     |

## orderItems

| Method            | Task guide                                                       | Official API                                                                               |
| ----------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `orderItems.get`  | [Orders, subscriptions, and metering](./orders-subscriptions.md) | [Retrieve order item](https://docs.lemonsqueezy.com/api/order-items/retrieve-order-item)   |
| `orderItems.list` | [Orders, subscriptions, and metering](./orders-subscriptions.md) | [List all order items](https://docs.lemonsqueezy.com/api/order-items/list-all-order-items) |

## subscriptions

| Method                 | Task guide                                                       | Official API                                                                                     |
| ---------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `subscriptions.cancel` | [Orders, subscriptions, and metering](./orders-subscriptions.md) | [Cancel subscription](https://docs.lemonsqueezy.com/api/subscriptions/cancel-subscription)       |
| `subscriptions.get`    | [Orders, subscriptions, and metering](./orders-subscriptions.md) | [Retrieve subscription](https://docs.lemonsqueezy.com/api/subscriptions/retrieve-subscription)   |
| `subscriptions.list`   | [Orders, subscriptions, and metering](./orders-subscriptions.md) | [List all subscriptions](https://docs.lemonsqueezy.com/api/subscriptions/list-all-subscriptions) |
| `subscriptions.update` | [Orders, subscriptions, and metering](./orders-subscriptions.md) | [Update subscription](https://docs.lemonsqueezy.com/api/subscriptions/update-subscription)       |

## subscriptionInvoices

| Method                                 | Task guide                                                       | Official API                                                                                                             |
| -------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `subscriptionInvoices.generateInvoice` | [Orders, subscriptions, and metering](./orders-subscriptions.md) | [Generate subscription invoice](https://docs.lemonsqueezy.com/api/subscription-invoices/generate-subscription-invoice)   |
| `subscriptionInvoices.get`             | [Orders, subscriptions, and metering](./orders-subscriptions.md) | [Retrieve subscription invoice](https://docs.lemonsqueezy.com/api/subscription-invoices/retrieve-subscription-invoice)   |
| `subscriptionInvoices.list`            | [Orders, subscriptions, and metering](./orders-subscriptions.md) | [List all subscription invoices](https://docs.lemonsqueezy.com/api/subscription-invoices/list-all-subscription-invoices) |
| `subscriptionInvoices.refund`          | [Orders, subscriptions, and metering](./orders-subscriptions.md) | [Issue refund](https://docs.lemonsqueezy.com/api/subscription-invoices/issue-refund)                                     |

## subscriptionItems

| Method                           | Task guide                                                       | Official API                                                                                                                              |
| -------------------------------- | ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `subscriptionItems.currentUsage` | [Orders, subscriptions, and metering](./orders-subscriptions.md) | [Retrieve subscription item current usage](https://docs.lemonsqueezy.com/api/subscription-items/retrieve-subscription-item-current-usage) |
| `subscriptionItems.get`          | [Orders, subscriptions, and metering](./orders-subscriptions.md) | [Retrieve subscription item](https://docs.lemonsqueezy.com/api/subscription-items/retrieve-subscription-item)                             |
| `subscriptionItems.list`         | [Orders, subscriptions, and metering](./orders-subscriptions.md) | [List all subscription items](https://docs.lemonsqueezy.com/api/subscription-items/list-all-subscription-items)                           |
| `subscriptionItems.update`       | [Orders, subscriptions, and metering](./orders-subscriptions.md) | [Update subscription item](https://docs.lemonsqueezy.com/api/subscription-items/update-subscription-item)                                 |

## usageRecords

| Method                | Task guide                                                       | Official API                                                                                     |
| --------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `usageRecords.create` | [Orders, subscriptions, and metering](./orders-subscriptions.md) | [Create usage record](https://docs.lemonsqueezy.com/api/usage-records/create-usage-record)       |
| `usageRecords.get`    | [Orders, subscriptions, and metering](./orders-subscriptions.md) | [Retrieve usage record](https://docs.lemonsqueezy.com/api/usage-records/retrieve-usage-record)   |
| `usageRecords.list`   | [Orders, subscriptions, and metering](./orders-subscriptions.md) | [List all usage records](https://docs.lemonsqueezy.com/api/usage-records/list-all-usage-records) |

## discounts

| Method             | Task guide                                          | Official API                                                                         |
| ------------------ | --------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `discounts.create` | [Discounts and licensing](./discounts-licensing.md) | [Create discount](https://docs.lemonsqueezy.com/api/discounts/create-discount)       |
| `discounts.delete` | [Discounts and licensing](./discounts-licensing.md) | [Delete discount](https://docs.lemonsqueezy.com/api/discounts/delete-discount)       |
| `discounts.get`    | [Discounts and licensing](./discounts-licensing.md) | [Retrieve discount](https://docs.lemonsqueezy.com/api/discounts/retrieve-discount)   |
| `discounts.list`   | [Discounts and licensing](./discounts-licensing.md) | [List all discounts](https://docs.lemonsqueezy.com/api/discounts/list-all-discounts) |

## discountRedemptions

| Method                     | Task guide                                          | Official API                                                                                                          |
| -------------------------- | --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `discountRedemptions.get`  | [Discounts and licensing](./discounts-licensing.md) | [Retrieve discount redemption](https://docs.lemonsqueezy.com/api/discount-redemptions/retrieve-discount-redemption)   |
| `discountRedemptions.list` | [Discounts and licensing](./discounts-licensing.md) | [List all discount redemptions](https://docs.lemonsqueezy.com/api/discount-redemptions/list-all-discount-redemptions) |

## licenseKeys

| Method               | Task guide                                          | Official API                                                                                  |
| -------------------- | --------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `licenseKeys.get`    | [Discounts and licensing](./discounts-licensing.md) | [Retrieve license key](https://docs.lemonsqueezy.com/api/license-keys/retrieve-license-key)   |
| `licenseKeys.list`   | [Discounts and licensing](./discounts-licensing.md) | [List all license keys](https://docs.lemonsqueezy.com/api/license-keys/list-all-license-keys) |
| `licenseKeys.update` | [Discounts and licensing](./discounts-licensing.md) | [Update license key](https://docs.lemonsqueezy.com/api/license-keys/update-license-key)       |

## licenseKeyInstances

| Method                     | Task guide                                          | Official API                                                                                                             |
| -------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `licenseKeyInstances.get`  | [Discounts and licensing](./discounts-licensing.md) | [Retrieve license key instance](https://docs.lemonsqueezy.com/api/license-key-instances/retrieve-license-key-instance)   |
| `licenseKeyInstances.list` | [Discounts and licensing](./discounts-licensing.md) | [List all license key instances](https://docs.lemonsqueezy.com/api/license-key-instances/list-all-license-key-instances) |

## license

| Method               | Task guide                                          | Official API                                                                                   |
| -------------------- | --------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `license.activate`   | [Discounts and licensing](./discounts-licensing.md) | [Activate license key](https://docs.lemonsqueezy.com/api/license-api/activate-license-key)     |
| `license.deactivate` | [Discounts and licensing](./discounts-licensing.md) | [Deactivate license key](https://docs.lemonsqueezy.com/api/license-api/deactivate-license-key) |
| `license.validate`   | [Discounts and licensing](./discounts-licensing.md) | [Validate license key](https://docs.lemonsqueezy.com/api/license-api/validate-license-key)     |

## webhooks

| Method            | Task guide                          | Official API                                                                      |
| ----------------- | ----------------------------------- | --------------------------------------------------------------------------------- |
| `webhooks.create` | [Webhook management](./webhooks.md) | [Create webhook](https://docs.lemonsqueezy.com/api/webhooks/create-webhook)       |
| `webhooks.delete` | [Webhook management](./webhooks.md) | [Delete webhook](https://docs.lemonsqueezy.com/api/webhooks/delete-webhook)       |
| `webhooks.get`    | [Webhook management](./webhooks.md) | [Retrieve webhook](https://docs.lemonsqueezy.com/api/webhooks/retrieve-webhook)   |
| `webhooks.list`   | [Webhook management](./webhooks.md) | [List all webhooks](https://docs.lemonsqueezy.com/api/webhooks/list-all-webhooks) |
| `webhooks.update` | [Webhook management](./webhooks.md) | [Update webhook](https://docs.lemonsqueezy.com/api/webhooks/update-webhook)       |

## Next guides

- [Explicit Client](./client.md) for construction, request options, and
  failures
- [Compatibility API](./compatibility-api.md) for the 59 facade functions
- [Webhook management and inbound delivery](./webhooks.md) for the 17
  known inbound events
- [Getting Started](./getting-started.md) for install and the first
  authenticated read
- [MIGRATION.md](../../MIGRATION.md) for Compatibility-first adoption
- [Official Lemon Squeezy API](https://docs.lemonsqueezy.com/api) for
  resource fields and business rules

# Orders, Subscriptions, and Metering

This guide follows post-purchase billing on the Explicit Client: query
orders and order items, issue refunds and invoices, update or cancel
subscriptions, then record metered usage. Import only
`@terminalzero/lemonsqueezy/client`. Request behavior, pagination, and
errors are documented in the [Explicit Client](./client.md) guide.

Use Lemon Squeezy
[Test Mode](https://docs.lemonsqueezy.com/help/getting-started/test-mode)
for any write. Name Test Mode fixtures with a `docs-` prefix and a store
or run identifier so they stay identifiable. Refunds, invoices, and usage
records have no hard-delete cleanup path. Do not use these examples
against Live Mode resources.

Complete field definitions remain in the official Lemon Squeezy API
documentation linked from each namespace.

## Query orders and order items

`orders.list` and `orders.get` map to
[List all orders](https://docs.lemonsqueezy.com/api/orders/list-all-orders)
and
[Retrieve an order](https://docs.lemonsqueezy.com/api/orders/retrieve-order).
`orderItems.list` and `orderItems.get` map to
[List all order items](https://docs.lemonsqueezy.com/api/order-items/list-all-order-items)
and
[Retrieve an order item](https://docs.lemonsqueezy.com/api/order-items/retrieve-order-item).

List filters use SDK camelCase (`storeId`, `userEmail`, `orderNumber`,
`orderId`, `productId`, `variantId`) and are compiled to Lemon Squeezy
query parameters. Request the next page with `page.number` and
`page.size`. Read `meta.page.currentPage` from the response; the SDK does
not paginate automatically.

Keep wire-native values. Monetary attributes such as `total` stay integers
in the smallest currency unit. Timestamps such as `created_at` stay ISO
strings. Identifiers stay the JSON:API `id` strings returned by the API.
Status values such as `paid` remain open strings; unknown server values
are preserved.

<!-- fixture: orders-query.ts -->

```ts
import { createClient } from "@terminalzero/lemonsqueezy/client";

const client = createClient({
  apiKey: process.env.LEMONSQUEEZY_API_KEY,
});

export async function ordersForStore(storeId: string) {
  const orders = await client.orders.list({
    filter: { storeId },
    page: { number: 1, size: 10 },
  });
  const order = orders.data[0];
  if (!order) {
    return undefined;
  }

  const items = await client.orderItems.list({
    filter: { orderId: order.id },
    page: { number: 1, size: 10 },
  });

  return {
    currentPage: orders.meta.page.currentPage,
    order: await client.orders.get(order.id),
    item: items.data[0]
      ? await client.orderItems.get(items.data[0].id)
      : undefined,
    total: order.attributes.total,
    createdAt: order.attributes.created_at,
    status: order.attributes.status,
  };
}
```

## Refund orders and generate invoices

`orders.refund` maps to
[Issue a refund](https://docs.lemonsqueezy.com/api/orders/issue-refund)
and returns the updated order document. Omit `amount` for a full refund.
Pass a positive integer `amount` in the smallest currency unit for a
partial refund. This is irreversible in Test Mode and Live Mode; there is
no cleanup path.

`orders.generateInvoice` maps to
[Generate order invoice](https://docs.lemonsqueezy.com/api/orders/generate-order-invoice).
It does not return an order resource. A successful response is a JSON:API
document whose `meta.urls.download_invoice` is the invoice download URL.

<!-- fixture: orders-refund-invoice.ts -->

```ts
import { createClient } from "@terminalzero/lemonsqueezy/client";

const client = createClient({
  apiKey: process.env.LEMONSQUEEZY_API_KEY,
});

export async function refundTestOrder(orderId: string, amount?: number) {
  const refunded = await client.orders.refund(
    orderId,
    amount === undefined ? undefined : { amount },
  );
  return refunded.data.attributes.refunded;
}

export async function downloadOrderInvoice(orderId: string) {
  const invoice = await client.orders.generateInvoice(orderId, {
    name: "Docs Test Customer",
    notes: "docs-test-invoice",
  });
  return invoice.meta.urls.download_invoice;
}
```

## Update and cancel subscriptions

`subscriptions.list`, `subscriptions.get`, `subscriptions.update`, and
`subscriptions.cancel` map to
[List](https://docs.lemonsqueezy.com/api/subscriptions/list-all-subscriptions),
[Retrieve](https://docs.lemonsqueezy.com/api/subscriptions/retrieve-subscription),
[Update](https://docs.lemonsqueezy.com/api/subscriptions/update-subscription),
and
[Cancel](https://docs.lemonsqueezy.com/api/subscriptions/cancel-subscription).

Update sends only the fields you pass. `pause: null` clears a payment
pause. `pause.mode` must be `void` or `free` when pausing.
`subscriptions.cancel` uses HTTP DELETE but still returns a subscription
resource, not an empty body. Filter `status` values are the documented
subscription statuses; unknown response statuses are still valid data.

<!-- fixture: subscriptions-lifecycle.ts -->

```ts
import { createClient } from "@terminalzero/lemonsqueezy/client";

const client = createClient({
  apiKey: process.env.LEMONSQUEEZY_API_KEY,
});

export async function pauseThenCancel(subscriptionId: string) {
  const paused = await client.subscriptions.update(subscriptionId, {
    pause: { mode: "void" },
  });
  const resumed = await client.subscriptions.update(subscriptionId, {
    pause: null,
  });
  const cancelled = await client.subscriptions.cancel(subscriptionId);
  return {
    paused: paused.data.attributes.status,
    resumed: resumed.data.attributes.pause,
    cancelled: cancelled.data.attributes.status,
  };
}

export async function subscriptionsForOrder(orderId: string) {
  const subscriptions = await client.subscriptions.list({
    filter: { orderId, status: "active" },
    page: { number: 1, size: 10 },
  });
  const first = subscriptions.data[0];
  return first ? client.subscriptions.get(first.id) : undefined;
}
```

## Subscription invoices

`subscriptionInvoices.list`, `subscriptionInvoices.get`,
`subscriptionInvoices.generateInvoice`, and
`subscriptionInvoices.refund` map to
[List](https://docs.lemonsqueezy.com/api/subscription-invoices/list-all-subscription-invoices),
[Retrieve](https://docs.lemonsqueezy.com/api/subscription-invoices/retrieve-subscription-invoice),
[Generate subscription invoice](https://docs.lemonsqueezy.com/api/subscription-invoices/generate-subscription-invoice),
and
[Issue a refund](https://docs.lemonsqueezy.com/api/subscription-invoices/issue-refund).

Generate-invoice returns `meta.urls.download_invoice`, not an invoice
resource. Refund returns the updated subscription-invoice document. Omit
`amount` for a full refund; a positive integer `amount` is a partial
refund in the smallest currency unit. There is no cleanup path.

<!-- fixture: subscription-invoices.ts -->

```ts
import { createClient } from "@terminalzero/lemonsqueezy/client";

const client = createClient({
  apiKey: process.env.LEMONSQUEEZY_API_KEY,
});

export async function invoiceActions(subscriptionId: string) {
  const invoices = await client.subscriptionInvoices.list({
    filter: { subscriptionId, status: "paid" },
    page: { number: 1, size: 10 },
  });
  const invoice = invoices.data[0];
  if (!invoice) {
    return undefined;
  }

  const current = await client.subscriptionInvoices.get(invoice.id);
  const generated = await client.subscriptionInvoices.generateInvoice(
    invoice.id,
  );
  return {
    status: current.data.attributes.status,
    download: generated.meta.urls.download_invoice,
  };
}

export async function refundSubscriptionInvoice(
  subscriptionInvoiceId: string,
  amount?: number,
) {
  const refunded = await client.subscriptionInvoices.refund(
    subscriptionInvoiceId,
    amount === undefined ? undefined : { amount },
  );
  return refunded.data.attributes.refunded;
}
```

## Subscription items and usage records

`subscriptionItems.list`, `subscriptionItems.get`,
`subscriptionItems.update`, and `subscriptionItems.currentUsage` map to
[List](https://docs.lemonsqueezy.com/api/subscription-items/list-all-subscription-items),
[Retrieve](https://docs.lemonsqueezy.com/api/subscription-items/retrieve-subscription-item),
[Update](https://docs.lemonsqueezy.com/api/subscription-items/update-subscription-item),
and
[Retrieve current usage](https://docs.lemonsqueezy.com/api/subscription-items/retrieve-subscription-item-current-usage).

`usageRecords.create`, `usageRecords.list`, and `usageRecords.get` map to
[Create](https://docs.lemonsqueezy.com/api/usage-records/create-usage-record),
[List](https://docs.lemonsqueezy.com/api/usage-records/list-all-usage-records),
and
[Retrieve](https://docs.lemonsqueezy.com/api/usage-records/retrieve-usage-record).

`subscriptionItems.currentUsage` does not return a subscription-item
resource. A successful response is `jsonapi` plus `meta` with
`period_start`, `period_end`, `quantity`, `interval_unit`, and
`interval_quantity`. Update requires a positive `quantity`. Usage create
requires a positive `quantity` and optional `action` of `increment` or
`set`. Usage records cannot be deleted.

<!-- fixture: subscription-items-usage.ts -->

```ts
import { createClient } from "@terminalzero/lemonsqueezy/client";

const client = createClient({
  apiKey: process.env.LEMONSQUEEZY_API_KEY,
});

export async function recordTestUsage(subscriptionId: string) {
  const items = await client.subscriptionItems.list({
    filter: { subscriptionId },
    page: { number: 1, size: 10 },
  });
  const item = items.data[0];
  if (!item) {
    return undefined;
  }

  const current = await client.subscriptionItems.get(item.id);
  if (current.data.attributes.is_usage_based) {
    const usage = await client.subscriptionItems.currentUsage(item.id);
    const recorded = await client.usageRecords.create({
      subscriptionItemId: item.id,
      quantity: 1,
      action: "increment",
    });
    const records = await client.usageRecords.list({
      filter: { subscriptionItemId: item.id },
    });
    return {
      periodStart: usage.meta.period_start,
      quantity: usage.meta.quantity,
      record: records.data[0]
        ? await client.usageRecords.get(records.data[0].id)
        : recorded,
    };
  }

  return client.subscriptionItems.update(item.id, { quantity: 2 });
}
```

Invalid identifiers fail before transport:

<!-- fixture: billing-validation.ts execute -->

```ts
import {
  createClient,
  isLemonSqueezyError,
} from "@terminalzero/lemonsqueezy/client";

const client = createClient({
  apiKey: process.env.LEMONSQUEEZY_API_KEY,
});

try {
  await client.orders.refund("");
} catch (error) {
  if (isLemonSqueezyError(error)) {
    console.error(error.code, error.statusCode);
  } else {
    throw error;
  }
}
```

## Next guides

- [Explicit Client](./client.md) for construction, request options,
  pagination, and failures
- [Client API](./client-api.md) for every namespace method
- [Catalog, customers, and checkouts](./catalog-checkout.md) for the path
  that creates the orders billed here
- [Discounts and licensing](./discounts-licensing.md) for promotions and
  License Keys attached to orders
- [Webhook management and inbound delivery](./webhooks.md) for order and
  subscription events
- [Compatibility API](./compatibility-api.md) for facade equivalents
- [Official Lemon Squeezy API](https://docs.lemonsqueezy.com/api) for
  resource fields and billing rules

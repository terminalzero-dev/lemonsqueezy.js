# Catalog, Customers, and Checkouts

This guide follows the catalog-to-checkout path on the Explicit Client:
discover the authenticated account and stores, select product identifiers,
manage customers, and create a checkout. Import only
`@terminalzero/lemonsqueezy/client`. Request behavior, pagination, and
errors are documented in the [Explicit Client](./client.md) guide.

Use Lemon Squeezy
[Test Mode](https://docs.lemonsqueezy.com/help/getting-started/test-mode)
for any write. Checkouts have no delete operation. Customers can be
archived; they are not hard-deleted. Do not use these examples against
Live Mode resources.

Complete field definitions remain in the official Lemon Squeezy API
documentation linked from each namespace.

## Discover the account and stores

`users.getAuthenticated` reads the current account. It maps to
[Retrieve the authenticated user](https://docs.lemonsqueezy.com/api/users/retrieve-user)
and does not require a store ID.

`stores.list` and `stores.get` map to
[List all stores](https://docs.lemonsqueezy.com/api/stores/list-all-stores)
and
[Retrieve a store](https://docs.lemonsqueezy.com/api/stores/retrieve-store).
Take a store `id` from the list response and pass it to later filters.

<!-- fixture: catalog-discovery.ts -->

```ts
import { createClient } from "@terminalzero/lemonsqueezy/client";

const client = createClient({
  apiKey: process.env.LEMONSQUEEZY_API_KEY,
});

export async function firstStoreId() {
  const user = await client.users.getAuthenticated();
  const stores = await client.stores.list({
    page: { number: 1, size: 10 },
  });
  const store = stores.data[0];

  if (!store) {
    throw new Error("No store is available for this account.");
  }

  console.log(user.data.attributes.email, stores.meta.page.currentPage);
  return store.id;
}
```

## Browse the catalog

Pass the store ID into product listing, then use product, variant, and
price identifiers for the next read. These namespaces are read-only in the
SDK.

| Namespace    | SDK operations                      | Official API                                                                                                                                          |
| ------------ | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `products`   | `products.list`, `products.get`     | [List](https://docs.lemonsqueezy.com/api/products/list-all-products), [Retrieve](https://docs.lemonsqueezy.com/api/products/retrieve-product)         |
| `variants`   | `variants.list`, `variants.get`     | [List](https://docs.lemonsqueezy.com/api/variants/list-all-variants), [Retrieve](https://docs.lemonsqueezy.com/api/variants/retrieve-variant)         |
| `prices`     | `prices.list`, `prices.get`         | [List](https://docs.lemonsqueezy.com/api/prices/list-all-prices), [Retrieve](https://docs.lemonsqueezy.com/api/prices/retrieve-price)                 |
| `files`      | `files.list`, `files.get`           | [List](https://docs.lemonsqueezy.com/api/files/list-all-files), [Retrieve](https://docs.lemonsqueezy.com/api/files/retrieve-file)                     |
| `affiliates` | `affiliates.list`, `affiliates.get` | [List](https://docs.lemonsqueezy.com/api/affiliates/list-all-affiliates), [Retrieve](https://docs.lemonsqueezy.com/api/affiliates/retrieve-affiliate) |

List filters use SDK camelCase (`storeId`, `productId`, `variantId`,
`userEmail`) and are compiled to Lemon Squeezy query parameters. Product,
variant, price, file, and affiliate status-like attributes remain open
strings; unknown server values are preserved.

<!-- fixture: catalog-browse.ts -->

```ts
import { createClient } from "@terminalzero/lemonsqueezy/client";

const client = createClient({
  apiKey: process.env.LEMONSQUEEZY_API_KEY,
});

export async function catalogForStore(storeId: string) {
  const products = await client.products.list({
    filter: { storeId },
    page: { number: 1, size: 10 },
  });
  const product = products.data[0];
  if (!product) {
    return undefined;
  }

  const variants = await client.variants.list({
    filter: { productId: product.id },
  });
  const variant = variants.data[0];
  if (!variant) {
    return { product };
  }

  const [prices, files, affiliates] = await Promise.all([
    client.prices.list({ filter: { variantId: variant.id } }),
    client.files.list({ filter: { variantId: variant.id } }),
    client.affiliates.list({ filter: { storeId } }),
  ]);

  return {
    product: await client.products.get(product.id),
    variant: await client.variants.get(variant.id),
    price: prices.data[0]
      ? await client.prices.get(prices.data[0].id)
      : undefined,
    file: files.data[0] ? await client.files.get(files.data[0].id) : undefined,
    affiliate: affiliates.data[0]
      ? await client.affiliates.get(affiliates.data[0].id)
      : undefined,
  };
}
```

## Manage customers

`customers.list`, `customers.get`, `customers.create`, `customers.update`,
and `customers.archive` map to the official
[List](https://docs.lemonsqueezy.com/api/customers/list-all-customers),
[Retrieve](https://docs.lemonsqueezy.com/api/customers/retrieve-customer),
[Create](https://docs.lemonsqueezy.com/api/customers/create-customer), and
[Update](https://docs.lemonsqueezy.com/api/customers/update-customer)
endpoints. `customers.archive` is the SDK convenience for setting status
to archived through that update endpoint.

Create requires `storeId`, `name`, and `email`. Update requires at least
one field. Archive returns the updated customer document; it is not a
hard delete and has no guaranteed cleanup path.

<!-- fixture: catalog-customers.ts -->

```ts
import { createClient } from "@terminalzero/lemonsqueezy/client";

const client = createClient({
  apiKey: process.env.LEMONSQUEEZY_API_KEY,
});

export async function findOrDescribeCustomer(storeId: string, email: string) {
  const existing = await client.customers.list({
    filter: { storeId, email },
    page: { number: 1, size: 10 },
  });
  const current = existing.data[0];
  if (current) {
    return client.customers.get(current.id);
  }

  const created = await client.customers.create({
    storeId,
    name: "Test Mode Customer",
    email,
  });
  return created;
}

export async function archiveCustomer(id: string) {
  return client.customers.archive(id);
}

export async function renameCustomer(id: string, name: string) {
  return client.customers.update(id, { name });
}
```

## Create a checkout

`checkouts.create` requires SDK `storeId` and `variantId` taken from the
catalog reads above. Those identifiers must already exist on the Lemon
Squeezy store, product, and variant; the SDK does not create catalog
records. Optional `productOptions`, `checkoutOptions`, `checkoutData`,
`customPrice`, `expiresAt`, `preview`, and `testMode` customize a checkout
that the store, product, and variant configuration already allow.

See
[Create a checkout](https://docs.lemonsqueezy.com/api/checkouts/create-checkout)
for upstream rules. `checkouts.get` and `checkouts.list` map to
[Retrieve](https://docs.lemonsqueezy.com/api/checkouts/retrieve-checkout)
and
[List](https://docs.lemonsqueezy.com/api/checkouts/list-all-checkouts).
There is no checkout update or delete operation.

Opaque user data belongs in `checkoutData.custom`. It is
application-controlled context: the SDK preserves keys and nested values
without renaming them. Treat those values as untrusted once they return
through webhooks or later API reads. Do not store secrets there.

<!-- fixture: catalog-checkout-create.ts -->

```ts
import { createClient } from "@terminalzero/lemonsqueezy/client";

const client = createClient({
  apiKey: process.env.LEMONSQUEEZY_API_KEY,
});

export async function createTestCheckout(
  storeId: string,
  variantId: string,
  applicationUserId: string,
) {
  const checkout = await client.checkouts.create({
    storeId,
    variantId,
    testMode: true,
    checkoutData: {
      custom: {
        applicationUserId,
        featureFlag: "beta",
      },
    },
  });

  return {
    id: checkout.data.id,
    url: checkout.data.attributes.url,
    custom: checkout.data.attributes.checkout_data.custom,
  };
}

export async function listStoreCheckouts(storeId: string) {
  const checkouts = await client.checkouts.list({
    filter: { storeId },
    page: { number: 1, size: 10 },
  });
  const first = checkouts.data[0];
  return first ? client.checkouts.get(first.id) : undefined;
}
```

Invalid identifiers fail before transport:

<!-- fixture: catalog-checkout-validation.ts execute -->

```ts
import {
  createClient,
  isLemonSqueezyError,
} from "@terminalzero/lemonsqueezy/client";

const client = createClient({
  apiKey: process.env.LEMONSQUEEZY_API_KEY,
});

try {
  await client.checkouts.create({
    storeId: "",
    variantId: "",
  });
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
- [Getting Started](./getting-started.md) for install and the first read
- [Orders, subscriptions, and metering](./orders-subscriptions.md) for
  post-purchase billing
- [Discounts and licensing](./discounts-licensing.md) for promotions and
  License Keys
- [Webhook management and inbound delivery](./webhooks.md) for signed
  event delivery
- [Compatibility API](./compatibility-api.md) for facade equivalents
- [Official Lemon Squeezy API](https://docs.lemonsqueezy.com/api) for
  resource fields and checkout business rules

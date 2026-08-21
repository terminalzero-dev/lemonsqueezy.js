# Getting Started

> Experimental community-maintained SDK maintained by Terminal Zero. Not
> affiliated with or endorsed by Lemon Squeezy.

This path takes a new v5 consumer from install to one authenticated read
against the [official Lemon Squeezy API](https://docs.lemonsqueezy.com/api).
Use only the documented public package entries. Source, `dist`, and other deep
imports are not part of the supported SDK.

The package supports Node.js 22 and 24, Bun 1.3.14 through 1.x, ESM and CJS,
and TypeScript 5.4 and later.

## Install an exact version

Install and deploy the current verified v5 beta as an exact version.

```sh
pnpm add --save-exact @terminalzero/lemonsqueezy@5.0.0-beta.3
```

```sh
npm install --save-exact @terminalzero/lemonsqueezy@5.0.0-beta.3
```

```sh
bun add --exact @terminalzero/lemonsqueezy@5.0.0-beta.3
```

Existing v4 applications should follow
[Compatibility-first migration](../../MIGRATION.md) before changing API usage.

## Create a client

New projects should create an isolated Explicit Client from
`@terminalzero/lemonsqueezy/client`. Each client captures immutable
configuration and exposes resource namespaces. Credential rotation creates a
new client; do not mutate a client after construction.

## Authenticate from the server

Create an API key in Lemon Squeezy and load it from the environment in trusted
server-side code. Do not put an API key in browser code, client bundles, logs,
or issue reports. Use a Test Mode key while you are evaluating the SDK. See
the official [Requests](https://docs.lemonsqueezy.com/api/getting-started/requests)
guide for key creation and authentication.

## Make a first request

`users.getAuthenticated` is a safe read of the current account. It maps to
[Retrieve the authenticated user](https://docs.lemonsqueezy.com/api/users/retrieve-user)
and does not require a store or resource ID.

The Explicit Client returns the wire-native JSON:API body, including
`snake_case` attributes and `meta.test_mode`. Failures reject with a typed
`LemonSqueezyError`. If the API credential is missing, the SDK fails with
code `configuration` before it makes a network request.

<!-- fixture: getting-started.ts execute -->

```ts
import {
  createClient,
  isLemonSqueezyError,
} from "@terminalzero/lemonsqueezy/client";

const client = createClient({
  apiKey: process.env.LEMONSQUEEZY_API_KEY,
});

try {
  const user = await client.users.getAuthenticated();
  console.log(user.meta.test_mode, user.data.attributes.email);
} catch (error) {
  if (isLemonSqueezyError(error)) {
    console.error(error.code, error.statusCode);
  } else {
    throw error;
  }
}
```

Complete field definitions and account semantics remain in the official
Lemon Squeezy API documentation.

## Handle success and failure

A successful read resolves to the JSON:API document. Keep that shape; the SDK
does not convert it into a camelCase domain model.

When `isLemonSqueezyError(error)` is true, inspect `error.code` and
`error.statusCode`. Configuration and validation failures happen before
transport. HTTP, network, timeout, abort, and invalid-response failures are
also typed `LemonSqueezyError` values. Unknown errors should be rethrown.

Use Lemon Squeezy Test Mode for any follow-up request that talks to the API.

## Next guides

- [Public package entries](../../README.md#public-entries) for the four
  supported imports and the unsupported deep paths
- [Explicit Client](./client.md) for construction, request options,
  pagination, and failures
- [Client API](./client-api.md) for all 21 namespaces and 61 methods
- [Catalog, customers, and checkouts](./catalog-checkout.md) for store
  discovery through checkout creation
- [Orders, subscriptions, and metering](./orders-subscriptions.md) for
  refunds, invoices, cancellation, and usage
- [Discounts and licensing](./discounts-licensing.md) for promotions and
  the public License API
- [Webhook management and inbound delivery](./webhooks.md) for endpoint
  CRUD and signed event parsing
- [Compatibility API](./compatibility-api.md) for the 59 facade functions
- [Compatibility-first](../../README.md#existing-v4-applications-compatibility-first)
  and [MIGRATION.md](../../MIGRATION.md) for existing v4 applications
- [Official Lemon Squeezy API](https://docs.lemonsqueezy.com/api) for resource
  fields, filters, and business rules

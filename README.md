# Lemon Squeezy JavaScript SDK

> Experimental community-maintained SDK maintained by Terminal Zero. Not
> affiliated with or endorsed by Lemon Squeezy.

`@terminalzero/lemonsqueezy` is a typed JavaScript and TypeScript SDK for the
Lemon Squeezy API. It ships native ESM and CJS for Node.js 22 and 24 and Bun
1.3.14 through 1.x.

## Documentation

- [Installation](#installation)
- [Getting Started](./docs/usage/getting-started.md)
- [API usage](./docs/usage/client.md)
- [Client API](./docs/usage/client-api.md)
- [Catalog, customers, and checkouts](./docs/usage/catalog-checkout.md)
- [Orders, subscriptions, and metering](./docs/usage/orders-subscriptions.md)
- [Discounts and licensing](./docs/usage/discounts-licensing.md)
- [Webhook management and inbound delivery](./docs/usage/webhooks.md)
- [Compatibility API](./docs/usage/compatibility-api.md)
- [Compatibility-first](#existing-v4-applications-compatibility-first)
- [Webhooks](#inbound-webhooks)
- [Webhook events](./docs/usage/webhooks.md#known-inbound-webhook-events)
- [Migration](./MIGRATION.md)
- [Official Lemon Squeezy API](https://docs.lemonsqueezy.com/api)

## Installation

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

Existing v4 applications should follow the
[Compatibility-first migration guide](./MIGRATION.md) before changing API
usage. It includes the behavior audit, canary plan, and exact rollback steps.

## Greenfield: Explicit Client

New projects should create an isolated Explicit Client and use its resource
namespaces. Each client captures immutable configuration and returns direct API
bodies. Errors reject with a typed `LemonSqueezyError`.

<!-- fixture: readme-client.ts -->

```ts
import {
  createClient,
  isLemonSqueezyError,
} from "@terminalzero/lemonsqueezy/client";

const client = createClient({
  apiKey: process.env.LEMONSQUEEZY_API_KEY,
});

try {
  const response = await client.orders.list({
    filter: { storeId: 1 },
  });
  console.log(response.data);
} catch (error) {
  if (isLemonSqueezyError(error)) {
    console.error(error.code, error.statusCode);
  } else {
    throw error;
  }
}
```

Create separate clients for separate credentials or tenants. Credential
rotation creates a new client.

## Existing v4 applications: Compatibility-first

The supported Compatibility facade preserves the v4 flat functions, root
types, argument shapes, and `{ statusCode, data, error }` envelope. First
change only the dependency and module specifier:

<!-- fixture: readme-compat.ts -->

```ts
import {
  getAuthenticatedUser,
  lemonSqueezySetup,
} from "@terminalzero/lemonsqueezy";

lemonSqueezySetup({
  apiKey: process.env.LEMONSQUEEZY_API_KEY,
  onError: (error) => console.error(error),
});

const { data, error, statusCode } = await getAuthenticatedUser();
```

The same facade is available from `@terminalzero/lemonsqueezy/compat` when an
explicit application boundary is useful. The Compatibility facade remains a
supported v5 interface. Adopting the Explicit Client later is optional and can
be done one complete call site or namespace at a time. The complete function
mapping is in the [Compatibility API](./docs/usage/compatibility-api.md)
index.

Read [MIGRATION.md](./MIGRATION.md) before rollout. v5 corrects observable v4
defects involving empty responses, error status, update defaults, validation,
observer behavior, and public declarations.

## Inbound Webhooks

Webhook registration management is available on `client.webhooks`. Signed
Inbound Webhook delivery is an independent root function. Follow
[Webhook management and inbound delivery](./docs/usage/webhooks.md) for
the complete management and receiver path.

```ts
import { parseWebhookEvent } from "@terminalzero/lemonsqueezy";

const event = parseWebhookEvent({
  secret: process.env.LEMONSQUEEZY_WEBHOOK_SECRET!,
  rawBody,
  signature,
});

if (event.known && event.eventName === "order_created") {
  console.log(event.eventName, event.data.type);
}
```

Pass the exact unparsed request-body bytes. The SDK does not send HTTP
acknowledgments or manage retries or idempotency for your endpoint.

## Public entries

- `@terminalzero/lemonsqueezy`: Compatibility facade, Client conveniences,
  and Inbound Webhook receiver.
- `@terminalzero/lemonsqueezy/client`: Explicit Client and typed Client errors.
- `@terminalzero/lemonsqueezy/compat`: Compatibility facade only.
- `@terminalzero/lemonsqueezy/types`: type-only Canonical and Compatibility
  types.

Resource, transport, testing, source, and distribution deep imports are not
public entries.

## Security

Use API credentials only in trusted server-side code. Do not expose an API key
or Webhook secret in browser code, logs, migration reports, or issue reports.
Use Lemon Squeezy Test Mode for integration canaries before a production
rollout.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

[MIT](./LICENSE)

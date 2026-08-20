# Explicit Client

The Explicit Client is the default v5 API. Create an isolated client, call
resource namespaces, and handle wire-native JSON:API responses or typed
failures. The Compatibility facade remains a supported alternative for
migration or function-style usage; see
[Compatibility-first migration](../../MIGRATION.md).

This guide stays at the public SDK boundary. Resource fields, filters, and
business rules belong to the
[official Lemon Squeezy API](https://docs.lemonsqueezy.com/api).

## Public package entries

Use only these published specifiers:

- `@terminalzero/lemonsqueezy`: Compatibility facade, Client conveniences,
  and the Inbound Webhook receiver
- `@terminalzero/lemonsqueezy/client`: Explicit Client, typed errors, and
  Client-related types
- `@terminalzero/lemonsqueezy/compat`: Compatibility facade only
- `@terminalzero/lemonsqueezy/types`: type-only Canonical and Compatibility
  types

Source, `dist`, resource, transport, testing, and other deep imports are not
supported public entries.

<!-- fixture: client-entries.ts -->

```ts
import { createClient } from "@terminalzero/lemonsqueezy/client";
import type { LemonSqueezyErrorCode } from "@terminalzero/lemonsqueezy/client";
import type { StoreListResponse } from "@terminalzero/lemonsqueezy/types";

export function createStoreClient(
  apiKey: string | undefined,
): ReturnType<typeof createClient> {
  return createClient({ apiKey });
}

export function describeError(code: LemonSqueezyErrorCode): string {
  return code;
}

export function currentPage(response: StoreListResponse): number {
  return response.meta.page.currentPage;
}
```

## Create and isolate clients

`createClient` captures immutable configuration. Each client is isolated:
it never reads from or writes to another Explicit Client or the Default
Client used by the Compatibility facade.

Load the API credential from the environment in trusted server-side code.
Do not put an API key in browser code, client bundles, logs, or issue
reports. Create a new client to rotate a credential or to separate tenants.
Do not mutate a client after construction.

The `license` namespace does not send a Bearer credential. Every other
Authenticated API namespace requires an API key and fails with
`configuration` before it makes a network request.

See the official
[Requests](https://docs.lemonsqueezy.com/api/getting-started/requests)
guide for key creation and authentication.

<!-- fixture: client-construction.ts execute -->

```ts
import {
  createClient,
  isLemonSqueezyError,
} from "@terminalzero/lemonsqueezy/client";

const billing = createClient({
  apiKey: process.env.LEMONSQUEEZY_API_KEY,
  timeoutMs: 15_000,
});
const reporting = createClient({
  apiKey: process.env.LEMONSQUEEZY_REPORTING_API_KEY,
});

try {
  await billing.stores.get("");
} catch (error) {
  if (isLemonSqueezyError(error)) {
    console.error(error.code, error.statusCode);
  } else {
    throw error;
  }
}

void reporting;
```

Invalid identifiers fail with `validation` before transport. Missing API
credentials fail with `configuration` before transport.

## Request options

Authenticated Client methods accept optional `RequestOptions` as the last
argument:

- `timeoutMs` overrides the client default for that call. The client
  default is `30_000` milliseconds. The value must be a positive finite
  number.
- `signal` is an `AbortSignal`. Caller cancellation and the SDK timeout
  remain separate. An already aborted signal does not create a network
  request.

The SDK does not retry. One Client call makes at most one network attempt,
including reads, writes, `429`, `5xx`, network errors, and timeouts. Retry
only from application code when the operation is safe to repeat.

<!-- fixture: client-request-options.ts -->

```ts
import { createClient } from "@terminalzero/lemonsqueezy/client";

const client = createClient({
  apiKey: process.env.LEMONSQUEEZY_API_KEY,
  timeoutMs: 15_000,
});
const controller = new AbortController();
controller.abort();

const stores = client.stores.list(
  { page: { number: 1, size: 10 } },
  { signal: controller.signal, timeoutMs: 5_000 },
);

void stores;
```

## Success responses and pagination

Successful Authenticated API calls resolve to the parsed JSON:API document.
Keep that shape. Resource attributes stay in `snake_case`. The SDK does
not convert the body into a camelCase domain model.

List responses include `links` (`first`, `last`, optional `next` and
`prev`) and `meta.page`. The page object uses the API's documented
camelCase fields: `currentPage`, `from`, `lastPage`, `perPage`, `to`, and
`total`. Request the next page with `page.number` and `page.size`. The SDK
does not paginate automatically.

Values that look like enums, such as product status, remain open strings.
Known examples are documented by Lemon Squeezy; unknown server values are
still valid response data.

See official
[Responses](https://docs.lemonsqueezy.com/api/getting-started/responses)
and
[Requests](https://docs.lemonsqueezy.com/api/getting-started/requests)
for pagination query parameters and document structure.

<!-- fixture: client-pagination.ts -->

```ts
import { createClient } from "@terminalzero/lemonsqueezy/client";

const client = createClient({
  apiKey: process.env.LEMONSQUEEZY_API_KEY,
});

export async function listStorePage(pageNumber: number) {
  const stores = await client.stores.list({
    page: { number: pageNumber, size: 10 },
  });

  return {
    currentPage: stores.meta.page.currentPage,
    lastPage: stores.meta.page.lastPage,
    ids: stores.data.map((store) => store.id),
    next: stores.links.next,
  };
}
```

## Failures

Explicit Client methods reject. They do not return a Compatibility
`{ statusCode, data, error }` envelope. Use `isLemonSqueezyError` across
ESM and CJS; do not rely on `instanceof`.

When `isLemonSqueezyError(error)` is true, inspect `error.code` and
`error.statusCode`:

- `configuration`: missing API credential; no network request
- `validation`: invalid Client arguments; no network request
- `http`: non-2xx API response; `statusCode` is the HTTP status;
  `apiErrors` is present when the body contains JSON:API `errors`
- `network`: no HTTP response
- `timeout`: the SDK timeout elapsed
- `aborted`: the caller `AbortSignal` cancelled the request
- `invalid_response`: HTTP 2xx with a missing or unusable body

`statusCode` is `null` for configuration, validation, network, timeout,
and aborted failures. Unknown errors should be rethrown.

<!-- fixture: client-failures.ts -->

```ts
import {
  createClient,
  isLemonSqueezyError,
} from "@terminalzero/lemonsqueezy/client";

const client = createClient({
  apiKey: process.env.LEMONSQUEEZY_API_KEY,
});

export async function readStores() {
  try {
    return await client.stores.list();
  } catch (error) {
    if (isLemonSqueezyError(error)) {
      console.error(error.code, error.statusCode);
      return undefined;
    }
    throw error;
  }
}
```

## Next guides

- [Getting Started](./getting-started.md) for install and the first
  authenticated read
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
- [Official Lemon Squeezy API](https://docs.lemonsqueezy.com/api) for
  resource fields and business rules

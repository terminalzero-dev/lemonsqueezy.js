# Webhook Management and Inbound Delivery

Webhook registration and inbound event authentication are separate
capabilities.

The Webhook Management API lives on `client.webhooks`. It uses an API
credential and JSON:API requests to create, list, get, update, and delete
endpoint registrations. It does not receive or verify deliveries.

Inbound webhook delivery is handled by `parseWebhookEvent` from
`@terminalzero/lemonsqueezy`. It authenticates the exact raw request
bytes with the signing secret, then interprets the signed payload. It
does not use the Explicit Client or the management namespace.

Use Lemon Squeezy
[Test Mode](https://docs.lemonsqueezy.com/help/getting-started/test-mode)
for management writes. Name Test Mode endpoints with a `docs-` prefix and
delete them after the example run. Load the signing secret from the
environment. Do not log it, embed it in source, or put it in browser
code.

## Manage webhook endpoints

`webhooks.list`, `webhooks.get`, `webhooks.create`, `webhooks.update`,
and `webhooks.delete` map to
[List](https://docs.lemonsqueezy.com/api/webhooks/list-all-webhooks),
[Retrieve](https://docs.lemonsqueezy.com/api/webhooks/retrieve-webhook),
[Create](https://docs.lemonsqueezy.com/api/webhooks/create-webhook),
[Update](https://docs.lemonsqueezy.com/api/webhooks/update-webhook),
and
[Delete](https://docs.lemonsqueezy.com/api/webhooks/delete-webhook).

Create requires `storeId`, an HTTP(S) `url`, a non-empty `events` array
of supported subscription names, and `secret`. Pass `testMode: true` for
Test Mode. Update requires at least one of `url`, `events`, or `secret`.
`webhooks.delete` hard-deletes the registration and returns no document.

The SDK has no test-event operation. Send simulated deliveries from the
Lemon Squeezy
[dashboard](https://docs.lemonsqueezy.com/help/webhooks/simulate-webhook-events).

See official
[Webhook Requests](https://docs.lemonsqueezy.com/help/webhooks/webhook-requests)
for delivery retries and acknowledgements. The SDK does not send HTTP
responses, retries, or idempotent business processing for your endpoint.

<!-- fixture: webhooks-management.ts -->

```ts
import { createClient } from "@terminalzero/lemonsqueezy/client";

const client = createClient({
  apiKey: process.env.LEMONSQUEEZY_API_KEY,
});

function requiredSecret(): string {
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error("LEMONSQUEEZY_WEBHOOK_SECRET is required.");
  }
  return secret;
}

export async function createTestWebhook(storeId: string) {
  const created = await client.webhooks.create({
    storeId,
    url: "https://example.com/lemon-squeezy-webhooks",
    events: ["order_created", "subscription_created"],
    secret: requiredSecret(),
    testMode: true,
  });
  return created.data.id;
}

export async function rotateWebhookEvents(webhookId: string) {
  return client.webhooks.update(webhookId, {
    events: ["order_created", "order_refunded"],
  });
}

export async function webhooksForStore(storeId: string) {
  const webhooks = await client.webhooks.list({
    filter: { storeId },
    page: { number: 1, size: 10 },
  });
  const first = webhooks.data[0];
  return first ? client.webhooks.get(first.id) : undefined;
}

export async function deleteTestWebhook(webhookId: string) {
  await client.webhooks.delete(webhookId);
}
```

## Receive inbound deliveries

Your HTTP framework must give you the exact unparsed request body before
any JSON parser runs. That
[Webhook raw body](https://docs.lemonsqueezy.com/help/webhooks/signing-requests)
is the HMAC-SHA256 input. Reconstructing JSON, pretty-printing, or
reading a parsed object first destroys the signature evidence.

`parseWebhookEvent` is framework-neutral. Pass:

- `secret`: the signing secret for that endpoint
- `rawBody`: `string`, `Uint8Array`, or `ArrayBuffer` bytes
- `signature`: the `X-Signature` header hex digest, 64 hexadecimal
  characters, case-insensitive

The function verifies HMAC-SHA256 with a constant-time compare. Invalid
signatures throw `WebhookError` with `invalid_signature` before the body
is parsed, so unauthenticated payload data is never exposed. After a
valid signature, malformed JSON or an unusable envelope throws
`invalid_payload`. Use `isWebhookError`; do not rely on `instanceof`.

Event names come from signed `meta.event_name`, not from `X-Event-Name`.
The 17 known names and their JSON:API resource types are listed below and
in official
[Event Types](https://docs.lemonsqueezy.com/help/webhooks/event-types).
Authenticated unknown events remain supported: `known` is false, and
the original name, metadata, resource, and unknown fields are preserved.
Do not discard them.

## Known inbound webhook events

| Event name                       | Resource type           | Task guide                                                       | Official                                                               |
| -------------------------------- | ----------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `order_created`                  | `orders`                | [Orders, subscriptions, and metering](./orders-subscriptions.md) | [Event types](https://docs.lemonsqueezy.com/help/webhooks/event-types) |
| `order_refunded`                 | `orders`                | [Orders, subscriptions, and metering](./orders-subscriptions.md) | [Event types](https://docs.lemonsqueezy.com/help/webhooks/event-types) |
| `customer_updated`               | `customers`             | [Catalog, customers, and checkouts](./catalog-checkout.md)       | [Event types](https://docs.lemonsqueezy.com/help/webhooks/event-types) |
| `subscription_created`           | `subscriptions`         | [Orders, subscriptions, and metering](./orders-subscriptions.md) | [Event types](https://docs.lemonsqueezy.com/help/webhooks/event-types) |
| `subscription_updated`           | `subscriptions`         | [Orders, subscriptions, and metering](./orders-subscriptions.md) | [Event types](https://docs.lemonsqueezy.com/help/webhooks/event-types) |
| `subscription_cancelled`         | `subscriptions`         | [Orders, subscriptions, and metering](./orders-subscriptions.md) | [Event types](https://docs.lemonsqueezy.com/help/webhooks/event-types) |
| `subscription_resumed`           | `subscriptions`         | [Orders, subscriptions, and metering](./orders-subscriptions.md) | [Event types](https://docs.lemonsqueezy.com/help/webhooks/event-types) |
| `subscription_expired`           | `subscriptions`         | [Orders, subscriptions, and metering](./orders-subscriptions.md) | [Event types](https://docs.lemonsqueezy.com/help/webhooks/event-types) |
| `subscription_paused`            | `subscriptions`         | [Orders, subscriptions, and metering](./orders-subscriptions.md) | [Event types](https://docs.lemonsqueezy.com/help/webhooks/event-types) |
| `subscription_unpaused`          | `subscriptions`         | [Orders, subscriptions, and metering](./orders-subscriptions.md) | [Event types](https://docs.lemonsqueezy.com/help/webhooks/event-types) |
| `subscription_payment_success`   | `subscription-invoices` | [Orders, subscriptions, and metering](./orders-subscriptions.md) | [Event types](https://docs.lemonsqueezy.com/help/webhooks/event-types) |
| `subscription_payment_failed`    | `subscription-invoices` | [Orders, subscriptions, and metering](./orders-subscriptions.md) | [Event types](https://docs.lemonsqueezy.com/help/webhooks/event-types) |
| `subscription_payment_recovered` | `subscription-invoices` | [Orders, subscriptions, and metering](./orders-subscriptions.md) | [Event types](https://docs.lemonsqueezy.com/help/webhooks/event-types) |
| `subscription_payment_refunded`  | `subscription-invoices` | [Orders, subscriptions, and metering](./orders-subscriptions.md) | [Event types](https://docs.lemonsqueezy.com/help/webhooks/event-types) |
| `license_key_created`            | `license-keys`          | [Discounts and licensing](./discounts-licensing.md)              | [Event types](https://docs.lemonsqueezy.com/help/webhooks/event-types) |
| `license_key_updated`            | `license-keys`          | [Discounts and licensing](./discounts-licensing.md)              | [Event types](https://docs.lemonsqueezy.com/help/webhooks/event-types) |
| `affiliate_activated`            | `affiliates`            | [Catalog, customers, and checkouts](./catalog-checkout.md)       | [Event types](https://docs.lemonsqueezy.com/help/webhooks/event-types) |

The following vectors are synthetic. They exercise the receiver offline
and must not be used as production secrets.

<!-- fixture: webhooks-receiver.ts execute -->

```ts
import { isWebhookError, parseWebhookEvent } from "@terminalzero/lemonsqueezy";

const secret = "whsec_test";
const knownBody =
  '{"meta":{"event_name":"order_created"},"data":{"type":"orders","id":"1"}}';
const unknownBody =
  '{"meta":{"event_name":"future_event","trace":"keep"},"data":{"type":"future-resource","id":"3","future":{"ok":true}},"top_level":"keep"}';
const malformedBody = "not-valid-json";

const known = parseWebhookEvent({
  secret,
  rawBody: knownBody,
  signature: "af4b38ef6309cd13c5ba6a37b5032caeaddc0d2683278dbab2e3c3894e7d383a",
});
if (known.known && known.eventName === "order_created") {
  console.log(known.eventName, known.data.type);
}

const unknown = parseWebhookEvent({
  secret,
  rawBody: unknownBody,
  signature: "ca6ddeb6dd45daa848e33894b5641be310b3f4ac1fdd5e0797f69ae2a01be066",
});
if (!unknown.known) {
  console.log(unknown.eventName, unknown.data.type);
}

try {
  parseWebhookEvent({
    secret,
    rawBody: knownBody,
    signature:
      "0000000000000000000000000000000000000000000000000000000000000000",
  });
} catch (error) {
  if (isWebhookError(error)) {
    console.error(error.code);
  } else {
    throw error;
  }
}

try {
  parseWebhookEvent({
    secret,
    rawBody: malformedBody,
    signature:
      "7edd3d90aab1b05e4af8518095fff9ccd90b76251affb6858e22aeec0ca7f3f1",
  });
} catch (error) {
  if (isWebhookError(error)) {
    console.error(error.code);
  } else {
    throw error;
  }
}
```

## Next guides

- [Explicit Client](./client.md) for construction, request options, and
  failures
- [Client API](./client-api.md) for all 21 namespaces and 61 methods
- [Orders, subscriptions, and metering](./orders-subscriptions.md) and
  [Discounts and licensing](./discounts-licensing.md) for the resources
  carried by known events
- [Compatibility API](./compatibility-api.md) for facade equivalents
- [Official Lemon Squeezy API](https://docs.lemonsqueezy.com/api) for
  webhook registration fields

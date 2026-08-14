import { describe, expectTypeOf, it } from "vitest";
import type { WebhookError } from "../../src";
import type {
  AffiliateResource,
  CustomerResource,
  InboundWebhookEvent,
  KnownInboundWebhookEvent,
  KnownWebhookEventName,
  LicenseKeyResource,
  OrderResource,
  ParseWebhookEventInput,
  SubscriptionInvoiceResource,
  SubscriptionResource,
  UnknownInboundWebhookEvent,
  WebhookErrorCode,
  WebhookEventMeta,
  WebhookEventResourceMap,
  WebhookRawBody,
} from "../../src/types";

function assertKnownEventNarrowing(event: InboundWebhookEvent): void {
  if (!event.known) {
    const unknownEvent: UnknownInboundWebhookEvent = event;
    void unknownEvent;
    return;
  }

  const knownEvent: KnownInboundWebhookEvent = event;
  void knownEvent;

  switch (event.eventName) {
    case "order_created":
    case "order_refunded": {
      const resource: OrderResource = event.data;
      void resource;
      break;
    }
    case "customer_updated": {
      const resource: CustomerResource = event.data;
      void resource;
      break;
    }
    case "subscription_created":
    case "subscription_updated":
    case "subscription_cancelled":
    case "subscription_resumed":
    case "subscription_expired":
    case "subscription_paused":
    case "subscription_unpaused": {
      const resource: SubscriptionResource = event.data;
      void resource;
      break;
    }
    case "subscription_payment_success":
    case "subscription_payment_failed":
    case "subscription_payment_recovered":
    case "subscription_payment_refunded": {
      const resource: SubscriptionInvoiceResource = event.data;
      void resource;
      break;
    }
    case "license_key_created":
    case "license_key_updated": {
      const resource: LicenseKeyResource = event.data;
      void resource;
      break;
    }
    case "affiliate_activated": {
      const resource: AffiliateResource = event.data;
      void resource;
      break;
    }
  }
}

describe("Inbound Webhook public types", () => {
  it("exports the complete receiver contract from the types entry", () => {
    expectTypeOf<WebhookRawBody>().toEqualTypeOf<
      string | Uint8Array | ArrayBuffer
    >();
    expectTypeOf<ParseWebhookEventInput>().toHaveProperty("secret");
    expectTypeOf<WebhookErrorCode>().toEqualTypeOf<
      "invalid_signature" | "invalid_payload"
    >();
    expectTypeOf<KnownWebhookEventName>().toEqualTypeOf<
      keyof WebhookEventResourceMap
    >();
    expectTypeOf<WebhookEventMeta>().toHaveProperty("event_name");
    expectTypeOf<UnknownInboundWebhookEvent["known"]>().toEqualTypeOf<false>();
    expectTypeOf<InboundWebhookEvent>().toMatchTypeOf<
      KnownInboundWebhookEvent | UnknownInboundWebhookEvent
    >();
    expectTypeOf(assertKnownEventNarrowing).toBeFunction();
  });
});

function assertReadonlyCause(webhookError: WebhookError): void {
  // @ts-expect-error Webhook error causes are immutable public evidence
  webhookError.cause = new Error("replacement");
}

void assertReadonlyCause;

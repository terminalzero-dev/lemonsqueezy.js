import type { AffiliateResource } from "../namespaces/affiliates/types";
import type { CustomerResource } from "../namespaces/customers/types";
import type { LicenseKeyResource } from "../namespaces/license-keys/types";
import type { OrderResource } from "../namespaces/orders/types";
import type { SubscriptionInvoiceResource } from "../namespaces/subscription-invoices/types";
import type { SubscriptionResource } from "../namespaces/subscriptions/types";
import type {
  JSONAPIResourceIdentifier,
  JSONValue,
  UnknownJSONAPIResource,
} from "../types/jsonapi";

export type WebhookRawBody = string | Uint8Array | ArrayBuffer;

export interface ParseWebhookEventInput {
  readonly secret: string;
  readonly rawBody: WebhookRawBody;
  readonly signature: string;
}

export interface WebhookEventResourceMap {
  readonly order_created: OrderResource;
  readonly order_refunded: OrderResource;
  readonly customer_updated: CustomerResource;
  readonly subscription_created: SubscriptionResource;
  readonly subscription_updated: SubscriptionResource;
  readonly subscription_cancelled: SubscriptionResource;
  readonly subscription_resumed: SubscriptionResource;
  readonly subscription_expired: SubscriptionResource;
  readonly subscription_paused: SubscriptionResource;
  readonly subscription_unpaused: SubscriptionResource;
  readonly subscription_payment_success: SubscriptionInvoiceResource;
  readonly subscription_payment_failed: SubscriptionInvoiceResource;
  readonly subscription_payment_recovered: SubscriptionInvoiceResource;
  readonly subscription_payment_refunded: SubscriptionInvoiceResource;
  readonly license_key_created: LicenseKeyResource;
  readonly license_key_updated: LicenseKeyResource;
  readonly affiliate_activated: AffiliateResource;
}

export type KnownWebhookEventName = keyof WebhookEventResourceMap;

export type WebhookEventMeta<Name extends string = string> = Readonly<
  Record<string, JSONValue>
> & {
  readonly event_name: Name;
  readonly custom_data?: Readonly<Record<string, JSONValue>>;
};

type WebhookEventEnvelope<
  Name extends string,
  Resource extends JSONAPIResourceIdentifier,
  Known extends boolean,
> = Readonly<Record<string, JSONValue>> & {
  readonly known: Known;
  readonly eventName: Name;
  readonly meta: WebhookEventMeta<Name>;
  readonly data: Resource;
};

export type KnownInboundWebhookEvent = {
  readonly [Name in KnownWebhookEventName]: WebhookEventEnvelope<
    Name,
    WebhookEventResourceMap[Name],
    true
  >;
}[KnownWebhookEventName];

export type UnknownInboundWebhookEvent = WebhookEventEnvelope<
  string,
  UnknownJSONAPIResource,
  false
>;

export type InboundWebhookEvent =
  | KnownInboundWebhookEvent
  | UnknownInboundWebhookEvent;

export type WebhookErrorCode = "invalid_signature" | "invalid_payload";

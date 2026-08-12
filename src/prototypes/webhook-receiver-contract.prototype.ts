/**
 * PROTOTYPE — not production code.
 *
 * Tests the selected v5 beta Inbound Webhook receiver contract. The public
 * function authenticates the exact raw body before parsing it, exposes no
 * unverified parser, and remains independent from Client and HTTP frameworks.
 */

import { createHmac, timingSafeEqual } from "node:crypto";

export type JSONPrimitive = string | number | boolean | null;
export type JSONValue =
  | JSONPrimitive
  | { readonly [key: string]: JSONValue }
  | readonly JSONValue[];

export type WebhookRawBody = string | Uint8Array | ArrayBuffer;

export interface ParseWebhookEventInput {
  readonly secret: string;
  readonly rawBody: WebhookRawBody;
  readonly signature: string;
}

export type UnknownJSONAPIResource = Readonly<Record<string, JSONValue>> & {
  readonly type: string;
  readonly id: string;
};

type CanonicalResource<Type extends string> = UnknownJSONAPIResource & {
  readonly type: Type;
};

export type OrderResource = CanonicalResource<"orders">;
export type CustomerResource = CanonicalResource<"customers">;
export type SubscriptionResource = CanonicalResource<"subscriptions">;
export type SubscriptionInvoiceResource =
  CanonicalResource<"subscription-invoices">;
export type LicenseKeyResource = CanonicalResource<"license-keys">;
export type AffiliateResource = CanonicalResource<"affiliates">;

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
  Resource extends UnknownJSONAPIResource,
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

const webhookErrorMarker = Symbol.for(
  "@terminalzero/lemonsqueezy/WebhookError"
);

export class WebhookError extends Error {
  readonly name = "WebhookError";
  readonly [webhookErrorMarker] = true;

  constructor(
    readonly code: WebhookErrorCode,
    message: string,
    options?: ErrorOptions
  ) {
    super(message, options);
  }
}

export function isWebhookError(value: unknown): value is WebhookError {
  if (!isRecord(value)) return false;

  return (
    value[webhookErrorMarker] === true &&
    (value.code === "invalid_signature" || value.code === "invalid_payload")
  );
}

const resourceTypeByEvent = {
  order_created: "orders",
  order_refunded: "orders",
  customer_updated: "customers",
  subscription_created: "subscriptions",
  subscription_updated: "subscriptions",
  subscription_cancelled: "subscriptions",
  subscription_resumed: "subscriptions",
  subscription_expired: "subscriptions",
  subscription_paused: "subscriptions",
  subscription_unpaused: "subscriptions",
  subscription_payment_success: "subscription-invoices",
  subscription_payment_failed: "subscription-invoices",
  subscription_payment_recovered: "subscription-invoices",
  subscription_payment_refunded: "subscription-invoices",
  license_key_created: "license-keys",
  license_key_updated: "license-keys",
  affiliate_activated: "affiliates",
} as const satisfies Readonly<Record<KnownWebhookEventName, string>>;

export function parseWebhookEvent(
  input: ParseWebhookEventInput
): InboundWebhookEvent {
  const rawBody = toBuffer(input.rawBody);
  verifySignature(input.secret, rawBody, input.signature);

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody.toString("utf8"));
  } catch (cause) {
    throw new WebhookError(
      "invalid_payload",
      "Webhook body is not valid JSON",
      { cause }
    );
  }

  return decodeEvent(payload);
}

function toBuffer(rawBody: WebhookRawBody): Buffer {
  if (typeof rawBody === "string") return Buffer.from(rawBody, "utf8");

  if (rawBody instanceof Uint8Array) {
    return Buffer.from(rawBody.buffer, rawBody.byteOffset, rawBody.byteLength);
  }

  return Buffer.from(rawBody);
}

function verifySignature(
  secret: string,
  rawBody: Uint8Array,
  signature: string
): void {
  if (!/^[0-9a-f]{64}$/iu.test(signature)) {
    throw new WebhookError("invalid_signature", "Webhook signature is invalid");
  }

  const expected = createHmac("sha256", secret).update(rawBody).digest();
  const received = Buffer.from(signature, "hex");

  if (!timingSafeEqual(expected, received)) {
    throw new WebhookError("invalid_signature", "Webhook signature is invalid");
  }
}

function decodeEvent(payload: unknown): InboundWebhookEvent {
  if (
    !isRecord(payload) ||
    !isRecord(payload.meta) ||
    !isRecord(payload.data)
  ) {
    throw invalidPayload("Webhook body must contain meta and resource data");
  }

  const eventName = payload.meta.event_name;
  const resourceType = payload.data.type;
  const resourceId = payload.data.id;

  if (
    typeof eventName !== "string" ||
    eventName.length === 0 ||
    typeof resourceType !== "string" ||
    typeof resourceId !== "string"
  ) {
    throw invalidPayload("Webhook routing fields are invalid");
  }

  const expectedResourceType = knownResourceType(eventName);
  if (
    expectedResourceType !== undefined &&
    resourceType !== expectedResourceType
  ) {
    throw invalidPayload("Webhook event and resource type do not match");
  }

  return {
    ...payload,
    known: expectedResourceType !== undefined,
    eventName,
    meta: payload.meta,
    data: payload.data,
  } as InboundWebhookEvent;
}

function knownResourceType(eventName: string): string | undefined {
  if (Object.hasOwn(resourceTypeByEvent, eventName)) {
    return resourceTypeByEvent[eventName as KnownWebhookEventName];
  }

  return undefined;
}

function invalidPayload(message: string): WebhookError {
  return new WebhookError("invalid_payload", message);
}

function isRecord(value: unknown): value is Record<PropertyKey, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

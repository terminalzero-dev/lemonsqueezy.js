import { createHmac, timingSafeEqual } from "node:crypto";
import { WebhookError, isRecord } from "./error";
import type {
  InboundWebhookEvent,
  KnownWebhookEventName,
  ParseWebhookEventInput,
  WebhookEventResourceMap,
  WebhookRawBody,
} from "./types";

export const knownWebhookEventCatalog = {
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
} as const satisfies {
  readonly [
    Name in KnownWebhookEventName
  ]: WebhookEventResourceMap[Name]["type"];
};

export function parseWebhookEvent(
  input: ParseWebhookEventInput,
): InboundWebhookEvent {
  const rawBody = toBuffer(input.rawBody);
  verifySignature(input.secret, rawBody, input.signature);

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody.toString("utf8"));
  } catch {
    throw new WebhookError("invalid_payload", "Webhook body is not valid JSON");
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
  signature: string,
): void {
  if (!/^[0-9a-f]{64}$/iu.test(signature)) {
    throw invalidSignature();
  }

  const expected = createHmac("sha256", secret).update(rawBody).digest();
  const received = Buffer.from(signature, "hex");

  if (!timingSafeEqual(expected, received)) {
    throw invalidSignature();
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
  if (Object.hasOwn(knownWebhookEventCatalog, eventName)) {
    return knownWebhookEventCatalog[eventName as KnownWebhookEventName];
  }

  return undefined;
}

function invalidSignature(): WebhookError {
  return new WebhookError("invalid_signature", "Webhook signature is invalid");
}

function invalidPayload(message: string): WebhookError {
  return new WebhookError("invalid_payload", message);
}

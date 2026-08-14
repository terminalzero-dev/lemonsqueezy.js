import type { WebhookErrorCode } from "./types";

const webhookErrorMarker = Symbol.for(
  "@terminalzero/lemonsqueezy/WebhookError",
);

export class WebhookError extends Error {
  readonly name = "WebhookError";
  readonly [webhookErrorMarker] = true;
  override readonly cause?: unknown;

  constructor(
    readonly code: WebhookErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.cause = options?.cause;
  }
}

export function isWebhookError(value: unknown): value is WebhookError {
  if (!isRecord(value)) return false;

  return (
    value[webhookErrorMarker] === true &&
    (value.code === "invalid_signature" || value.code === "invalid_payload")
  );
}

export function isRecord(
  value: unknown,
): value is Record<PropertyKey, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

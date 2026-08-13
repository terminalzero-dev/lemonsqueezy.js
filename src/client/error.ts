import type { JSONAPIError } from "../types/jsonapi";

export type LemonSqueezyErrorCode =
  | "configuration"
  | "validation"
  | "http"
  | "network"
  | "aborted"
  | "timeout"
  | "invalid_response";

interface LemonSqueezyErrorOptions {
  readonly statusCode?: number | null;
  readonly responseBody?: unknown;
  readonly apiErrors?: readonly JSONAPIError[];
  readonly cause?: unknown;
}

const errorBrand = Symbol.for("@terminalzero/lemonsqueezy.error");

export class LemonSqueezyError extends Error {
  readonly code: LemonSqueezyErrorCode;
  readonly statusCode: number | null;
  readonly responseBody: unknown;
  readonly apiErrors?: readonly JSONAPIError[];
  override readonly cause?: unknown;

  constructor(
    message: string,
    code: LemonSqueezyErrorCode,
    options: LemonSqueezyErrorOptions = {},
  ) {
    super(message);
    this.name = "LemonSqueezyError";
    this.code = code;
    this.statusCode = options.statusCode ?? null;
    this.responseBody = options.responseBody ?? null;
    this.apiErrors = options.apiErrors;
    this.cause = options.cause;
    Object.defineProperty(this, errorBrand, { value: true });
  }
}

export function isLemonSqueezyError(
  value: unknown,
): value is LemonSqueezyError {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as Record<PropertyKey, unknown>)[errorBrand] === true
  );
}

export const DEFAULT_TIMEOUT_MS = 30_000;

export interface AbortSignal {
  readonly aborted: boolean;
  readonly reason: unknown;
  addEventListener(
    type: "abort",
    listener: () => void,
    options?: boolean | { readonly once?: boolean },
  ): void;
  removeEventListener(type: "abort", listener: () => void): void;
}

export interface RequestOptions {
  readonly signal?: AbortSignal;
  readonly timeoutMs?: number;
}

export interface ClientOptions {
  readonly apiKey?: string;
  readonly timeoutMs?: number;
}

export interface RuntimeConfig {
  readonly apiKey?: string;
  readonly timeoutMs: number;
}

export type TransportAdapter = (request: Request) => Promise<Response>;

export interface JsonApiCoreRequest {
  readonly protocol: "jsonapi";
  readonly method: "GET" | "POST" | "PATCH" | "DELETE";
  readonly path: `/v1/${string}`;
  readonly query?: URLSearchParams;
  readonly body?: unknown;
}

export interface LicenseCoreRequest {
  readonly protocol: "license";
  readonly method: "POST";
  readonly path: `/v1/licenses/${"activate" | "validate" | "deactivate"}`;
  readonly form: readonly (readonly [string, string])[];
}

export type CoreRequest = JsonApiCoreRequest | LicenseCoreRequest;

export type SuccessContract =
  | {
      readonly kind: "jsonapi-single" | "jsonapi-list";
      readonly resourceType: string;
    }
  | { readonly kind: "meta-only" }
  | { readonly kind: "invoice" }
  | { readonly kind: "empty" }
  | {
      readonly kind: "license-json";
      readonly discriminator: "activated" | "valid" | "deactivated";
    };

declare const operationResult: unique symbol;

export interface OperationContract<Args extends readonly unknown[], Result> {
  readonly key: `${string}.${string}`;
  readonly compile: (args: Args) => CoreRequest;
  readonly success: SuccessContract;
  readonly evidence: readonly string[];
  readonly sanitizeErrorDetail?: (value: unknown, args: Args) => unknown;
  readonly [operationResult]?: Result;
}

export interface CoreSuccess<Result> {
  readonly statusCode: number;
  readonly body: Result;
}

export interface ResourceRuntime {
  invoke<Args extends readonly unknown[], Result>(
    operation: OperationContract<Args, Result>,
    args: Args,
    options?: RequestOptions,
  ): Promise<CoreSuccess<Result>>;
}

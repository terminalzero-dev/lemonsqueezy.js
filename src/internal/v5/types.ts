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

export interface CoreRequest {
  readonly protocol: "jsonapi";
  readonly method: "GET" | "POST" | "PATCH" | "DELETE";
  readonly path: `/v1/${string}`;
  readonly query?: URLSearchParams;
  readonly body?: unknown;
}

export type SuccessContract =
  | {
      readonly kind: "jsonapi-single" | "jsonapi-list";
      readonly resourceType: string;
    }
  | { readonly kind: "meta-only" }
  | { readonly kind: "invoice" };

declare const operationResult: unique symbol;

export interface OperationContract<Args extends readonly unknown[], Result> {
  readonly key: `${string}.${string}`;
  readonly compile: (args: Args) => CoreRequest;
  readonly success: SuccessContract;
  readonly evidence: readonly string[];
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

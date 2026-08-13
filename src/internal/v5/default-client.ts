import {
  isLemonSqueezyError,
  type LemonSqueezyError,
} from "../../client/error";
import { createResourceRuntime } from "./runtime";
import {
  DEFAULT_TIMEOUT_MS,
  type ClientOptions,
  type OperationContract,
  type TransportAdapter,
} from "./types";

export interface DefaultClientOptions extends ClientOptions {
  readonly onError?: (error: Error) => void;
}

export type CompatibilityResponse<Result> =
  | {
      readonly statusCode: number;
      readonly data: Result | null;
      readonly error: null;
    }
  | {
      readonly statusCode: number | null;
      readonly data: null;
      readonly error: LemonSqueezyError;
    };

let defaultOptions: DefaultClientOptions = {};
let defaultTransport: TransportAdapter = (request) => fetch(request);

export function configureDefaultClient(options: DefaultClientOptions): void {
  defaultOptions = {
    apiKey: options.apiKey,
    timeoutMs: options.timeoutMs,
    onError: options.onError,
  };
}

export function setDefaultTransport(transport: TransportAdapter): void {
  defaultTransport = transport;
}

export async function invokeDefaultCompatibility<
  Args extends readonly unknown[],
  RuntimeResult,
  CompatibilityResult = RuntimeResult,
>(
  operation: OperationContract<Args, RuntimeResult>,
  args: Args,
): Promise<CompatibilityResponse<CompatibilityResult>> {
  const runtime = createResourceRuntime(
    {
      apiKey: defaultOptions.apiKey,
      timeoutMs: defaultOptions.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    },
    defaultTransport,
  );

  try {
    const result = await runtime.invoke<Args, RuntimeResult>(operation, args);
    return {
      statusCode: result.statusCode,
      data: (result.body ?? null) as CompatibilityResult | null,
      error: null,
    };
  } catch (error) {
    if (!isLemonSqueezyError(error) || error.code === "validation") {
      throw error;
    }

    const envelope = {
      statusCode: error.statusCode,
      data: null,
      error,
    } as const;

    try {
      defaultOptions.onError?.(error);
    } catch {
      // Observers cannot replace or alter the SDK result.
    }

    return envelope;
  }
}

import { API_BASE_URL } from "../utils";
import { LemonSqueezyError } from "../../client/error";
import type { JSONAPIError } from "../../types/jsonapi";
import type {
  AbortSignal as PublicAbortSignal,
  OperationContract,
  RequestOptions,
  ResourceRuntime,
  RuntimeConfig,
  TransportAdapter,
} from "./types";

export function createResourceRuntime(
  config: RuntimeConfig,
  transport: TransportAdapter,
): ResourceRuntime {
  return Object.freeze({
    async invoke<Args extends readonly unknown[], Result>(
      operation: OperationContract<Args, Result>,
      args: Args,
      options?: RequestOptions,
    ) {
      if (!config.apiKey) {
        throw new LemonSqueezyError(
          "An API credential is required for this operation.",
          "configuration",
        );
      }

      const timeoutMs = options?.timeoutMs ?? config.timeoutMs;
      if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
        throw new LemonSqueezyError(
          "timeoutMs must be a positive finite number.",
          "validation",
        );
      }

      if (options?.signal?.aborted) {
        throw new LemonSqueezyError("The request was aborted.", "aborted", {
          cause: options.signal.reason,
        });
      }

      const compiled = operation.compile(args);
      const headers = new Headers({
        Accept: "application/vnd.api+json",
        "Content-Type": "application/vnd.api+json",
      });

      if (config.apiKey) {
        headers.set("Authorization", `Bearer ${config.apiKey}`);
      }

      const response = await sendOnce(
        transport,
        `${API_BASE_URL}${compiled.path}`,
        {
          method: compiled.method,
          headers,
        },
        timeoutMs,
        options?.signal,
      );

      if (response.status === 204 || response.status === 205) {
        return { statusCode: response.status, body: undefined as Result };
      }

      const text = await response.text();
      const parsed = parseResponseBody(text);

      if (!response.ok) {
        throw new LemonSqueezyError(
          `Lemon Squeezy API request failed with status ${response.status}.`,
          "http",
          {
            statusCode: response.status,
            responseBody: parsed.body,
            apiErrors: getJsonApiErrors(parsed.body),
          },
        );
      }

      if (
        !parsed.isJson ||
        !isValidSingleResponse(parsed.body, operation.success.resourceType)
      ) {
        throw new LemonSqueezyError(
          "Lemon Squeezy API returned an invalid response.",
          "invalid_response",
          {
            statusCode: response.status,
            responseBody: parsed.body,
            cause: parsed.cause,
          },
        );
      }

      return { statusCode: response.status, body: parsed.body as Result };
    },
  });
}

async function sendOnce(
  transport: TransportAdapter,
  url: string,
  init: RequestInit,
  timeoutMs: number,
  callerSignal?: PublicAbortSignal,
): Promise<Response> {
  const controller = new AbortController();
  let abortSource: "caller" | "timeout" | undefined;
  let timeoutReason: Error | undefined;

  const abortFromCaller = () => {
    if (abortSource) return;
    abortSource = "caller";
    controller.abort(callerSignal?.reason);
  };
  callerSignal?.addEventListener("abort", abortFromCaller, { once: true });

  const timeout = setTimeout(() => {
    if (abortSource) return;
    abortSource = "timeout";
    timeoutReason = new Error(`The request timed out after ${timeoutMs}ms.`);
    controller.abort(timeoutReason);
  }, timeoutMs);

  const aborted = new Promise<never>((_resolve, reject) => {
    controller.signal.addEventListener(
      "abort",
      () => reject(controller.signal.reason),
      { once: true },
    );
  });

  try {
    const request = new Request(url, { ...init, signal: controller.signal });
    return await Promise.race([transport(request), aborted]);
  } catch (cause) {
    if (abortSource === "caller") {
      throw new LemonSqueezyError("The request was aborted.", "aborted", {
        cause: callerSignal?.reason ?? cause,
      });
    }

    if (abortSource === "timeout") {
      throw new LemonSqueezyError("The request timed out.", "timeout", {
        cause: timeoutReason ?? cause,
      });
    }

    throw new LemonSqueezyError(
      "The Lemon Squeezy API request failed before receiving a response.",
      "network",
      { cause },
    );
  } finally {
    clearTimeout(timeout);
    callerSignal?.removeEventListener("abort", abortFromCaller);
  }
}

interface ParsedResponseBody {
  readonly body: unknown;
  readonly isJson: boolean;
  readonly cause?: unknown;
}

function parseResponseBody(text: string): ParsedResponseBody {
  if (text === "") return { body: null, isJson: false };

  try {
    return { body: JSON.parse(text) as unknown, isJson: true };
  } catch (cause) {
    return { body: text, isJson: false, cause };
  }
}

function isValidSingleResponse(body: unknown, resourceType: string): boolean {
  if (!isRecord(body) || !isRecord(body.data)) return false;

  const { data } = body;
  if (
    data.type !== resourceType ||
    typeof data.id !== "string" ||
    !isRecord(data.attributes)
  ) {
    return false;
  }

  return (
    isOptionalRecord(body.jsonapi) &&
    isOptionalRecord(body.links) &&
    isOptionalRecord(body.meta) &&
    isOptionalArray(body.included) &&
    isOptionalRecord(data.relationships) &&
    isOptionalRecord(data.links) &&
    isOptionalRecord(data.meta)
  );
}

function isOptionalRecord(value: unknown): boolean {
  return value === undefined || isRecord(value);
}

function isOptionalArray(value: unknown): boolean {
  return value === undefined || Array.isArray(value);
}

function getJsonApiErrors(body: unknown): readonly JSONAPIError[] | undefined {
  if (!isRecord(body) || !Array.isArray(body.errors)) return undefined;

  const errors = body.errors.filter(
    (error): error is JSONAPIError =>
      isRecord(error) && typeof error.title === "string",
  );

  return errors.length > 0 ? errors : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

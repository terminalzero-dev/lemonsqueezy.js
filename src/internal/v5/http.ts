import { LemonSqueezyError } from "../../client/error";
import type { JSONAPIError } from "../../types/jsonapi";
import { API_BASE_URL } from "../utils";
import type {
  AbortSignal as PublicAbortSignal,
  CoreRequest,
  CoreSuccess,
  RequestOptions,
  RuntimeConfig,
  TransportAdapter,
} from "./types";

export async function sendJsonApiRequest(
  request: CoreRequest,
  config: RuntimeConfig,
  transport: TransportAdapter,
  options?: RequestOptions,
): Promise<CoreSuccess<unknown>> {
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

  const headers = new Headers({
    Accept: "application/vnd.api+json",
    Authorization: `Bearer ${config.apiKey}`,
    "Content-Type": "application/vnd.api+json",
  });
  const url = new URL(`${API_BASE_URL}${request.path}`);
  request.query?.forEach((value, key) => url.searchParams.append(key, value));
  const received = await receiveOnce(
    transport,
    url.href,
    {
      method: request.method,
      headers,
      body:
        request.body === undefined ? undefined : JSON.stringify(request.body),
    },
    timeoutMs,
    options?.signal,
  );

  if (received.response.status === 204 || received.response.status === 205) {
    return { statusCode: received.response.status, body: undefined };
  }

  const parsed = parseResponseBody(received.text);
  if (!received.response.ok) {
    throw new LemonSqueezyError(
      `Lemon Squeezy API request failed with status ${received.response.status}.`,
      "http",
      {
        statusCode: received.response.status,
        responseBody: parsed.body,
        apiErrors: getJsonApiErrors(parsed.body),
      },
    );
  }

  if (!parsed.isJson) {
    throw new LemonSqueezyError(
      "Lemon Squeezy API returned an invalid response.",
      "invalid_response",
      {
        statusCode: received.response.status,
        responseBody: parsed.body,
        cause: parsed.cause,
      },
    );
  }

  return { statusCode: received.response.status, body: parsed.body };
}

interface ReceivedResponse {
  readonly response: Response;
  readonly text: string;
}

async function receiveOnce(
  transport: TransportAdapter,
  url: string,
  init: RequestInit,
  timeoutMs: number,
  callerSignal?: PublicAbortSignal,
): Promise<ReceivedResponse> {
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
    const sdkRequest = new Request(url, { ...init, signal: controller.signal });
    const receive = (async () => {
      const response = await transport(sdkRequest);
      const text =
        response.status === 204 || response.status === 205
          ? ""
          : await response.text();
      return { response, text };
    })();

    return await Promise.race([receive, aborted]);
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

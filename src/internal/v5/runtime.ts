import { LemonSqueezyError } from "../../client/error";
import { sendJsonApiRequest } from "./http";
import type {
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
      const compiled = operation.compile(args);
      const result = await sendJsonApiRequest(
        compiled,
        config,
        transport,
        options,
      );

      if (result.body === undefined) {
        return { statusCode: result.statusCode, body: undefined as Result };
      }

      if (!isValidSingleResponse(result.body, operation.success.resourceType)) {
        throw new LemonSqueezyError(
          "Lemon Squeezy API returned an invalid response.",
          "invalid_response",
          {
            statusCode: result.statusCode,
            responseBody: result.body,
          },
        );
      }

      return { statusCode: result.statusCode, body: result.body as Result };
    },
  });
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

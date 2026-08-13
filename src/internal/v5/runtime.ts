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

      if (!isValidResponse(result.body, operation.success)) {
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

function isValidResponse(
  body: unknown,
  success: {
    readonly kind: "jsonapi-single" | "jsonapi-list";
    readonly resourceType: string;
  },
): boolean {
  if (!isRecord(body)) return false;
  const resources = success.kind === "jsonapi-list" ? body.data : [body.data];
  if (!Array.isArray(resources)) return false;

  return (
    resources.every((resource) =>
      isValidResource(resource, success.resourceType),
    ) &&
    isOptionalRecord(body.jsonapi) &&
    isOptionalRecord(body.links) &&
    isOptionalRecord(body.meta) &&
    isOptionalArray(body.included)
  );
}

function isValidResource(value: unknown, resourceType: string): boolean {
  return (
    isRecord(value) &&
    value.type === resourceType &&
    typeof value.id === "string" &&
    isRecord(value.attributes) &&
    isOptionalRecord(value.relationships) &&
    isOptionalRecord(value.links) &&
    isOptionalRecord(value.meta)
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

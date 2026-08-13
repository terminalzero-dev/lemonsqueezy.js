import { isLemonSqueezyError, LemonSqueezyError } from "../../client/error";
import { sendJsonApiRequest } from "./http";
import type {
  OperationContract,
  RequestOptions,
  ResourceRuntime,
  RuntimeConfig,
  SuccessContract,
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
      let result;
      try {
        result = await sendJsonApiRequest(compiled, config, transport, options);
      } catch (error) {
        if (operation.redactErrorDetails && isLemonSqueezyError(error)) {
          throw new LemonSqueezyError(error.message, error.code, {
            statusCode: error.statusCode,
          });
        }
        throw error;
      }

      if (!isValidResponse(result.body, operation.success)) {
        throw new LemonSqueezyError(
          "Lemon Squeezy API returned an invalid response.",
          "invalid_response",
          {
            statusCode: result.statusCode,
            responseBody: operation.redactErrorDetails ? null : result.body,
          },
        );
      }

      return { statusCode: result.statusCode, body: result.body as Result };
    },
  });
}

function isValidResponse(body: unknown, success: SuccessContract): boolean {
  if (success.kind === "empty") return body === undefined;
  if (success.kind === "invoice") return isValidInvoiceResponse(body);
  if (success.kind === "meta-only") return isValidMetaOnlyResponse(body);
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

function isValidMetaOnlyResponse(body: unknown): boolean {
  return (
    isRecord(body) &&
    isRecord(body.meta) &&
    isOptionalRecord(body.jsonapi) &&
    isOptionalRecord(body.links)
  );
}

function isValidInvoiceResponse(body: unknown): boolean {
  return (
    isRecord(body) &&
    isRecord(body.jsonapi) &&
    typeof body.jsonapi.version === "string" &&
    isRecord(body.meta) &&
    isRecord(body.meta.urls) &&
    typeof body.meta.urls.download_invoice === "string"
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

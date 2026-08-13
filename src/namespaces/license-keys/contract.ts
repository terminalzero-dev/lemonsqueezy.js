import {
  compilePathId,
  compileReadQuery,
  compileResourceId,
} from "../../internal/v5/request";
import { LemonSqueezyError } from "../../client/error";
import { sanitizeLicenseManagementErrorDetail } from "../../internal/v5/redaction";
import type { OperationContract } from "../../internal/v5/types";
import type { Id } from "../../types/jsonapi";
import type {
  GetLicenseKeyParams,
  LicenseKeyListResponse,
  LicenseKeyResponse,
  ListLicenseKeysParams,
  UpdateLicenseKeyInput,
} from "./types";
import { knownLicenseKeyStatuses } from "./types";

const knownLicenseKeyStatusSet = new Set(knownLicenseKeyStatuses);

const evidence = {
  object:
    "https://docs.lemonsqueezy.com/api/license-keys/the-license-key-object",
  get: "https://docs.lemonsqueezy.com/api/license-keys/retrieve-license-key",
  list: "https://docs.lemonsqueezy.com/api/license-keys/list-all-license-keys",
  update: "https://docs.lemonsqueezy.com/api/license-keys/update-license-key",
} as const;

export const getLicenseKeyOperation = {
  key: "licenseKeys.get",
  compile: ([id, params]) => ({
    protocol: "jsonapi",
    method: "GET",
    path: `/v1/license-keys/${compilePathId("licenseKeyId", id)}`,
    query: compileReadQuery(params),
  }),
  success: { kind: "jsonapi-single", resourceType: "license-keys" },
  evidence: [evidence.get, evidence.object],
  sanitizeErrorDetail: sanitizeLicenseManagementErrorDetail,
} as const satisfies OperationContract<
  readonly [Id, GetLicenseKeyParams],
  LicenseKeyResponse
>;

export const updateLicenseKeyOperation = {
  key: "licenseKeys.update",
  compile: ([id, input]) => {
    assertValidUpdateInput(input);
    const licenseKeyId = compileResourceId("licenseKeyId", id);
    return {
      protocol: "jsonapi",
      method: "PATCH",
      path: `/v1/license-keys/${encodeURIComponent(licenseKeyId)}`,
      body: {
        data: {
          type: "license-keys",
          id: licenseKeyId,
          attributes: {
            activation_limit: input.activationLimit,
            expires_at: input.expiresAt,
            disabled: input.disabled,
          },
        },
      },
    };
  },
  success: { kind: "jsonapi-single", resourceType: "license-keys" },
  evidence: [evidence.update, evidence.object],
  sanitizeErrorDetail: sanitizeLicenseManagementErrorDetail,
} as const satisfies OperationContract<
  readonly [Id, UpdateLicenseKeyInput],
  LicenseKeyResponse
>;

function assertValidUpdateInput(input: UpdateLicenseKeyInput): void {
  if (
    typeof input !== "object" ||
    input === null ||
    Array.isArray(input) ||
    (input.activationLimit === undefined &&
      input.expiresAt === undefined &&
      input.disabled === undefined) ||
    (input.activationLimit !== undefined &&
      input.activationLimit !== null &&
      (!Number.isSafeInteger(input.activationLimit) ||
        input.activationLimit < 0)) ||
    (input.expiresAt !== undefined &&
      input.expiresAt !== null &&
      typeof input.expiresAt !== "string") ||
    (input.disabled !== undefined && typeof input.disabled !== "boolean")
  ) {
    throw new LemonSqueezyError(
      "License Key update must provide valid explicit fields.",
      "validation",
    );
  }
}

export const listLicenseKeysOperation = {
  key: "licenseKeys.list",
  compile: ([params]) => {
    const status = params.filter?.status;
    if (
      status !== undefined &&
      status !== null &&
      !knownLicenseKeyStatusSet.has(status)
    ) {
      throw new LemonSqueezyError(
        "status must be a documented License Key status.",
        "validation",
      );
    }

    return {
      protocol: "jsonapi",
      method: "GET",
      path: "/v1/license-keys",
      query: compileReadQuery(params, {
        storeId: "filter[store_id]",
        orderId: "filter[order_id]",
        orderItemId: "filter[order_item_id]",
        productId: "filter[product_id]",
        status: "filter[status]",
      }),
    };
  },
  success: { kind: "jsonapi-list", resourceType: "license-keys" },
  evidence: [evidence.list, evidence.object],
  sanitizeErrorDetail: sanitizeLicenseManagementErrorDetail,
} as const satisfies OperationContract<
  readonly [ListLicenseKeysParams],
  LicenseKeyListResponse
>;

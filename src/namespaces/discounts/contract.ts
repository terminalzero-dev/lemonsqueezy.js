import { LemonSqueezyError } from "../../client/error";
import {
  compilePathId,
  compileReadQuery,
  compileResourceId,
} from "../../internal/v5/request";
import { generateDiscount } from "../../internal/utils";
import type { OperationContract } from "../../internal/v5/types";
import type { Id } from "../../types/jsonapi";
import type {
  DiscountListResponse,
  DiscountResponse,
  CreateDiscountInput,
  GetDiscountParams,
  ListDiscountsParams,
} from "./types";

const evidence = {
  object: "https://docs.lemonsqueezy.com/api/discounts/the-discount-object",
  get: "https://docs.lemonsqueezy.com/api/discounts/retrieve-discount",
  list: "https://docs.lemonsqueezy.com/api/discounts/list-all-discounts",
  create: "https://docs.lemonsqueezy.com/api/discounts/create-discount",
  delete: "https://docs.lemonsqueezy.com/api/discounts/delete-discount",
} as const;

export const getDiscountOperation = {
  key: "discounts.get",
  compile: ([id, params]) => ({
    protocol: "jsonapi",
    method: "GET",
    path: `/v1/discounts/${compilePathId("discountId", id)}`,
    query: compileReadQuery(params),
  }),
  success: { kind: "jsonapi-single", resourceType: "discounts" },
  evidence: [evidence.get, evidence.object],
} as const satisfies OperationContract<
  readonly [Id, GetDiscountParams],
  DiscountResponse
>;

export const listDiscountsOperation = {
  key: "discounts.list",
  compile: ([params]) => ({
    protocol: "jsonapi",
    method: "GET",
    path: "/v1/discounts",
    query: compileReadQuery(params, { storeId: "filter[store_id]" }),
  }),
  success: { kind: "jsonapi-list", resourceType: "discounts" },
  evidence: [evidence.list, evidence.object],
} as const satisfies OperationContract<
  readonly [ListDiscountsParams],
  DiscountListResponse
>;

export const createDiscountOperation = {
  key: "discounts.create",
  compile: ([input]) => {
    assertValidCreateInput(input);
    const relationships: Record<string, unknown> = {
      store: {
        data: {
          type: "stores",
          id: compileResourceId("storeId", input.storeId),
        },
      },
    };
    if (input.variantIds && input.variantIds.length > 0) {
      relationships.variants = {
        data: input.variantIds.map((id) => ({
          type: "variants",
          id: compileResourceId("variantId", id),
        })),
      };
    }

    return {
      protocol: "jsonapi",
      method: "POST",
      path: "/v1/discounts",
      body: {
        data: {
          type: "discounts",
          attributes: {
            name: input.name,
            code: input.code ?? generateDiscount(),
            amount: input.amount,
            amount_type: input.amountType,
            is_limited_to_products: input.isLimitedToProducts ?? false,
            is_limited_redemptions: input.isLimitedRedemptions ?? false,
            max_redemptions: input.maxRedemptions ?? 0,
            starts_at: input.startsAt ?? null,
            expires_at: input.expiresAt ?? null,
            duration: input.duration ?? "once",
            duration_in_months: input.durationInMonths ?? 1,
            test_mode: input.testMode,
          },
          relationships,
        },
      },
    };
  },
  success: { kind: "jsonapi-single", resourceType: "discounts" },
  evidence: [evidence.create, evidence.object],
} as const satisfies OperationContract<
  readonly [CreateDiscountInput],
  DiscountResponse
>;

function assertValidCreateInput(input: CreateDiscountInput): void {
  if (
    typeof input !== "object" ||
    input === null ||
    Array.isArray(input) ||
    typeof input.name !== "string" ||
    input.name.length === 0 ||
    (input.code !== undefined && !/^[A-Z0-9]{3,256}$/.test(input.code)) ||
    !Number.isSafeInteger(input.amount) ||
    input.amount <= 0 ||
    (input.amountType !== "percent" && input.amountType !== "fixed") ||
    (input.isLimitedToProducts !== undefined &&
      typeof input.isLimitedToProducts !== "boolean") ||
    (input.isLimitedRedemptions !== undefined &&
      typeof input.isLimitedRedemptions !== "boolean") ||
    (input.maxRedemptions !== undefined &&
      (!Number.isSafeInteger(input.maxRedemptions) ||
        input.maxRedemptions < 0)) ||
    !isOptionalDate(input.startsAt) ||
    !isOptionalDate(input.expiresAt) ||
    (input.duration !== undefined &&
      input.duration !== "once" &&
      input.duration !== "repeating" &&
      input.duration !== "forever") ||
    (input.durationInMonths !== undefined &&
      (!Number.isSafeInteger(input.durationInMonths) ||
        input.durationInMonths <= 0)) ||
    (input.testMode !== undefined && typeof input.testMode !== "boolean") ||
    (input.isLimitedToProducts === true &&
      (!Array.isArray(input.variantIds) || input.variantIds.length === 0)) ||
    (input.isLimitedToProducts !== true && input.variantIds !== undefined) ||
    (input.variantIds !== undefined && !Array.isArray(input.variantIds))
  ) {
    throw new LemonSqueezyError(
      "input must contain valid Discount attributes and relationships.",
      "validation",
    );
  }
}

function isOptionalDate(value: string | null | undefined): boolean {
  return value === undefined || value === null || typeof value === "string";
}

export const deleteDiscountOperation = {
  key: "discounts.delete",
  compile: ([id]) => ({
    protocol: "jsonapi",
    method: "DELETE",
    path: `/v1/discounts/${compilePathId("discountId", id)}`,
  }),
  success: { kind: "empty" },
  evidence: [evidence.delete],
} as const satisfies OperationContract<readonly [Id], void>;

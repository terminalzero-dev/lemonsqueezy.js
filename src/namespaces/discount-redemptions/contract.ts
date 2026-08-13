import { compilePathId, compileReadQuery } from "../../internal/v5/request";
import type { OperationContract } from "../../internal/v5/types";
import type { Id } from "../../types/jsonapi";
import type {
  DiscountRedemptionListResponse,
  DiscountRedemptionResponse,
  GetDiscountRedemptionParams,
  ListDiscountRedemptionsParams,
} from "./types";

const evidence = {
  object:
    "https://docs.lemonsqueezy.com/api/discount-redemptions/the-discount-redemption-object",
  get: "https://docs.lemonsqueezy.com/api/discount-redemptions/retrieve-discount-redemption",
  list: "https://docs.lemonsqueezy.com/api/discount-redemptions/list-all-discount-redemptions",
} as const;

export const getDiscountRedemptionOperation = {
  key: "discountRedemptions.get",
  compile: ([id, params]) => ({
    protocol: "jsonapi",
    method: "GET",
    path: `/v1/discount-redemptions/${compilePathId("discountRedemptionId", id)}`,
    query: compileReadQuery(params),
  }),
  success: { kind: "jsonapi-single", resourceType: "discount-redemptions" },
  evidence: [evidence.get, evidence.object],
} as const satisfies OperationContract<
  readonly [Id, GetDiscountRedemptionParams],
  DiscountRedemptionResponse
>;

export const listDiscountRedemptionsOperation = {
  key: "discountRedemptions.list",
  compile: ([params]) => ({
    protocol: "jsonapi",
    method: "GET",
    path: "/v1/discount-redemptions",
    query: compileReadQuery(params, {
      discountId: "filter[discount_id]",
      orderId: "filter[order_id]",
    }),
  }),
  success: { kind: "jsonapi-list", resourceType: "discount-redemptions" },
  evidence: [evidence.list, evidence.object],
} as const satisfies OperationContract<
  readonly [ListDiscountRedemptionsParams],
  DiscountRedemptionListResponse
>;

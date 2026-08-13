import type { RequestOptions, ResourceRuntime } from "../../internal/v5/types";
import type { Id } from "../../types/jsonapi";
import {
  getDiscountRedemptionOperation,
  listDiscountRedemptionsOperation,
} from "./contract";
import type {
  DiscountRedemptionListResponse,
  DiscountRedemptionResponse,
  GetDiscountRedemptionParams,
  ListDiscountRedemptionsParams,
} from "./types";

export interface DiscountRedemptionsNamespace {
  get(
    id: Id,
    params?: GetDiscountRedemptionParams,
    options?: RequestOptions,
  ): Promise<DiscountRedemptionResponse>;
  list(
    params?: ListDiscountRedemptionsParams,
    options?: RequestOptions,
  ): Promise<DiscountRedemptionListResponse>;
}

export function createDiscountRedemptionsNamespace(
  runtime: ResourceRuntime,
): DiscountRedemptionsNamespace {
  return Object.freeze({
    async get(
      id: Id,
      params: GetDiscountRedemptionParams = {},
      options?: RequestOptions,
    ) {
      return (
        await runtime.invoke<
          readonly [Id, GetDiscountRedemptionParams],
          DiscountRedemptionResponse
        >(getDiscountRedemptionOperation, [id, params], options)
      ).body;
    },
    async list(
      params: ListDiscountRedemptionsParams = {},
      options?: RequestOptions,
    ) {
      return (
        await runtime.invoke<
          readonly [ListDiscountRedemptionsParams],
          DiscountRedemptionListResponse
        >(listDiscountRedemptionsOperation, [params], options)
      ).body;
    },
  });
}

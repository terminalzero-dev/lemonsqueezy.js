import type { FetchResponse } from "../internal/fetch/types";
import { invokeDefaultCompatibility } from "../internal/v5/default-client";
import {
  getDiscountRedemptionOperation,
  listDiscountRedemptionsOperation,
} from "../namespaces/discount-redemptions/contract";
import type {
  DiscountRedemptionListResponse,
  DiscountRedemptionResponse,
  GetDiscountRedemptionParams as CanonicalGetDiscountRedemptionParams,
  ListDiscountRedemptionsParams as CanonicalListDiscountRedemptionsParams,
} from "../namespaces/discount-redemptions/types";
import type {
  DiscountRedemption,
  GetDiscountRedemptionParams,
  ListDiscountRedemptions,
  ListDiscountRedemptionsParams,
} from "./types";

/**
 * Retrieve a discount redemption.
 *
 * @param discountRedemptionId The given discount redemption id.
 * @param [params] (Optional) Additional parameters.
 * @param [params.include] (Optional) Related resources.
 * @returns A discount redemption object.
 */
export function getDiscountRedemption(
  discountRedemptionId: number | string,
  params: GetDiscountRedemptionParams = {},
) {
  return invokeDefaultCompatibility<
    readonly [number | string, CanonicalGetDiscountRedemptionParams],
    DiscountRedemptionResponse,
    DiscountRedemption
  >(getDiscountRedemptionOperation, [discountRedemptionId, params]) as Promise<
    FetchResponse<DiscountRedemption>
  >;
}

/**
 * List all discount redemptions.
 *
 * @param [params] (Optional) Additional parameters.
 * @param [params.filter] (Optional) Filter parameters.
 * @param [params.filter.discountId] (Optional) Only return discount redemptions belonging to the discount with this ID.
 * @param [params.filter.orderId] (Optional) Only return discount redemptions belonging to the order with this ID.
 * @param [params.page] (Optional) Custom paginated queries.
 * @param [params.page.number] (Optional) The parameter determine which page to retrieve.
 * @param [params.page.size] (Optional) The parameter to determine how many results to return per page.
 * @param [params.include] (Optional) Related resources.
 * @returns A paginated list of discount redemption objects ordered by `created_at` (descending).
 */
export function listDiscountRedemptions(
  params: ListDiscountRedemptionsParams = {},
) {
  return invokeDefaultCompatibility<
    readonly [CanonicalListDiscountRedemptionsParams],
    DiscountRedemptionListResponse,
    ListDiscountRedemptions
  >(listDiscountRedemptionsOperation, [params]) as Promise<
    FetchResponse<ListDiscountRedemptions>
  >;
}

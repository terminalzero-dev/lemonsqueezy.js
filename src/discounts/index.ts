import { invokeDefaultCompatibility } from "../internal/v5/default-client";
import type { FetchResponse } from "../internal/fetch/types";
import {
  createDiscountOperation,
  deleteDiscountOperation,
  getDiscountOperation,
  listDiscountsOperation,
} from "../namespaces/discounts/contract";
import type {
  CreateDiscountInput,
  DiscountResponse,
  GetDiscountParams as CanonicalGetDiscountParams,
  DiscountListResponse,
  ListDiscountsParams as CanonicalListDiscountsParams,
} from "../namespaces/discounts/types";
import type {
  Discount,
  GetDiscountParams,
  ListDiscounts,
  ListDiscountsParams,
  NewDiscount,
} from "./types";

/**
 * Create a discount.
 *
 * @param discount New discount info.
 * @returns A discount object.
 */
export function createDiscount(discount: NewDiscount) {
  const input: CreateDiscountInput = discount;
  return invokeDefaultCompatibility<
    readonly [CreateDiscountInput],
    DiscountResponse,
    Discount
  >(createDiscountOperation, [input]) as Promise<FetchResponse<Discount>>;
}

/**
 * List all discounts.
 *
 * @param [params] (Optional) Additional parameters.
 * @param [params.filter] (Optional) Filter parameters.
 * @param [params.filter.storeId] (Optional) Only return discounts belonging to the store with this ID.
 * @param [params.page] (Optional) Custom paginated queries.
 * @param [params.page.number] (Optional) The parameter determine which page to retrieve.
 * @param [params.page.size] (Optional) The parameter to determine how many results to return per page.
 * @param [params.include] (Optional) Related resources.
 * @returns A paginated list of discount objects ordered by `created_at`.
 */
export function listDiscounts(params: ListDiscountsParams = {}) {
  return invokeDefaultCompatibility<
    readonly [CanonicalListDiscountsParams],
    DiscountListResponse,
    ListDiscounts
  >(listDiscountsOperation, [params]) as Promise<FetchResponse<ListDiscounts>>;
}

/**
 * Retrieve a discount.
 *
 * @param discountId The given discount id.
 * @param [params] (Optional) Additional parameters.
 * @param [params.include] (Optional) Related resources.
 * @returns A discount object.
 */
export function getDiscount(
  discountId: number | string,
  params: GetDiscountParams = {},
) {
  return invokeDefaultCompatibility<
    readonly [number | string, CanonicalGetDiscountParams],
    DiscountResponse,
    Discount
  >(getDiscountOperation, [discountId, params]) as Promise<
    FetchResponse<Discount>
  >;
}

/**
 * Delete a discount.
 *
 * @param discountId The given discount id.
 * @returns A `204 No Content` response on success.
 */
export function deleteDiscount(discountId: string | number) {
  return invokeDefaultCompatibility<readonly [number | string], void, null>(
    deleteDiscountOperation,
    [discountId],
  ) as Promise<FetchResponse<null>>;
}

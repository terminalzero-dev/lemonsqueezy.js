import { invokeDefaultCompatibility } from "../internal/v5/default-client";
import type { FetchResponse } from "../internal/fetch/types";
import {
  getPriceOperation,
  listPricesOperation,
} from "../namespaces/prices/contract";
import type {
  GetPriceParams as CanonicalGetPriceParams,
  ListPricesParams as CanonicalListPricesParams,
  PriceListResponse,
  PriceResponse,
} from "../namespaces/prices/types";
import type {
  GetPriceParams,
  ListPrices,
  ListPricesParams,
  Price,
} from "./types";

/**
 * Retrieve a price.
 *
 * @param priceId The given price id.
 * @param [params] (Optional) Additional parameters.
 * @param [params.include] (Optional) Related resources.
 * @returns A price object.
 */
export function getPrice(
  priceId: number | string,
  params: GetPriceParams = {},
) {
  return invokeDefaultCompatibility<
    readonly [number | string, CanonicalGetPriceParams],
    PriceResponse,
    Price
  >(getPriceOperation, [priceId, params]) as Promise<FetchResponse<Price>>;
}

/**
 * List all prices.
 *
 * @param [params] (Optional) Additional parameters.
 * @param [params.filter] (Optional) Filter parameters.
 * @param [params.filter.variantId] Only return prices belonging to the variant with this ID.
 * @param [params.page] (Optional) Custom paginated queries.
 * @param [params.page.number] (Optional) The parameter determine which page to retrieve.
 * @param [params.page.size] (Optional) The parameter to determine how many results to return per page.
 * @param [params.include] (Optional) Related resources.
 * @returns A paginated list of price objects ordered by `created_at` (descending).
 */
export function listPrices(params: ListPricesParams = {}) {
  return invokeDefaultCompatibility<
    readonly [CanonicalListPricesParams],
    PriceListResponse,
    ListPrices
  >(listPricesOperation, [params]) as Promise<FetchResponse<ListPrices>>;
}

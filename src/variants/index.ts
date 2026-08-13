import { invokeDefaultCompatibility } from "../internal/v5/default-client";
import type { FetchResponse } from "../internal/fetch/types";
import {
  getVariantOperation,
  listVariantsOperation,
} from "../namespaces/variants/contract";
import type {
  GetVariantParams as CanonicalGetVariantParams,
  ListVariantsParams as CanonicalListVariantsParams,
  VariantListResponse,
  VariantResponse,
} from "../namespaces/variants/types";
import type {
  GetVariantParams,
  ListVariants,
  ListVariantsParams,
  Variant,
} from "./types";

/**
 * Retrieve a variant.
 *
 * @param variantId The given variant id.
 * @param [params] (Optional) Additional parameters.
 * @param [params.include] (Optional) Related resources.
 * @returns A variant object.
 */
export function getVariant(
  variantId: number | string,
  params: GetVariantParams = {},
) {
  return invokeDefaultCompatibility<
    readonly [number | string, CanonicalGetVariantParams],
    VariantResponse,
    Variant
  >(getVariantOperation, [variantId, params]) as Promise<
    FetchResponse<Variant>
  >;
}

/**
 * List all variants
 *
 * @param [params] (Optional) Additional parameters.
 * @param [params.filter] (Optional) Filter parameters.
 * @param [params.filter.productId] (Optional) Only return variants belonging to the product with this ID.
 * @param [params.filter.status] (Optional) Only return variants with this status.
 * @param [params.page] (Optional) Custom paginated queries.
 * @param [params.page.number] (Optional) The parameter determine which page to retrieve.
 * @param [params.page.size] (Optional) The parameter to determine how many results to return per page.
 * @param [params.include] (Optional) Related resources.
 * @returns A paginated list of variant objects ordered by `sort`.
 */
export function listVariants(params: ListVariantsParams = {}) {
  return invokeDefaultCompatibility<
    readonly [CanonicalListVariantsParams],
    VariantListResponse,
    ListVariants
  >(listVariantsOperation, [params]) as Promise<FetchResponse<ListVariants>>;
}

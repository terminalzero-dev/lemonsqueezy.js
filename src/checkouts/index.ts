import { invokeDefaultCompatibility } from "../internal/v5/default-client";
import type { FetchResponse } from "../internal/fetch/types";
import {
  createCheckoutOperation,
  getCheckoutOperation,
  listCheckoutsOperation,
} from "../namespaces/checkouts/contract";
import type {
  CheckoutListResponse,
  CheckoutResponse,
  CreateCheckoutInput,
  GetCheckoutParams as CanonicalGetCheckoutParams,
  ListCheckoutsParams as CanonicalListCheckoutsParams,
} from "../namespaces/checkouts/types";
import type {
  Checkout,
  GetCheckoutParams,
  ListCheckouts,
  ListCheckoutsParams,
  NewCheckout,
} from "./types";

/**
 * Create a checkout.
 *
 * @param storeId (Required) The given store id.
 * @param variantId (Required) The given variant id.
 * @param [checkout] (Optional) A new checkout info.
 * @returns A checkout object.
 *
 * @see https://docs.lemonsqueezy.com/api/checkouts#create-a-checkout
 */
export function createCheckout(
  storeId: number | string,
  variantId: number | string,
  checkout: NewCheckout = {},
) {
  return invokeDefaultCompatibility<
    readonly [CreateCheckoutInput],
    CheckoutResponse,
    Checkout
  >(createCheckoutOperation, [{ ...checkout, storeId, variantId }]) as Promise<
    FetchResponse<Checkout>
  >;
}

/**
 * Retrieve a checkout.
 *
 * @param checkoutId (Required) The checkout id.
 * @param [params] (Optional) Additional parameters.
 * @param [params.include] (Optional) Related resources.
 * @returns A checkout object.
 */
export function getCheckout(
  checkoutId: number | string,
  params: GetCheckoutParams = {},
) {
  return invokeDefaultCompatibility<
    readonly [number | string, CanonicalGetCheckoutParams],
    CheckoutResponse,
    Checkout
  >(getCheckoutOperation, [checkoutId, params]) as Promise<
    FetchResponse<Checkout>
  >;
}

/**
 * List all checkouts.
 *
 * @param [params] (Optional) Additional parameters.
 * @param [params.filter] (Optional) Filter parameters.
 * @param [params.filter.storeId] (Optional) Only return products belonging to the store with this ID.
 * @param [params.filter.variantId] (Optional) Only return products belonging to the variant with this ID.
 * @param [params.page] (Optional) Custom paginated queries.
 * @param [params.page.number] (Optional) The parameter determine which page to retrieve.
 * @param [params.page.size] (Optional) The parameter to determine how many results to return per page.
 * @param [params.include] (Optional) Related resources.
 * @returns A paginated list of checkout objects ordered by `created_at` (descending).
 */
export function listCheckouts(params: ListCheckoutsParams = {}) {
  return invokeDefaultCompatibility<
    readonly [CanonicalListCheckoutsParams],
    CheckoutListResponse,
    ListCheckouts
  >(listCheckoutsOperation, [params]) as Promise<FetchResponse<ListCheckouts>>;
}

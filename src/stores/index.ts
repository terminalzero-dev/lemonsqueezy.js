import { invokeDefaultCompatibility } from "../internal/v5/default-client";
import {
  getStoreOperation,
  listStoresOperation,
} from "../namespaces/stores/contract";
import type {
  GetStoreParams as CanonicalGetStoreParams,
  ListStoresParams as CanonicalListStoresParams,
  StoreListResponse,
  StoreResponse,
} from "../namespaces/stores/types";
import type {
  GetStoreParams,
  ListStores,
  ListStoresParams,
  Store,
} from "./types";

/**
 * Retrieve a store.
 *
 * @param storeId (Required) The given store id.
 * @param [params] (Optional) Additional parameters.
 * @param [params.include] (Optional) Related resources.
 * @returns A store object.
 */
export function getStore(
  storeId: number | string,
  params: GetStoreParams = {},
) {
  return invokeDefaultCompatibility<
    readonly [number | string, CanonicalGetStoreParams],
    StoreResponse,
    Store
  >(getStoreOperation, [storeId, params]);
}

/**
 * List all stores.
 *
 * @param [params] (Optional) Additional parameters.
 * @param [params.page] (Optional) Custom paginated queries.
 * @param [params.page.number] (Optional) The parameter determine which page to retrieve.
 * @param [params.page.size] (Optional) The parameter to determine how many results to return per page.
 * @param [params.include] (Optional) Related resources.
 * @returns A paginated list of `store` objects ordered by name.
 */
export function listStores(params: ListStoresParams = {}) {
  return invokeDefaultCompatibility<
    readonly [CanonicalListStoresParams],
    StoreListResponse,
    ListStores
  >(listStoresOperation, [params]);
}

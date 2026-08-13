import type { RequestOptions, ResourceRuntime } from "../../internal/v5/types";
import { getStoreOperation, listStoresOperation } from "./contract";
import type {
  GetStoreParams,
  ListStoresParams,
  StoreId,
  StoreListResponse,
  StoreResponse,
} from "./types";

export interface StoresNamespace {
  get(
    id: StoreId,
    params?: GetStoreParams,
    options?: RequestOptions,
  ): Promise<StoreResponse>;
  list(
    params?: ListStoresParams,
    options?: RequestOptions,
  ): Promise<StoreListResponse>;
}

export function createStoresNamespace(
  runtime: ResourceRuntime,
): StoresNamespace {
  return Object.freeze({
    async get(
      id: StoreId,
      params: GetStoreParams = {},
      options?: RequestOptions,
    ) {
      return (
        await runtime.invoke<readonly [StoreId, GetStoreParams], StoreResponse>(
          getStoreOperation,
          [id, params],
          options,
        )
      ).body;
    },
    async list(params: ListStoresParams = {}, options?: RequestOptions) {
      return (
        await runtime.invoke<readonly [ListStoresParams], StoreListResponse>(
          listStoresOperation,
          [params],
          options,
        )
      ).body;
    },
  });
}

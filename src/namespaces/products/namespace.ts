import type { RequestOptions, ResourceRuntime } from "../../internal/v5/types";
import type { Id } from "../../types/jsonapi";
import { getProductOperation, listProductsOperation } from "./contract";
import type {
  GetProductParams,
  ListProductsParams,
  ProductListResponse,
  ProductResponse,
} from "./types";

export interface ProductsNamespace {
  get(
    id: Id,
    params?: GetProductParams,
    options?: RequestOptions,
  ): Promise<ProductResponse>;
  list(
    params?: ListProductsParams,
    options?: RequestOptions,
  ): Promise<ProductListResponse>;
}

export function createProductsNamespace(
  runtime: ResourceRuntime,
): ProductsNamespace {
  return Object.freeze({
    async get(id: Id, params: GetProductParams = {}, options?: RequestOptions) {
      return (
        await runtime.invoke<readonly [Id, GetProductParams], ProductResponse>(
          getProductOperation,
          [id, params],
          options,
        )
      ).body;
    },
    async list(params: ListProductsParams = {}, options?: RequestOptions) {
      return (
        await runtime.invoke<
          readonly [ListProductsParams],
          ProductListResponse
        >(listProductsOperation, [params], options)
      ).body;
    },
  });
}

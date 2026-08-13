import { invokeDefaultCompatibility } from "../internal/v5/default-client";
import type { FetchResponse } from "../internal/fetch/types";
import {
  getProductOperation,
  listProductsOperation,
} from "../namespaces/products/contract";
import type {
  GetProductParams as CanonicalGetProductParams,
  ListProductsParams as CanonicalListProductsParams,
  ProductListResponse,
  ProductResponse,
} from "../namespaces/products/types";
import type {
  GetProductParams,
  ListProducts,
  ListProductsParams,
  Product,
} from "./types";

/**
 * Retrieve a product.
 *
 * @param productId The given product id.
 * @param [params] (Optional) Additional parameters.
 * @param [params.include] (Optional) Related resources.
 * @returns A product object.
 */
export function getProduct(
  productId: number | string,
  params: GetProductParams = {},
) {
  return invokeDefaultCompatibility<
    readonly [number | string, CanonicalGetProductParams],
    ProductResponse,
    Product
  >(getProductOperation, [productId, params]) as Promise<
    FetchResponse<Product>
  >;
}

/**
 * List all products.
 *
 * @param [params] (Optional) Additional parameters.
 * @param [params.filter] (Optional) Filter parameters.
 * @param [params.filter.storeId] (Optional) Only return products belonging to the store with this ID.
 * @param [params.page] (Optional) Custom paginated queries.
 * @param [params.page.number] (Optional) The parameter determine which page to retrieve.
 * @param [params.page.size] (Optional) The parameter to determine how many results to return per page.
 * @param [params.include] (Optional) Related resources.
 * @returns A paginated list of product objects ordered by `name`.
 */
export function listProducts(params: ListProductsParams = {}) {
  return invokeDefaultCompatibility<
    readonly [CanonicalListProductsParams],
    ProductListResponse,
    ListProducts
  >(listProductsOperation, [params]) as Promise<FetchResponse<ListProducts>>;
}

import { compilePathId, compileReadQuery } from "../../internal/v5/request";
import type { OperationContract } from "../../internal/v5/types";
import type {
  GetProductParams,
  ListProductsParams,
  ProductListResponse,
  ProductResponse,
} from "./types";
import type { Id } from "../../types/jsonapi";

const evidence = {
  object: "https://docs.lemonsqueezy.com/api/products/the-product-object",
  get: "https://docs.lemonsqueezy.com/api/products/retrieve-product",
  list: "https://docs.lemonsqueezy.com/api/products/list-all-products",
} as const;

export const getProductOperation = {
  key: "products.get",
  compile: ([id, params]) => ({
    protocol: "jsonapi",
    method: "GET",
    path: `/v1/products/${compilePathId("productId", id)}`,
    query: compileReadQuery(params),
  }),
  success: { kind: "jsonapi-single", resourceType: "products" },
  evidence: [evidence.get, evidence.object],
} as const satisfies OperationContract<
  readonly [Id, GetProductParams],
  ProductResponse
>;

export const listProductsOperation = {
  key: "products.list",
  compile: ([params]) => ({
    protocol: "jsonapi",
    method: "GET",
    path: "/v1/products",
    query: compileReadQuery(params, { storeId: "filter[store_id]" }),
  }),
  success: { kind: "jsonapi-list", resourceType: "products" },
  evidence: [evidence.list, evidence.object],
} as const satisfies OperationContract<
  readonly [ListProductsParams],
  ProductListResponse
>;

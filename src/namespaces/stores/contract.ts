import { compilePathId, compileReadQuery } from "../../internal/v5/request";
import type { OperationContract } from "../../internal/v5/types";
import type {
  GetStoreParams,
  ListStoresParams,
  StoreId,
  StoreListResponse,
  StoreResponse,
} from "./types";

export const getStoreOperation = {
  key: "stores.get",
  compile: ([id, params]) => ({
    protocol: "jsonapi",
    method: "GET",
    path: `/v1/stores/${compilePathId("storeId", id)}`,
    query: compileReadQuery(params),
  }),
  success: { kind: "jsonapi-single", resourceType: "stores" },
  evidence: [
    "https://docs.lemonsqueezy.com/api/stores/retrieve-store",
    "https://docs.lemonsqueezy.com/api/stores/the-store-object",
  ],
} as const satisfies OperationContract<
  readonly [StoreId, GetStoreParams],
  StoreResponse
>;

export const listStoresOperation = {
  key: "stores.list",
  compile: ([params]) => ({
    protocol: "jsonapi",
    method: "GET",
    path: "/v1/stores",
    query: compileReadQuery(params),
  }),
  success: { kind: "jsonapi-list", resourceType: "stores" },
  evidence: [
    "https://docs.lemonsqueezy.com/api/stores/list-all-stores",
    "https://docs.lemonsqueezy.com/api/stores/the-store-object",
  ],
} as const satisfies OperationContract<
  readonly [ListStoresParams],
  StoreListResponse
>;

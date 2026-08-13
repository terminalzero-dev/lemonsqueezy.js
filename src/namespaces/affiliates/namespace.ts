import type { RequestOptions, ResourceRuntime } from "../../internal/v5/types";
import type { Id } from "../../types/jsonapi";
import { getAffiliateOperation, listAffiliatesOperation } from "./contract";
import type {
  AffiliateListResponse,
  AffiliateResponse,
  GetAffiliateParams,
  ListAffiliatesParams,
} from "./types";

export interface AffiliatesNamespace {
  get(
    id: Id,
    params?: GetAffiliateParams,
    options?: RequestOptions,
  ): Promise<AffiliateResponse>;
  list(
    params?: ListAffiliatesParams,
    options?: RequestOptions,
  ): Promise<AffiliateListResponse>;
}

export function createAffiliatesNamespace(
  runtime: ResourceRuntime,
): AffiliatesNamespace {
  return Object.freeze({
    async get(
      id: Id,
      params: GetAffiliateParams = {},
      options?: RequestOptions,
    ) {
      return (
        await runtime.invoke<
          readonly [Id, GetAffiliateParams],
          AffiliateResponse
        >(getAffiliateOperation, [id, params], options)
      ).body;
    },
    async list(params: ListAffiliatesParams = {}, options?: RequestOptions) {
      return (
        await runtime.invoke<
          readonly [ListAffiliatesParams],
          AffiliateListResponse
        >(listAffiliatesOperation, [params], options)
      ).body;
    },
  });
}

import type { RequestOptions, ResourceRuntime } from "../../internal/v5/types";
import type { Id } from "../../types/jsonapi";
import { getPriceOperation, listPricesOperation } from "./contract";
import type {
  GetPriceParams,
  ListPricesParams,
  PriceListResponse,
  PriceResponse,
} from "./types";

export interface PricesNamespace {
  get(
    id: Id,
    params?: GetPriceParams,
    options?: RequestOptions,
  ): Promise<PriceResponse>;
  list(
    params?: ListPricesParams,
    options?: RequestOptions,
  ): Promise<PriceListResponse>;
}

export function createPricesNamespace(
  runtime: ResourceRuntime,
): PricesNamespace {
  return Object.freeze({
    async get(id: Id, params: GetPriceParams = {}, options?: RequestOptions) {
      return (
        await runtime.invoke<readonly [Id, GetPriceParams], PriceResponse>(
          getPriceOperation,
          [id, params],
          options,
        )
      ).body;
    },
    async list(params: ListPricesParams = {}, options?: RequestOptions) {
      return (
        await runtime.invoke<readonly [ListPricesParams], PriceListResponse>(
          listPricesOperation,
          [params],
          options,
        )
      ).body;
    },
  });
}

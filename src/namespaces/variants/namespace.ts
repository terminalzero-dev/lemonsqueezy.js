import type { RequestOptions, ResourceRuntime } from "../../internal/v5/types";
import type { Id } from "../../types/jsonapi";
import { getVariantOperation, listVariantsOperation } from "./contract";
import type {
  GetVariantParams,
  ListVariantsParams,
  VariantListResponse,
  VariantResponse,
} from "./types";

export interface VariantsNamespace {
  get(
    id: Id,
    params?: GetVariantParams,
    options?: RequestOptions,
  ): Promise<VariantResponse>;
  list(
    params?: ListVariantsParams,
    options?: RequestOptions,
  ): Promise<VariantListResponse>;
}

export function createVariantsNamespace(
  runtime: ResourceRuntime,
): VariantsNamespace {
  return Object.freeze({
    async get(id: Id, params: GetVariantParams = {}, options?: RequestOptions) {
      return (
        await runtime.invoke<readonly [Id, GetVariantParams], VariantResponse>(
          getVariantOperation,
          [id, params],
          options,
        )
      ).body;
    },
    async list(params: ListVariantsParams = {}, options?: RequestOptions) {
      return (
        await runtime.invoke<
          readonly [ListVariantsParams],
          VariantListResponse
        >(listVariantsOperation, [params], options)
      ).body;
    },
  });
}

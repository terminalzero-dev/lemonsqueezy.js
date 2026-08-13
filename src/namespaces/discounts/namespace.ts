import type { RequestOptions, ResourceRuntime } from "../../internal/v5/types";
import type { Id } from "../../types/jsonapi";
import {
  createDiscountOperation,
  deleteDiscountOperation,
  getDiscountOperation,
  listDiscountsOperation,
} from "./contract";
import type {
  DiscountListResponse,
  DiscountResponse,
  CreateDiscountInput,
  GetDiscountParams,
  ListDiscountsParams,
} from "./types";

export interface DiscountsNamespace {
  create(
    input: CreateDiscountInput,
    options?: RequestOptions,
  ): Promise<DiscountResponse>;
  delete(id: Id, options?: RequestOptions): Promise<void>;
  get(
    id: Id,
    params?: GetDiscountParams,
    options?: RequestOptions,
  ): Promise<DiscountResponse>;
  list(
    params?: ListDiscountsParams,
    options?: RequestOptions,
  ): Promise<DiscountListResponse>;
}

export function createDiscountsNamespace(
  runtime: ResourceRuntime,
): DiscountsNamespace {
  return Object.freeze({
    async create(input: CreateDiscountInput, options?: RequestOptions) {
      return (
        await runtime.invoke<readonly [CreateDiscountInput], DiscountResponse>(
          createDiscountOperation,
          [input],
          options,
        )
      ).body;
    },
    async delete(id: Id, options?: RequestOptions) {
      return (
        await runtime.invoke<readonly [Id], void>(
          deleteDiscountOperation,
          [id],
          options,
        )
      ).body;
    },
    async get(
      id: Id,
      params: GetDiscountParams = {},
      options?: RequestOptions,
    ) {
      return (
        await runtime.invoke<
          readonly [Id, GetDiscountParams],
          DiscountResponse
        >(getDiscountOperation, [id, params], options)
      ).body;
    },
    async list(params: ListDiscountsParams = {}, options?: RequestOptions) {
      return (
        await runtime.invoke<
          readonly [ListDiscountsParams],
          DiscountListResponse
        >(listDiscountsOperation, [params], options)
      ).body;
    },
  });
}

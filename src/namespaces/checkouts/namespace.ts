import type { RequestOptions, ResourceRuntime } from "../../internal/v5/types";
import type { Id } from "../../types/jsonapi";
import {
  createCheckoutOperation,
  getCheckoutOperation,
  listCheckoutsOperation,
} from "./contract";
import type {
  CheckoutListResponse,
  CheckoutResponse,
  CreateCheckoutInput,
  GetCheckoutParams,
  ListCheckoutsParams,
} from "./types";

export interface CheckoutsNamespace {
  create(
    input: CreateCheckoutInput,
    options?: RequestOptions,
  ): Promise<CheckoutResponse>;
  get(
    id: Id,
    params?: GetCheckoutParams,
    options?: RequestOptions,
  ): Promise<CheckoutResponse>;
  list(
    params?: ListCheckoutsParams,
    options?: RequestOptions,
  ): Promise<CheckoutListResponse>;
}

export function createCheckoutsNamespace(
  runtime: ResourceRuntime,
): CheckoutsNamespace {
  return Object.freeze({
    async create(input: CreateCheckoutInput, options?: RequestOptions) {
      return (
        await runtime.invoke<readonly [CreateCheckoutInput], CheckoutResponse>(
          createCheckoutOperation,
          [input],
          options,
        )
      ).body;
    },
    async get(
      id: Id,
      params: GetCheckoutParams = {},
      options?: RequestOptions,
    ) {
      return (
        await runtime.invoke<
          readonly [Id, GetCheckoutParams],
          CheckoutResponse
        >(getCheckoutOperation, [id, params], options)
      ).body;
    },
    async list(params: ListCheckoutsParams = {}, options?: RequestOptions) {
      return (
        await runtime.invoke<
          readonly [ListCheckoutsParams],
          CheckoutListResponse
        >(listCheckoutsOperation, [params], options)
      ).body;
    },
  });
}

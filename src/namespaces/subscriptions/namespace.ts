import type { RequestOptions, ResourceRuntime } from "../../internal/v5/types";
import type { Id } from "../../types/jsonapi";
import {
  cancelSubscriptionOperation,
  getSubscriptionOperation,
  listSubscriptionsOperation,
  updateSubscriptionOperation,
} from "./contract";
import type {
  GetSubscriptionParams,
  ListSubscriptionsParams,
  SubscriptionListResponse,
  SubscriptionResponse,
  UpdateSubscriptionInput,
} from "./types";

export interface SubscriptionsNamespace {
  cancel(id: Id, options?: RequestOptions): Promise<SubscriptionResponse>;
  get(
    id: Id,
    params?: GetSubscriptionParams,
    options?: RequestOptions,
  ): Promise<SubscriptionResponse>;
  list(
    params?: ListSubscriptionsParams,
    options?: RequestOptions,
  ): Promise<SubscriptionListResponse>;
  update(
    id: Id,
    input: UpdateSubscriptionInput,
    options?: RequestOptions,
  ): Promise<SubscriptionResponse>;
}

export function createSubscriptionsNamespace(
  runtime: ResourceRuntime,
): SubscriptionsNamespace {
  return Object.freeze({
    async cancel(id: Id, options?: RequestOptions) {
      return (
        await runtime.invoke<readonly [Id], SubscriptionResponse>(
          cancelSubscriptionOperation,
          [id],
          options,
        )
      ).body;
    },
    async get(
      id: Id,
      params: GetSubscriptionParams = {},
      options?: RequestOptions,
    ) {
      return (
        await runtime.invoke<
          readonly [Id, GetSubscriptionParams],
          SubscriptionResponse
        >(getSubscriptionOperation, [id, params], options)
      ).body;
    },
    async list(params: ListSubscriptionsParams = {}, options?: RequestOptions) {
      return (
        await runtime.invoke<
          readonly [ListSubscriptionsParams],
          SubscriptionListResponse
        >(listSubscriptionsOperation, [params], options)
      ).body;
    },
    async update(
      id: Id,
      input: UpdateSubscriptionInput,
      options?: RequestOptions,
    ) {
      return (
        await runtime.invoke<
          readonly [Id, UpdateSubscriptionInput],
          SubscriptionResponse
        >(updateSubscriptionOperation, [id, input], options)
      ).body;
    },
  });
}

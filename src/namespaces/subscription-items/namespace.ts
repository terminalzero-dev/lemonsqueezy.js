import type { RequestOptions, ResourceRuntime } from "../../internal/v5/types";
import type { Id } from "../../types/jsonapi";
import {
  getSubscriptionItemCurrentUsageOperation,
  getSubscriptionItemOperation,
  listSubscriptionItemsOperation,
  updateSubscriptionItemOperation,
} from "./contract";
import type {
  GetSubscriptionItemParams,
  ListSubscriptionItemsParams,
  SubscriptionItemListResponse,
  SubscriptionItemCurrentUsageResponse,
  SubscriptionItemResponse,
  UpdateSubscriptionItemInput,
} from "./types";

export interface SubscriptionItemsNamespace {
  get(
    id: Id,
    params?: GetSubscriptionItemParams,
    options?: RequestOptions,
  ): Promise<SubscriptionItemResponse>;
  list(
    params?: ListSubscriptionItemsParams,
    options?: RequestOptions,
  ): Promise<SubscriptionItemListResponse>;
  update(
    id: Id,
    input: UpdateSubscriptionItemInput,
    options?: RequestOptions,
  ): Promise<SubscriptionItemResponse>;
  currentUsage(
    id: Id,
    options?: RequestOptions,
  ): Promise<SubscriptionItemCurrentUsageResponse>;
}

export function createSubscriptionItemsNamespace(
  runtime: ResourceRuntime,
): SubscriptionItemsNamespace {
  return Object.freeze({
    async get(
      id: Id,
      params: GetSubscriptionItemParams = {},
      options?: RequestOptions,
    ) {
      return (
        await runtime.invoke<
          readonly [Id, GetSubscriptionItemParams],
          SubscriptionItemResponse
        >(getSubscriptionItemOperation, [id, params], options)
      ).body;
    },
    async list(
      params: ListSubscriptionItemsParams = {},
      options?: RequestOptions,
    ) {
      return (
        await runtime.invoke<
          readonly [ListSubscriptionItemsParams],
          SubscriptionItemListResponse
        >(listSubscriptionItemsOperation, [params], options)
      ).body;
    },
    async update(
      id: Id,
      input: UpdateSubscriptionItemInput,
      options?: RequestOptions,
    ) {
      return (
        await runtime.invoke<
          readonly [Id, UpdateSubscriptionItemInput],
          SubscriptionItemResponse
        >(updateSubscriptionItemOperation, [id, input], options)
      ).body;
    },
    async currentUsage(id: Id, options?: RequestOptions) {
      return (
        await runtime.invoke<
          readonly [Id],
          SubscriptionItemCurrentUsageResponse
        >(getSubscriptionItemCurrentUsageOperation, [id], options)
      ).body;
    },
  });
}

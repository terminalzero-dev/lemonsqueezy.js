import type { RequestOptions, ResourceRuntime } from "../../internal/v5/types";
import type { Id } from "../../types/jsonapi";
import { getOrderItemOperation, listOrderItemsOperation } from "./contract";
import type {
  GetOrderItemParams,
  ListOrderItemsParams,
  OrderItemListResponse,
  OrderItemResponse,
} from "./types";

export interface OrderItemsNamespace {
  get(
    id: Id,
    params?: GetOrderItemParams,
    options?: RequestOptions,
  ): Promise<OrderItemResponse>;
  list(
    params?: ListOrderItemsParams,
    options?: RequestOptions,
  ): Promise<OrderItemListResponse>;
}

export function createOrderItemsNamespace(
  runtime: ResourceRuntime,
): OrderItemsNamespace {
  return Object.freeze({
    async get(
      id: Id,
      params: GetOrderItemParams = {},
      options?: RequestOptions,
    ) {
      return (
        await runtime.invoke<
          readonly [Id, GetOrderItemParams],
          OrderItemResponse
        >(getOrderItemOperation, [id, params], options)
      ).body;
    },
    async list(params: ListOrderItemsParams = {}, options?: RequestOptions) {
      return (
        await runtime.invoke<
          readonly [ListOrderItemsParams],
          OrderItemListResponse
        >(listOrderItemsOperation, [params], options)
      ).body;
    },
  });
}

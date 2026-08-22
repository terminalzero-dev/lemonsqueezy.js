import { invokeDefaultCompatibility } from "../internal/v5/default-client";
import {
  getOrderItemOperation,
  listOrderItemsOperation,
} from "../namespaces/order-items/contract";
import type {
  GetOrderItemParams as CanonicalGetOrderItemParams,
  ListOrderItemsParams as CanonicalListOrderItemsParams,
  OrderItemListResponse,
  OrderItemResponse,
} from "../namespaces/order-items/types";
import type {
  GetOrderItemParams,
  ListOrderItems,
  ListOrderItemsParams,
  OrderItem,
} from "./types";

/** Retrieve an order item. */
export function getOrderItem(
  orderItemId: number | string,
  params: GetOrderItemParams = {},
) {
  return invokeDefaultCompatibility<
    readonly [number | string, CanonicalGetOrderItemParams],
    OrderItemResponse,
    OrderItem
  >(getOrderItemOperation, [orderItemId, params]);
}

/** List all order items. */
export function listOrderItems(params: ListOrderItemsParams = {}) {
  return invokeDefaultCompatibility<
    readonly [CanonicalListOrderItemsParams],
    OrderItemListResponse,
    ListOrderItems
  >(listOrderItemsOperation, [params]);
}

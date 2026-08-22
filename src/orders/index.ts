import { invokeDefaultCompatibility } from "../internal/v5/default-client";
import {
  generateOrderInvoiceOperation,
  getOrderOperation,
  listOrdersOperation,
  refundOrderOperation,
} from "../namespaces/orders/contract";
import type {
  GenerateOrderInvoiceInput,
  GenerateOrderInvoiceResponse,
  GetOrderParams as CanonicalGetOrderParams,
  ListOrdersParams as CanonicalListOrdersParams,
  OrderListResponse,
  OrderResponse,
  RefundOrderInput,
} from "../namespaces/orders/types";
import type {
  GenerateOrderInvoiceParams,
  GetOrderParams,
  ListOrders,
  ListOrdersParams,
  Order,
  OrderInvoice,
} from "./types";

/** Retrieve an order. */
export function getOrder(
  orderId: number | string,
  params: GetOrderParams = {},
) {
  return invokeDefaultCompatibility<
    readonly [number | string, CanonicalGetOrderParams],
    OrderResponse,
    Order
  >(getOrderOperation, [orderId, params]);
}

/** List all orders. */
export function listOrders(params: ListOrdersParams = {}) {
  return invokeDefaultCompatibility<
    readonly [CanonicalListOrdersParams],
    OrderListResponse,
    ListOrders
  >(listOrdersOperation, [params]);
}

/** Generate an order invoice. */
export function generateOrderInvoice(
  orderId: number | string,
  params?: GenerateOrderInvoiceParams,
) {
  const input: GenerateOrderInvoiceInput | undefined =
    params === undefined
      ? undefined
      : {
          ...params,
          country: params.country as GenerateOrderInvoiceInput["country"],
        };
  return invokeDefaultCompatibility<
    readonly [number | string, GenerateOrderInvoiceInput | undefined],
    GenerateOrderInvoiceResponse,
    OrderInvoice
  >(generateOrderInvoiceOperation, [orderId, input]);
}

/** Issue a full or partial order refund. */
export function issueOrderRefund(orderId: number | string, amount?: number) {
  const input: RefundOrderInput | undefined =
    amount === undefined ? undefined : { amount };
  return invokeDefaultCompatibility<
    readonly [number | string, RefundOrderInput | undefined],
    OrderResponse,
    Order
  >(refundOrderOperation, [orderId, input]);
}

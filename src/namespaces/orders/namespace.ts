import type { RequestOptions, ResourceRuntime } from "../../internal/v5/types";
import type { Id } from "../../types/jsonapi";
import {
  generateOrderInvoiceOperation,
  getOrderOperation,
  listOrdersOperation,
  refundOrderOperation,
} from "./contract";
import type {
  GenerateOrderInvoiceInput,
  GenerateOrderInvoiceResponse,
  GetOrderParams,
  ListOrdersParams,
  OrderListResponse,
  OrderResponse,
  RefundOrderInput,
} from "./types";

export interface OrdersNamespace {
  generateInvoice(
    id: Id,
    input?: GenerateOrderInvoiceInput,
    options?: RequestOptions,
  ): Promise<GenerateOrderInvoiceResponse>;
  get(
    id: Id,
    params?: GetOrderParams,
    options?: RequestOptions,
  ): Promise<OrderResponse>;
  list(
    params?: ListOrdersParams,
    options?: RequestOptions,
  ): Promise<OrderListResponse>;
  refund(
    id: Id,
    input?: RefundOrderInput,
    options?: RequestOptions,
  ): Promise<OrderResponse>;
}

export function createOrdersNamespace(
  runtime: ResourceRuntime,
): OrdersNamespace {
  return Object.freeze({
    async generateInvoice(
      id: Id,
      input?: GenerateOrderInvoiceInput,
      options?: RequestOptions,
    ) {
      return (
        await runtime.invoke<
          readonly [Id, GenerateOrderInvoiceInput | undefined],
          GenerateOrderInvoiceResponse
        >(generateOrderInvoiceOperation, [id, input], options)
      ).body;
    },
    async get(id: Id, params: GetOrderParams = {}, options?: RequestOptions) {
      return (
        await runtime.invoke<readonly [Id, GetOrderParams], OrderResponse>(
          getOrderOperation,
          [id, params],
          options,
        )
      ).body;
    },
    async list(params: ListOrdersParams = {}, options?: RequestOptions) {
      return (
        await runtime.invoke<readonly [ListOrdersParams], OrderListResponse>(
          listOrdersOperation,
          [params],
          options,
        )
      ).body;
    },
    async refund(id: Id, input?: RefundOrderInput, options?: RequestOptions) {
      return (
        await runtime.invoke<
          readonly [Id, RefundOrderInput | undefined],
          OrderResponse
        >(refundOrderOperation, [id, input], options)
      ).body;
    },
  });
}

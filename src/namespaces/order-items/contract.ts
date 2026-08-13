import { compilePathId, compileReadQuery } from "../../internal/v5/request";
import type { OperationContract } from "../../internal/v5/types";
import type { Id } from "../../types/jsonapi";
import type {
  GetOrderItemParams,
  ListOrderItemsParams,
  OrderItemListResponse,
  OrderItemResponse,
} from "./types";

const evidence = {
  object: "https://docs.lemonsqueezy.com/api/order-items/the-order-item-object",
  get: "https://docs.lemonsqueezy.com/api/order-items/retrieve-order-item",
  list: "https://docs.lemonsqueezy.com/api/order-items/list-all-order-items",
} as const;

export const getOrderItemOperation = {
  key: "orderItems.get",
  compile: ([id, params]) => ({
    protocol: "jsonapi",
    method: "GET",
    path: `/v1/order-items/${compilePathId("orderItemId", id)}`,
    query: compileReadQuery(params),
  }),
  success: { kind: "jsonapi-single", resourceType: "order-items" },
  evidence: [evidence.get, evidence.object],
} as const satisfies OperationContract<
  readonly [Id, GetOrderItemParams],
  OrderItemResponse
>;

export const listOrderItemsOperation = {
  key: "orderItems.list",
  compile: ([params]) => ({
    protocol: "jsonapi",
    method: "GET",
    path: "/v1/order-items",
    query: compileReadQuery(params, {
      orderId: "filter[order_id]",
      productId: "filter[product_id]",
      variantId: "filter[variant_id]",
    }),
  }),
  success: { kind: "jsonapi-list", resourceType: "order-items" },
  evidence: [evidence.list, evidence.object],
} as const satisfies OperationContract<
  readonly [ListOrderItemsParams],
  OrderItemListResponse
>;

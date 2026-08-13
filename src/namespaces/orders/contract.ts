import { LemonSqueezyError } from "../../client/error";
import {
  compilePathId,
  compileReadQuery,
  compileResourceId,
} from "../../internal/v5/request";
import type { Id } from "../../types/jsonapi";
import type { OperationContract } from "../../internal/v5/types";
import type {
  GenerateOrderInvoiceInput,
  GenerateOrderInvoiceResponse,
  GetOrderParams,
  ListOrdersParams,
  OrderListResponse,
  OrderResponse,
  RefundOrderInput,
} from "./types";

const evidence = {
  object: "https://docs.lemonsqueezy.com/api/orders/the-order-object",
  get: "https://docs.lemonsqueezy.com/api/orders/retrieve-order",
  generateInvoice:
    "https://docs.lemonsqueezy.com/api/orders/generate-order-invoice",
  list: "https://docs.lemonsqueezy.com/api/orders/list-all-orders",
  refund: "https://docs.lemonsqueezy.com/api/orders/issue-refund",
} as const;

export const generateOrderInvoiceOperation = {
  key: "orders.generateInvoice",
  compile: ([id, input]) => ({
    protocol: "jsonapi",
    method: "POST",
    path: `/v1/orders/${compilePathId("orderId", id)}/generate-invoice`,
    query: compileInvoiceQuery(input),
  }),
  success: { kind: "invoice" },
  evidence: [evidence.generateInvoice],
} as const satisfies OperationContract<
  readonly [Id, GenerateOrderInvoiceInput | undefined],
  GenerateOrderInvoiceResponse
>;

export const getOrderOperation = {
  key: "orders.get",
  compile: ([id, params]) => ({
    protocol: "jsonapi",
    method: "GET",
    path: `/v1/orders/${compilePathId("orderId", id)}`,
    query: compileReadQuery(params),
  }),
  success: { kind: "jsonapi-single", resourceType: "orders" },
  evidence: [evidence.get, evidence.object],
} as const satisfies OperationContract<
  readonly [Id, GetOrderParams],
  OrderResponse
>;

export const listOrdersOperation = {
  key: "orders.list",
  compile: ([params]) => ({
    protocol: "jsonapi",
    method: "GET",
    path: "/v1/orders",
    query: compileReadQuery(params, {
      storeId: "filter[store_id]",
      userEmail: "filter[user_email]",
      orderNumber: "filter[order_number]",
    }),
  }),
  success: { kind: "jsonapi-list", resourceType: "orders" },
  evidence: [evidence.list, evidence.object],
} as const satisfies OperationContract<
  readonly [ListOrdersParams],
  OrderListResponse
>;

export const refundOrderOperation = {
  key: "orders.refund",
  compile: ([id, input]) => {
    const orderId = compileResourceId("orderId", id);
    if (
      input?.amount !== undefined &&
      (!Number.isSafeInteger(input.amount) || input.amount <= 0)
    ) {
      throw new LemonSqueezyError(
        "amount must be a positive safe integer when provided.",
        "validation",
      );
    }

    return {
      protocol: "jsonapi",
      method: "POST",
      path: `/v1/orders/${encodeURIComponent(orderId)}/refund`,
      body: {
        data: {
          type: "orders",
          id: orderId,
          attributes:
            input?.amount === undefined ? {} : { amount: input.amount },
        },
      },
    };
  },
  success: { kind: "jsonapi-single", resourceType: "orders" },
  evidence: [evidence.refund, evidence.object],
} as const satisfies OperationContract<
  readonly [Id, RefundOrderInput | undefined],
  OrderResponse
>;

function compileInvoiceQuery(
  input: GenerateOrderInvoiceInput | undefined,
): URLSearchParams | undefined {
  if (!input) return undefined;

  const query = new URLSearchParams();
  const values = {
    name: input.name,
    address: input.address,
    city: input.city,
    state: input.state,
    zip_code: input.zipCode,
    country: input.country,
    notes: input.notes,
    locale: input.locale,
  } as const;

  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined) query.set(key, String(value));
  }

  return query.size > 0 ? query : undefined;
}

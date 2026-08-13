import { LemonSqueezyError } from "../../client/error";
import {
  compilePathId,
  compileReadQuery,
  compileResourceId,
} from "../../internal/v5/request";
import type { OperationContract } from "../../internal/v5/types";
import type { Id } from "../../types/jsonapi";
import type {
  GenerateSubscriptionInvoiceInput,
  GenerateSubscriptionInvoiceResponse,
  GetSubscriptionInvoiceParams,
  ListSubscriptionInvoicesParams,
  RefundSubscriptionInvoiceInput,
  SubscriptionInvoiceResponse,
  SubscriptionInvoiceListResponse,
} from "./types";

const knownSubscriptionInvoiceStatuses = new Set([
  "pending",
  "paid",
  "void",
  "refunded",
  "partial_refund",
]);

const evidence = {
  object:
    "https://docs.lemonsqueezy.com/api/subscription-invoices/the-subscription-invoice-object",
  generateInvoice:
    "https://docs.lemonsqueezy.com/api/subscription-invoices/generate-subscription-invoice",
  get: "https://docs.lemonsqueezy.com/api/subscription-invoices/retrieve-subscription-invoice",
  list: "https://docs.lemonsqueezy.com/api/subscription-invoices/list-all-subscription-invoices",
  refund:
    "https://docs.lemonsqueezy.com/api/subscription-invoices/issue-refund",
} as const;

export const listSubscriptionInvoicesOperation = {
  key: "subscriptionInvoices.list",
  compile: ([params]) => {
    const status = params.filter?.status;
    if (
      status !== undefined &&
      status !== null &&
      !knownSubscriptionInvoiceStatuses.has(status)
    ) {
      throw new LemonSqueezyError(
        "status must be a documented Subscription Invoice status.",
        "validation",
      );
    }

    return {
      protocol: "jsonapi",
      method: "GET",
      path: "/v1/subscription-invoices",
      query: compileReadQuery(params, {
        storeId: "filter[store_id]",
        status: "filter[status]",
        refunded: "filter[refunded]",
        subscriptionId: "filter[subscription_id]",
      }),
    };
  },
  success: { kind: "jsonapi-list", resourceType: "subscription-invoices" },
  evidence: [evidence.list, evidence.object],
} as const satisfies OperationContract<
  readonly [ListSubscriptionInvoicesParams],
  SubscriptionInvoiceListResponse
>;

export const getSubscriptionInvoiceOperation = {
  key: "subscriptionInvoices.get",
  compile: ([id, params]) => ({
    protocol: "jsonapi",
    method: "GET",
    path: `/v1/subscription-invoices/${compilePathId("subscriptionInvoiceId", id)}`,
    query: compileReadQuery(params),
  }),
  success: { kind: "jsonapi-single", resourceType: "subscription-invoices" },
  evidence: [evidence.get, evidence.object],
} as const satisfies OperationContract<
  readonly [Id, GetSubscriptionInvoiceParams],
  SubscriptionInvoiceResponse
>;

export const generateSubscriptionInvoiceOperation = {
  key: "subscriptionInvoices.generateInvoice",
  compile: ([id, input]) => ({
    protocol: "jsonapi",
    method: "POST",
    path: `/v1/subscription-invoices/${compilePathId("subscriptionInvoiceId", id)}/generate-invoice`,
    query: compileInvoiceQuery(input),
  }),
  success: { kind: "invoice" },
  evidence: [evidence.generateInvoice],
} as const satisfies OperationContract<
  readonly [Id, GenerateSubscriptionInvoiceInput | undefined],
  GenerateSubscriptionInvoiceResponse
>;

export const refundSubscriptionInvoiceOperation = {
  key: "subscriptionInvoices.refund",
  compile: ([id, input]) => {
    const subscriptionInvoiceId = compileResourceId(
      "subscriptionInvoiceId",
      id,
    );
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
      path: `/v1/subscription-invoices/${encodeURIComponent(subscriptionInvoiceId)}/refund`,
      body: {
        data: {
          type: "subscription-invoices",
          id: subscriptionInvoiceId,
          attributes:
            input?.amount === undefined ? {} : { amount: input.amount },
        },
      },
    };
  },
  success: { kind: "jsonapi-single", resourceType: "subscription-invoices" },
  evidence: [evidence.refund, evidence.object],
} as const satisfies OperationContract<
  readonly [Id, RefundSubscriptionInvoiceInput | undefined],
  SubscriptionInvoiceResponse
>;

function compileInvoiceQuery(
  input: GenerateSubscriptionInvoiceInput | undefined,
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

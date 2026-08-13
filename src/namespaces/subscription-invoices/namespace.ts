import type { RequestOptions, ResourceRuntime } from "../../internal/v5/types";
import type { Id } from "../../types/jsonapi";
import {
  generateSubscriptionInvoiceOperation,
  getSubscriptionInvoiceOperation,
  listSubscriptionInvoicesOperation,
  refundSubscriptionInvoiceOperation,
} from "./contract";
import type {
  GenerateSubscriptionInvoiceInput,
  GenerateSubscriptionInvoiceResponse,
  GetSubscriptionInvoiceParams,
  ListSubscriptionInvoicesParams,
  RefundSubscriptionInvoiceInput,
  SubscriptionInvoiceResponse,
  SubscriptionInvoiceListResponse,
} from "./types";

export interface SubscriptionInvoicesNamespace {
  list(
    params?: ListSubscriptionInvoicesParams,
    options?: RequestOptions,
  ): Promise<SubscriptionInvoiceListResponse>;
  get(
    id: Id,
    params?: GetSubscriptionInvoiceParams,
    options?: RequestOptions,
  ): Promise<SubscriptionInvoiceResponse>;
  generateInvoice(
    id: Id,
    input?: GenerateSubscriptionInvoiceInput,
    options?: RequestOptions,
  ): Promise<GenerateSubscriptionInvoiceResponse>;
  refund(
    id: Id,
    input?: RefundSubscriptionInvoiceInput,
    options?: RequestOptions,
  ): Promise<SubscriptionInvoiceResponse>;
}

export function createSubscriptionInvoicesNamespace(
  runtime: ResourceRuntime,
): SubscriptionInvoicesNamespace {
  return Object.freeze({
    async list(
      params: ListSubscriptionInvoicesParams = {},
      options?: RequestOptions,
    ) {
      return (
        await runtime.invoke<
          readonly [ListSubscriptionInvoicesParams],
          SubscriptionInvoiceListResponse
        >(listSubscriptionInvoicesOperation, [params], options)
      ).body;
    },
    async get(
      id: Id,
      params: GetSubscriptionInvoiceParams = {},
      options?: RequestOptions,
    ) {
      return (
        await runtime.invoke<
          readonly [Id, GetSubscriptionInvoiceParams],
          SubscriptionInvoiceResponse
        >(getSubscriptionInvoiceOperation, [id, params], options)
      ).body;
    },
    async generateInvoice(
      id: Id,
      input?: GenerateSubscriptionInvoiceInput,
      options?: RequestOptions,
    ) {
      return (
        await runtime.invoke<
          readonly [Id, GenerateSubscriptionInvoiceInput | undefined],
          GenerateSubscriptionInvoiceResponse
        >(generateSubscriptionInvoiceOperation, [id, input], options)
      ).body;
    },
    async refund(
      id: Id,
      input?: RefundSubscriptionInvoiceInput,
      options?: RequestOptions,
    ) {
      return (
        await runtime.invoke<
          readonly [Id, RefundSubscriptionInvoiceInput | undefined],
          SubscriptionInvoiceResponse
        >(refundSubscriptionInvoiceOperation, [id, input], options)
      ).body;
    },
  });
}

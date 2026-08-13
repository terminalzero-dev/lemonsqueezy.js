import { invokeDefaultCompatibility } from "../internal/v5/default-client";
import type { FetchResponse } from "../internal/fetch/types";
import {
  generateSubscriptionInvoiceOperation,
  getSubscriptionInvoiceOperation,
  listSubscriptionInvoicesOperation,
  refundSubscriptionInvoiceOperation,
} from "../namespaces/subscription-invoices/contract";
import type {
  GenerateSubscriptionInvoiceInput,
  GenerateSubscriptionInvoiceResponse,
  GetSubscriptionInvoiceParams as CanonicalGetSubscriptionInvoiceParams,
  ListSubscriptionInvoicesParams as CanonicalListSubscriptionInvoicesParams,
  RefundSubscriptionInvoiceInput,
  SubscriptionInvoiceListResponse,
  SubscriptionInvoiceResponse,
} from "../namespaces/subscription-invoices/types";
import type {
  GetSubscriptionInvoiceParams,
  ListSubscriptionInvoices,
  ListSubscriptionInvoicesParams,
  SubscriptionInvoice,
  GenerateSubscriptionInvoiceParams,
  GenerateSubscriptionInvoice,
} from "./types";

/**
 * Retrieve a subscription invoice.
 *
 * @param subscriptionInvoiceId The given subscription invoice id.
 * @param [params] (Optional) Additional parameters.
 * @param [params.include] (Optional) Related resources.
 * @returns A subscription invoice object.
 */
export function getSubscriptionInvoice(
  subscriptionInvoiceId: number | string,
  params: GetSubscriptionInvoiceParams = {},
) {
  return invokeDefaultCompatibility<
    readonly [number | string, CanonicalGetSubscriptionInvoiceParams],
    SubscriptionInvoiceResponse,
    SubscriptionInvoice
  >(getSubscriptionInvoiceOperation, [
    subscriptionInvoiceId,
    params,
  ]) as Promise<FetchResponse<SubscriptionInvoice>>;
}

/**
 * List all subscription invoices.
 *
 * @param [params] (Optional) Additional parameters.
 * @param [params.filter] (Optional) Filter parameters.
 * @param [params.filter.storeId] (Optional) Only return subscription invoices belonging to the store with this ID.
 * @param [params.filter.status] (Optional) Only return subscription invoices with this status.
 * @param [params.filter.refunded] (Optional) Only return subscription invoices that are `refunded` (the value should be `true` or `false`).
 * @param [params.filter.subscriptionId] (Optional) Only return subscription invoices belonging to a subscription with this ID.
 * @param [params.page] (Optional) Custom paginated queries.
 * @param [params.page.number] (Optional) The parameter determine which page to retrieve.
 * @param [params.page.size] (Optional) The parameter to determine how many results to return per page.
 * @param [params.include] (Optional) Related resources.
 * @returns A paginated list of subscription invoice objects ordered by `created_at` (descending).
 */
export function listSubscriptionInvoices(
  params: ListSubscriptionInvoicesParams = {},
) {
  return invokeDefaultCompatibility<
    readonly [CanonicalListSubscriptionInvoicesParams],
    SubscriptionInvoiceListResponse,
    ListSubscriptionInvoices
  >(listSubscriptionInvoicesOperation, [params]) as Promise<
    FetchResponse<ListSubscriptionInvoices>
  >;
}

/**
 * Generate subscription invoice.
 *
 * @param subscriptionInvoiceId The given subscription invoice id.
 * @param [params] The given parameters.
 * @param [params.name] The full name of the customer.
 * @param [params.address] The street address of the customer.
 * @param [params.city] The city of the customer.
 * @param [params.state] The state of the customer.
 * @param [params.zipCode] The ZIP code of the customer.
 * @param [params.country] The country of the customer.
 * @param [params.notes] (Optional) Any additional notes to include on the invoice.
 * @param [params.locale] (Optional) ISO 639 language code, e.g., ‘en’ for English language.
 * @returns A link to download the generated invoice.
 */
export function generateSubscriptionInvoice(
  subscriptionInvoiceId: number | string,
  params?: GenerateSubscriptionInvoiceParams,
) {
  const input: GenerateSubscriptionInvoiceInput | undefined =
    params === undefined
      ? undefined
      : {
          ...params,
          country:
            params.country as GenerateSubscriptionInvoiceInput["country"],
        };
  return invokeDefaultCompatibility<
    readonly [number | string, GenerateSubscriptionInvoiceInput | undefined],
    GenerateSubscriptionInvoiceResponse,
    GenerateSubscriptionInvoice
  >(generateSubscriptionInvoiceOperation, [
    subscriptionInvoiceId,
    input,
  ]) as Promise<FetchResponse<GenerateSubscriptionInvoice>>;
}

/**
 * Issues a full or partial refund for the subscription invoice.
 *
 * @param subscriptionInvoiceId The subscription invoice id.
 * @param amount The optional amount in cents to refund. Omit it for a full refund.
 */
export function issueSubscriptionInvoiceRefund(
  subscriptionInvoiceId: number | string,
  amount?: number,
) {
  const input: RefundSubscriptionInvoiceInput | undefined =
    amount === undefined ? undefined : { amount };
  return invokeDefaultCompatibility<
    readonly [number | string, RefundSubscriptionInvoiceInput | undefined],
    SubscriptionInvoiceResponse,
    SubscriptionInvoice
  >(refundSubscriptionInvoiceOperation, [
    subscriptionInvoiceId,
    input,
  ]) as Promise<FetchResponse<SubscriptionInvoice>>;
}

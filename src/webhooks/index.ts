import { invokeDefaultCompatibility } from "../internal/v5/default-client";
import {
  createWebhookOperation,
  deleteWebhookOperation,
  getWebhookOperation,
  listWebhooksOperation,
  updateWebhookOperation,
} from "../namespaces/webhooks/contract";
import type {
  CreateWebhookInput,
  GetWebhookParams as CanonicalGetWebhookParams,
  ListWebhooksParams as CanonicalListWebhooksParams,
  UpdateWebhookInput,
  WebhookListResponse,
  WebhookResponse,
} from "../namespaces/webhooks/types";
import type { FetchResponse } from "../internal/fetch/types";
import type {
  GetWebhookParams,
  ListWebhooks,
  ListWebhooksParams,
  NewWebhook,
  UpdateWebhook,
  Webhook,
} from "./types";

/**
 * Create a webhook.
 *
 * @param storeId The store id.
 * @param webhook a new webhook info.
 * @returns A webhook object.
 */
export function createWebhook(storeId: number | string, webhook: NewWebhook) {
  const input: CreateWebhookInput = { storeId, ...webhook };
  return invokeDefaultCompatibility<
    readonly [CreateWebhookInput],
    WebhookResponse,
    Webhook
  >(createWebhookOperation, [input]) as Promise<FetchResponse<Webhook>>;
}

/**
 * Retrieve a webhook.
 *
 * @param webhookId The given webhook id.
 * @param [params] (Optional) Additional parameters.
 * @param [params.include] (Optional) Related resources.
 * @returns A webhook object.
 */
export function getWebhook(
  webhookId: number | string,
  params: GetWebhookParams = {},
) {
  return invokeDefaultCompatibility<
    readonly [number | string, CanonicalGetWebhookParams],
    WebhookResponse,
    Webhook
  >(getWebhookOperation, [webhookId, params]) as Promise<
    FetchResponse<Webhook>
  >;
}

/**
 * Update a webhook.
 *
 * @param webhookId The webhook id.
 * @param webhook The webhook info you want to update.
 * @returns A webhook object.
 */
export function updateWebhook(
  webhookId: number | string,
  webhook: UpdateWebhook,
) {
  const input: UpdateWebhookInput = webhook;
  return invokeDefaultCompatibility<
    readonly [number | string, UpdateWebhookInput],
    WebhookResponse,
    Webhook
  >(updateWebhookOperation, [webhookId, input]) as Promise<
    FetchResponse<Webhook>
  >;
}

/**
 * Delete a webhook.
 *
 * @param webhookId The webhook id.
 * @returns A `204` status code and `No Content` response on success.
 */
export function deleteWebhook(webhookId: number | string) {
  return invokeDefaultCompatibility<readonly [number | string], void, null>(
    deleteWebhookOperation,
    [webhookId],
  ) as Promise<FetchResponse<null>>;
}

/**
 * List all webhooks.
 *
 * @param [params] (Optional) Additional parameters.
 * @param [params.filter] (Optional) Filter parameters.
 * @param [params.filter.storeId] (Optional) Only return webhooks belonging to the store with this ID.
 * @param [params.page] (Optional) Custom paginated queries.
 * @param [params.page.number] (Optional) The parameter determine which page to retrieve.
 * @param [params.page.size] (Optional) The parameter to determine how many results to return per page.
 * @param [params.include] (Optional) Related resources.
 * @returns A paginated list of webhook objects ordered by `created_at`.
 */
export function listWebhooks(params: ListWebhooksParams = {}) {
  return invokeDefaultCompatibility<
    readonly [CanonicalListWebhooksParams],
    WebhookListResponse,
    ListWebhooks
  >(listWebhooksOperation, [params]) as Promise<FetchResponse<ListWebhooks>>;
}

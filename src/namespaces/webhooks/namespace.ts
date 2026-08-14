import type { RequestOptions, ResourceRuntime } from "../../internal/v5/types";
import type { Id } from "../../types/jsonapi";
import {
  createWebhookOperation,
  deleteWebhookOperation,
  getWebhookOperation,
  listWebhooksOperation,
  updateWebhookOperation,
} from "./contract";
import type {
  CreateWebhookInput,
  GetWebhookParams,
  ListWebhooksParams,
  UpdateWebhookInput,
  WebhookListResponse,
  WebhookResponse,
} from "./types";

export interface WebhooksNamespace {
  create(
    input: CreateWebhookInput,
    options?: RequestOptions,
  ): Promise<WebhookResponse>;
  delete(id: Id, options?: RequestOptions): Promise<void>;
  get(
    id: Id,
    params?: GetWebhookParams,
    options?: RequestOptions,
  ): Promise<WebhookResponse>;
  list(
    params?: ListWebhooksParams,
    options?: RequestOptions,
  ): Promise<WebhookListResponse>;
  update(
    id: Id,
    input: UpdateWebhookInput,
    options?: RequestOptions,
  ): Promise<WebhookResponse>;
}

export function createWebhooksNamespace(
  runtime: ResourceRuntime,
): WebhooksNamespace {
  return Object.freeze({
    async create(input: CreateWebhookInput, options?: RequestOptions) {
      return (
        await runtime.invoke<readonly [CreateWebhookInput], WebhookResponse>(
          createWebhookOperation,
          [input],
          options,
        )
      ).body;
    },
    async delete(id: Id, options?: RequestOptions) {
      return (
        await runtime.invoke<readonly [Id], void>(
          deleteWebhookOperation,
          [id],
          options,
        )
      ).body;
    },
    async get(id: Id, params: GetWebhookParams = {}, options?: RequestOptions) {
      return (
        await runtime.invoke<readonly [Id, GetWebhookParams], WebhookResponse>(
          getWebhookOperation,
          [id, params],
          options,
        )
      ).body;
    },
    async list(params: ListWebhooksParams = {}, options?: RequestOptions) {
      return (
        await runtime.invoke<
          readonly [ListWebhooksParams],
          WebhookListResponse
        >(listWebhooksOperation, [params], options)
      ).body;
    },
    async update(id: Id, input: UpdateWebhookInput, options?: RequestOptions) {
      return (
        await runtime.invoke<
          readonly [Id, UpdateWebhookInput],
          WebhookResponse
        >(updateWebhookOperation, [id, input], options)
      ).body;
    },
  });
}

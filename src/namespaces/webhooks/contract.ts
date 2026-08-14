import { LemonSqueezyError } from "../../client/error";
import {
  compilePathId,
  compileReadQuery,
  compileResourceId,
} from "../../internal/v5/request";
import { sanitizeWebhookManagementErrorDetail } from "../../internal/v5/redaction";
import type { OperationContract } from "../../internal/v5/types";
import type { Id } from "../../types/jsonapi";
import { webhookSubscriptionEventNames } from "./types";
import type {
  CreateWebhookInput,
  GetWebhookParams,
  ListWebhooksParams,
  UpdateWebhookInput,
  WebhookListResponse,
  WebhookResponse,
} from "./types";

const evidence = {
  object: "https://docs.lemonsqueezy.com/api/webhooks/the-webhook-object",
  get: "https://docs.lemonsqueezy.com/api/webhooks/retrieve-webhook",
  list: "https://docs.lemonsqueezy.com/api/webhooks/list-all-webhooks",
  create: "https://docs.lemonsqueezy.com/api/webhooks/create-webhook",
  update: "https://docs.lemonsqueezy.com/api/webhooks/update-webhook",
  delete: "https://docs.lemonsqueezy.com/api/webhooks/delete-webhook",
} as const;

export const getWebhookOperation = {
  key: "webhooks.get",
  compile: ([id, params]) => ({
    protocol: "jsonapi",
    method: "GET",
    path: `/v1/webhooks/${compilePathId("webhookId", id)}`,
    query: compileReadQuery(params),
  }),
  success: { kind: "jsonapi-single", resourceType: "webhooks" },
  evidence: [evidence.get, evidence.object],
} as const satisfies OperationContract<
  readonly [Id, GetWebhookParams],
  WebhookResponse
>;

export const updateWebhookOperation = {
  key: "webhooks.update",
  compile: ([id, input]) => {
    if (
      input.url === undefined &&
      input.events === undefined &&
      input.secret === undefined
    ) {
      throw new LemonSqueezyError(
        "Webhook update must provide at least one field.",
        "validation",
      );
    }
    if (input.url !== undefined) assertValidUrl(input.url);
    if (input.events !== undefined) assertValidEvents(input.events);
    if (input.secret !== undefined)
      assertNonEmptyString("secret", input.secret);

    const webhookId = compileResourceId("webhookId", id);
    return {
      protocol: "jsonapi",
      method: "PATCH",
      path: `/v1/webhooks/${encodeURIComponent(webhookId)}`,
      body: {
        data: {
          type: "webhooks",
          id: webhookId,
          attributes: {
            url: input.url,
            events: input.events,
            secret: input.secret,
          },
        },
      },
    };
  },
  success: { kind: "jsonapi-single", resourceType: "webhooks" },
  evidence: [evidence.update, evidence.object],
  sanitizeErrorDetail: (value, [, input]) =>
    sanitizeWebhookManagementErrorDetail(
      value,
      input.secret === undefined ? [] : [input.secret],
    ),
} as const satisfies OperationContract<
  readonly [Id, UpdateWebhookInput],
  WebhookResponse
>;

export const createWebhookOperation = {
  key: "webhooks.create",
  compile: ([input]) => {
    assertValidUrl(input.url);
    assertValidEvents(input.events);
    assertNonEmptyString("secret", input.secret);
    if (input.testMode !== undefined && typeof input.testMode !== "boolean") {
      throw new LemonSqueezyError(
        "testMode must be a boolean when provided.",
        "validation",
      );
    }

    return {
      protocol: "jsonapi",
      method: "POST",
      path: "/v1/webhooks",
      body: {
        data: {
          type: "webhooks",
          attributes: {
            url: input.url,
            events: input.events,
            secret: input.secret,
            test_mode: input.testMode,
          },
          relationships: {
            store: {
              data: {
                type: "stores",
                id: compileResourceId("storeId", input.storeId),
              },
            },
          },
        },
      },
    };
  },
  success: { kind: "jsonapi-single", resourceType: "webhooks" },
  evidence: [evidence.create, evidence.object],
  sanitizeErrorDetail: (value, [input]) =>
    sanitizeWebhookManagementErrorDetail(value, [input.secret]),
} as const satisfies OperationContract<
  readonly [CreateWebhookInput],
  WebhookResponse
>;

function assertValidUrl(value: unknown): asserts value is string {
  if (typeof value !== "string") {
    throw new LemonSqueezyError("url must be a valid HTTP URL.", "validation");
  }

  try {
    const url = new URL(value);
    if (url.protocol === "http:" || url.protocol === "https:") return;
  } catch {
    // Fall through to the stable validation error.
  }

  throw new LemonSqueezyError("url must be a valid HTTP URL.", "validation");
}

function assertValidEvents(
  value: unknown,
): asserts value is readonly (typeof webhookSubscriptionEventNames)[number][] {
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    value.some(
      (event) =>
        !webhookSubscriptionEventNames.includes(
          event as (typeof webhookSubscriptionEventNames)[number],
        ),
    )
  ) {
    throw new LemonSqueezyError(
      "events must contain supported Webhook subscription event names.",
      "validation",
    );
  }
}

function assertNonEmptyString(
  name: string,
  value: unknown,
): asserts value is string {
  if (typeof value !== "string" || value.length === 0) {
    throw new LemonSqueezyError(
      `${name} must be a non-empty string.`,
      "validation",
    );
  }
}

export const listWebhooksOperation = {
  key: "webhooks.list",
  compile: ([params]) => ({
    protocol: "jsonapi",
    method: "GET",
    path: "/v1/webhooks",
    query: compileReadQuery(params, { storeId: "filter[store_id]" }),
  }),
  success: { kind: "jsonapi-list", resourceType: "webhooks" },
  evidence: [evidence.list, evidence.object],
} as const satisfies OperationContract<
  readonly [ListWebhooksParams],
  WebhookListResponse
>;

export const deleteWebhookOperation = {
  key: "webhooks.delete",
  compile: ([id]) => ({
    protocol: "jsonapi",
    method: "DELETE",
    path: `/v1/webhooks/${compilePathId("webhookId", id)}`,
  }),
  success: { kind: "empty" },
  evidence: [evidence.delete],
} as const satisfies OperationContract<readonly [Id], void>;

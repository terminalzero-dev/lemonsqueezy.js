import {
  compilePathId,
  compileReadQuery,
  compileResourceId,
} from "../../internal/v5/request";
import { LemonSqueezyError } from "../../client/error";
import type { OperationContract } from "../../internal/v5/types";
import type { Id } from "../../types/jsonapi";
import type { SubscriptionItemCurrentUsageResponse } from "./types";
import type {
  GetSubscriptionItemParams,
  ListSubscriptionItemsParams,
  SubscriptionItemListResponse,
  SubscriptionItemResponse,
  UpdateSubscriptionItemInput,
} from "./types";

const evidence = {
  object:
    "https://docs.lemonsqueezy.com/api/subscription-items/the-subscription-item-object",
  get: "https://docs.lemonsqueezy.com/api/subscription-items/retrieve-subscription-item",
  list: "https://docs.lemonsqueezy.com/api/subscription-items/list-all-subscription-items",
  update:
    "https://docs.lemonsqueezy.com/api/subscription-items/update-subscription-item",
  currentUsage:
    "https://docs.lemonsqueezy.com/api/subscription-items/retrieve-subscription-item-current-usage",
} as const;

export const updateSubscriptionItemOperation = {
  key: "subscriptionItems.update",
  compile: ([id, input]) => {
    assertValidUpdateInput(input);
    const subscriptionItemId = compileResourceId("subscriptionItemId", id);
    return {
      protocol: "jsonapi",
      method: "PATCH",
      path: `/v1/subscription-items/${encodeURIComponent(subscriptionItemId)}`,
      body: {
        data: {
          type: "subscription-items",
          id: subscriptionItemId,
          attributes: {
            quantity: input.quantity,
            invoice_immediately: input.invoiceImmediately,
            disable_prorations: input.disableProrations,
          },
        },
      },
    };
  },
  success: { kind: "jsonapi-single", resourceType: "subscription-items" },
  evidence: [evidence.update, evidence.object],
} as const satisfies OperationContract<
  readonly [Id, UpdateSubscriptionItemInput],
  SubscriptionItemResponse
>;

function assertValidUpdateInput(input: UpdateSubscriptionItemInput): void {
  if (
    typeof input !== "object" ||
    input === null ||
    Array.isArray(input) ||
    !Number.isSafeInteger(input.quantity) ||
    input.quantity <= 0 ||
    (input.invoiceImmediately !== undefined &&
      typeof input.invoiceImmediately !== "boolean") ||
    (input.disableProrations !== undefined &&
      typeof input.disableProrations !== "boolean")
  ) {
    throw new LemonSqueezyError(
      "input must contain a positive quantity and valid proration options.",
      "validation",
    );
  }
}

export const listSubscriptionItemsOperation = {
  key: "subscriptionItems.list",
  compile: ([params]) => ({
    protocol: "jsonapi",
    method: "GET",
    path: "/v1/subscription-items",
    query: compileReadQuery(params, {
      subscriptionId: "filter[subscription_id]",
      priceId: "filter[price_id]",
    }),
  }),
  success: { kind: "jsonapi-list", resourceType: "subscription-items" },
  evidence: [evidence.list, evidence.object],
} as const satisfies OperationContract<
  readonly [ListSubscriptionItemsParams],
  SubscriptionItemListResponse
>;

export const getSubscriptionItemOperation = {
  key: "subscriptionItems.get",
  compile: ([id, params]) => ({
    protocol: "jsonapi",
    method: "GET",
    path: `/v1/subscription-items/${compilePathId("subscriptionItemId", id)}`,
    query: compileReadQuery(params),
  }),
  success: { kind: "jsonapi-single", resourceType: "subscription-items" },
  evidence: [evidence.get, evidence.object],
} as const satisfies OperationContract<
  readonly [Id, GetSubscriptionItemParams],
  SubscriptionItemResponse
>;

export const getSubscriptionItemCurrentUsageOperation = {
  key: "subscriptionItems.currentUsage",
  compile: ([id]) => ({
    protocol: "jsonapi",
    method: "GET",
    path: `/v1/subscription-items/${compilePathId("subscriptionItemId", id)}/current-usage`,
  }),
  success: { kind: "meta-only" },
  evidence: [evidence.currentUsage],
} as const satisfies OperationContract<
  readonly [Id],
  SubscriptionItemCurrentUsageResponse
>;

import {
  compilePathId,
  compileReadQuery,
  compileResourceId,
} from "../../internal/v5/request";
import { LemonSqueezyError } from "../../client/error";
import type { OperationContract } from "../../internal/v5/types";
import type { Id } from "../../types/jsonapi";
import type {
  GetSubscriptionParams,
  ListSubscriptionsParams,
  SubscriptionListResponse,
  SubscriptionResponse,
  UpdateSubscriptionInput,
} from "./types";

const knownSubscriptionStatuses = new Set([
  "on_trial",
  "active",
  "paused",
  "past_due",
  "unpaid",
  "cancelled",
  "expired",
]);

const evidence = {
  object:
    "https://docs.lemonsqueezy.com/api/subscriptions/the-subscription-object",
  get: "https://docs.lemonsqueezy.com/api/subscriptions/retrieve-subscription",
  list: "https://docs.lemonsqueezy.com/api/subscriptions/list-all-subscriptions",
  update: "https://docs.lemonsqueezy.com/api/subscriptions/update-subscription",
  cancel: "https://docs.lemonsqueezy.com/api/subscriptions/cancel-subscription",
} as const;

export const getSubscriptionOperation = {
  key: "subscriptions.get",
  compile: ([id, params]) => ({
    protocol: "jsonapi",
    method: "GET",
    path: `/v1/subscriptions/${compilePathId("subscriptionId", id)}`,
    query: compileReadQuery(params),
  }),
  success: { kind: "jsonapi-single", resourceType: "subscriptions" },
  evidence: [evidence.get, evidence.object],
} as const satisfies OperationContract<
  readonly [Id, GetSubscriptionParams],
  SubscriptionResponse
>;

export const cancelSubscriptionOperation = {
  key: "subscriptions.cancel",
  compile: ([id]) => ({
    protocol: "jsonapi",
    method: "DELETE",
    path: `/v1/subscriptions/${compilePathId("subscriptionId", id)}`,
  }),
  success: { kind: "jsonapi-single", resourceType: "subscriptions" },
  evidence: [evidence.cancel, evidence.object],
} as const satisfies OperationContract<readonly [Id], SubscriptionResponse>;

export const updateSubscriptionOperation = {
  key: "subscriptions.update",
  compile: ([id, input]) => {
    assertValidPause(input.pause);
    const subscriptionId = compileResourceId("subscriptionId", id);
    return {
      protocol: "jsonapi",
      method: "PATCH",
      path: `/v1/subscriptions/${encodeURIComponent(subscriptionId)}`,
      body: {
        data: {
          type: "subscriptions",
          id: subscriptionId,
          attributes: {
            variant_id: input.variantId,
            pause:
              input.pause === undefined || input.pause === null
                ? input.pause
                : {
                    mode: input.pause.mode,
                    resumes_at: input.pause.resumesAt,
                  },
            cancelled: input.cancelled,
            trial_ends_at: input.trialEndsAt,
            billing_anchor: input.billingAnchor,
            invoice_immediately: input.invoiceImmediately,
            disable_prorations: input.disableProrations,
          },
        },
      },
    };
  },
  success: { kind: "jsonapi-single", resourceType: "subscriptions" },
  evidence: [evidence.update, evidence.object],
} as const satisfies OperationContract<
  readonly [Id, UpdateSubscriptionInput],
  SubscriptionResponse
>;

export const listSubscriptionsOperation = {
  key: "subscriptions.list",
  compile: ([params]) => {
    const status = params.filter?.status;
    if (
      status !== undefined &&
      status !== null &&
      !knownSubscriptionStatuses.has(status)
    ) {
      throw new LemonSqueezyError(
        "status must be a documented Subscription status.",
        "validation",
      );
    }

    return {
      protocol: "jsonapi",
      method: "GET",
      path: "/v1/subscriptions",
      query: compileReadQuery(params, {
        storeId: "filter[store_id]",
        orderId: "filter[order_id]",
        orderItemId: "filter[order_item_id]",
        productId: "filter[product_id]",
        variantId: "filter[variant_id]",
        userEmail: "filter[user_email]",
        status: "filter[status]",
      }),
    };
  },
  success: { kind: "jsonapi-list", resourceType: "subscriptions" },
  evidence: [evidence.list, evidence.object],
} as const satisfies OperationContract<
  readonly [ListSubscriptionsParams],
  SubscriptionListResponse
>;

function assertValidPause(pause: UpdateSubscriptionInput["pause"]): void {
  if (pause === undefined || pause === null) return;
  if (
    typeof pause !== "object" ||
    Array.isArray(pause) ||
    (pause.mode !== "void" && pause.mode !== "free") ||
    (pause.resumesAt !== undefined &&
      pause.resumesAt !== null &&
      typeof pause.resumesAt !== "string")
  ) {
    throw new LemonSqueezyError(
      "pause must be null or a valid payment pause object.",
      "validation",
    );
  }
}

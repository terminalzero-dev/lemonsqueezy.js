import type {
  Id,
  JSONAPIListResponse,
  JSONAPIRelationship,
  JSONAPIResource,
  JSONAPIResourceIdentifier,
  JSONAPISingleResponse,
  OpenString,
} from "../../types/jsonapi";

export const webhookSubscriptionEventNames = [
  "order_created",
  "order_refunded",
  "customer_updated",
  "subscription_created",
  "subscription_updated",
  "subscription_cancelled",
  "subscription_resumed",
  "subscription_expired",
  "subscription_paused",
  "subscription_unpaused",
  "subscription_payment_success",
  "subscription_payment_failed",
  "subscription_payment_recovered",
  "subscription_payment_refunded",
  "license_key_created",
  "license_key_updated",
  "affiliate_activated",
] as const;

export type WebhookSubscriptionEventName =
  (typeof webhookSubscriptionEventNames)[number];

export type WebhookEventName = OpenString<WebhookSubscriptionEventName>;

export interface WebhookAttributes {
  readonly store_id: number;
  readonly url: string;
  readonly events: readonly WebhookEventName[];
  readonly last_sent_at: string | null;
  readonly created_at: string;
  readonly updated_at: string;
  readonly test_mode: boolean;
}

export interface WebhookRelationships {
  readonly store: JSONAPIRelationship<JSONAPIResourceIdentifier<"stores">>;
}

export type WebhookResource = Omit<
  JSONAPIResource<"webhooks", WebhookAttributes, WebhookRelationships>,
  "relationships"
> & { readonly relationships: WebhookRelationships };
export type WebhookResponse = JSONAPISingleResponse<WebhookResource>;
export type WebhookListResponse = JSONAPIListResponse<WebhookResource>;

export interface GetWebhookParams {
  readonly include?: readonly (keyof WebhookRelationships)[];
}

export interface ListWebhooksParams extends GetWebhookParams {
  readonly filter?: { readonly storeId?: Id | null };
  readonly page?: {
    readonly number?: number | null;
    readonly size?: number | null;
  };
}

export interface CreateWebhookInput {
  readonly storeId: Id;
  readonly url: string;
  readonly events: readonly WebhookSubscriptionEventName[];
  readonly secret: string;
  readonly testMode?: boolean;
}

export interface UpdateWebhookInput {
  readonly url?: string;
  readonly events?: readonly WebhookSubscriptionEventName[];
  readonly secret?: string;
}

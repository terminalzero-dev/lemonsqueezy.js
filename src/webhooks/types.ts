import type {
  Data,
  LemonSqueezyResponse,
  Links,
  Meta,
  Params,
  Relationships,
} from "../types";
import type {
  WebhookEventName,
  WebhookSubscriptionEventName,
} from "../namespaces/webhooks/types";

type Attributes = {
  /**
   * The ID of the store this webhook belongs to.
   */
  store_id: number;
  /**
   * The URL that events will be sent to.
   */
  url: string;
  /**
   * An array of events that will be sent.
   */
  events: readonly WebhookEventName[];
  /**
   * An [ISO 8601](https://en.wikipedia.org/wiki/ISO_8601) formatted date-time string indicating when the last webhook event was sent. Will be `null` if no events have been sent yet.
   */
  last_sent_at: string | null;
  /**
   * An [ISO 8601](https://en.wikipedia.org/wiki/ISO_8601) formatted date-time string indicating when the object was created.
   */
  created_at: string;
  /**
   * An [ISO 8601](https://en.wikipedia.org/wiki/ISO_8601) formatted date-time string indicating when the object was last updated.
   */
  updated_at: string;
  /**
   * A boolean indicating if the object was created within test mode.
   */
  test_mode: boolean;
};
type WebhookData = Data<Attributes, Pick<Relationships, "store">>;

export type GetWebhookParams = Pick<
  Params<(keyof WebhookData["relationships"])[]>,
  "include"
>;
export type ListWebhooksParams = Params<
  GetWebhookParams["include"],
  { storeId?: number | string }
>;
export type Webhook = Omit<
  LemonSqueezyResponse<WebhookData, unknown, Pick<Links, "self">>,
  "meta"
>;
export type ListWebhooks = LemonSqueezyResponse<
  WebhookData[],
  Pick<Meta, "page">,
  Pick<Links, "first" | "last">
>;
export type NewWebhook = {
  /**
   * (Required) A valid URL of the endpoint that should receive webhook events.
   */
  url: string;
  /**
   * (Required) An array of webhook event types that should be sent to the webhook endpoint. [See the list of available event types](https://docs.lemonsqueezy.com/help/webhooks#event-types).
   */
  events: readonly WebhookSubscriptionEventName[];
  /**
   * (Required) A string used by Lemon Squeezy to sign requests for increased security. (Learn about receiving signed requests)[https://docs.lemonsqueezy.com/help/webhooks#signing-requests].
   *
   * Note: The `secret` is never returned in the API. To view the secret of a webhook, open the webhook in your dashboard.
   */
  secret: string;
  /**
   * Set this to `true` if the webhook should be created in test mode.
   */
  testMode?: boolean;
};
export type UpdateWebhook = {
  url?: string;
  events?: readonly WebhookSubscriptionEventName[];
  secret?: string;
};

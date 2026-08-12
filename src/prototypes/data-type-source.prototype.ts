/**
 * PROTOTYPE — not production code.
 *
 * This stub tests the recommended hybrid type model. The repository-owned
 * Contract Catalog holds mechanical endpoint facts; hand-authored TypeScript
 * models retain semantic constraints. Responses stay wire-native, request
 * inputs stay camelCase, and inbound enum/event surfaces remain open-world.
 */

export type Id = string | number;

export type JSONPrimitive = string | number | boolean | null;
export type JSONValue =
  | JSONPrimitive
  | readonly JSONValue[]
  | { readonly [key: string]: JSONValue };

/** Keeps autocomplete for known values without claiming the server is closed. */
export type OpenString<Known extends string> =
  | Known
  | (string & Record<never, never>);

export interface JSONAPIResourceIdentifier<Type extends string = string> {
  readonly type: Type;
  readonly id: string;
}

export interface JSONAPIRelationship<
  Related extends
    | JSONAPIResourceIdentifier
    | readonly JSONAPIResourceIdentifier[]
    | null = JSONAPIResourceIdentifier,
> {
  readonly links: {
    readonly related: string;
    readonly self: string;
  };
  readonly data?: Related;
}

export interface JSONAPIResource<
  Type extends string,
  Attributes,
  Relationships = never,
> extends JSONAPIResourceIdentifier<Type> {
  readonly attributes: Attributes;
  readonly relationships?: Relationships;
  readonly links: { readonly self: string };
}

export interface UnknownJSONAPIResource
  extends JSONAPIResource<
    string,
    Readonly<Record<string, unknown>>,
    Readonly<Record<string, unknown>>
  > {}

export interface JSONAPISingleResponse<Resource> {
  readonly jsonapi: { readonly version: string };
  readonly links: { readonly self: string };
  readonly data: Resource;
  readonly included?: readonly UnknownJSONAPIResource[];
}

export interface JSONAPIListResponse<Resource> {
  readonly jsonapi: { readonly version: string };
  readonly links: {
    readonly first: string;
    readonly last: string;
    readonly next?: string;
    readonly prev?: string;
  };
  readonly meta: {
    readonly page: {
      readonly current_page: number;
      readonly from: number;
      readonly last_page: number;
      readonly per_page: number;
      readonly to: number;
      readonly total: number;
    };
  };
  readonly data: readonly Resource[];
  readonly included?: readonly UnknownJSONAPIResource[];
}

export type KnownOrderStatus =
  | "pending"
  | "failed"
  | "paid"
  | "refunded"
  | "fraudulent";

/** Response values are open because API v1 may add enum members. */
export type OrderStatus = OpenString<KnownOrderStatus>;

export interface OrderAttributes {
  readonly store_id: number;
  readonly order_number: number;
  readonly status: OrderStatus;
  readonly refunded_at: string | null;
  readonly affiliate_id: number | null;
  readonly referral_amount: number | null;
  readonly created_at: string;
  readonly updated_at: string;
  readonly test_mode: boolean;
}

export interface OrderRelationships {
  readonly store: JSONAPIRelationship<JSONAPIResourceIdentifier<"stores">>;
  readonly customer: JSONAPIRelationship<
    JSONAPIResourceIdentifier<"customers">
  >;
  readonly affiliate: JSONAPIRelationship<JSONAPIResourceIdentifier<"affiliates"> | null>;
}

export type OrderResource = JSONAPIResource<"orders", OrderAttributes> & {
  readonly relationships: OrderRelationships;
};

/** Compatibility projection keeps the v4 closed response enum. */
export interface CompatibilityOrderAttributes
  extends Omit<OrderAttributes, "status"> {
  status: KnownOrderStatus;
}

export type CompatibilityOrderResource = JSONAPIResource<
  "orders",
  CompatibilityOrderAttributes
> & {
  relationships: OrderRelationships;
};

/** Compatibility names remain complete v4-shaped JSON:API bodies. */
export type Order = JSONAPISingleResponse<CompatibilityOrderResource>;
export type ListOrders = JSONAPIListResponse<CompatibilityOrderResource>;

export interface ListOrdersParams {
  readonly include?: readonly (keyof OrderRelationships)[];
  readonly filter?: {
    readonly storeId?: Id;
    readonly userEmail?: string;
    readonly orderNumber?: number;
  };
  readonly page?: {
    readonly number?: number;
    readonly size?: number;
  };
}

/** Request enums stay closed so typos never reach Lemon Squeezy. */
export type SubscriptionPauseMode = "void" | "free";

export interface UpdateSubscriptionInput {
  readonly pause?: {
    readonly mode: SubscriptionPauseMode;
    readonly resumesAt?: string | null;
  } | null;
  readonly billingAnchor?: number | null;
  readonly invoiceImmediately?: boolean;
  readonly disableProrations?: boolean;
}

export interface CreateCheckoutInput {
  readonly storeId: Id;
  readonly variantId: Id;
  readonly checkoutData?: {
    /** Opaque user-owned keys must never be case-converted. */
    readonly custom?: Readonly<Record<string, unknown>>;
  };
}

/** Official prose and JSON examples currently disagree on this key. */
export interface SubscriptionUrls {
  readonly update_payment_method: string;
  readonly customer_portal: string;
  readonly customer_portal_update_subscription?: string;
  readonly update_customer_portal?: string;
}

export type AffiliateStatus = OpenString<"active" | "pending" | "disabled">;

export interface AffiliateAttributes {
  readonly status: AffiliateStatus;
  /** Documented only as JSON, with no public non-null element schema. */
  readonly products: JSONValue | null;
}

export type KnownWebhookEventName =
  | "order_created"
  | "order_refunded"
  | "customer_updated"
  | "subscription_created"
  | "subscription_updated"
  | "subscription_cancelled"
  | "subscription_resumed"
  | "subscription_expired"
  | "subscription_paused"
  | "subscription_unpaused"
  | "subscription_payment_success"
  | "subscription_payment_failed"
  | "subscription_payment_recovered"
  | "subscription_payment_refunded"
  | "license_key_created"
  | "license_key_updated"
  | "affiliate_activated";

/** Outbound subscription input is intentionally closed. */
export type WebhookSubscriptionEventName = KnownWebhookEventName;

export type KnownIncomingWebhook =
  | {
      readonly known: true;
      readonly eventName: "order_created" | "order_refunded";
      readonly data: OrderResource;
    }
  | {
      readonly known: true;
      readonly eventName: "customer_updated";
      readonly data: UnknownJSONAPIResource & { readonly type: "customers" };
    }
  | {
      readonly known: true;
      readonly eventName: "affiliate_activated";
      readonly data: UnknownJSONAPIResource & { readonly type: "affiliates" };
    };

export interface UnknownIncomingWebhook {
  readonly known: false;
  readonly eventName: string;
  readonly data: UnknownJSONAPIResource;
}

/** Inbound events retain an unknown fallback for future server additions. */
export type IncomingWebhook = KnownIncomingWebhook | UnknownIncomingWebhook;

interface OperationContract {
  readonly method: "GET" | "POST" | "PATCH" | "DELETE";
  readonly path: string;
  readonly response: "single" | "list" | "void";
  readonly query?: Readonly<Record<string, string>>;
}

interface ResourceContract {
  readonly type: string;
  readonly relationships: Readonly<Record<string, "one" | "many">>;
  readonly operations: Readonly<Record<string, OperationContract>>;
}

/** Mechanical catalog facts are values checked by TypeScript. */
export const orderContract = {
  type: "orders",
  relationships: {
    store: "one",
    customer: "one",
    affiliate: "one",
  },
  operations: {
    get: {
      method: "GET",
      path: "/v1/orders/:id",
      response: "single",
      query: { storeId: "filter[store_id]" },
    },
    list: {
      method: "GET",
      path: "/v1/orders",
      response: "list",
      query: {
        storeId: "filter[store_id]",
        userEmail: "filter[user_email]",
        orderNumber: "filter[order_number]",
      },
    },
  },
} as const satisfies ResourceContract;

export function acceptsFutureOrderStatus(status: OrderStatus): string {
  return status;
}

export function acceptsOnlyKnownRequestMode(
  mode: SubscriptionPauseMode
): string {
  return mode;
}

acceptsFutureOrderStatus("future_status");

// @ts-expect-error request enums reject undocumented values
acceptsOnlyKnownRequestMode("future_mode");

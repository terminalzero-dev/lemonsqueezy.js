import type {
  Id,
  JSONAPIListResponse,
  JSONAPIRelationship,
  JSONAPIResource,
  JSONAPIResourceIdentifier,
  JSONAPISingleResponse,
  OpenString,
} from "../../types/jsonapi";

export type KnownSubscriptionStatus =
  | "on_trial"
  | "active"
  | "paused"
  | "past_due"
  | "unpaid"
  | "cancelled"
  | "expired";
export type SubscriptionStatus = OpenString<KnownSubscriptionStatus>;
export type SubscriptionPaymentProcessor = OpenString<"stripe" | "paypal">;
export type SubscriptionCardBrand = OpenString<
  "visa" | "mastercard" | "amex" | "discover" | "jcb" | "diners" | "unionpay"
>;
export type SubscriptionPauseMode = "void" | "free";

export interface SubscriptionPause {
  readonly mode: OpenString<SubscriptionPauseMode>;
  readonly resumes_at?: string | null;
}

export interface SubscriptionFirstItem {
  readonly id: number;
  readonly subscription_id: number;
  readonly price_id: number;
  readonly quantity: number;
  readonly is_usage_based: boolean;
  readonly created_at: string;
  readonly updated_at: string;
}

export interface SubscriptionUrls {
  readonly update_payment_method: string;
  readonly customer_portal: string;
  readonly customer_portal_update_subscription?: string;
  readonly update_customer_portal?: string;
}

export interface SubscriptionAttributes {
  readonly store_id: number;
  readonly customer_id: number;
  readonly order_id: number;
  readonly order_item_id: number;
  readonly product_id: number;
  readonly variant_id: number;
  readonly product_name: string;
  readonly variant_name: string;
  readonly user_name: string;
  readonly user_email: string;
  readonly status: SubscriptionStatus;
  readonly status_formatted: string;
  readonly card_brand: SubscriptionCardBrand | null;
  readonly card_last_four: string | null;
  readonly payment_processor: SubscriptionPaymentProcessor;
  readonly pause: SubscriptionPause | null;
  readonly cancelled: boolean;
  readonly trial_ends_at: string | null;
  readonly billing_anchor: number;
  readonly first_subscription_item: SubscriptionFirstItem | null;
  readonly urls: SubscriptionUrls;
  readonly renews_at: string;
  readonly ends_at: string | null;
  readonly created_at: string;
  readonly updated_at: string;
  readonly test_mode: boolean;
}

type ToOne<Type extends string> = JSONAPIRelationship<
  JSONAPIResourceIdentifier<Type>
>;
type ToMany<Type extends string> = JSONAPIRelationship<
  readonly JSONAPIResourceIdentifier<Type>[]
>;

export interface SubscriptionRelationships {
  readonly store: ToOne<"stores">;
  readonly customer: ToOne<"customers">;
  readonly order: ToOne<"orders">;
  readonly "order-item": ToOne<"order-items">;
  readonly product: ToOne<"products">;
  readonly variant: ToOne<"variants">;
  readonly "subscription-items": ToMany<"subscription-items">;
  readonly "subscription-invoices": ToMany<"subscription-invoices">;
}

export type SubscriptionResource = Omit<
  JSONAPIResource<
    "subscriptions",
    SubscriptionAttributes,
    SubscriptionRelationships
  >,
  "relationships"
> & { readonly relationships: SubscriptionRelationships };
export type SubscriptionResponse = JSONAPISingleResponse<SubscriptionResource>;
export type SubscriptionListResponse =
  JSONAPIListResponse<SubscriptionResource>;

export interface GetSubscriptionParams {
  readonly include?: readonly (keyof SubscriptionRelationships)[];
}

export interface ListSubscriptionsParams extends GetSubscriptionParams {
  readonly filter?: {
    readonly storeId?: Id | null;
    readonly orderId?: Id | null;
    readonly orderItemId?: Id | null;
    readonly productId?: Id | null;
    readonly variantId?: Id | null;
    readonly userEmail?: string | null;
    readonly status?: KnownSubscriptionStatus | null;
  };
  readonly page?: {
    readonly number?: number | null;
    readonly size?: number | null;
  };
}

export interface UpdateSubscriptionInput {
  readonly variantId?: number;
  readonly pause?: {
    readonly mode: SubscriptionPauseMode;
    readonly resumesAt?: string | null;
  } | null;
  readonly cancelled?: boolean;
  readonly trialEndsAt?: string | null;
  readonly billingAnchor?: number | null;
  readonly invoiceImmediately?: boolean;
  readonly disableProrations?: boolean;
}

import type {
  Id,
  JSONAPIListResponse,
  JSONAPIRelationship,
  JSONAPIResource,
  JSONAPIResourceIdentifier,
  JSONAPISingleResponse,
  OpenString,
} from "../../types/jsonapi";
import type {
  ISO3166Alpha2CountryCode,
  ISO4217CurrencyCode,
  LanguageCode,
} from "../../types/iso";

export type KnownSubscriptionInvoiceBillingReason =
  | "initial"
  | "renewal"
  | "updated";
export type SubscriptionInvoiceBillingReason =
  OpenString<KnownSubscriptionInvoiceBillingReason>;

export type KnownSubscriptionInvoiceStatus =
  | "pending"
  | "paid"
  | "void"
  | "refunded"
  | "partial_refund";
export type SubscriptionInvoiceStatus =
  OpenString<KnownSubscriptionInvoiceStatus>;
export type SubscriptionInvoiceCardBrand = OpenString<
  "visa" | "mastercard" | "amex" | "discover" | "jcb" | "diners" | "unionpay"
>;

export interface SubscriptionInvoiceAttributes {
  readonly store_id: number;
  readonly subscription_id: number;
  readonly customer_id: number;
  readonly affiliate_id: number | null;
  readonly referral_amount: number | null;
  readonly user_name: string;
  readonly user_email: string;
  readonly billing_reason: SubscriptionInvoiceBillingReason;
  readonly card_brand: SubscriptionInvoiceCardBrand | null;
  readonly card_last_four: string | null;
  readonly currency: OpenString<ISO4217CurrencyCode>;
  readonly currency_rate: string;
  readonly status: SubscriptionInvoiceStatus;
  readonly status_formatted: string;
  readonly refunded: boolean;
  readonly refunded_at: string | null;
  readonly subtotal: number;
  readonly discount_total: number;
  readonly tax: number;
  readonly tax_inclusive: boolean;
  readonly total: number;
  readonly refunded_amount: number;
  readonly subtotal_usd: number;
  readonly discount_total_usd: number;
  readonly tax_usd: number;
  readonly total_usd: number;
  readonly refunded_amount_usd: number;
  readonly subtotal_formatted: string;
  readonly discount_total_formatted: string;
  readonly tax_formatted: string;
  readonly total_formatted: string;
  readonly refunded_amount_formatted: string;
  readonly urls: { readonly invoice_url: string | null };
  readonly created_at: string;
  readonly updated_at: string;
  readonly test_mode: boolean;
}

type ToOne<Type extends string> = JSONAPIRelationship<
  JSONAPIResourceIdentifier<Type>
>;

export interface SubscriptionInvoiceRelationships {
  readonly store: ToOne<"stores">;
  readonly subscription: ToOne<"subscriptions">;
  readonly customer: ToOne<"customers">;
  readonly affiliate: JSONAPIRelationship<JSONAPIResourceIdentifier<"affiliates"> | null>;
}

export type SubscriptionInvoiceResource = Omit<
  JSONAPIResource<
    "subscription-invoices",
    SubscriptionInvoiceAttributes,
    SubscriptionInvoiceRelationships
  >,
  "relationships"
> & { readonly relationships: SubscriptionInvoiceRelationships };
export type SubscriptionInvoiceResponse =
  JSONAPISingleResponse<SubscriptionInvoiceResource>;
export type SubscriptionInvoiceListResponse =
  JSONAPIListResponse<SubscriptionInvoiceResource>;

export interface GetSubscriptionInvoiceParams {
  readonly include?: readonly (keyof SubscriptionInvoiceRelationships)[];
}

export interface ListSubscriptionInvoicesParams extends GetSubscriptionInvoiceParams {
  readonly filter?: {
    readonly storeId?: Id | null;
    readonly status?: KnownSubscriptionInvoiceStatus | null;
    readonly refunded?: boolean | null;
    readonly subscriptionId?: Id | null;
  };
  readonly page?: {
    readonly number?: number | null;
    readonly size?: number | null;
  };
}

export interface GenerateSubscriptionInvoiceInput {
  readonly name?: string;
  readonly address?: string;
  readonly city?: string;
  readonly state?: string;
  readonly zipCode?: string | number;
  readonly country?: ISO3166Alpha2CountryCode;
  readonly notes?: string;
  readonly locale?: LanguageCode;
}

export interface GenerateSubscriptionInvoiceResponse {
  readonly jsonapi: { readonly version: string };
  readonly meta: {
    readonly urls: { readonly download_invoice: string };
  };
}

export interface RefundSubscriptionInvoiceInput {
  readonly amount?: number;
}

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

export type OrderStatus = OpenString<
  "pending" | "failed" | "paid" | "refunded" | "partial_refund" | "fraudulent"
>;

export interface OrderFirstItem {
  readonly id: number;
  readonly order_id: number;
  readonly product_id: number;
  readonly variant_id: number;
  readonly price_id: number;
  readonly quantity: number;
  readonly product_name: string;
  readonly variant_name: string;
  readonly price: number;
  readonly created_at: string;
  readonly updated_at: string;
  readonly test_mode: boolean;
}

export interface OrderAttributes {
  readonly store_id: number;
  readonly customer_id: number;
  readonly affiliate_id: number | null;
  readonly referral_amount: number | null;
  readonly identifier: string;
  readonly order_number: number;
  readonly user_name: string;
  readonly user_email: string;
  readonly currency: OpenString<ISO4217CurrencyCode>;
  readonly currency_rate: string;
  readonly subtotal: number;
  readonly setup_fee: number;
  readonly discount_total: number;
  readonly tax: number;
  readonly total: number;
  readonly refunded_amount: number;
  readonly subtotal_usd: number;
  readonly setup_fee_usd: number;
  readonly discount_total_usd: number;
  readonly tax_usd: number;
  readonly total_usd: number;
  readonly refunded_amount_usd: number;
  readonly tax_name: string | null;
  readonly tax_rate: string;
  readonly tax_inclusive: boolean;
  readonly status: OrderStatus;
  readonly status_formatted: string;
  readonly refunded: boolean;
  readonly refunded_at: string | null;
  readonly subtotal_formatted: string;
  readonly setup_fee_formatted: string;
  readonly discount_total_formatted: string;
  readonly tax_formatted: string;
  readonly total_formatted: string;
  readonly refunded_amount_formatted: string;
  readonly first_order_item: OrderFirstItem;
  readonly urls: { readonly receipt: string };
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

export interface OrderRelationships {
  readonly store: ToOne<"stores">;
  readonly customer: ToOne<"customers">;
  readonly affiliate: JSONAPIRelationship<JSONAPIResourceIdentifier<"affiliates"> | null>;
  readonly "order-items": ToMany<"order-items">;
  readonly subscriptions: ToMany<"subscriptions">;
  readonly "license-keys": ToMany<"license-keys">;
  readonly "discount-redemptions": ToMany<"discount-redemptions">;
}

export type OrderResource = Omit<
  JSONAPIResource<"orders", OrderAttributes, OrderRelationships>,
  "relationships"
> & { readonly relationships: OrderRelationships };
export type OrderResponse = JSONAPISingleResponse<OrderResource>;
export type OrderListResponse = JSONAPIListResponse<OrderResource>;

export interface GetOrderParams {
  readonly include?: readonly (keyof OrderRelationships)[];
}

export interface ListOrdersParams extends GetOrderParams {
  readonly filter?: {
    readonly storeId?: Id | null;
    readonly userEmail?: string | null;
    readonly orderNumber?: number | null;
  };
  readonly page?: {
    readonly number?: number | null;
    readonly size?: number | null;
  };
}

export interface GenerateOrderInvoiceInput {
  readonly name?: string;
  readonly address?: string;
  readonly city?: string;
  readonly state?: string;
  readonly zipCode?: string | number;
  readonly country?: ISO3166Alpha2CountryCode;
  readonly notes?: string;
  readonly locale?: LanguageCode;
}

export interface GenerateOrderInvoiceResponse {
  readonly jsonapi: { readonly version: string };
  readonly meta: {
    readonly urls: { readonly download_invoice: string };
  };
}

export interface RefundOrderInput {
  readonly amount?: number;
}

import type { IntervalUnit } from "../../types/common";
import type {
  Id,
  JSONAPIListResponse,
  JSONAPIRelationship,
  JSONAPIResource,
  JSONAPIResourceIdentifier,
  JSONAPISingleResponse,
  OpenString,
} from "../../types/jsonapi";

export type PriceCategory = OpenString<
  "one_time" | "subscription" | "lead_magnet" | "pwyw"
>;
export type PriceScheme = OpenString<
  "standard" | "package" | "graduated" | "volume"
>;
export type PriceUsageAggregation = OpenString<
  "sum" | "last_during_period" | "last_ever" | "max"
>;

export interface PriceTier {
  readonly last_unit: string | number;
  readonly unit_price: number | null;
  readonly unit_price_decimal: string | null;
  readonly fixed_fee: number;
}

export interface PriceAttributes {
  readonly variant_id: number;
  readonly category: PriceCategory;
  readonly scheme: PriceScheme;
  readonly usage_aggregation: PriceUsageAggregation | null;
  readonly unit_price: number | null;
  readonly unit_price_decimal: string | null;
  readonly setup_fee_enabled: boolean | null;
  readonly setup_fee: number | null;
  readonly package_size: number;
  readonly tiers: readonly PriceTier[] | null;
  readonly renewal_interval_unit: OpenString<IntervalUnit> | null;
  readonly renewal_interval_quantity: number | null;
  readonly trial_interval_unit: OpenString<IntervalUnit> | null;
  readonly trial_interval_quantity: number | null;
  readonly min_price: number | null;
  readonly suggested_price: number | null;
  readonly tax_code: OpenString<"eservice" | "ebook" | "saas">;
  readonly created_at: string;
  readonly updated_at: string;
}

export interface PriceRelationships {
  readonly variant: JSONAPIRelationship<JSONAPIResourceIdentifier<"variants">>;
  readonly "subscription-items": JSONAPIRelationship<
    readonly JSONAPIResourceIdentifier<"subscription-items">[]
  >;
  readonly "usage-records": JSONAPIRelationship<
    readonly JSONAPIResourceIdentifier<"usage-records">[]
  >;
}

export type PriceResource = Omit<
  JSONAPIResource<"prices", PriceAttributes, PriceRelationships>,
  "relationships"
> & { readonly relationships: PriceRelationships };
export type PriceResponse = JSONAPISingleResponse<PriceResource>;
export type PriceListResponse = JSONAPIListResponse<PriceResource>;

export interface GetPriceParams {
  readonly include?: readonly "variant"[];
}

export interface ListPricesParams extends GetPriceParams {
  readonly filter?: { readonly variantId?: Id | null };
  readonly page?: {
    readonly number?: number | null;
    readonly size?: number | null;
  };
}

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
} from "../../types/iso";

export interface StoreAttributes {
  readonly name: string;
  readonly slug: string;
  readonly domain: string;
  readonly url: string;
  readonly avatar_url: string;
  readonly plan: string;
  readonly country: OpenString<ISO3166Alpha2CountryCode>;
  readonly country_nicename: string;
  readonly currency: OpenString<ISO4217CurrencyCode>;
  readonly total_sales: number;
  readonly total_revenue: number;
  readonly thirty_day_sales: number;
  readonly thirty_day_revenue: number;
  readonly created_at: string;
  readonly updated_at: string;
}

type ToMany<Type extends string> = JSONAPIRelationship<
  readonly JSONAPIResourceIdentifier<Type>[]
>;

export interface StoreRelationships {
  readonly products: ToMany<"products">;
  readonly orders: ToMany<"orders">;
  readonly subscriptions: ToMany<"subscriptions">;
  readonly discounts: ToMany<"discounts">;
  readonly "license-keys": ToMany<"license-keys">;
  readonly webhooks: ToMany<"webhooks">;
}

export type StoreResource = Omit<
  JSONAPIResource<"stores", StoreAttributes, StoreRelationships>,
  "relationships"
> & { readonly relationships: StoreRelationships };
export type StoreResponse = JSONAPISingleResponse<StoreResource>;
export type StoreListResponse = JSONAPIListResponse<StoreResource>;

export interface GetStoreParams {
  readonly include?: readonly (keyof StoreRelationships)[];
}

export interface ListStoresParams extends GetStoreParams {
  readonly page?: {
    readonly number?: number;
    readonly size?: number;
  };
}

export type StoreId = Id;

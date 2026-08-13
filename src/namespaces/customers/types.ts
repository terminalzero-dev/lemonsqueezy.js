import type { ISO3166Alpha2CountryCode } from "../../types/iso";
import type {
  Id,
  JSONAPIListResponse,
  JSONAPIRelationship,
  JSONAPIResource,
  JSONAPIResourceIdentifier,
  JSONAPISingleResponse,
  OpenString,
} from "../../types/jsonapi";

export type CustomerStatus = OpenString<
  | "subscribed"
  | "unsubscribed"
  | "archived"
  | "requires_verification"
  | "invalid_email"
  | "bounced"
>;

export interface CustomerAttributes {
  readonly store_id: number;
  readonly name: string;
  readonly email: string;
  readonly status: CustomerStatus;
  readonly city: string | null;
  readonly region: string | null;
  readonly country: ISO3166Alpha2CountryCode | null;
  readonly total_revenue_currency: number;
  readonly mrr: number;
  readonly status_formatted: string;
  readonly country_formatted: string | null;
  readonly total_revenue_currency_formatted: string;
  readonly mrr_formatted: string;
  readonly urls: { readonly customer_portal: string | null };
  readonly created_at: string;
  readonly updated_at: string;
  readonly test_mode: boolean;
}

export interface CustomerRelationships {
  readonly store: JSONAPIRelationship<JSONAPIResourceIdentifier<"stores">>;
  readonly affiliates: JSONAPIRelationship<
    readonly JSONAPIResourceIdentifier<"affiliates">[]
  >;
  readonly orders: JSONAPIRelationship<
    readonly JSONAPIResourceIdentifier<"orders">[]
  >;
  readonly subscriptions: JSONAPIRelationship<
    readonly JSONAPIResourceIdentifier<"subscriptions">[]
  >;
  readonly "license-keys": JSONAPIRelationship<
    readonly JSONAPIResourceIdentifier<"license-keys">[]
  >;
}

export type CustomerResource = Omit<
  JSONAPIResource<"customers", CustomerAttributes, CustomerRelationships>,
  "relationships"
> & { readonly relationships: CustomerRelationships };
export type CustomerResponse = JSONAPISingleResponse<CustomerResource>;
export type CustomerListResponse = JSONAPIListResponse<CustomerResource>;

export interface CreateCustomerInput {
  readonly storeId: Id;
  readonly name: string;
  readonly email: string;
  readonly city?: string | null;
  readonly region?: string | null;
  readonly country?: ISO3166Alpha2CountryCode | null;
}

export interface UpdateCustomerInput {
  readonly name?: string;
  readonly email?: string;
  readonly city?: string | null;
  readonly region?: string | null;
  readonly country?: ISO3166Alpha2CountryCode | null;
  readonly status?: "archived";
}

export interface GetCustomerParams {
  readonly include?: readonly (keyof CustomerRelationships)[];
}

export interface ListCustomersParams extends GetCustomerParams {
  readonly filter?: {
    readonly storeId?: Id | null;
    readonly email?: string | null;
  };
  readonly page?: {
    readonly number?: number | null;
    readonly size?: number | null;
  };
}

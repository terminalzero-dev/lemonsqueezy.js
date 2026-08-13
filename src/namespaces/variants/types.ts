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

export const knownVariantStatuses = ["pending", "draft", "published"] as const;
export type KnownVariantStatus = (typeof knownVariantStatuses)[number];
export type VariantStatus = OpenString<KnownVariantStatus>;

export interface VariantAttributes {
  readonly product_id: number;
  readonly name: string;
  readonly slug: string;
  readonly description: string;
  readonly has_license_keys: boolean;
  readonly license_activation_limit: number;
  readonly is_license_limit_unlimited: boolean;
  readonly license_length_value: number;
  readonly license_length_unit: OpenString<"days" | "months" | "years">;
  readonly is_license_length_unlimited: boolean;
  readonly links: readonly {
    readonly title: string;
    readonly url: string;
  }[];
  readonly sort: number;
  readonly status: VariantStatus;
  readonly status_formatted: string;
  readonly created_at: string;
  readonly updated_at: string;
  readonly test_mode: boolean;
  readonly price: number;
  readonly is_subscription: boolean;
  readonly interval: OpenString<IntervalUnit> | null;
  readonly interval_count: number | null;
  readonly has_free_trial: boolean;
  readonly trial_interval: OpenString<IntervalUnit>;
  readonly trial_interval_count: number;
  readonly pay_what_you_want: boolean;
  readonly min_price: number;
  readonly suggested_price: number;
}

export interface VariantRelationships {
  readonly product: JSONAPIRelationship<JSONAPIResourceIdentifier<"products">>;
  readonly files: JSONAPIRelationship<
    readonly JSONAPIResourceIdentifier<"files">[]
  >;
  readonly "price-model": JSONAPIRelationship<
    JSONAPIResourceIdentifier<"prices">
  >;
}

export type VariantResource = Omit<
  JSONAPIResource<"variants", VariantAttributes, VariantRelationships>,
  "relationships"
> & { readonly relationships: VariantRelationships };
export type VariantResponse = JSONAPISingleResponse<VariantResource>;
export type VariantListResponse = JSONAPIListResponse<VariantResource>;

export interface GetVariantParams {
  readonly include?: readonly (keyof VariantRelationships)[];
}

export interface ListVariantsParams extends GetVariantParams {
  readonly filter?: {
    readonly productId?: Id | null;
    readonly status?: KnownVariantStatus | null;
  };
  readonly page?: {
    readonly number?: number | null;
    readonly size?: number | null;
  };
}

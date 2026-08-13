import type {
  Id,
  JSONAPIRelationship,
  JSONAPIListResponse,
  JSONAPIResource,
  JSONAPIResourceIdentifier,
  JSONAPISingleResponse,
  OpenString,
} from "../../types/jsonapi";

export type DiscountAmountType = "percent" | "fixed";
export type DiscountDuration = "once" | "repeating" | "forever";
export type KnownDiscountStatus = "draft" | "published";
export type DiscountStatus = OpenString<KnownDiscountStatus>;

export interface DiscountAttributes {
  readonly store_id: number;
  readonly name: string;
  readonly code: string;
  readonly amount: number;
  readonly amount_type: OpenString<DiscountAmountType>;
  readonly is_limited_to_products: boolean;
  readonly is_limited_redemptions: boolean;
  readonly max_redemptions: number;
  readonly starts_at: string | null;
  readonly expires_at: string | null;
  readonly duration: OpenString<DiscountDuration>;
  readonly duration_in_months: number;
  readonly status: DiscountStatus;
  readonly status_formatted: string;
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

export interface DiscountRelationships {
  readonly store: ToOne<"stores">;
  readonly variants: ToMany<"variants">;
  readonly "discount-redemptions": ToMany<"discount-redemptions">;
}

export type DiscountResource = Omit<
  JSONAPIResource<"discounts", DiscountAttributes, DiscountRelationships>,
  "relationships"
> & { readonly relationships: DiscountRelationships };
export type DiscountResponse = JSONAPISingleResponse<DiscountResource>;
export type DiscountListResponse = JSONAPIListResponse<DiscountResource>;

export interface GetDiscountParams {
  readonly include?: readonly (keyof DiscountRelationships)[];
}

export interface ListDiscountsParams extends GetDiscountParams {
  readonly filter?: { readonly storeId?: Id | null };
  readonly page?: {
    readonly number?: number | null;
    readonly size?: number | null;
  };
}

interface CreateDiscountInputBase {
  readonly storeId: Id;
  readonly name: string;
  readonly code?: string;
  readonly amount: number;
  readonly amountType: DiscountAmountType;
  readonly isLimitedRedemptions?: boolean;
  readonly maxRedemptions?: number;
  readonly startsAt?: string | null;
  readonly expiresAt?: string | null;
  readonly duration?: DiscountDuration;
  readonly durationInMonths?: number;
  readonly testMode?: boolean;
}

interface CreateDiscountWithVariants extends CreateDiscountInputBase {
  readonly isLimitedToProducts: true;
  readonly variantIds: readonly Id[];
}

interface CreateDiscountWithoutVariants extends CreateDiscountInputBase {
  readonly isLimitedToProducts?: false;
  readonly variantIds?: never;
}

export type CreateDiscountInput =
  | CreateDiscountWithVariants
  | CreateDiscountWithoutVariants;

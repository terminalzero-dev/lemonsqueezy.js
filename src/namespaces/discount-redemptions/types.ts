import type { DiscountAmountType } from "../discounts/types";
import type {
  Id,
  JSONAPIListResponse,
  JSONAPIRelationship,
  JSONAPIResource,
  JSONAPIResourceIdentifier,
  JSONAPISingleResponse,
  OpenString,
} from "../../types/jsonapi";

export interface DiscountRedemptionAttributes {
  readonly discount_id: number;
  readonly order_id: number;
  readonly discount_name: string;
  readonly discount_code: string;
  readonly discount_amount: number;
  readonly discount_amount_type: OpenString<DiscountAmountType>;
  readonly amount: number;
  readonly created_at: string;
  readonly updated_at: string;
}

type ToOne<Type extends string> = JSONAPIRelationship<
  JSONAPIResourceIdentifier<Type>
>;

export interface DiscountRedemptionRelationships {
  readonly discount: ToOne<"discounts">;
  readonly order: ToOne<"orders">;
}

export type DiscountRedemptionResource = Omit<
  JSONAPIResource<
    "discount-redemptions",
    DiscountRedemptionAttributes,
    DiscountRedemptionRelationships
  >,
  "relationships"
> & { readonly relationships: DiscountRedemptionRelationships };
export type DiscountRedemptionResponse =
  JSONAPISingleResponse<DiscountRedemptionResource>;
export type DiscountRedemptionListResponse =
  JSONAPIListResponse<DiscountRedemptionResource>;

export interface GetDiscountRedemptionParams {
  readonly include?: readonly (keyof DiscountRedemptionRelationships)[];
}

export interface ListDiscountRedemptionsParams extends GetDiscountRedemptionParams {
  readonly filter?: {
    readonly discountId?: Id | null;
    readonly orderId?: Id | null;
  };
  readonly page?: {
    readonly number?: number | null;
    readonly size?: number | null;
  };
}

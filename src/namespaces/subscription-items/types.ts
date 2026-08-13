import type { IntervalUnit } from "../../types/common";
import type {
  Id,
  JSONAPIRelationship,
  JSONAPIListResponse,
  JSONAPIResource,
  JSONAPIResourceIdentifier,
  JSONAPISingleResponse,
  OpenString,
} from "../../types/jsonapi";

export interface SubscriptionItemAttributes {
  readonly subscription_id: number;
  readonly price_id: number;
  readonly quantity: number;
  readonly is_usage_based: boolean;
  readonly created_at: string;
  readonly updated_at: string;
}

type ToOne<Type extends string> = JSONAPIRelationship<
  JSONAPIResourceIdentifier<Type>
>;
type ToMany<Type extends string> = JSONAPIRelationship<
  readonly JSONAPIResourceIdentifier<Type>[]
>;

export interface SubscriptionItemRelationships {
  readonly subscription: ToOne<"subscriptions">;
  readonly price: ToOne<"prices">;
  readonly "usage-records": ToMany<"usage-records">;
}

export type SubscriptionItemResource = Omit<
  JSONAPIResource<
    "subscription-items",
    SubscriptionItemAttributes,
    SubscriptionItemRelationships
  >,
  "relationships"
> & { readonly relationships: SubscriptionItemRelationships };
export type SubscriptionItemResponse =
  JSONAPISingleResponse<SubscriptionItemResource>;
export type SubscriptionItemListResponse =
  JSONAPIListResponse<SubscriptionItemResource>;

export interface GetSubscriptionItemParams {
  readonly include?: readonly (keyof SubscriptionItemRelationships)[];
}

export interface ListSubscriptionItemsParams extends GetSubscriptionItemParams {
  readonly filter?: {
    readonly subscriptionId?: Id | null;
    readonly priceId?: Id | null;
  };
  readonly page?: {
    readonly number?: number | null;
    readonly size?: number | null;
  };
}

export interface UpdateSubscriptionItemInput {
  readonly quantity: number;
  readonly invoiceImmediately?: boolean;
  readonly disableProrations?: boolean;
}

export interface SubscriptionItemCurrentUsageResponse {
  readonly jsonapi: { readonly version: string };
  readonly meta: {
    readonly period_start: string;
    readonly period_end: string;
    readonly quantity: number;
    readonly interval_unit: OpenString<IntervalUnit>;
    readonly interval_quantity: number;
  };
}

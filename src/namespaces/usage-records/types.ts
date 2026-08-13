import type {
  Id,
  JSONAPIListResponse,
  JSONAPIRelationship,
  JSONAPIResource,
  JSONAPIResourceIdentifier,
  JSONAPISingleResponse,
  OpenString,
} from "../../types/jsonapi";

export type UsageRecordAction = "increment" | "set";

export interface UsageRecordAttributes {
  readonly subscription_item_id: number;
  readonly quantity: number;
  readonly action: OpenString<UsageRecordAction>;
  readonly created_at: string;
  readonly updated_at: string;
}

export interface UsageRecordRelationships {
  readonly "subscription-item": JSONAPIRelationship<
    JSONAPIResourceIdentifier<"subscription-items">
  >;
}

export type UsageRecordResource = Omit<
  JSONAPIResource<
    "usage-records",
    UsageRecordAttributes,
    UsageRecordRelationships
  >,
  "relationships"
> & { readonly relationships: UsageRecordRelationships };
export type UsageRecordResponse = JSONAPISingleResponse<UsageRecordResource>;
export type UsageRecordListResponse = JSONAPIListResponse<UsageRecordResource>;

export interface CreateUsageRecordInput {
  readonly subscriptionItemId: Id;
  readonly quantity: number;
  readonly action?: UsageRecordAction;
}

export interface GetUsageRecordParams {
  readonly include?: readonly (keyof UsageRecordRelationships)[];
}

export interface ListUsageRecordsParams extends GetUsageRecordParams {
  readonly filter?: {
    readonly subscriptionItemId?: Id | null;
  };
  readonly page?: {
    readonly number?: number | null;
    readonly size?: number | null;
  };
}

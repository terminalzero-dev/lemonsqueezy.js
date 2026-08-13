import type {
  Id,
  JSONAPIListResponse,
  JSONAPIRelationship,
  JSONAPIResource,
  JSONAPIResourceIdentifier,
  JSONAPISingleResponse,
  JSONValue,
  OpenString,
} from "../../types/jsonapi";

export type AffiliateStatus = OpenString<"active" | "pending" | "disabled">;

export interface AffiliateAttributes {
  readonly store_id: number;
  readonly user_id: number;
  readonly user_name: string;
  readonly user_email: string;
  readonly share_domain: string;
  readonly status: AffiliateStatus;
  readonly application_note: string;
  readonly products: JSONValue | null;
  readonly total_earnings: number;
  readonly unpaid_earnings: number;
  readonly created_at: string;
  readonly updated_at: string;
}

export interface AffiliateRelationships {
  readonly store: JSONAPIRelationship<JSONAPIResourceIdentifier<"stores">>;
  readonly user: JSONAPIRelationship<JSONAPIResourceIdentifier<"users">>;
}

export type AffiliateResource = Omit<
  JSONAPIResource<"affiliates", AffiliateAttributes, AffiliateRelationships>,
  "relationships"
> & { readonly relationships: AffiliateRelationships };
export type AffiliateResponse = JSONAPISingleResponse<AffiliateResource>;
export type AffiliateListResponse = JSONAPIListResponse<AffiliateResource>;

export interface GetAffiliateParams {
  readonly include?: readonly (keyof AffiliateRelationships)[];
}

export interface ListAffiliatesParams extends GetAffiliateParams {
  readonly filter?: {
    readonly storeId?: Id | null;
    readonly userEmail?: string | null;
  };
  readonly page?: {
    readonly number?: number | null;
    readonly size?: number | null;
  };
}

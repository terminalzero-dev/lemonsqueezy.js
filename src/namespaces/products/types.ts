import type {
  Id,
  JSONAPIListResponse,
  JSONAPIRelationship,
  JSONAPIResource,
  JSONAPIResourceIdentifier,
  JSONAPISingleResponse,
  OpenString,
} from "../../types/jsonapi";

export interface ProductAttributes {
  readonly store_id: number;
  readonly name: string;
  readonly slug: string;
  readonly description: string;
  readonly status: OpenString<"published" | "draft">;
  readonly status_formatted: string;
  readonly thumb_url: string;
  readonly large_thumb_url: string;
  readonly price: number;
  readonly price_formatted: string;
  readonly from_price: number | null;
  readonly from_price_formatted: string | null;
  readonly to_price: number | null;
  readonly to_price_formatted: string | null;
  readonly pay_what_you_want: boolean;
  readonly buy_now_url: string;
  readonly created_at: string;
  readonly updated_at: string;
  readonly test_mode: boolean;
}

export interface ProductRelationships {
  readonly store: JSONAPIRelationship<JSONAPIResourceIdentifier<"stores">>;
  readonly variants: JSONAPIRelationship<
    readonly JSONAPIResourceIdentifier<"variants">[]
  >;
}

export type ProductResource = Omit<
  JSONAPIResource<"products", ProductAttributes, ProductRelationships>,
  "relationships"
> & { readonly relationships: ProductRelationships };
export type ProductResponse = JSONAPISingleResponse<ProductResource>;
export type ProductListResponse = JSONAPIListResponse<ProductResource>;

export interface GetProductParams {
  readonly include?: readonly (keyof ProductRelationships)[];
}

export interface ListProductsParams extends GetProductParams {
  readonly filter?: { readonly storeId?: Id | null };
  readonly page?: {
    readonly number?: number | null;
    readonly size?: number | null;
  };
}

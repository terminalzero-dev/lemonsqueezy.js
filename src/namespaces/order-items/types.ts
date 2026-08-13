import type {
  Id,
  JSONAPIListResponse,
  JSONAPIRelationship,
  JSONAPIResource,
  JSONAPIResourceIdentifier,
  JSONAPISingleResponse,
} from "../../types/jsonapi";

export interface OrderItemAttributes {
  readonly order_id: number;
  readonly product_id: number;
  readonly variant_id: number;
  readonly price_id: number;
  readonly product_name: string;
  readonly variant_name: string;
  readonly price: number;
  readonly quantity: number;
  readonly created_at: string;
  readonly updated_at: string;
  readonly test_mode: boolean;
}

type ToOne<Type extends string> = JSONAPIRelationship<
  JSONAPIResourceIdentifier<Type>
>;

export interface OrderItemRelationships {
  readonly order: ToOne<"orders">;
  readonly product: ToOne<"products">;
  readonly variant: ToOne<"variants">;
}

export type OrderItemResource = Omit<
  JSONAPIResource<"order-items", OrderItemAttributes, OrderItemRelationships>,
  "relationships"
> & { readonly relationships: OrderItemRelationships };
export type OrderItemResponse = JSONAPISingleResponse<OrderItemResource>;
export type OrderItemListResponse = JSONAPIListResponse<OrderItemResource>;

export interface GetOrderItemParams {
  readonly include?: readonly (keyof OrderItemRelationships)[];
}

export interface ListOrderItemsParams extends GetOrderItemParams {
  readonly filter?: {
    readonly orderId?: Id | null;
    readonly productId?: Id | null;
    readonly variantId?: Id | null;
  };
  readonly page?: {
    readonly number?: number | null;
    readonly size?: number | null;
  };
}

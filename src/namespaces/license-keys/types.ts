import type {
  Id,
  JSONAPIListResponse,
  JSONAPIRelationship,
  JSONAPIResource,
  JSONAPIResourceIdentifier,
  JSONAPISingleResponse,
  OpenString,
} from "../../types/jsonapi";

export type KnownLicenseKeyStatus =
  | "inactive"
  | "active"
  | "expired"
  | "disabled";
export type LicenseKeyStatus = OpenString<KnownLicenseKeyStatus>;

export interface LicenseKeyAttributes {
  readonly store_id: number;
  readonly customer_id: number;
  readonly order_id: number;
  readonly order_item_id: number;
  readonly product_id: number;
  readonly user_name: string;
  readonly user_email: string;
  readonly key: string;
  readonly key_short: string;
  readonly activation_limit: number | null;
  readonly instances_count: number;
  readonly disabled: boolean | number;
  readonly status: LicenseKeyStatus;
  readonly status_formatted: string;
  readonly expires_at: string | null;
  readonly created_at: string;
  readonly updated_at: string;
  readonly test_mode?: boolean;
}

type ToOne<Type extends string> = JSONAPIRelationship<
  JSONAPIResourceIdentifier<Type>
>;
type ToMany<Type extends string> = JSONAPIRelationship<
  readonly JSONAPIResourceIdentifier<Type>[]
>;

export interface LicenseKeyRelationships {
  readonly store: ToOne<"stores">;
  readonly customer: ToOne<"customers">;
  readonly order: ToOne<"orders">;
  readonly "order-item": ToOne<"order-items">;
  readonly product: ToOne<"products">;
  readonly "license-key-instances": ToMany<"license-key-instances">;
}

export type LicenseKeyResource = Omit<
  JSONAPIResource<
    "license-keys",
    LicenseKeyAttributes,
    LicenseKeyRelationships
  >,
  "relationships"
> & { readonly relationships: LicenseKeyRelationships };
export type LicenseKeyResponse = JSONAPISingleResponse<LicenseKeyResource>;
export type LicenseKeyListResponse = JSONAPIListResponse<LicenseKeyResource>;

export interface GetLicenseKeyParams {
  readonly include?: readonly (keyof LicenseKeyRelationships)[];
}

export interface ListLicenseKeysParams extends GetLicenseKeyParams {
  readonly filter?: {
    readonly storeId?: Id | null;
    readonly orderId?: Id | null;
    readonly orderItemId?: Id | null;
    readonly productId?: Id | null;
    readonly status?: KnownLicenseKeyStatus | null;
  };
  readonly page?: {
    readonly number?: number | null;
    readonly size?: number | null;
  };
}

export interface UpdateLicenseKeyInput {
  readonly activationLimit?: number | null;
  readonly expiresAt?: string | null;
  readonly disabled?: boolean;
}

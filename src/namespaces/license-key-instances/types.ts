import type {
  Id,
  JSONAPIListResponse,
  JSONAPIRelationship,
  JSONAPIResource,
  JSONAPIResourceIdentifier,
  JSONAPISingleResponse,
} from "../../types/jsonapi";

export interface LicenseKeyInstanceAttributes {
  readonly license_key_id: number;
  readonly identifier: string;
  readonly name: string;
  readonly created_at: string;
  readonly updated_at: string;
}

export interface LicenseKeyInstanceRelationships {
  readonly "license-key": JSONAPIRelationship<
    JSONAPIResourceIdentifier<"license-keys">
  >;
}

export type LicenseKeyInstanceResource = Omit<
  JSONAPIResource<
    "license-key-instances",
    LicenseKeyInstanceAttributes,
    LicenseKeyInstanceRelationships
  >,
  "relationships"
> & { readonly relationships: LicenseKeyInstanceRelationships };
export type LicenseKeyInstanceResponse =
  JSONAPISingleResponse<LicenseKeyInstanceResource>;
export type LicenseKeyInstanceListResponse =
  JSONAPIListResponse<LicenseKeyInstanceResource>;

export interface GetLicenseKeyInstanceParams {
  readonly include?: readonly (keyof LicenseKeyInstanceRelationships)[];
}

export interface ListLicenseKeyInstancesParams extends GetLicenseKeyInstanceParams {
  readonly filter?: { readonly licenseKeyId?: Id | null };
  readonly page?: {
    readonly number?: number | null;
    readonly size?: number | null;
  };
}

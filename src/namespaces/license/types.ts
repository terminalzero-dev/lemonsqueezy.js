import type { OpenString } from "../../types/jsonapi";

export type KnownLicenseApiKeyStatus =
  | "inactive"
  | "active"
  | "expired"
  | "disabled";
export type LicenseApiKeyStatus = OpenString<KnownLicenseApiKeyStatus>;

export interface LicenseApiKey {
  readonly id: number;
  readonly status: LicenseApiKeyStatus;
  readonly key: string;
  readonly activation_limit: number | null;
  readonly activation_usage: number;
  readonly created_at: string;
  readonly expires_at: string | null;
  readonly test_mode?: boolean;
}

export interface LicenseApiInstance {
  readonly id: string;
  readonly name: string;
  readonly created_at: string;
}

export interface LicenseApiMeta {
  readonly store_id: number;
  readonly order_id: number;
  readonly order_item_id: number;
  readonly product_id: number;
  readonly product_name: string;
  readonly variant_id: number;
  readonly variant_name: string;
  readonly customer_id: number;
  readonly customer_name: string;
  readonly customer_email: string;
}

interface LicenseApiResponse {
  readonly error: string | null;
  readonly license_key: LicenseApiKey;
  readonly meta: LicenseApiMeta;
}

export interface ActivateLicenseInput {
  readonly licenseKey: string;
  readonly instanceName: string;
}

export interface ActivateLicenseResponse extends LicenseApiResponse {
  readonly activated: boolean;
  readonly instance?: LicenseApiInstance | null;
}

export interface ValidateLicenseInput {
  readonly licenseKey: string;
  readonly instanceId?: string;
}

export interface ValidateLicenseResponse extends LicenseApiResponse {
  readonly valid: boolean;
  readonly instance: LicenseApiInstance | null;
}

export interface DeactivateLicenseInput {
  readonly licenseKey: string;
  readonly instanceId: string;
}

export interface DeactivateLicenseResponse extends LicenseApiResponse {
  readonly deactivated: boolean;
}

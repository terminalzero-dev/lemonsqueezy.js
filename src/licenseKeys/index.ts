import type { FetchResponse } from "../internal/fetch/types";
import { invokeDefaultCompatibility } from "../internal/v5/default-client";
import {
  getLicenseKeyOperation,
  listLicenseKeysOperation,
  updateLicenseKeyOperation,
} from "../namespaces/license-keys/contract";
import type {
  GetLicenseKeyParams as CanonicalGetLicenseKeyParams,
  LicenseKeyListResponse,
  LicenseKeyResponse,
  ListLicenseKeysParams as CanonicalListLicenseKeysParams,
  UpdateLicenseKeyInput,
} from "../namespaces/license-keys/types";
import type {
  GetLicenseKeyParams,
  LicenseKey,
  ListLicenseKeys,
  ListLicenseKeysParams,
  UpdateLicenseKey,
} from "./types";

/**
 * Retrieve a license key.
 *
 * @param licenseKeyId The license key id.
 * @param [params] (Optional) Additional parameters.
 * @param [params.include] (Optional) Related resources.
 * @returns A license key object.
 */
export function getLicenseKey(
  licenseKeyId: number | string,
  params: GetLicenseKeyParams = {},
) {
  return invokeDefaultCompatibility<
    readonly [number | string, CanonicalGetLicenseKeyParams],
    LicenseKeyResponse,
    LicenseKey
  >(getLicenseKeyOperation, [licenseKeyId, params]) as Promise<
    FetchResponse<LicenseKey>
  >;
}

/**
 * List all license keys.
 *
 * @param [params] (Optional) Additional parameters.
 * @param [params.filter] (Optional) Filter parameters.
 * @param [params.filter.storeId] (Optional) Only return license keys belonging to the store with this ID.
 * @param [params.filter.orderId] (Optional) (Optional) Only return license keys belonging to the order with this ID.
 * @param [params.filter.orderItemId] (Optional) Only return license keys belonging to the order item with this ID.
 * @param [params.filter.productId] (Optional) Only return license keys belonging to the product with this ID.
 * @param [params.page] (Optional) Custom paginated queries.
 * @param [params.page.number] (Optional) The parameter determine which page to retrieve.
 * @param [params.page.size] (Optional) The parameter to determine how many results to return per page.
 * @param [params.include] (Optional) Related resources.
 * @returns A paginated list of license key objects ordered by `id`.
 */
export function listLicenseKeys(params: ListLicenseKeysParams = {}) {
  return invokeDefaultCompatibility<
    readonly [CanonicalListLicenseKeysParams],
    LicenseKeyListResponse,
    ListLicenseKeys
  >(listLicenseKeysOperation, [params]) as Promise<
    FetchResponse<ListLicenseKeys>
  >;
}

/**
 * Update a license key.
 *
 * @param licenseKeyId The license key id.
 * @param licenseKey (Optional) Values to be updated.
 * @param [licenseKey.activationLimit] (Optional) The activation limit of this license key. Assign `null` to set the activation limit to "unlimited".
 * @param [licenseKey.expiresAt] (Optional) An [ISO 8601](https://en.wikipedia.org/wiki/ISO_8601) formatted date-time string indicating when the license key expires. Can be `null` if the license key is perpetual.
 * @param [licenseKey.disabled] (Optional) If `true`, the license key will have "disabled" status.
 * @returns A license key object.
 */
export function updateLicenseKey(
  licenseKeyId: string | number,
  licenseKey: UpdateLicenseKey,
) {
  const input: UpdateLicenseKeyInput = licenseKey;
  return invokeDefaultCompatibility<
    readonly [number | string, UpdateLicenseKeyInput],
    LicenseKeyResponse,
    LicenseKey
  >(updateLicenseKeyOperation, [licenseKeyId, input]) as Promise<
    FetchResponse<LicenseKey>
  >;
}

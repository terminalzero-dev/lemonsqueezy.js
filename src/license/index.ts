import { invokeDefaultCompatibility } from "../internal/v5/default-client";
import {
  activateLicenseOperation,
  deactivateLicenseOperation,
  validateLicenseOperation,
} from "../namespaces/license/contract";
import type {
  ActivateLicenseInput,
  ActivateLicenseResponse,
  DeactivateLicenseInput,
  DeactivateLicenseResponse,
  ValidateLicenseInput,
  ValidateLicenseResponse,
} from "../namespaces/license/types";
import type {
  ActivateLicense,
  DeactivateLicense,
  ValidateLicense,
} from "./types";

/**
 * Activate a license key.
 *
 * @param licenseKey The license key.
 * @param instanceName A label for the new instance to identify it in Lemon Squeezy.
 * @returns A response object containing `activated`, `error`, `license_key`, `instance`, `meta`.
 */
export async function activateLicense(
  licenseKey: string,
  instanceName: string,
) {
  return invokeDefaultCompatibility<
    readonly [ActivateLicenseInput],
    ActivateLicenseResponse,
    ActivateLicense
  >(activateLicenseOperation, [{ licenseKey, instanceName }]);
}

/**
 * Validate a license key or license key instance.
 *
 * @param licenseKey The license key.
 * @param [instanceId] (Optional) If included, validate a license key instance, otherwise a license key. If no `instance_id` is provided, the response will contain "instance": `null`.
 * @returns A response object containing `valid`, `error`, `license_key`, `instance`, `meta`.
 */
export async function validateLicense(licenseKey: string, instanceId?: string) {
  return invokeDefaultCompatibility<
    readonly [ValidateLicenseInput],
    ValidateLicenseResponse,
    ValidateLicense
  >(validateLicenseOperation, [{ licenseKey, instanceId }]);
}

/**
 * Deactivate a license key instance.
 *
 * @param licenseKey The license key.
 * @param instanceId The instance ID returned when activating a license key.
 * @returns A response object containing `deactivated`, `error`, `license_key`, `meta`.
 */
export async function deactivateLicense(
  licenseKey: string,
  instanceId: string,
) {
  return invokeDefaultCompatibility<
    readonly [DeactivateLicenseInput],
    DeactivateLicenseResponse,
    DeactivateLicense
  >(deactivateLicenseOperation, [{ licenseKey, instanceId }]);
}

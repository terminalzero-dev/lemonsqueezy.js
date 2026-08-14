import type { RequestOptions, ResourceRuntime } from "../../internal/v5/types";
import {
  activateLicenseOperation,
  deactivateLicenseOperation,
  validateLicenseOperation,
} from "./contract";
import type {
  ActivateLicenseInput,
  ActivateLicenseResponse,
  DeactivateLicenseInput,
  DeactivateLicenseResponse,
  ValidateLicenseInput,
  ValidateLicenseResponse,
} from "./types";

export interface LicenseNamespace {
  activate(
    input: ActivateLicenseInput,
    options?: RequestOptions,
  ): Promise<ActivateLicenseResponse>;
  validate(
    input: ValidateLicenseInput,
    options?: RequestOptions,
  ): Promise<ValidateLicenseResponse>;
  deactivate(
    input: DeactivateLicenseInput,
    options?: RequestOptions,
  ): Promise<DeactivateLicenseResponse>;
}

export function createLicenseNamespace(
  runtime: ResourceRuntime,
): LicenseNamespace {
  return Object.freeze({
    async activate(input: ActivateLicenseInput, options?: RequestOptions) {
      return (
        await runtime.invoke<
          readonly [ActivateLicenseInput],
          ActivateLicenseResponse
        >(activateLicenseOperation, [input], options)
      ).body;
    },
    async validate(input: ValidateLicenseInput, options?: RequestOptions) {
      return (
        await runtime.invoke<
          readonly [ValidateLicenseInput],
          ValidateLicenseResponse
        >(validateLicenseOperation, [input], options)
      ).body;
    },
    async deactivate(input: DeactivateLicenseInput, options?: RequestOptions) {
      return (
        await runtime.invoke<
          readonly [DeactivateLicenseInput],
          DeactivateLicenseResponse
        >(deactivateLicenseOperation, [input], options)
      ).body;
    },
  });
}

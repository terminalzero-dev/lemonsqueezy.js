import type { RequestOptions, ResourceRuntime } from "../../internal/v5/types";
import type { Id } from "../../types/jsonapi";
import {
  getLicenseKeyOperation,
  listLicenseKeysOperation,
  updateLicenseKeyOperation,
} from "./contract";
import type {
  GetLicenseKeyParams,
  LicenseKeyListResponse,
  LicenseKeyResponse,
  ListLicenseKeysParams,
  UpdateLicenseKeyInput,
} from "./types";

export interface LicenseKeysNamespace {
  get(
    id: Id,
    params?: GetLicenseKeyParams,
    options?: RequestOptions,
  ): Promise<LicenseKeyResponse>;
  list(
    params?: ListLicenseKeysParams,
    options?: RequestOptions,
  ): Promise<LicenseKeyListResponse>;
  update(
    id: Id,
    input: UpdateLicenseKeyInput,
    options?: RequestOptions,
  ): Promise<LicenseKeyResponse>;
}

export function createLicenseKeysNamespace(
  runtime: ResourceRuntime,
): LicenseKeysNamespace {
  return Object.freeze({
    async get(
      id: Id,
      params: GetLicenseKeyParams = {},
      options?: RequestOptions,
    ) {
      return (
        await runtime.invoke<
          readonly [Id, GetLicenseKeyParams],
          LicenseKeyResponse
        >(getLicenseKeyOperation, [id, params], options)
      ).body;
    },
    async list(params: ListLicenseKeysParams = {}, options?: RequestOptions) {
      return (
        await runtime.invoke<
          readonly [ListLicenseKeysParams],
          LicenseKeyListResponse
        >(listLicenseKeysOperation, [params], options)
      ).body;
    },
    async update(
      id: Id,
      input: UpdateLicenseKeyInput,
      options?: RequestOptions,
    ) {
      return (
        await runtime.invoke<
          readonly [Id, UpdateLicenseKeyInput],
          LicenseKeyResponse
        >(updateLicenseKeyOperation, [id, input], options)
      ).body;
    },
  });
}

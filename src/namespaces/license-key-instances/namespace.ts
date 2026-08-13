import type { RequestOptions, ResourceRuntime } from "../../internal/v5/types";
import type { Id } from "../../types/jsonapi";
import {
  getLicenseKeyInstanceOperation,
  listLicenseKeyInstancesOperation,
} from "./contract";
import type {
  GetLicenseKeyInstanceParams,
  LicenseKeyInstanceListResponse,
  LicenseKeyInstanceResponse,
  ListLicenseKeyInstancesParams,
} from "./types";

export interface LicenseKeyInstancesNamespace {
  get(
    id: Id,
    params?: GetLicenseKeyInstanceParams,
    options?: RequestOptions,
  ): Promise<LicenseKeyInstanceResponse>;
  list(
    params?: ListLicenseKeyInstancesParams,
    options?: RequestOptions,
  ): Promise<LicenseKeyInstanceListResponse>;
}

export function createLicenseKeyInstancesNamespace(
  runtime: ResourceRuntime,
): LicenseKeyInstancesNamespace {
  return Object.freeze({
    async get(
      id: Id,
      params: GetLicenseKeyInstanceParams = {},
      options?: RequestOptions,
    ) {
      return (
        await runtime.invoke<
          readonly [Id, GetLicenseKeyInstanceParams],
          LicenseKeyInstanceResponse
        >(getLicenseKeyInstanceOperation, [id, params], options)
      ).body;
    },
    async list(
      params: ListLicenseKeyInstancesParams = {},
      options?: RequestOptions,
    ) {
      return (
        await runtime.invoke<
          readonly [ListLicenseKeyInstancesParams],
          LicenseKeyInstanceListResponse
        >(listLicenseKeyInstancesOperation, [params], options)
      ).body;
    },
  });
}

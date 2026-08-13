import { compilePathId, compileReadQuery } from "../../internal/v5/request";
import type { OperationContract } from "../../internal/v5/types";
import type { Id } from "../../types/jsonapi";
import type {
  GetLicenseKeyInstanceParams,
  LicenseKeyInstanceListResponse,
  LicenseKeyInstanceResponse,
  ListLicenseKeyInstancesParams,
} from "./types";

const evidence = {
  object:
    "https://docs.lemonsqueezy.com/api/license-key-instances/the-license-key-instance-object",
  get: "https://docs.lemonsqueezy.com/api/license-key-instances/retrieve-license-key-instance",
  list: "https://docs.lemonsqueezy.com/api/license-key-instances/list-all-license-key-instances",
} as const;

export const getLicenseKeyInstanceOperation = {
  key: "licenseKeyInstances.get",
  compile: ([id, params]) => ({
    protocol: "jsonapi",
    method: "GET",
    path: `/v1/license-key-instances/${compilePathId("licenseKeyInstanceId", id)}`,
    query: compileReadQuery(params),
  }),
  success: { kind: "jsonapi-single", resourceType: "license-key-instances" },
  evidence: [evidence.get, evidence.object],
  redactErrorDetails: true,
} as const satisfies OperationContract<
  readonly [Id, GetLicenseKeyInstanceParams],
  LicenseKeyInstanceResponse
>;

export const listLicenseKeyInstancesOperation = {
  key: "licenseKeyInstances.list",
  compile: ([params]) => ({
    protocol: "jsonapi",
    method: "GET",
    path: "/v1/license-key-instances",
    query: compileReadQuery(params, {
      licenseKeyId: "filter[license_key_id]",
    }),
  }),
  success: { kind: "jsonapi-list", resourceType: "license-key-instances" },
  evidence: [evidence.list, evidence.object],
  redactErrorDetails: true,
} as const satisfies OperationContract<
  readonly [ListLicenseKeyInstancesParams],
  LicenseKeyInstanceListResponse
>;

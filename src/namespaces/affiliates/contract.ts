import { compilePathId, compileReadQuery } from "../../internal/v5/request";
import type { OperationContract } from "../../internal/v5/types";
import type { Id } from "../../types/jsonapi";
import type {
  AffiliateListResponse,
  AffiliateResponse,
  GetAffiliateParams,
  ListAffiliatesParams,
} from "./types";

const objectEvidence =
  "https://docs.lemonsqueezy.com/api/affiliates/the-affiliate-object";

export const getAffiliateOperation = {
  key: "affiliates.get",
  compile: ([id, params]) => ({
    protocol: "jsonapi",
    method: "GET",
    path: `/v1/affiliates/${compilePathId("affiliateId", id)}`,
    query: compileReadQuery(params),
  }),
  success: { kind: "jsonapi-single", resourceType: "affiliates" },
  evidence: [
    "https://docs.lemonsqueezy.com/api/affiliates/retrieve-affiliate",
    objectEvidence,
  ],
} as const satisfies OperationContract<
  readonly [Id, GetAffiliateParams],
  AffiliateResponse
>;

export const listAffiliatesOperation = {
  key: "affiliates.list",
  compile: ([params]) => ({
    protocol: "jsonapi",
    method: "GET",
    path: "/v1/affiliates",
    query: compileReadQuery(params, {
      storeId: "filter[store_id]",
      userEmail: "filter[user_email]",
    }),
  }),
  success: { kind: "jsonapi-list", resourceType: "affiliates" },
  evidence: [
    "https://docs.lemonsqueezy.com/api/affiliates/list-all-affiliates",
    objectEvidence,
  ],
} as const satisfies OperationContract<
  readonly [ListAffiliatesParams],
  AffiliateListResponse
>;

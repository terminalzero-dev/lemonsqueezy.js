import { compilePathId, compileReadQuery } from "../../internal/v5/request";
import type { OperationContract } from "../../internal/v5/types";
import type { Id } from "../../types/jsonapi";
import type {
  GetPriceParams,
  ListPricesParams,
  PriceListResponse,
  PriceResponse,
} from "./types";

const objectEvidence =
  "https://docs.lemonsqueezy.com/api/prices/the-price-object";

export const getPriceOperation = {
  key: "prices.get",
  compile: ([id, params]) => ({
    protocol: "jsonapi",
    method: "GET",
    path: `/v1/prices/${compilePathId("priceId", id)}`,
    query: compileReadQuery(params),
  }),
  success: { kind: "jsonapi-single", resourceType: "prices" },
  evidence: [
    "https://docs.lemonsqueezy.com/api/prices/retrieve-price",
    objectEvidence,
  ],
} as const satisfies OperationContract<
  readonly [Id, GetPriceParams],
  PriceResponse
>;

export const listPricesOperation = {
  key: "prices.list",
  compile: ([params]) => ({
    protocol: "jsonapi",
    method: "GET",
    path: "/v1/prices",
    query: compileReadQuery(params, { variantId: "filter[variant_id]" }),
  }),
  success: { kind: "jsonapi-list", resourceType: "prices" },
  evidence: [
    "https://docs.lemonsqueezy.com/api/prices/list-all-prices",
    objectEvidence,
  ],
} as const satisfies OperationContract<
  readonly [ListPricesParams],
  PriceListResponse
>;

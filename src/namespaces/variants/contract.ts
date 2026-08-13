import { LemonSqueezyError } from "../../client/error";
import { compilePathId, compileReadQuery } from "../../internal/v5/request";
import type { OperationContract } from "../../internal/v5/types";
import type { Id } from "../../types/jsonapi";
import type {
  GetVariantParams,
  ListVariantsParams,
  VariantListResponse,
  VariantResponse,
} from "./types";
import { knownVariantStatuses } from "./types";

const objectEvidence =
  "https://docs.lemonsqueezy.com/api/variants/the-variant-object";
const knownStatuses = new Set<string>(knownVariantStatuses);

export const getVariantOperation = {
  key: "variants.get",
  compile: ([id, params]) => ({
    protocol: "jsonapi",
    method: "GET",
    path: `/v1/variants/${compilePathId("variantId", id)}`,
    query: compileReadQuery(params),
  }),
  success: { kind: "jsonapi-single", resourceType: "variants" },
  evidence: [
    "https://docs.lemonsqueezy.com/api/variants/retrieve-variant",
    objectEvidence,
  ],
} as const satisfies OperationContract<
  readonly [Id, GetVariantParams],
  VariantResponse
>;

export const listVariantsOperation = {
  key: "variants.list",
  compile: ([params]) => {
    const status = params.filter?.status;
    if (status != null && !knownStatuses.has(status)) {
      throw new LemonSqueezyError(
        "filter.status must be pending, draft, or published.",
        "validation",
      );
    }

    return {
      protocol: "jsonapi",
      method: "GET",
      path: "/v1/variants",
      query: compileReadQuery(params, {
        productId: "filter[product_id]",
        status: "filter[status]",
      }),
    };
  },
  success: { kind: "jsonapi-list", resourceType: "variants" },
  evidence: [
    "https://docs.lemonsqueezy.com/api/variants/list-all-variants",
    objectEvidence,
  ],
} as const satisfies OperationContract<
  readonly [ListVariantsParams],
  VariantListResponse
>;

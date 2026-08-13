import {
  compilePathId,
  compileReadQuery,
  compileResourceId,
} from "../../internal/v5/request";
import { LemonSqueezyError } from "../../client/error";
import type { OperationContract } from "../../internal/v5/types";
import type { Id } from "../../types/jsonapi";
import type {
  CreateUsageRecordInput,
  GetUsageRecordParams,
  ListUsageRecordsParams,
  UsageRecordListResponse,
  UsageRecordResponse,
} from "./types";

const evidence = {
  object:
    "https://docs.lemonsqueezy.com/api/usage-records/the-usage-record-object",
  create: "https://docs.lemonsqueezy.com/api/usage-records/create-usage-record",
  get: "https://docs.lemonsqueezy.com/api/usage-records/retrieve-usage-record",
  list: "https://docs.lemonsqueezy.com/api/usage-records/list-all-usage-records",
} as const;

export const listUsageRecordsOperation = {
  key: "usageRecords.list",
  compile: ([params]) => ({
    protocol: "jsonapi",
    method: "GET",
    path: "/v1/usage-records",
    query: compileReadQuery(params, {
      subscriptionItemId: "filter[subscription_item_id]",
    }),
  }),
  success: { kind: "jsonapi-list", resourceType: "usage-records" },
  evidence: [evidence.list, evidence.object],
} as const satisfies OperationContract<
  readonly [ListUsageRecordsParams],
  UsageRecordListResponse
>;

export const getUsageRecordOperation = {
  key: "usageRecords.get",
  compile: ([id, params]) => ({
    protocol: "jsonapi",
    method: "GET",
    path: `/v1/usage-records/${compilePathId("usageRecordId", id)}`,
    query: compileReadQuery(params),
  }),
  success: { kind: "jsonapi-single", resourceType: "usage-records" },
  evidence: [evidence.get, evidence.object],
} as const satisfies OperationContract<
  readonly [Id, GetUsageRecordParams],
  UsageRecordResponse
>;

export const createUsageRecordOperation = {
  key: "usageRecords.create",
  compile: ([input]) => {
    assertValidCreateInput(input);
    return {
      protocol: "jsonapi",
      method: "POST",
      path: "/v1/usage-records",
      body: {
        data: {
          type: "usage-records",
          attributes: {
            quantity: input.quantity,
            action: input.action ?? "increment",
          },
          relationships: {
            "subscription-item": {
              data: {
                type: "subscription-items",
                id: compileResourceId(
                  "subscriptionItemId",
                  input.subscriptionItemId,
                ),
              },
            },
          },
        },
      },
    };
  },
  success: { kind: "jsonapi-single", resourceType: "usage-records" },
  evidence: [evidence.create, evidence.object],
} as const satisfies OperationContract<
  readonly [CreateUsageRecordInput],
  UsageRecordResponse
>;

function assertValidCreateInput(input: CreateUsageRecordInput): void {
  if (
    typeof input !== "object" ||
    input === null ||
    Array.isArray(input) ||
    !Number.isSafeInteger(input.quantity) ||
    input.quantity <= 0 ||
    (input.action !== undefined &&
      input.action !== "increment" &&
      input.action !== "set")
  ) {
    throw new LemonSqueezyError(
      "input must contain a positive quantity and a documented action.",
      "validation",
    );
  }
}

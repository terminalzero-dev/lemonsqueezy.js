import { describe, expect, it } from "vitest";
import {
  getSubscriptionItemCurrentUsageOperation,
  getSubscriptionItemOperation,
  listSubscriptionItemsOperation,
  updateSubscriptionItemOperation,
} from "../../src/namespaces/subscription-items/contract";
import {
  createUsageRecordOperation,
  getUsageRecordOperation,
  listUsageRecordsOperation,
} from "../../src/namespaces/usage-records/contract";

const operations = [
  getSubscriptionItemOperation,
  listSubscriptionItemsOperation,
  updateSubscriptionItemOperation,
  getSubscriptionItemCurrentUsageOperation,
  createUsageRecordOperation,
  getUsageRecordOperation,
  listUsageRecordsOperation,
] as const;

describe("subscription item and usage record Contract inventory", () => {
  it("contains seven unique reviewed Operation Contracts", () => {
    const keys = operations.map((operation) => operation.key);

    expect(keys).toEqual([
      "subscriptionItems.get",
      "subscriptionItems.list",
      "subscriptionItems.update",
      "subscriptionItems.currentUsage",
      "usageRecords.create",
      "usageRecords.get",
      "usageRecords.list",
    ]);
    expect(new Set(keys).size).toBe(7);
    expect(operations.every((operation) => operation.evidence.length > 0)).toBe(
      true,
    );
    expect(operations.map((operation) => operation.success.kind)).toEqual([
      "jsonapi-single",
      "jsonapi-list",
      "jsonapi-single",
      "meta-only",
      "jsonapi-single",
      "jsonapi-single",
      "jsonapi-list",
    ]);
  });
});

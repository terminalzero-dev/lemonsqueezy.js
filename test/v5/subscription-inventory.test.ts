import { describe, expect, it } from "vitest";
import {
  cancelSubscriptionOperation,
  getSubscriptionOperation,
  listSubscriptionsOperation,
  updateSubscriptionOperation,
} from "../../src/namespaces/subscriptions/contract";

const operations = [
  getSubscriptionOperation,
  listSubscriptionsOperation,
  updateSubscriptionOperation,
  cancelSubscriptionOperation,
] as const;

describe("subscription Contract inventory", () => {
  it("contains four unique reviewed Operation Contracts", () => {
    const keys = operations.map((operation) => operation.key);

    expect(keys).toEqual([
      "subscriptions.get",
      "subscriptions.list",
      "subscriptions.update",
      "subscriptions.cancel",
    ]);
    expect(new Set(keys).size).toBe(4);
    expect(operations.every((operation) => operation.evidence.length > 0)).toBe(
      true,
    );
    expect(operations.map((operation) => operation.success.kind)).toEqual([
      "jsonapi-single",
      "jsonapi-list",
      "jsonapi-single",
      "jsonapi-single",
    ]);
  });
});

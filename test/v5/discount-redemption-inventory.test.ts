import { describe, expect, it } from "vitest";
import {
  createDiscountOperation,
  deleteDiscountOperation,
  getDiscountOperation,
  listDiscountsOperation,
} from "../../src/namespaces/discounts/contract";
import {
  getDiscountRedemptionOperation,
  listDiscountRedemptionsOperation,
} from "../../src/namespaces/discount-redemptions/contract";

const operations = [
  createDiscountOperation,
  getDiscountOperation,
  listDiscountsOperation,
  deleteDiscountOperation,
  getDiscountRedemptionOperation,
  listDiscountRedemptionsOperation,
] as const;

describe("discount and redemption Contract inventory", () => {
  it("contains six unique reviewed Operation Contracts", () => {
    const keys = operations.map((operation) => operation.key);

    expect(keys).toEqual([
      "discounts.create",
      "discounts.get",
      "discounts.list",
      "discounts.delete",
      "discountRedemptions.get",
      "discountRedemptions.list",
    ]);
    expect(new Set(keys).size).toBe(6);
    expect(operations.every((operation) => operation.evidence.length > 0)).toBe(
      true,
    );
    expect(operations.map((operation) => operation.success.kind)).toEqual([
      "jsonapi-single",
      "jsonapi-single",
      "jsonapi-list",
      "empty",
      "jsonapi-single",
      "jsonapi-list",
    ]);
  });
});

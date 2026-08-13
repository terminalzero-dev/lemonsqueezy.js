import { describe, expect, it } from "vitest";
import {
  archiveCustomerOperation,
  createCustomerOperation,
  getCustomerOperation,
  listCustomersOperation,
  updateCustomerOperation,
} from "../../src/namespaces/customers/contract";
import {
  createCheckoutOperation,
  getCheckoutOperation,
  listCheckoutsOperation,
} from "../../src/namespaces/checkouts/contract";

const operations = [
  createCustomerOperation,
  getCustomerOperation,
  updateCustomerOperation,
  listCustomersOperation,
  archiveCustomerOperation,
  createCheckoutOperation,
  getCheckoutOperation,
  listCheckoutsOperation,
] as const;

describe("customer and checkout Contract inventory", () => {
  it("contains eight unique reviewed Operation Contracts", () => {
    const keys = operations.map((operation) => operation.key);

    expect(keys).toEqual([
      "customers.create",
      "customers.get",
      "customers.update",
      "customers.list",
      "customers.archive",
      "checkouts.create",
      "checkouts.get",
      "checkouts.list",
    ]);
    expect(new Set(keys).size).toBe(8);
    expect(
      operations.every((operation) => operation.evidence.length >= 2),
    ).toBe(true);
    expect(operations.map((operation) => operation.success.kind)).toEqual([
      "jsonapi-single",
      "jsonapi-single",
      "jsonapi-single",
      "jsonapi-list",
      "jsonapi-single",
      "jsonapi-single",
      "jsonapi-single",
      "jsonapi-list",
    ]);
  });
});

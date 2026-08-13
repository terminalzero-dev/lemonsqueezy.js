import { describe, expect, it } from "vitest";
import {
  generateOrderInvoiceOperation,
  getOrderOperation,
  listOrdersOperation,
  refundOrderOperation,
} from "../../src/namespaces/orders/contract";
import {
  getOrderItemOperation,
  listOrderItemsOperation,
} from "../../src/namespaces/order-items/contract";

const operations = [
  getOrderOperation,
  listOrdersOperation,
  generateOrderInvoiceOperation,
  refundOrderOperation,
  getOrderItemOperation,
  listOrderItemsOperation,
] as const;

describe("order Contract inventory", () => {
  it("contains six unique reviewed Operation Contracts", () => {
    const keys = operations.map((operation) => operation.key);

    expect(keys).toEqual([
      "orders.get",
      "orders.list",
      "orders.generateInvoice",
      "orders.refund",
      "orderItems.get",
      "orderItems.list",
    ]);
    expect(new Set(keys).size).toBe(6);
    expect(operations.every((operation) => operation.evidence.length > 0)).toBe(
      true,
    );
    expect(operations.map((operation) => operation.success.kind)).toEqual([
      "jsonapi-single",
      "jsonapi-list",
      "invoice",
      "jsonapi-single",
      "jsonapi-single",
      "jsonapi-list",
    ]);
  });
});

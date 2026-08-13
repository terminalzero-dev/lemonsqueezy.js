import { describe, expect, it } from "vitest";
import {
  generateSubscriptionInvoiceOperation,
  getSubscriptionInvoiceOperation,
  listSubscriptionInvoicesOperation,
  refundSubscriptionInvoiceOperation,
} from "../../src/namespaces/subscription-invoices/contract";

const operations = [
  getSubscriptionInvoiceOperation,
  listSubscriptionInvoicesOperation,
  generateSubscriptionInvoiceOperation,
  refundSubscriptionInvoiceOperation,
] as const;

describe("Subscription Invoice Contract inventory", () => {
  it("contains four unique reviewed Operation Contracts", () => {
    const keys = operations.map((operation) => operation.key);

    expect(keys).toEqual([
      "subscriptionInvoices.get",
      "subscriptionInvoices.list",
      "subscriptionInvoices.generateInvoice",
      "subscriptionInvoices.refund",
    ]);
    expect(new Set(keys).size).toBe(4);
    expect(operations.every((operation) => operation.evidence.length > 0)).toBe(
      true,
    );
    expect(operations.map((operation) => operation.success.kind)).toEqual([
      "jsonapi-single",
      "jsonapi-list",
      "invoice",
      "jsonapi-single",
    ]);
  });
});

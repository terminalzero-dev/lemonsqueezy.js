import { describe, expect, it } from "vitest";
import {
  createWebhookOperation,
  deleteWebhookOperation,
  getWebhookOperation,
  listWebhooksOperation,
  updateWebhookOperation,
} from "../../src/namespaces/webhooks/contract";

const operations = [
  createWebhookOperation,
  getWebhookOperation,
  updateWebhookOperation,
  deleteWebhookOperation,
  listWebhooksOperation,
] as const;

describe("Webhook Management Contract inventory", () => {
  it("contains five unique reviewed Operation Contracts", () => {
    const keys = operations.map((operation) => operation.key);

    expect(keys).toEqual([
      "webhooks.create",
      "webhooks.get",
      "webhooks.update",
      "webhooks.delete",
      "webhooks.list",
    ]);
    expect(new Set(keys).size).toBe(5);
    expect(operations.every((operation) => operation.evidence.length > 0)).toBe(
      true,
    );
    expect(operations.map((operation) => operation.success.kind)).toEqual([
      "jsonapi-single",
      "jsonapi-single",
      "jsonapi-single",
      "empty",
      "jsonapi-list",
    ]);
  });
});

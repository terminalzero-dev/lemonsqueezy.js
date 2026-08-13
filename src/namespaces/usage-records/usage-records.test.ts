import { describe, expect, it } from "vitest";
import { createClientWithAdapter } from "../../internal/testing";

const usageRecordResponse = {
  jsonapi: { version: "1.0" },
  links: { self: "https://api.lemonsqueezy.com/v1/usage-records/51" },
  data: {
    type: "usage-records",
    id: "51",
    attributes: {
      subscription_item_id: 42,
      quantity: 5,
      action: "set",
      created_at: "2026-08-01T00:00:00.000000Z",
      updated_at: "2026-08-01T00:00:00.000000Z",
      future_field: "preserved",
    },
    relationships: {},
    links: { self: "https://api.lemonsqueezy.com/v1/usage-records/51" },
  },
} as const;

const usageRecordListResponse = {
  jsonapi: { version: "1.0" },
  links: {
    first: "https://api.lemonsqueezy.com/v1/usage-records?page[number]=1",
    last: "https://api.lemonsqueezy.com/v1/usage-records?page[number]=1",
  },
  meta: {
    page: {
      current_page: 1,
      from: 1,
      last_page: 1,
      per_page: 10,
      to: 1,
      total: 1,
    },
  },
  data: [usageRecordResponse.data],
} as const;

describe("usageRecords namespace", () => {
  it("retrieves a wire-native usage record", async () => {
    const requests: Request[] = [];
    const client = createClientWithAdapter(
      { apiKey: "usage-records-key" },
      async (request) => {
        requests.push(request);
        return Response.json(usageRecordResponse);
      },
    );

    await expect(
      client.usageRecords.get("record/51", {
        include: ["subscription-item"],
      }),
    ).resolves.toEqual(usageRecordResponse);

    expect(requests).toHaveLength(1);
    expect(requests[0]?.method).toBe("GET");
    expect(requests[0]?.url).toBe(
      "https://api.lemonsqueezy.com/v1/usage-records/record%2F51?include=subscription-item",
    );
  });

  it("creates a usage record with exact attributes and relationship", async () => {
    const requests: Request[] = [];
    const client = createClientWithAdapter(
      { apiKey: "usage-records-key" },
      async (request) => {
        requests.push(request);
        return Response.json(usageRecordResponse);
      },
    );

    await expect(
      client.usageRecords.create({
        subscriptionItemId: "item/42",
        quantity: 5,
        action: "set",
      }),
    ).resolves.toEqual(usageRecordResponse);

    expect(requests).toHaveLength(1);
    expect(requests[0]?.method).toBe("POST");
    expect(requests[0]?.url).toBe(
      "https://api.lemonsqueezy.com/v1/usage-records",
    );
    await expect(requests[0]?.json()).resolves.toEqual({
      data: {
        type: "usage-records",
        attributes: { quantity: 5, action: "set" },
        relationships: {
          "subscription-item": {
            data: { type: "subscription-items", id: "item/42" },
          },
        },
      },
    });
  });

  it("defaults an omitted action to increment", async () => {
    const requests: Request[] = [];
    const client = createClientWithAdapter(
      { apiKey: "usage-records-key" },
      async (request) => {
        requests.push(request);
        return Response.json(usageRecordResponse);
      },
    );

    await client.usageRecords.create({
      subscriptionItemId: 42,
      quantity: 5,
    });

    await expect(requests[0]?.json()).resolves.toMatchObject({
      data: { attributes: { quantity: 5, action: "increment" } },
    });
  });

  it("lists usage records for a subscription item", async () => {
    const requests: Request[] = [];
    const client = createClientWithAdapter(
      { apiKey: "usage-records-key" },
      async (request) => {
        requests.push(request);
        return Response.json(usageRecordListResponse);
      },
    );

    await expect(
      client.usageRecords.list({
        filter: { subscriptionItemId: 42 },
        include: ["subscription-item"],
        page: { number: 0, size: 10 },
      }),
    ).resolves.toEqual(usageRecordListResponse);

    const url = new URL(requests[0]!.url);
    expect(url.pathname).toBe("/v1/usage-records");
    expect(url.searchParams.get("filter[subscription_item_id]")).toBe("42");
    expect(url.searchParams.get("include")).toBe("subscription-item");
    expect(url.searchParams.get("page[number]")).toBe("0");
    expect(url.searchParams.get("page[size]")).toBe("10");
  });

  it("rejects invalid input before transport", async () => {
    let attempts = 0;
    const client = createClientWithAdapter(
      { apiKey: "usage-records-key" },
      async () => {
        attempts += 1;
        return Response.json(usageRecordResponse);
      },
    );

    await expect(client.usageRecords.get("")).rejects.toMatchObject({
      code: "validation",
    });
    await expect(client.usageRecords.create(5 as never)).rejects.toMatchObject({
      code: "validation",
    });
    await expect(
      client.usageRecords.create({ subscriptionItemId: 42, quantity: 0 }),
    ).rejects.toMatchObject({ code: "validation" });
    await expect(
      client.usageRecords.create({
        subscriptionItemId: 42,
        quantity: 5,
        action: "replace" as "set",
      }),
    ).rejects.toMatchObject({ code: "validation" });
    await expect(
      client.usageRecords.create({ subscriptionItemId: "", quantity: 5 }),
    ).rejects.toMatchObject({ code: "validation" });
    await expect(
      client.usageRecords.list({}, { timeoutMs: 0 }),
    ).rejects.toMatchObject({ code: "validation" });

    expect(attempts).toBe(0);
  });
});

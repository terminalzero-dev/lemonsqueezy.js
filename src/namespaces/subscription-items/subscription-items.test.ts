import { describe, expect, it } from "vitest";
import { createClientWithAdapter } from "../../internal/testing";

const currentUsageResponse = {
  jsonapi: { version: "1.0" },
  meta: {
    period_start: "2026-08-01T00:00:00.000000Z",
    period_end: "2026-09-01T00:00:00.000000Z",
    quantity: 12,
    interval_unit: "month",
    interval_quantity: 1,
  },
} as const;

const subscriptionItemResponse = {
  jsonapi: { version: "1.0" },
  links: { self: "https://api.lemonsqueezy.com/v1/subscription-items/42" },
  data: {
    type: "subscription-items",
    id: "42",
    attributes: {
      subscription_id: 7,
      price_id: 9,
      quantity: 0,
      is_usage_based: true,
      created_at: "2026-08-01T00:00:00.000000Z",
      updated_at: "2026-08-02T00:00:00.000000Z",
      future_field: { preserved: true },
    },
    relationships: {},
    links: { self: "https://api.lemonsqueezy.com/v1/subscription-items/42" },
  },
} as const;

const subscriptionItemListResponse = {
  jsonapi: { version: "1.0" },
  links: {
    first: "https://api.lemonsqueezy.com/v1/subscription-items?page[number]=1",
    last: "https://api.lemonsqueezy.com/v1/subscription-items?page[number]=1",
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
  data: [subscriptionItemResponse.data],
} as const;

describe("subscriptionItems namespace", () => {
  it("retrieves a wire-native subscription item", async () => {
    const requests: Request[] = [];
    const client = createClientWithAdapter(
      { apiKey: "subscription-items-key" },
      async (request) => {
        requests.push(request);
        return Response.json(subscriptionItemResponse);
      },
    );

    await expect(
      client.subscriptionItems.get("item/42", {
        include: ["subscription", "price", "usage-records"],
      }),
    ).resolves.toEqual(subscriptionItemResponse);

    expect(requests).toHaveLength(1);
    expect(requests[0]?.method).toBe("GET");
    expect(requests[0]?.url).toBe(
      "https://api.lemonsqueezy.com/v1/subscription-items/item%2F42?include=subscription%2Cprice%2Cusage-records",
    );
  });

  it("retrieves a meta-only current usage response", async () => {
    const requests: Request[] = [];
    const client = createClientWithAdapter(
      { apiKey: "subscription-items-key" },
      async (request) => {
        requests.push(request);
        return Response.json(currentUsageResponse);
      },
    );

    await expect(
      client.subscriptionItems.currentUsage("item/42", { timeoutMs: 1_000 }),
    ).resolves.toEqual(currentUsageResponse);

    expect(requests).toHaveLength(1);
    expect(requests[0]?.method).toBe("GET");
    expect(requests[0]?.url).toBe(
      "https://api.lemonsqueezy.com/v1/subscription-items/item%2F42/current-usage",
    );
  });

  it("rejects a current usage response without top-level meta", async () => {
    const client = createClientWithAdapter(
      { apiKey: "subscription-items-key" },
      async () => Response.json(subscriptionItemResponse),
    );

    await expect(
      client.subscriptionItems.currentUsage(42),
    ).rejects.toMatchObject({ code: "invalid_response", statusCode: 200 });
  });

  it("lists subscription items with documented filters", async () => {
    const requests: Request[] = [];
    const client = createClientWithAdapter(
      { apiKey: "subscription-items-key" },
      async (request) => {
        requests.push(request);
        return Response.json(subscriptionItemListResponse);
      },
    );

    await expect(
      client.subscriptionItems.list({
        filter: { subscriptionId: 7, priceId: 9 },
        include: ["subscription"],
        page: { number: 0, size: 10 },
      }),
    ).resolves.toEqual(subscriptionItemListResponse);

    const url = new URL(requests[0]!.url);
    expect(url.pathname).toBe("/v1/subscription-items");
    expect(url.searchParams.get("filter[subscription_id]")).toBe("7");
    expect(url.searchParams.get("filter[price_id]")).toBe("9");
    expect(url.searchParams.get("include")).toBe("subscription");
    expect(url.searchParams.get("page[number]")).toBe("0");
    expect(url.searchParams.get("page[size]")).toBe("10");
  });

  it("updates only explicit fields while preserving false values", async () => {
    const requests: Request[] = [];
    const client = createClientWithAdapter(
      { apiKey: "subscription-items-key" },
      async (request) => {
        requests.push(request);
        return Response.json(subscriptionItemResponse);
      },
    );

    await client.subscriptionItems.update(42, { quantity: 3 });
    await client.subscriptionItems.update(42, {
      quantity: 4,
      invoiceImmediately: false,
      disableProrations: false,
    });

    expect(requests).toHaveLength(2);
    expect(requests[0]?.method).toBe("PATCH");
    await expect(requests[0]?.json()).resolves.toEqual({
      data: {
        type: "subscription-items",
        id: "42",
        attributes: { quantity: 3 },
      },
    });
    await expect(requests[1]?.json()).resolves.toEqual({
      data: {
        type: "subscription-items",
        id: "42",
        attributes: {
          quantity: 4,
          invoice_immediately: false,
          disable_prorations: false,
        },
      },
    });
  });

  it("rejects invalid input before transport", async () => {
    let attempts = 0;
    const client = createClientWithAdapter(
      { apiKey: "subscription-items-key" },
      async () => {
        attempts += 1;
        return Response.json(subscriptionItemResponse);
      },
    );

    await expect(client.subscriptionItems.get("")).rejects.toMatchObject({
      code: "validation",
    });
    await expect(
      client.subscriptionItems.update(42, 3 as never),
    ).rejects.toMatchObject({ code: "validation" });
    await expect(
      client.subscriptionItems.update(42, { quantity: 0 }),
    ).rejects.toMatchObject({ code: "validation" });
    await expect(
      client.subscriptionItems.currentUsage(42, { timeoutMs: 0 }),
    ).rejects.toMatchObject({ code: "validation" });

    expect(attempts).toBe(0);
  });
});

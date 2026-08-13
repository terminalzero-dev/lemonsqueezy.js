import { describe, expect, it } from "vitest";
import { createClientWithAdapter } from "../../internal/testing";

const discountRedemptionResponse = {
  jsonapi: { version: "1.0" },
  links: {
    self: "https://api.lemonsqueezy.com/v1/discount-redemptions/51",
  },
  data: {
    type: "discount-redemptions",
    id: "51",
    attributes: {
      discount_id: 42,
      order_id: 99,
      discount_name: "Ten percent off",
      discount_code: "TENOFF",
      discount_amount: 10,
      discount_amount_type: "percent",
      amount: 999,
      created_at: "2026-08-01T00:00:00.000000Z",
      updated_at: "2026-08-02T00:00:00.000000Z",
      future_field: "preserved",
    },
    relationships: {},
    links: {
      self: "https://api.lemonsqueezy.com/v1/discount-redemptions/51",
    },
  },
} as const;

const discountRedemptionListResponse = {
  jsonapi: { version: "1.0" },
  links: {
    first:
      "https://api.lemonsqueezy.com/v1/discount-redemptions?page[number]=1",
    last: "https://api.lemonsqueezy.com/v1/discount-redemptions?page[number]=1",
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
  data: [discountRedemptionResponse.data],
} as const;

describe("discountRedemptions namespace", () => {
  it("retrieves a wire-native discount redemption", async () => {
    const requests: Request[] = [];
    const client = createClientWithAdapter(
      { apiKey: "discount-redemptions-key" },
      async (request) => {
        requests.push(request);
        return Response.json(discountRedemptionResponse);
      },
    );

    await expect(
      client.discountRedemptions.get("redemption/51", {
        include: ["discount", "order"],
      }),
    ).resolves.toEqual(discountRedemptionResponse);

    expect(requests).toHaveLength(1);
    expect(requests[0]?.method).toBe("GET");
    expect(requests[0]?.url).toBe(
      "https://api.lemonsqueezy.com/v1/discount-redemptions/redemption%2F51?include=discount%2Corder",
    );
  });

  it("lists discount redemptions with documented filters", async () => {
    const requests: Request[] = [];
    const client = createClientWithAdapter(
      { apiKey: "discount-redemptions-key" },
      async (request) => {
        requests.push(request);
        return Response.json(discountRedemptionListResponse);
      },
    );

    await expect(
      client.discountRedemptions.list({
        filter: { discountId: 42, orderId: "order/99" },
        include: ["order"],
        page: { number: 0, size: 10 },
      }),
    ).resolves.toEqual(discountRedemptionListResponse);

    const url = new URL(requests[0]!.url);
    expect(url.pathname).toBe("/v1/discount-redemptions");
    expect(url.searchParams.get("filter[discount_id]")).toBe("42");
    expect(url.searchParams.get("filter[order_id]")).toBe("order/99");
    expect(url.searchParams.get("include")).toBe("order");
    expect(url.searchParams.get("page[number]")).toBe("0");
    expect(url.searchParams.get("page[size]")).toBe("10");
  });
});

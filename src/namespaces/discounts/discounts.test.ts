import { describe, expect, it, vi } from "vitest";
import { createClientWithAdapter } from "../../internal/testing";

const discountResponse = {
  jsonapi: { version: "1.0" },
  links: { self: "https://api.lemonsqueezy.com/v1/discounts/42" },
  data: {
    type: "discounts",
    id: "42",
    attributes: {
      store_id: 1,
      name: "Ten percent off",
      code: "TENOFF",
      amount: 10,
      amount_type: "percent",
      is_limited_to_products: false,
      is_limited_redemptions: false,
      max_redemptions: 0,
      starts_at: null,
      expires_at: null,
      duration: "once",
      duration_in_months: 1,
      status: "published",
      status_formatted: "Published",
      created_at: "2026-08-01T00:00:00.000000Z",
      updated_at: "2026-08-02T00:00:00.000000Z",
      test_mode: true,
      future_field: { preserved: true },
    },
    relationships: {},
    links: { self: "https://api.lemonsqueezy.com/v1/discounts/42" },
  },
} as const;

const discountListResponse = {
  jsonapi: { version: "1.0" },
  links: {
    first: "https://api.lemonsqueezy.com/v1/discounts?page[number]=1",
    last: "https://api.lemonsqueezy.com/v1/discounts?page[number]=1",
  },
  meta: {
    page: {
      currentPage: 1,
      from: 1,
      lastPage: 1,
      perPage: 10,
      to: 1,
      total: 1,
    },
  },
  data: [discountResponse.data],
} as const;

describe("discounts namespace", () => {
  it("retrieves a wire-native discount", async () => {
    const requests: Request[] = [];
    const client = createClientWithAdapter(
      { apiKey: "discounts-key" },
      async (request) => {
        requests.push(request);
        return Response.json(discountResponse);
      },
    );

    await expect(
      client.discounts.get("discount/42", {
        include: ["store", "variants", "discount-redemptions"],
      }),
    ).resolves.toEqual(discountResponse);

    expect(requests).toHaveLength(1);
    expect(requests[0]?.method).toBe("GET");
    expect(requests[0]?.url).toBe(
      "https://api.lemonsqueezy.com/v1/discounts/discount%2F42?include=store%2Cvariants%2Cdiscount-redemptions",
    );
  });

  it("lists discounts for a store", async () => {
    const requests: Request[] = [];
    const client = createClientWithAdapter(
      { apiKey: "discounts-key" },
      async (request) => {
        requests.push(request);
        return Response.json(discountListResponse);
      },
    );

    await expect(
      client.discounts.list({
        filter: { storeId: 1 },
        include: ["store"],
        page: { number: 0, size: 10 },
      }),
    ).resolves.toEqual(discountListResponse);

    const url = new URL(requests[0]!.url);
    expect(url.pathname).toBe("/v1/discounts");
    expect(url.searchParams.get("filter[store_id]")).toBe("1");
    expect(url.searchParams.get("include")).toBe("store");
    expect(url.searchParams.get("page[number]")).toBe("0");
    expect(url.searchParams.get("page[size]")).toBe("10");
  });

  it("creates a discount with exact attributes and relationships", async () => {
    const requests: Request[] = [];
    const client = createClientWithAdapter(
      { apiKey: "discounts-key" },
      async (request) => {
        requests.push(request);
        return Response.json(discountResponse);
      },
    );

    await expect(
      client.discounts.create({
        storeId: "store/1",
        name: "Ten percent off",
        code: "TENOFF",
        amount: 10,
        amountType: "percent",
        isLimitedToProducts: true,
        variantIds: [3, "variant/4"],
        isLimitedRedemptions: true,
        maxRedemptions: 50,
        startsAt: null,
        expiresAt: "2026-12-31T23:59:59Z",
        duration: "repeating",
        durationInMonths: 3,
        testMode: true,
      }),
    ).resolves.toEqual(discountResponse);

    expect(requests).toHaveLength(1);
    expect(requests[0]?.method).toBe("POST");
    expect(requests[0]?.url).toBe("https://api.lemonsqueezy.com/v1/discounts");
    await expect(requests[0]?.json()).resolves.toEqual({
      data: {
        type: "discounts",
        attributes: {
          name: "Ten percent off",
          code: "TENOFF",
          amount: 10,
          amount_type: "percent",
          is_limited_to_products: true,
          is_limited_redemptions: true,
          max_redemptions: 50,
          starts_at: null,
          expires_at: "2026-12-31T23:59:59Z",
          duration: "repeating",
          duration_in_months: 3,
          test_mode: true,
        },
        relationships: {
          store: { data: { type: "stores", id: "store/1" } },
          variants: {
            data: [
              { type: "variants", id: "3" },
              { type: "variants", id: "variant/4" },
            ],
          },
        },
      },
    });
  });

  it.each([204, 205])(
    "deletes a discount on empty %s success without reading the body",
    async (status) => {
      const requests: Request[] = [];
      const response = new Response(null, { status });
      const text = vi.spyOn(response, "text");
      const client = createClientWithAdapter(
        { apiKey: "discounts-key" },
        async (request) => {
          requests.push(request);
          return response;
        },
      );

      await expect(client.discounts.delete("discount/42")).resolves.toBe(
        undefined,
      );

      expect(requests).toHaveLength(1);
      expect(requests[0]?.method).toBe("DELETE");
      expect(requests[0]?.url).toBe(
        "https://api.lemonsqueezy.com/v1/discounts/discount%2F42",
      );
      expect(text).not.toHaveBeenCalled();
    },
  );

  it("rejects invalid input before transport", async () => {
    let attempts = 0;
    const client = createClientWithAdapter(
      { apiKey: "discounts-key" },
      async () => {
        attempts += 1;
        return Response.json(discountResponse);
      },
    );

    await expect(client.discounts.get("")).rejects.toMatchObject({
      code: "validation",
    });
    await expect(
      client.discounts.create({
        storeId: 1,
        name: "Ten percent off",
        code: "invalid-code",
        amount: 10,
        amountType: "percent",
      }),
    ).rejects.toMatchObject({ code: "validation" });
    await expect(
      client.discounts.create({
        storeId: 1,
        name: "Ten percent off",
        amount: 10,
        amountType: "percent",
        isLimitedToProducts: false,
        variantIds: [2],
      } as never),
    ).rejects.toMatchObject({ code: "validation" });
    await expect(
      client.discounts.create({
        storeId: 1,
        name: "Ten percent off",
        amount: 10,
        amountType: "percent",
        isLimitedToProducts: true,
        variantIds: [],
      }),
    ).rejects.toMatchObject({ code: "validation" });
    await expect(
      client.discounts.list({}, { timeoutMs: 0 }),
    ).rejects.toMatchObject({ code: "validation" });

    expect(attempts).toBe(0);
  });

  it("preserves configuration, HTTP, and invalid-response errors", async () => {
    let attempts = 0;
    const unconfigured = createClientWithAdapter({}, async () => {
      attempts += 1;
      return Response.json(discountResponse);
    });
    await expect(unconfigured.discounts.get(42)).rejects.toMatchObject({
      code: "configuration",
    });
    expect(attempts).toBe(0);

    const httpFailure = createClientWithAdapter(
      { apiKey: "discounts-key" },
      async () =>
        Response.json(
          { errors: [{ title: "Unprocessable Entity" }] },
          { status: 422 },
        ),
    );
    await expect(
      httpFailure.discounts.create({} as never),
    ).rejects.toMatchObject({ code: "validation" });
    await expect(httpFailure.discounts.get(42)).rejects.toMatchObject({
      code: "http",
      statusCode: 422,
    });

    const invalidResponse = createClientWithAdapter(
      { apiKey: "discounts-key" },
      async () => Response.json({ data: { type: "orders", id: "42" } }),
    );
    await expect(invalidResponse.discounts.get(42)).rejects.toMatchObject({
      code: "invalid_response",
      statusCode: 200,
    });
  });
});

import { describe, expect, it } from "vitest";
import { createClientWithAdapter } from "../../internal/testing";

const checkoutResponse = {
  jsonapi: { version: "1.0" },
  links: { self: "https://api.lemonsqueezy.com/v1/checkouts/checkout-1" },
  data: {
    type: "checkouts",
    id: "checkout-1",
    attributes: {
      store_id: 1,
      variant_id: 2,
      custom_price: null,
      product_options: {},
      checkout_options: {},
      checkout_data: {},
      expires_at: null,
      created_at: "2026-08-13T00:00:00Z",
      updated_at: "2026-08-13T00:00:00Z",
      test_mode: true,
      url: "https://example.lemonsqueezy.com/checkout/buy/checkout-1",
      future_field: "preserved",
    },
    relationships: {},
    links: {
      self: "https://api.lemonsqueezy.com/v1/checkouts/checkout-1",
    },
  },
} as const;

const checkoutListResponse = {
  jsonapi: { version: "1.0" },
  links: {
    first: "https://api.lemonsqueezy.com/v1/checkouts",
    last: "https://api.lemonsqueezy.com/v1/checkouts",
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
  data: [checkoutResponse.data],
} as const;

describe("checkouts namespace", () => {
  it("creates a checkout while preserving opaque custom data", async () => {
    const requests: Request[] = [];
    const client = createClientWithAdapter(
      { apiKey: "commerce-key" },
      async (request) => {
        requests.push(request);
        return Response.json(checkoutResponse);
      },
    );
    const custom = {
      userId: 123,
      snake_case: "kept",
      nestedValue: { camelCase: "kept", zero: 0, disabled: false },
    };

    await expect(
      client.checkouts.create({
        storeId: 1,
        variantId: 2,
        productOptions: { redirectUrl: "", enabledVariants: [] },
        checkoutOptions: { embed: false, locale: null },
        checkoutData: {
          email: "",
          billingAddress: { country: "US", zip: "" },
          custom,
          variantQuantities: [{ variantId: 2, quantity: 1 }],
        },
        expiresAt: null,
        preview: false,
        testMode: false,
      }),
    ).resolves.toEqual(checkoutResponse);

    await expect(requests[0]?.json()).resolves.toEqual({
      data: {
        type: "checkouts",
        attributes: {
          product_options: { redirect_url: "", enabled_variants: [] },
          checkout_options: { embed: false, locale: null },
          checkout_data: {
            email: "",
            billing_address: { country: "US", zip: "" },
            custom,
            variant_quantities: [{ variant_id: 2, quantity: 1 }],
          },
          expires_at: null,
          preview: false,
          test_mode: false,
        },
        relationships: {
          store: { data: { type: "stores", id: "1" } },
          variant: { data: { type: "variants", id: "2" } },
        },
      },
    });
  });

  it("retrieves a checkout through its public namespace", async () => {
    const requests: Request[] = [];
    const client = createClientWithAdapter(
      { apiKey: "commerce-key" },
      async (request) => {
        requests.push(request);
        return Response.json(checkoutResponse);
      },
    );

    await client.checkouts.get("checkout/1", { include: ["variant"] });

    expect(requests[0]?.url).toBe(
      "https://api.lemonsqueezy.com/v1/checkouts/checkout%2F1?include=variant",
    );
  });

  it("lists checkouts with reviewed store and variant filters", async () => {
    const requests: Request[] = [];
    const client = createClientWithAdapter(
      { apiKey: "commerce-key" },
      async (request) => {
        requests.push(request);
        return Response.json(checkoutListResponse);
      },
    );

    await client.checkouts.list({
      filter: { storeId: 1, variantId: 2 },
      include: ["store"],
      page: { number: 1, size: 10 },
    });

    const url = new URL(requests[0]!.url);
    expect(url.searchParams.get("filter[store_id]")).toBe("1");
    expect(url.searchParams.get("filter[variant_id]")).toBe("2");
    expect(url.searchParams.get("include")).toBe("store");
  });

  it("rejects invalid checkout inputs before transport", async () => {
    let attempts = 0;
    const client = createClientWithAdapter(
      { apiKey: "commerce-key" },
      async () => {
        attempts += 1;
        return Response.json(checkoutResponse);
      },
    );

    const invalidCalls = [
      () => client.checkouts.get(""),
      () =>
        client.checkouts.create({ storeId: 1, variantId: 2, customPrice: 0 }),
      () =>
        client.checkouts.create({
          storeId: 1,
          variantId: 2,
          checkoutData: {
            variantQuantities: [{ variantId: 2, quantity: 0 }],
          },
        }),
      () =>
        client.checkouts.create({
          storeId: 1,
          variantId: 2,
          checkoutOptions: { locale: "xx" as "en" },
        }),
      () => client.checkouts.list({}, { timeoutMs: 0 }),
    ];

    for (const call of invalidCalls) {
      await expect(call()).rejects.toMatchObject({ code: "validation" });
    }
    expect(attempts).toBe(0);
  });
});

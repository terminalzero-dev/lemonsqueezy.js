import { describe, expect, it } from "vitest";
import { createClientWithAdapter } from "../../src/internal/testing";

const storeResponse = {
  jsonapi: { version: "1.0" },
  links: { self: "https://api.lemonsqueezy.com/v1/stores/store%2F1" },
  data: {
    type: "stores",
    id: "store/1",
    attributes: {
      name: "Example Store",
      future_field: "preserved",
    },
    relationships: {},
    links: { self: "https://api.lemonsqueezy.com/v1/stores/store%2F1" },
  },
} as const;

const storeListResponse = {
  jsonapi: { version: "1.0" },
  links: {
    first: "https://api.lemonsqueezy.com/v1/stores?page%5Bnumber%5D=2",
    last: "https://api.lemonsqueezy.com/v1/stores?page%5Bnumber%5D=2",
  },
  meta: {
    page: {
      currentPage: 2,
      from: 2,
      lastPage: 2,
      perPage: 1,
      to: 2,
      total: 2,
    },
  },
  data: [storeResponse.data],
} as const;

const productResponse = {
  jsonapi: { version: "1.0" },
  links: { self: "https://api.lemonsqueezy.com/v1/products/2" },
  data: {
    type: "products",
    id: "2",
    attributes: { name: "Product", status: "future_status" },
    relationships: {},
    links: { self: "https://api.lemonsqueezy.com/v1/products/2" },
  },
} as const;

const productListResponse = {
  jsonapi: { version: "1.0" },
  links: {
    first: "https://example.com/first",
    last: "https://example.com/last",
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
  data: [productResponse.data],
} as const;

const variantResponse = {
  jsonapi: { version: "1.0" },
  links: { self: "https://api.lemonsqueezy.com/v1/variants/3" },
  data: {
    type: "variants",
    id: "3",
    attributes: { name: "Variant", status: "future_status" },
    relationships: {},
    links: { self: "https://api.lemonsqueezy.com/v1/variants/3" },
  },
} as const;

const variantListResponse = {
  ...productListResponse,
  data: [variantResponse.data],
} as const;

const priceResponse = {
  jsonapi: { version: "1.0" },
  links: { self: "https://api.lemonsqueezy.com/v1/prices/5" },
  data: {
    type: "prices",
    id: "5",
    attributes: { category: "future_category", unit_price: null },
    relationships: {},
    links: { self: "https://api.lemonsqueezy.com/v1/prices/5" },
  },
} as const;

const priceListResponse = {
  ...productListResponse,
  data: [priceResponse.data],
} as const;

const fileResponse = {
  jsonapi: { version: "1.0" },
  links: { self: "https://api.lemonsqueezy.com/v1/files/7" },
  data: {
    type: "files",
    id: "7",
    attributes: {
      name: "guide.pdf",
      created_at: "2026-08-13T00:00:00Z",
      updated_at: "2026-08-13T00:00:00Z",
    },
    relationships: {},
    links: { self: "https://api.lemonsqueezy.com/v1/files/7" },
  },
} as const;

const fileListResponse = {
  ...productListResponse,
  data: [fileResponse.data],
} as const;

const affiliateResponse = {
  jsonapi: { version: "1.0" },
  links: { self: "https://api.lemonsqueezy.com/v1/affiliates/9" },
  data: {
    type: "affiliates",
    id: "9",
    attributes: {
      status: "future_status",
      products: [{ product_id: 10, enabled: true }],
      future_field: "preserved",
    },
    relationships: {},
    links: { self: "https://api.lemonsqueezy.com/v1/affiliates/9" },
  },
} as const;

const affiliateListResponse = {
  ...productListResponse,
  data: [affiliateResponse.data],
} as const;

describe("read-only catalog namespaces", () => {
  it("retrieves a store through its public namespace", async () => {
    const requests: Request[] = [];
    const client = createClientWithAdapter(
      { apiKey: "catalog-key" },
      async (request) => {
        requests.push(request);
        return Response.json(storeResponse);
      },
    );

    await expect(
      client.stores.get("store/1", { include: ["products"] }),
    ).resolves.toEqual(storeResponse);

    expect(Object.isFrozen(client.stores)).toBe(true);
    expect(requests).toHaveLength(1);
    expect(requests[0]?.url).toBe(
      "https://api.lemonsqueezy.com/v1/stores/store%2F1?include=products",
    );
    expect(requests[0]?.method).toBe("GET");
  });

  it("lists stores without emitting an empty include", async () => {
    const requests: Request[] = [];
    const client = createClientWithAdapter(
      { apiKey: "catalog-key" },
      async (request) => {
        requests.push(request);
        return Response.json(storeListResponse);
      },
    );

    await expect(
      client.stores.list({ include: [], page: { number: 2, size: 1 } }),
    ).resolves.toEqual(storeListResponse);

    expect(requests).toHaveLength(1);
    const url = new URL(requests[0]!.url);
    expect(url.pathname).toBe("/v1/stores");
    expect(url.searchParams.get("page[number]")).toBe("2");
    expect(url.searchParams.get("page[size]")).toBe("1");
    expect(url.searchParams.has("include")).toBe(false);
  });

  it("retrieves and lists products with explicit query mappings", async () => {
    const requests: Request[] = [];
    const responses = [productResponse, productListResponse];
    const client = createClientWithAdapter(
      { apiKey: "catalog-key" },
      async (request) => {
        requests.push(request);
        return Response.json(responses[requests.length - 1]);
      },
    );

    await expect(
      client.products.get(2, { include: ["variants"] }),
    ).resolves.toEqual(productResponse);
    await expect(
      client.products.list({
        filter: { storeId: 0 },
        include: ["store"],
        page: { number: 0, size: 25 },
      }),
    ).resolves.toEqual(productListResponse);

    expect(requests[0]?.url).toBe(
      "https://api.lemonsqueezy.com/v1/products/2?include=variants",
    );
    const listUrl = new URL(requests[1]!.url);
    expect(listUrl.pathname).toBe("/v1/products");
    expect(listUrl.searchParams.get("filter[store_id]")).toBe("0");
    expect(listUrl.searchParams.get("include")).toBe("store");
    expect(listUrl.searchParams.get("page[number]")).toBe("0");
    expect(listUrl.searchParams.get("page[size]")).toBe("25");
  });

  it("retrieves and lists variants with reviewed filters", async () => {
    const requests: Request[] = [];
    const responses = [variantResponse, variantListResponse];
    const client = createClientWithAdapter(
      { apiKey: "catalog-key" },
      async (request) => {
        requests.push(request);
        return Response.json(responses[requests.length - 1]);
      },
    );

    await client.variants.get(3, { include: ["price-model"] });
    await client.variants.list({
      filter: { productId: 4, status: "published" },
      include: ["files"],
    });

    expect(requests[0]?.url).toBe(
      "https://api.lemonsqueezy.com/v1/variants/3?include=price-model",
    );
    const listUrl = new URL(requests[1]!.url);
    expect(listUrl.searchParams.get("filter[product_id]")).toBe("4");
    expect(listUrl.searchParams.get("filter[status]")).toBe("published");
    expect(listUrl.searchParams.get("include")).toBe("files");
  });

  it("retrieves and lists prices by variant", async () => {
    const requests: Request[] = [];
    const responses = [priceResponse, priceListResponse];
    const client = createClientWithAdapter(
      { apiKey: "catalog-key" },
      async (request) => {
        requests.push(request);
        return Response.json(responses[requests.length - 1]);
      },
    );

    await client.prices.get(5, {
      include: ["variant", "subscription-items", "usage-records"],
    });
    await client.prices.list({ filter: { variantId: 6 } });

    expect(requests[0]?.url).toBe(
      "https://api.lemonsqueezy.com/v1/prices/5?include=variant%2Csubscription-items%2Cusage-records",
    );
    expect(
      new URL(requests[1]!.url).searchParams.get("filter[variant_id]"),
    ).toBe("6");
  });

  it("retrieves and lists wire-native files by variant", async () => {
    const requests: Request[] = [];
    const responses = [fileResponse, fileListResponse];
    const client = createClientWithAdapter(
      { apiKey: "catalog-key" },
      async (request) => {
        requests.push(request);
        return Response.json(responses[requests.length - 1]);
      },
    );

    await client.files.get(7, { include: ["variant"] });
    await client.files.list({ filter: { variantId: 8 } });

    expect(requests[0]?.url).toBe(
      "https://api.lemonsqueezy.com/v1/files/7?include=variant",
    );
    expect(
      new URL(requests[1]!.url).searchParams.get("filter[variant_id]"),
    ).toBe("8");
  });

  it("retrieves and lists affiliates without inventing write behavior", async () => {
    const requests: Request[] = [];
    const responses = [affiliateResponse, affiliateListResponse];
    const client = createClientWithAdapter(
      { apiKey: "catalog-key" },
      async (request) => {
        requests.push(request);
        return Response.json(responses[requests.length - 1]);
      },
    );

    await expect(
      client.affiliates.get(9, { include: ["store", "user"] }),
    ).resolves.toEqual(affiliateResponse);
    await client.affiliates.list({
      filter: { storeId: null, userEmail: "" },
      include: [],
    });

    expect(requests[0]?.url).toBe(
      "https://api.lemonsqueezy.com/v1/affiliates/9?include=store%2Cuser",
    );
    const listUrl = new URL(requests[1]!.url);
    expect(listUrl.searchParams.has("filter[store_id]")).toBe(false);
    expect(listUrl.searchParams.get("filter[user_email]")).toBe("");
    expect(listUrl.searchParams.has("include")).toBe(false);
    expect(Object.keys(client.affiliates).sort()).toEqual(["get", "list"]);
  });

  it("rejects invalid identifiers and RequestOptions before transport", async () => {
    let attempts = 0;
    const client = createClientWithAdapter(
      { apiKey: "catalog-key" },
      async () => {
        attempts += 1;
        return Response.json(storeResponse);
      },
    );

    const invalidGets = [
      () => client.stores.get(""),
      () => client.products.get(""),
      () => client.variants.get(""),
      () => client.prices.get(""),
      () => client.files.get(""),
      () => client.affiliates.get(""),
    ];
    const invalidOptions = [
      () => client.stores.get(1, {}, { timeoutMs: 0 }),
      () => client.products.get(1, {}, { timeoutMs: 0 }),
      () => client.variants.get(1, {}, { timeoutMs: 0 }),
      () => client.prices.get(1, {}, { timeoutMs: 0 }),
      () => client.files.get(1, {}, { timeoutMs: 0 }),
      () => client.affiliates.get(1, {}, { timeoutMs: 0 }),
      () => client.stores.list({}, { timeoutMs: 0 }),
      () => client.products.list({}, { timeoutMs: 0 }),
      () => client.variants.list({}, { timeoutMs: 0 }),
      () => client.prices.list({}, { timeoutMs: 0 }),
      () => client.files.list({}, { timeoutMs: 0 }),
      () => client.affiliates.list({}, { timeoutMs: 0 }),
    ];
    const invalidInputs = [
      () =>
        client.variants.list({
          filter: { status: "archived" as "published" },
        }),
    ];

    for (const run of [...invalidGets, ...invalidOptions, ...invalidInputs]) {
      await expect(run()).rejects.toMatchObject({ code: "validation" });
    }
    expect(attempts).toBe(0);
  });
});

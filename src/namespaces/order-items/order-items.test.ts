import { describe, expect, it } from "vitest";
import { createClientWithAdapter } from "../../internal/testing";

const orderItemListResponse = {
  jsonapi: { version: "1.0" },
  links: {
    first: "https://api.lemonsqueezy.com/v1/order-items?page[number]=1",
    last: "https://api.lemonsqueezy.com/v1/order-items?page[number]=1",
  },
  meta: {
    page: {
      current_page: 1,
      from: 1,
      last_page: 1,
      per_page: 20,
      to: 1,
      total: 1,
    },
  },
  data: [
    {
      type: "order-items",
      id: "5",
      attributes: { quantity: 2, future_field: "preserved" },
      relationships: {},
      links: { self: "https://api.lemonsqueezy.com/v1/order-items/5" },
    },
  ],
} as const;

const orderItemResponse = {
  jsonapi: { version: "1.0" },
  links: { self: "https://api.lemonsqueezy.com/v1/order-items/5" },
  data: {
    type: "order-items",
    id: "5",
    attributes: {
      order_id: 42,
      product_id: 6,
      variant_id: 7,
      price_id: 8,
      product_name: "Lemonade",
      variant_name: "Citrus Blast",
      price: 999,
      quantity: 2,
      created_at: "2026-08-13T03:00:00Z",
      updated_at: "2026-08-13T04:00:00Z",
      test_mode: true,
      future_field: "preserved",
    },
    relationships: {},
    links: { self: "https://api.lemonsqueezy.com/v1/order-items/5" },
  },
  included: [
    {
      type: "products",
      id: "6",
      attributes: { future_field: true },
      relationships: {},
      links: { self: "https://api.lemonsqueezy.com/v1/products/6" },
    },
  ],
} as const;

describe("orderItems namespace", () => {
  it("retrieves an order item with reviewed includes", async () => {
    const requests: Request[] = [];
    const client = createClientWithAdapter(
      { apiKey: "orders-key" },
      async (request) => {
        requests.push(request);
        return Response.json(orderItemResponse);
      },
    );

    await expect(
      client.orderItems.get("item/5", { include: ["product", "variant"] }),
    ).resolves.toEqual(orderItemResponse);

    expect(requests[0]?.url).toBe(
      "https://api.lemonsqueezy.com/v1/order-items/item%2F5?include=product%2Cvariant",
    );
  });

  it("lists order items with reviewed filters and pagination", async () => {
    const requests: Request[] = [];
    const client = createClientWithAdapter(
      { apiKey: "orders-key" },
      async (request) => {
        requests.push(request);
        return Response.json(orderItemListResponse);
      },
    );

    await expect(
      client.orderItems.list({
        filter: { orderId: 42, productId: null, variantId: 7 },
        include: ["product"],
        page: { number: 0, size: 20 },
      }),
    ).resolves.toEqual(orderItemListResponse);

    const url = new URL(requests[0]!.url);
    expect(url.searchParams.get("filter[order_id]")).toBe("42");
    expect(url.searchParams.has("filter[product_id]")).toBe(false);
    expect(url.searchParams.get("filter[variant_id]")).toBe("7");
    expect(url.searchParams.get("include")).toBe("product");
    expect(url.searchParams.get("page[number]")).toBe("0");
    expect(url.searchParams.get("page[size]")).toBe("20");
  });
});

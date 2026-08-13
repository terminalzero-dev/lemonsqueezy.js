import { describe, expect, it } from "vitest";
import { createClientWithAdapter } from "../../internal/testing";

const orderListResponse = {
  jsonapi: { version: "1.0" },
  links: {
    first: "https://api.lemonsqueezy.com/v1/orders?page[number]=1",
    last: "https://api.lemonsqueezy.com/v1/orders?page[number]=1",
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
  data: [
    {
      type: "orders",
      id: "42",
      attributes: { future_field: "preserved" },
      relationships: {},
      links: { self: "https://api.lemonsqueezy.com/v1/orders/42" },
    },
  ],
} as const;

const orderResponse = {
  jsonapi: { version: "1.0" },
  links: { self: "https://api.lemonsqueezy.com/v1/orders/42" },
  data: {
    type: "orders",
    id: "42",
    attributes: {
      affiliate_id: 7,
      referral_amount: 250,
      refunded_at: "2026-08-13T04:00:00Z",
      created_at: "2026-08-13T03:00:00Z",
      updated_at: "2026-08-13T04:00:00Z",
      future_status_detail: { reason: "preserved" },
    },
    relationships: {
      affiliate: {
        links: {
          related: "https://api.lemonsqueezy.com/v1/orders/42/affiliate",
          self: "https://api.lemonsqueezy.com/v1/orders/42/relationships/affiliate",
        },
        data: { type: "affiliates", id: "7" },
      },
    },
    links: { self: "https://api.lemonsqueezy.com/v1/orders/42" },
  },
  included: [
    {
      type: "affiliates",
      id: "7",
      attributes: { future_field: true },
      relationships: {},
      links: { self: "https://api.lemonsqueezy.com/v1/affiliates/7" },
    },
  ],
} as const;

const invoiceResponse = {
  jsonapi: { version: "1.0" },
  meta: {
    urls: {
      download_invoice: "https://app.lemonsqueezy.com/invoices/order-42.pdf",
    },
    future_field: "preserved",
  },
} as const;

describe("orders namespace", () => {
  it("distinguishes full refunds, partial refunds, and explicit zero", async () => {
    const requests: Request[] = [];
    const client = createClientWithAdapter(
      { apiKey: "orders-key" },
      async (request) => {
        requests.push(request);
        return Response.json(orderResponse);
      },
    );

    await client.orders.refund(42);
    await client.orders.refund(42, { amount: 250 });
    for (const amount of [0, -1, 0.5, Number.NaN]) {
      await expect(client.orders.refund(42, { amount })).rejects.toMatchObject({
        code: "validation",
      });
    }

    expect(requests).toHaveLength(2);
    expect(requests[0]?.method).toBe("POST");
    await expect(requests[0]?.json()).resolves.toEqual({
      data: { type: "orders", id: "42", attributes: {} },
    });
    await expect(requests[1]?.json()).resolves.toEqual({
      data: { type: "orders", id: "42", attributes: { amount: 250 } },
    });
  });

  it("generates the official non-resource invoice with optional input", async () => {
    const requests: Request[] = [];
    const client = createClientWithAdapter(
      { apiKey: "orders-key" },
      async (request) => {
        requests.push(request);
        return Response.json(invoiceResponse);
      },
    );

    await expect(client.orders.generateInvoice(42)).resolves.toEqual(
      invoiceResponse,
    );
    await client.orders.generateInvoice(42, {
      name: "Ada Lovelace",
      address: "",
      zipCode: 0,
      locale: "en",
    });

    expect(requests[0]?.method).toBe("POST");
    expect(requests[0]?.url).toBe(
      "https://api.lemonsqueezy.com/v1/orders/42/generate-invoice",
    );
    const withInput = new URL(requests[1]!.url);
    expect(withInput.searchParams.get("name")).toBe("Ada Lovelace");
    expect(withInput.searchParams.get("address")).toBe("");
    expect(withInput.searchParams.get("zip_code")).toBe("0");
    expect(withInput.searchParams.get("locale")).toBe("en");
    expect(withInput.searchParams.has("city")).toBe(false);
  });

  it("retrieves a wire-native order without rejecting additive response data", async () => {
    const requests: Request[] = [];
    const client = createClientWithAdapter(
      { apiKey: "orders-key" },
      async (request) => {
        requests.push(request);
        return Response.json(orderResponse);
      },
    );

    await expect(
      client.orders.get(
        "order/42",
        { include: ["affiliate"] },
        { timeoutMs: 1_000 },
      ),
    ).resolves.toEqual(orderResponse);

    expect(requests[0]?.url).toBe(
      "https://api.lemonsqueezy.com/v1/orders/order%2F42?include=affiliate",
    );
    expect(orderResponse.data.attributes.refunded_at).toBe(
      "2026-08-13T04:00:00Z",
    );
  });

  it("lists orders with the documented order number filter only", async () => {
    const requests: Request[] = [];
    const client = createClientWithAdapter(
      { apiKey: "orders-key" },
      async (request) => {
        requests.push(request);
        return Response.json(orderListResponse);
      },
    );

    await expect(
      client.orders.list({
        filter: { storeId: 1, userEmail: "", orderNumber: 42 },
        include: ["affiliate"],
      }),
    ).resolves.toEqual(orderListResponse);

    const url = new URL(requests[0]!.url);
    expect(url.searchParams.get("filter[store_id]")).toBe("1");
    expect(url.searchParams.get("filter[user_email]")).toBe("");
    expect(url.searchParams.get("filter[order_number]")).toBe("42");
    expect(url.searchParams.has("filter[affiliate_id]")).toBe(false);
    expect(url.searchParams.get("include")).toBe("affiliate");
  });
});

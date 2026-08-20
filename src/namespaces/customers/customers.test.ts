import { describe, expect, it } from "vitest";
import { createClientWithAdapter } from "../../internal/testing";

const customerResponse = {
  jsonapi: { version: "1.0" },
  links: { self: "https://api.lemonsqueezy.com/v1/customers/12" },
  data: {
    type: "customers",
    id: "12",
    attributes: {
      store_id: 1,
      name: "Ada Lovelace",
      email: "ada@example.com",
      status: "subscribed",
      city: null,
      region: "",
      country: null,
      total_revenue_currency: 0,
      mrr: 0,
      status_formatted: "Subscribed",
      country_formatted: null,
      total_revenue_currency_formatted: "$0.00",
      mrr_formatted: "$0.00",
      urls: { customer_portal: null },
      created_at: "2026-08-13T00:00:00Z",
      updated_at: "2026-08-13T00:00:00Z",
      test_mode: true,
      future_field: "preserved",
    },
    relationships: {},
    links: { self: "https://api.lemonsqueezy.com/v1/customers/12" },
  },
} as const;

const customerListResponse = {
  jsonapi: { version: "1.0" },
  links: {
    first: "https://api.lemonsqueezy.com/v1/customers?page[number]=0",
    last: "https://api.lemonsqueezy.com/v1/customers?page[number]=0",
  },
  meta: {
    page: {
      currentPage: 0,
      from: 0,
      lastPage: 0,
      perPage: 10,
      to: 0,
      total: 1,
    },
  },
  data: [customerResponse.data],
} as const;

describe("customers namespace", () => {
  it("creates a customer from an operation-owned store relationship", async () => {
    const requests: Request[] = [];
    const client = createClientWithAdapter(
      { apiKey: "commerce-key" },
      async (request) => {
        requests.push(request);
        return Response.json(customerResponse);
      },
    );

    await expect(
      client.customers.create({
        storeId: 1,
        name: "Ada Lovelace",
        email: "ada@example.com",
        city: null,
        region: "",
        country: null,
      }),
    ).resolves.toEqual(customerResponse);

    expect(requests).toHaveLength(1);
    expect(requests[0]?.method).toBe("POST");
    expect(requests[0]?.url).toBe("https://api.lemonsqueezy.com/v1/customers");
    await expect(requests[0]?.json()).resolves.toEqual({
      data: {
        type: "customers",
        attributes: {
          name: "Ada Lovelace",
          email: "ada@example.com",
          city: null,
          region: "",
          country: null,
        },
        relationships: {
          store: { data: { type: "stores", id: "1" } },
        },
      },
    });
  });

  it("retrieves a customer with the confirmed affiliates relationship", async () => {
    const requests: Request[] = [];
    const client = createClientWithAdapter(
      { apiKey: "commerce-key" },
      async (request) => {
        requests.push(request);
        return Response.json(customerResponse);
      },
    );

    await expect(
      client.customers.get("customer/12", { include: ["affiliates"] }),
    ).resolves.toEqual(customerResponse);

    expect(requests[0]?.url).toBe(
      "https://api.lemonsqueezy.com/v1/customers/customer%2F12?include=affiliates",
    );
  });

  it("lists customers with explicit filters and pagination", async () => {
    const requests: Request[] = [];
    const client = createClientWithAdapter(
      { apiKey: "commerce-key" },
      async (request) => {
        requests.push(request);
        return Response.json(customerListResponse);
      },
    );

    await expect(
      client.customers.list({
        filter: { storeId: 1, email: "" },
        include: ["orders"],
        page: { number: 0, size: 10 },
      }),
    ).resolves.toEqual(customerListResponse);

    const url = new URL(requests[0]!.url);
    expect(url.searchParams.get("filter[store_id]")).toBe("1");
    expect(url.searchParams.get("filter[email]")).toBe("");
    expect(url.searchParams.get("include")).toBe("orders");
    expect(url.searchParams.get("page[number]")).toBe("0");
    expect(url.searchParams.get("page[size]")).toBe("10");
  });

  it("updates only caller-provided fields while preserving null and empty strings", async () => {
    const requests: Request[] = [];
    const client = createClientWithAdapter(
      { apiKey: "commerce-key" },
      async (request) => {
        requests.push(request);
        return Response.json(customerResponse);
      },
    );

    await client.customers.update(12, { city: null, region: "" });

    expect(requests[0]?.method).toBe("PATCH");
    await expect(requests[0]?.json()).resolves.toEqual({
      data: {
        type: "customers",
        id: "12",
        attributes: { city: null, region: "" },
      },
    });
  });

  it("archives a customer through its stable operation contract", async () => {
    const requests: Request[] = [];
    const client = createClientWithAdapter(
      { apiKey: "commerce-key" },
      async (request) => {
        requests.push(request);
        return Response.json(customerResponse);
      },
    );

    await client.customers.archive(12);

    expect(requests[0]?.method).toBe("PATCH");
    await expect(requests[0]?.json()).resolves.toEqual({
      data: {
        type: "customers",
        id: "12",
        attributes: { status: "archived" },
      },
    });
  });

  it("rejects invalid customer inputs before transport", async () => {
    let attempts = 0;
    const client = createClientWithAdapter(
      { apiKey: "commerce-key" },
      async () => {
        attempts += 1;
        return Response.json(customerResponse);
      },
    );

    for (const call of [
      () => client.customers.get(""),
      () => client.customers.archive(0),
      () =>
        client.customers.create({ storeId: 0, name: "Ada", email: "a@b.c" }),
      () => client.customers.update(1, {}),
      () => client.customers.update(1, { arbitrary: true } as never),
    ]) {
      await expect(call()).rejects.toMatchObject({ code: "validation" });
    }
    expect(attempts).toBe(0);
  });
});

import { describe, expect, it } from "vitest";
import { createClientWithAdapter } from "../../internal/testing";

const subscriptionInvoiceResponse = {
  jsonapi: { version: "1.0" },
  links: {
    self: "https://api.lemonsqueezy.com/v1/subscription-invoices/42",
  },
  data: {
    type: "subscription-invoices",
    id: "42",
    attributes: {
      status: "future_status",
      future_field: { preserved: true },
    },
    relationships: {
      affiliate: {
        links: {
          related:
            "https://api.lemonsqueezy.com/v1/subscription-invoices/42/affiliate",
          self: "https://api.lemonsqueezy.com/v1/subscription-invoices/42/relationships/affiliate",
        },
        data: { type: "affiliates", id: "7" },
      },
      future_relationship: { data: { type: "future-resources", id: "1" } },
    },
    links: {
      self: "https://api.lemonsqueezy.com/v1/subscription-invoices/42",
    },
  },
} as const;

const invoiceResponse = {
  jsonapi: { version: "1.0" },
  meta: {
    urls: {
      download_invoice:
        "https://app.lemonsqueezy.com/invoices/subscription-invoice-42.pdf",
    },
    future_field: "preserved",
  },
} as const;

const subscriptionInvoiceListResponse = {
  jsonapi: { version: "1.0" },
  links: {
    first:
      "https://api.lemonsqueezy.com/v1/subscription-invoices?page[number]=1",
    last: "https://api.lemonsqueezy.com/v1/subscription-invoices?page[number]=1",
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
  data: [subscriptionInvoiceResponse.data],
} as const;

describe("subscription invoices namespace", () => {
  it("lists invoices with every documented filter and request option", async () => {
    const requests: Request[] = [];
    const client = createClientWithAdapter(
      { apiKey: "subscription-invoices-key" },
      async (request) => {
        requests.push(request);
        return Response.json(subscriptionInvoiceListResponse);
      },
    );

    await expect(
      client.subscriptionInvoices.list(
        {
          filter: {
            storeId: 1,
            status: "partial_refund",
            refunded: false,
            subscriptionId: "subscription/2",
          },
          include: ["store", "subscription", "customer", "affiliate"],
          page: { number: 2, size: 25 },
        },
        { timeoutMs: 1_000 },
      ),
    ).resolves.toEqual(subscriptionInvoiceListResponse);

    const url = new URL(requests[0]!.url);
    expect(url.searchParams.get("filter[store_id]")).toBe("1");
    expect(url.searchParams.get("filter[status]")).toBe("partial_refund");
    expect(url.searchParams.get("filter[refunded]")).toBe("false");
    expect(url.searchParams.get("filter[subscription_id]")).toBe(
      "subscription/2",
    );
    expect(url.searchParams.get("include")).toBe(
      "store,subscription,customer,affiliate",
    );
    expect(url.searchParams.get("page[number]")).toBe("2");
    expect(url.searchParams.get("page[size]")).toBe("25");
  });

  it("rejects an undocumented list status before transport", async () => {
    let attempts = 0;
    const client = createClientWithAdapter(
      { apiKey: "subscription-invoices-key" },
      async () => {
        attempts += 1;
        return Response.json(subscriptionInvoiceListResponse);
      },
    );

    await expect(
      client.subscriptionInvoices.list({
        filter: { status: "future_status" as "paid" },
      }),
    ).rejects.toMatchObject({ code: "validation" });
    expect(attempts).toBe(0);
  });

  it("retrieves a wire-native invoice without rejecting additive response data", async () => {
    const requests: Request[] = [];
    const client = createClientWithAdapter(
      { apiKey: "subscription-invoices-key" },
      async (request) => {
        requests.push(request);
        return Response.json(subscriptionInvoiceResponse);
      },
    );

    await expect(
      client.subscriptionInvoices.get(
        "invoice/42",
        { include: ["affiliate"] },
        { timeoutMs: 1_000 },
      ),
    ).resolves.toEqual(subscriptionInvoiceResponse);

    expect(requests[0]?.url).toBe(
      "https://api.lemonsqueezy.com/v1/subscription-invoices/invoice%2F42?include=affiliate",
    );
    expect(subscriptionInvoiceResponse.data.attributes.future_field).toEqual({
      preserved: true,
    });
    expect(
      subscriptionInvoiceResponse.data.relationships.future_relationship,
    ).toEqual({ data: { type: "future-resources", id: "1" } });
  });

  it("generates the official non-resource invoice with optional input", async () => {
    const requests: Request[] = [];
    const client = createClientWithAdapter(
      { apiKey: "subscription-invoices-key" },
      async (request) => {
        requests.push(request);
        return Response.json(invoiceResponse);
      },
    );

    await expect(
      client.subscriptionInvoices.generateInvoice(42),
    ).resolves.toEqual(invoiceResponse);
    await client.subscriptionInvoices.generateInvoice(42, {
      name: "Ada Lovelace",
      address: "",
      zipCode: 0,
      locale: "en",
    });

    expect(requests[0]?.method).toBe("POST");
    expect(requests[0]?.url).toBe(
      "https://api.lemonsqueezy.com/v1/subscription-invoices/42/generate-invoice",
    );
    const withInput = new URL(requests[1]!.url);
    expect(withInput.searchParams.get("name")).toBe("Ada Lovelace");
    expect(withInput.searchParams.get("address")).toBe("");
    expect(withInput.searchParams.get("zip_code")).toBe("0");
    expect(withInput.searchParams.get("locale")).toBe("en");
    expect(withInput.searchParams.has("city")).toBe(false);
  });

  it("distinguishes full refunds, partial refunds, and explicit zero", async () => {
    const requests: Request[] = [];
    const client = createClientWithAdapter(
      { apiKey: "subscription-invoices-key" },
      async (request) => {
        requests.push(request);
        return Response.json(subscriptionInvoiceResponse);
      },
    );

    await client.subscriptionInvoices.refund(42);
    await client.subscriptionInvoices.refund(42, { amount: 250 });
    for (const amount of [0, -1, 0.5, Number.NaN]) {
      await expect(
        client.subscriptionInvoices.refund(42, { amount }),
      ).rejects.toMatchObject({ code: "validation" });
    }

    expect(requests).toHaveLength(2);
    await expect(requests[0]?.json()).resolves.toEqual({
      data: { type: "subscription-invoices", id: "42", attributes: {} },
    });
    await expect(requests[1]?.json()).resolves.toEqual({
      data: {
        type: "subscription-invoices",
        id: "42",
        attributes: { amount: 250 },
      },
    });
  });
});

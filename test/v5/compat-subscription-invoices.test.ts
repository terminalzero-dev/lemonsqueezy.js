import { afterEach, describe, expect, it, vi } from "vitest";
import {
  generateSubscriptionInvoice,
  getSubscriptionInvoice,
  issueSubscriptionInvoiceRefund,
  lemonSqueezySetup,
  listSubscriptionInvoices,
} from "../../src/compat";
import type { LemonSqueezyClient } from "../../src/client";
import {
  createClientWithAdapter,
  setDefaultAdapter,
} from "../../src/internal/testing";

const response = {
  jsonapi: { version: "1.0" },
  links: {
    self: "https://api.lemonsqueezy.com/v1/subscription-invoices/1",
  },
  data: {
    type: "subscription-invoices",
    id: "1",
    attributes: { future_field: "preserved" },
    relationships: {},
    links: {
      self: "https://api.lemonsqueezy.com/v1/subscription-invoices/1",
    },
  },
};

const listResponse = {
  jsonapi: { version: "1.0" },
  links: {
    first: "https://example.com/first",
    last: "https://example.com/last",
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
  data: [response.data],
};

const invoiceResponse = {
  jsonapi: { version: "1.0" },
  meta: { urls: { download_invoice: "https://example.com/invoice.pdf" } },
};

const cases: readonly {
  readonly name: string;
  readonly response: unknown;
  readonly facade: () => Promise<unknown>;
  readonly explicit: (client: LemonSqueezyClient) => Promise<unknown>;
}[] = [
  {
    name: "getSubscriptionInvoice / subscriptionInvoices.get",
    response,
    facade: () => getSubscriptionInvoice(1, { include: ["affiliate"] }),
    explicit: (client) =>
      client.subscriptionInvoices.get(1, { include: ["affiliate"] }),
  },
  {
    name: "listSubscriptionInvoices / subscriptionInvoices.list",
    response: listResponse,
    facade: () =>
      listSubscriptionInvoices({
        filter: {
          storeId: 2,
          status: "partial_refund" as never,
          refunded: false,
          subscriptionId: 3,
        },
      }),
    explicit: (client) =>
      client.subscriptionInvoices.list({
        filter: {
          storeId: 2,
          status: "partial_refund",
          refunded: false,
          subscriptionId: 3,
        },
      }),
  },
  {
    name: "generateSubscriptionInvoice / subscriptionInvoices.generateInvoice",
    response: invoiceResponse,
    facade: () => generateSubscriptionInvoice(1, undefined as never),
    explicit: (client) => client.subscriptionInvoices.generateInvoice(1),
  },
  {
    name: "issueSubscriptionInvoiceRefund / subscriptionInvoices.refund",
    response,
    facade: () => issueSubscriptionInvoiceRefund(1),
    explicit: (client) => client.subscriptionInvoices.refund(1),
  },
  {
    name: "issueSubscriptionInvoiceRefund partial / subscriptionInvoices.refund",
    response,
    facade: () => issueSubscriptionInvoiceRefund(1, 250),
    explicit: (client) =>
      client.subscriptionInvoices.refund(1, { amount: 250 }),
  },
];

afterEach(() => {
  vi.unstubAllGlobals();
  setDefaultAdapter((request) => fetch(request));
});

describe("Subscription Invoice Compatibility projections", () => {
  it.each(cases)("compiles $name to the same CoreRequest", async (testCase) => {
    const facadeRequests: Request[] = [];
    const explicitRequests: Request[] = [];
    const facadeAdapter = async (
      input: RequestInfo | URL,
      init?: RequestInit,
    ) => {
      const request =
        input instanceof Request && init === undefined
          ? input
          : new Request(input, init);
      facadeRequests.push(request);
      return Response.json(testCase.response);
    };
    vi.stubGlobal("fetch", facadeAdapter);
    setDefaultAdapter(facadeAdapter);
    lemonSqueezySetup({ apiKey: "facade-key" });
    const client = createClientWithAdapter(
      { apiKey: "explicit-key" },
      async (request) => {
        explicitRequests.push(request);
        return Response.json(testCase.response);
      },
    );

    await expect(testCase.facade()).resolves.toMatchObject({
      statusCode: 200,
      data: testCase.response,
      error: null,
    });
    await expect(testCase.explicit(client)).resolves.toEqual(testCase.response);

    expect(facadeRequests).toHaveLength(1);
    expect(explicitRequests).toHaveLength(1);
    await expect(requestSnapshot(facadeRequests[0]!)).resolves.toEqual(
      await requestSnapshot(explicitRequests[0]!),
    );
  });

  it("rejects invalid refund amounts before either transport", async () => {
    let attempts = 0;
    const adapter = async () => {
      attempts += 1;
      return Response.json(response);
    };
    vi.stubGlobal("fetch", adapter);
    setDefaultAdapter(adapter);
    lemonSqueezySetup({ apiKey: "facade-key" });
    const client = createClientWithAdapter({ apiKey: "explicit-key" }, adapter);

    for (const amount of [0, -1, 0.5, Number.NaN]) {
      await expect(
        issueSubscriptionInvoiceRefund(1, amount),
      ).rejects.toMatchObject({ code: "validation" });
      await expect(
        client.subscriptionInvoices.refund(1, { amount }),
      ).rejects.toMatchObject({ code: "validation" });
    }
    expect(attempts).toBe(0);
  });
});

async function requestSnapshot(request: Request) {
  return {
    method: request.method,
    url: request.url,
    body: await request.clone().text(),
  };
}

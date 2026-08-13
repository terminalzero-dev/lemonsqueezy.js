import { afterEach, describe, expect, it, vi } from "vitest";
import {
  generateOrderInvoice,
  getOrder,
  getOrderItem,
  issueOrderRefund,
  lemonSqueezySetup,
  listOrderItems,
  listOrders,
} from "../../src/compat";
import type { LemonSqueezyClient } from "../../src/client";
import {
  createClientWithAdapter,
  setDefaultAdapter,
} from "../../src/internal/testing";

const resource = (type: "orders" | "order-items") => ({
  type,
  id: "1",
  attributes: { future_field: "preserved" },
  relationships: {},
  links: { self: `https://api.lemonsqueezy.com/v1/${type}/1` },
});

const singleResponse = (type: "orders" | "order-items") => ({
  jsonapi: { version: "1.0" },
  links: { self: `https://api.lemonsqueezy.com/v1/${type}/1` },
  data: resource(type),
});

const listResponse = (type: "orders" | "order-items") => ({
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
  data: [resource(type)],
});

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
    name: "getOrder / orders.get",
    response: singleResponse("orders"),
    facade: () => getOrder(1, { include: ["affiliate"] }),
    explicit: (client) => client.orders.get(1, { include: ["affiliate"] }),
  },
  {
    name: "listOrders / orders.list",
    response: listResponse("orders"),
    facade: () =>
      listOrders({ filter: { storeId: 2, userEmail: "", orderNumber: 3 } }),
    explicit: (client) =>
      client.orders.list({
        filter: { storeId: 2, userEmail: "", orderNumber: 3 },
      }),
  },
  {
    name: "generateOrderInvoice / orders.generateInvoice",
    response: invoiceResponse,
    facade: () => generateOrderInvoice(1),
    explicit: (client) => client.orders.generateInvoice(1),
  },
  {
    name: "issueOrderRefund / orders.refund",
    response: singleResponse("orders"),
    facade: () => issueOrderRefund(1),
    explicit: (client) => client.orders.refund(1),
  },
  {
    name: "issueOrderRefund partial / orders.refund",
    response: singleResponse("orders"),
    facade: () => issueOrderRefund(1, 250),
    explicit: (client) => client.orders.refund(1, { amount: 250 }),
  },
  {
    name: "getOrderItem / orderItems.get",
    response: singleResponse("order-items"),
    facade: () => getOrderItem(1, { include: ["product"] }),
    explicit: (client) => client.orderItems.get(1, { include: ["product"] }),
  },
  {
    name: "listOrderItems / orderItems.list",
    response: listResponse("order-items"),
    facade: () => listOrderItems({ filter: { orderId: 1, variantId: 2 } }),
    explicit: (client) =>
      client.orderItems.list({ filter: { orderId: 1, variantId: 2 } }),
  },
];

afterEach(() => {
  vi.unstubAllGlobals();
  setDefaultAdapter((request) => fetch(request));
});

describe("order Compatibility projections", () => {
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
      return Response.json(singleResponse("orders"));
    };
    vi.stubGlobal("fetch", adapter);
    setDefaultAdapter(adapter);
    lemonSqueezySetup({ apiKey: "facade-key" });
    const client = createClientWithAdapter({ apiKey: "explicit-key" }, adapter);

    for (const amount of [0, -1, 0.5, Number.NaN]) {
      await expect(issueOrderRefund(1, amount)).rejects.toMatchObject({
        code: "validation",
      });
      await expect(client.orders.refund(1, { amount })).rejects.toMatchObject({
        code: "validation",
      });
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

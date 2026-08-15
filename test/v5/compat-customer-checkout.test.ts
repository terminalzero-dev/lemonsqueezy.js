import { afterEach, describe, expect, it, vi } from "vitest";
import {
  archiveCustomer,
  createCheckout,
  createCustomer,
  getCheckout,
  getCustomer,
  lemonSqueezySetup,
  listCheckouts,
  listCustomers,
  updateCustomer,
} from "../../src/compat";
import type { LemonSqueezyClient } from "../../src/client";
import {
  createClientWithAdapter,
  setDefaultAdapter,
} from "../../src/internal/testing";

function createResourceResponseFixture(type: "customers" | "checkouts") {
  return {
    jsonapi: { version: "1.0" },
    links: { self: `https://api.lemonsqueezy.com/v1/${type}/1` },
    data: {
      type,
      id: "1",
      attributes: { future_field: "preserved" },
      relationships: {},
      links: { self: `https://api.lemonsqueezy.com/v1/${type}/1` },
    },
  };
}

function createListResponseFixture(type: "customers" | "checkouts") {
  return {
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
    data: [createResourceResponseFixture(type).data],
  };
}

const cases: readonly {
  readonly name: string;
  readonly response: unknown;
  readonly facade: () => Promise<unknown>;
  readonly explicit: (client: LemonSqueezyClient) => Promise<unknown>;
}[] = [
  {
    name: "createCustomer / customers.create",
    response: createResourceResponseFixture("customers"),
    facade: () => createCustomer(1, { name: "Ada", email: "ada@example.com" }),
    explicit: (client) =>
      client.customers.create({
        storeId: 1,
        name: "Ada",
        email: "ada@example.com",
      }),
  },
  {
    name: "getCustomer / customers.get",
    response: createResourceResponseFixture("customers"),
    facade: () => getCustomer(1, { include: ["affiliates"] }),
    explicit: (client) => client.customers.get(1, { include: ["affiliates"] }),
  },
  {
    name: "updateCustomer / customers.update",
    response: createResourceResponseFixture("customers"),
    facade: () => updateCustomer(1, { city: "" }),
    explicit: (client) => client.customers.update(1, { city: "" }),
  },
  {
    name: "listCustomers / customers.list",
    response: createListResponseFixture("customers"),
    facade: () => listCustomers({ filter: { storeId: 1, email: "" } }),
    explicit: (client) =>
      client.customers.list({ filter: { storeId: 1, email: "" } }),
  },
  {
    name: "archiveCustomer / customers.archive",
    response: createResourceResponseFixture("customers"),
    facade: () => archiveCustomer(1),
    explicit: (client) => client.customers.archive(1),
  },
  {
    name: "createCheckout / checkouts.create",
    response: createResourceResponseFixture("checkouts"),
    facade: () =>
      createCheckout(1, 2, {
        checkoutOptions: { embed: false },
        checkoutData: { custom: { userId: 1 } },
      }),
    explicit: (client) =>
      client.checkouts.create({
        storeId: 1,
        variantId: 2,
        checkoutOptions: { embed: false },
        checkoutData: { custom: { userId: 1 } },
      }),
  },
  {
    name: "getCheckout / checkouts.get",
    response: createResourceResponseFixture("checkouts"),
    facade: () => getCheckout(1, { include: ["variant"] }),
    explicit: (client) => client.checkouts.get(1, { include: ["variant"] }),
  },
  {
    name: "listCheckouts / checkouts.list",
    response: createListResponseFixture("checkouts"),
    facade: () => listCheckouts({ filter: { storeId: 1, variantId: 2 } }),
    explicit: (client) =>
      client.checkouts.list({ filter: { storeId: 1, variantId: 2 } }),
  },
];

afterEach(() => {
  vi.unstubAllGlobals();
  setDefaultAdapter((request) => fetch(request));
});

describe("customer and checkout Compatibility projections", () => {
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
    expect({
      method: facadeRequests[0]?.method,
      url: facadeRequests[0]?.url,
      body: await facadeRequests[0]?.clone().text(),
    }).toEqual({
      method: explicitRequests[0]?.method,
      url: explicitRequests[0]?.url,
      body: await explicitRequests[0]?.clone().text(),
    });
  });

  it("keeps positional relationship IDs authoritative", async () => {
    const requests: Request[] = [];
    const adapter = async (input: RequestInfo | URL, init?: RequestInit) => {
      const request =
        input instanceof Request && init === undefined
          ? input
          : new Request(input, init);
      requests.push(request);
      const type = request.url.endsWith("/customers")
        ? "customers"
        : "checkouts";
      return Response.json(createResourceResponseFixture(type));
    };
    vi.stubGlobal("fetch", adapter);
    setDefaultAdapter(adapter);
    lemonSqueezySetup({ apiKey: "facade-key" });

    const customer = {
      storeId: 999,
      name: "Ada",
      email: "ada@example.com",
    };
    const checkout = {
      storeId: 999,
      variantId: 999,
      checkoutOptions: { embed: false },
    };

    await createCustomer(1, customer);
    await createCheckout(1, 2, checkout);

    await expect(requests[0]?.clone().json()).resolves.toMatchObject({
      data: {
        relationships: { store: { data: { id: "1" } } },
      },
    });
    await expect(requests[1]?.clone().json()).resolves.toMatchObject({
      data: {
        relationships: {
          store: { data: { id: "1" } },
          variant: { data: { id: "2" } },
        },
      },
    });
  });
});

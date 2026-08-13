import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getFile,
  getPrice,
  getProduct,
  getStore,
  getVariant,
  lemonSqueezySetup,
  listFiles,
  listPrices,
  listProducts,
  listStores,
  listVariants,
} from "../../src/compat";
import type { LemonSqueezyClient } from "../../src/client";
import {
  createClientWithAdapter,
  setDefaultAdapter,
} from "../../src/internal/testing";

const listResponse = (type: string) => ({
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

const singleResponse = (type: string) => ({
  jsonapi: { version: "1.0" },
  links: { self: `https://api.lemonsqueezy.com/v1/${type}/1` },
  data: resource(type),
});

function resource(type: string) {
  return {
    type,
    id: "1",
    attributes: { name: type },
    relationships: {},
    links: { self: `https://api.lemonsqueezy.com/v1/${type}/1` },
  };
}

const parityCases: readonly {
  readonly name: string;
  readonly type: string;
  readonly list: boolean;
  readonly facade: () => Promise<unknown>;
  readonly explicit: (client: LemonSqueezyClient) => Promise<unknown>;
}[] = [
  {
    name: "getStore / stores.get",
    type: "stores",
    list: false,
    facade: () => getStore(1, { include: ["products"] }),
    explicit: (client) => client.stores.get(1, { include: ["products"] }),
  },
  {
    name: "listStores / stores.list",
    type: "stores",
    list: true,
    facade: () => listStores({ page: { number: 2, size: 5 } }),
    explicit: (client) => client.stores.list({ page: { number: 2, size: 5 } }),
  },
  {
    name: "getProduct / products.get",
    type: "products",
    list: false,
    facade: () => getProduct(1, { include: ["variants"] }),
    explicit: (client) => client.products.get(1, { include: ["variants"] }),
  },
  {
    name: "listProducts / products.list",
    type: "products",
    list: true,
    facade: () => listProducts({ filter: { storeId: 2 } }),
    explicit: (client) => client.products.list({ filter: { storeId: 2 } }),
  },
  {
    name: "getVariant / variants.get",
    type: "variants",
    list: false,
    facade: () => getVariant(1, { include: ["product"] }),
    explicit: (client) => client.variants.get(1, { include: ["product"] }),
  },
  {
    name: "listVariants / variants.list",
    type: "variants",
    list: true,
    facade: () =>
      listVariants({ filter: { productId: 2, status: "published" } }),
    explicit: (client) =>
      client.variants.list({ filter: { productId: 2, status: "published" } }),
  },
  {
    name: "getPrice / prices.get",
    type: "prices",
    list: false,
    facade: () => getPrice(1, { include: ["variant"] }),
    explicit: (client) => client.prices.get(1, { include: ["variant"] }),
  },
  {
    name: "listPrices / prices.list",
    type: "prices",
    list: true,
    facade: () => listPrices({ filter: { variantId: 2 } }),
    explicit: (client) => client.prices.list({ filter: { variantId: 2 } }),
  },
  {
    name: "getFile / files.get",
    type: "files",
    list: false,
    facade: () => getFile(1, { include: ["variant"] }),
    explicit: (client) => client.files.get(1, { include: ["variant"] }),
  },
  {
    name: "listFiles / files.list",
    type: "files",
    list: true,
    facade: () => listFiles({ filter: { variantId: 2 } }),
    explicit: (client) => client.files.list({ filter: { variantId: 2 } }),
  },
];

afterEach(() => {
  vi.unstubAllGlobals();
  setDefaultAdapter((request) => fetch(request));
});

describe("read-only Compatibility projections", () => {
  it.each(parityCases)(
    "compiles $name to the same request",
    async (testCase) => {
      const facadeRequests: Request[] = [];
      const explicitRequests: Request[] = [];
      const response = testCase.list
        ? listResponse(testCase.type)
        : singleResponse(testCase.type);
      const facadeAdapter = async (
        input: RequestInfo | URL,
        init?: RequestInit,
      ) => {
        const request =
          input instanceof Request && init === undefined
            ? input
            : new Request(input, init);
        facadeRequests.push(request);
        return Response.json(response);
      };
      vi.stubGlobal("fetch", facadeAdapter);
      setDefaultAdapter(facadeAdapter);
      lemonSqueezySetup({ apiKey: "facade-key" });
      const client = createClientWithAdapter(
        { apiKey: "explicit-key" },
        async (request) => {
          explicitRequests.push(request);
          return Response.json(response);
        },
      );

      await expect(testCase.facade()).resolves.toMatchObject({
        statusCode: 200,
        data: response,
        error: null,
      });
      await expect(testCase.explicit(client)).resolves.toEqual(response);

      expect(facadeRequests).toHaveLength(1);
      expect(explicitRequests).toHaveLength(1);
      expect({
        method: facadeRequests[0]?.method,
        url: facadeRequests[0]?.url,
      }).toEqual({
        method: explicitRequests[0]?.method,
        url: explicitRequests[0]?.url,
      });
    },
  );
});

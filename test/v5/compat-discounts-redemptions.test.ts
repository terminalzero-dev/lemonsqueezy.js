import { afterEach, describe, expect, it, vi } from "vitest";
import type { LemonSqueezyClient } from "../../src/client";
import {
  createDiscount,
  deleteDiscount,
  getDiscount,
  getDiscountRedemption,
  lemonSqueezySetup,
  listDiscounts,
  listDiscountRedemptions,
} from "../../src/compat";
import {
  createClientWithAdapter,
  setDefaultAdapter,
} from "../../src/internal/testing";

const discountResource = {
  type: "discounts",
  id: "42",
  attributes: { future_field: "preserved" },
  relationships: {},
  links: { self: "https://api.lemonsqueezy.com/v1/discounts/42" },
} as const;

const discountResponse = {
  jsonapi: { version: "1.0" },
  links: { self: discountResource.links.self },
  data: discountResource,
} as const;
const discountListResponse = {
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
  data: [discountResource],
} as const;
const discountRedemptionResource = {
  type: "discount-redemptions",
  id: "51",
  attributes: { future_field: "preserved" },
  relationships: {},
  links: {
    self: "https://api.lemonsqueezy.com/v1/discount-redemptions/51",
  },
} as const;
const discountRedemptionResponse = {
  jsonapi: { version: "1.0" },
  links: { self: discountRedemptionResource.links.self },
  data: discountRedemptionResource,
} as const;
const discountRedemptionListResponse = {
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
  data: [discountRedemptionResource],
} as const;

afterEach(() => {
  vi.unstubAllGlobals();
  setDefaultAdapter((request) => fetch(request));
});

describe("discount and redemption Compatibility projections", () => {
  it("uses the same CoreRequest for getDiscount and discounts.get", async () => {
    const { facadeResult, explicitResult } = await invokeBoth(
      () => Response.json(discountResponse),
      () => getDiscount(42, { include: ["variants"] }),
      (client) => client.discounts.get(42, { include: ["variants"] }),
    );

    expect(facadeResult).toEqual({
      statusCode: 200,
      data: discountResponse,
      error: null,
    });
    expect(explicitResult).toEqual(discountResponse);
  });

  it("uses the same CoreRequest for createDiscount and discounts.create", async () => {
    const input = {
      storeId: 1,
      name: "Ten percent off",
      code: "TENOFF",
      amount: 10,
      amountType: "percent",
    } as const;
    await invokeBoth(
      () => Response.json(discountResponse),
      () => createDiscount(input),
      (client) => client.discounts.create(input),
    );
  });

  it("uses the same CoreRequest for listDiscounts and discounts.list", async () => {
    const params = { filter: { storeId: 1 }, page: { number: 1, size: 10 } };
    await invokeBoth(
      () => Response.json(discountListResponse),
      () => listDiscounts(params),
      (client) => client.discounts.list(params),
    );
  });

  it.each([204, 205])(
    "projects deleteDiscount %s as the actual status with null data and error",
    async (status) => {
      const { facadeResult, explicitResult } = await invokeBoth(
        () => new Response(null, { status }),
        () => deleteDiscount(42),
        (client) => client.discounts.delete(42),
      );

      expect(facadeResult).toEqual({
        statusCode: status,
        data: null,
        error: null,
      });
      expect(explicitResult).toBeUndefined();
    },
  );

  it("uses the same CoreRequest for getDiscountRedemption and discountRedemptions.get", async () => {
    await invokeBoth(
      () => Response.json(discountRedemptionResponse),
      () => getDiscountRedemption(51, { include: ["order"] }),
      (client) => client.discountRedemptions.get(51, { include: ["order"] }),
    );
  });

  it("uses the same CoreRequest for listDiscountRedemptions and discountRedemptions.list", async () => {
    const params = { filter: { discountId: 42, orderId: 99 } };
    await invokeBoth(
      () => Response.json(discountRedemptionListResponse),
      () => listDiscountRedemptions(params),
      (client) => client.discountRedemptions.list(params),
    );
  });

  it("preserves Compatibility error and validation semantics", async () => {
    let attempts = 0;
    setDefaultAdapter(async () => {
      attempts += 1;
      return Response.json(discountResponse);
    });
    lemonSqueezySetup({});
    await expect(getDiscount(42)).resolves.toMatchObject({
      statusCode: null,
      data: null,
      error: { code: "configuration" },
    });
    expect(attempts).toBe(0);

    lemonSqueezySetup({ apiKey: "facade-key" });
    setDefaultAdapter(async () =>
      Response.json(
        { errors: [{ title: "Unprocessable Entity" }] },
        { status: 422 },
      ),
    );
    await expect(getDiscount(42)).resolves.toMatchObject({
      statusCode: 422,
      data: null,
      error: { code: "http" },
    });

    setDefaultAdapter(async () =>
      Response.json({ data: { type: "orders", id: "42" } }),
    );
    await expect(getDiscount(42)).resolves.toMatchObject({
      statusCode: 200,
      data: null,
      error: { code: "invalid_response" },
    });

    await expect(getDiscount("")).rejects.toMatchObject({ code: "validation" });
  });
});

async function requestSnapshot(request: Request) {
  return {
    method: request.method,
    url: request.url,
    body: await request.clone().text(),
  };
}

async function invokeBoth(
  createResponse: () => Response,
  invokeFacade: () => Promise<unknown>,
  invokeExplicit: (client: LemonSqueezyClient) => Promise<unknown>,
) {
  const facadeRequests: Request[] = [];
  const explicitRequests: Request[] = [];
  vi.stubGlobal("fetch", () => {
    throw new Error("Compatibility facade bypassed the Default Client");
  });
  setDefaultAdapter(async (request) => {
    facadeRequests.push(request);
    return createResponse();
  });
  lemonSqueezySetup({ apiKey: "facade-key" });
  const client = createClientWithAdapter(
    { apiKey: "explicit-key" },
    async (request) => {
      explicitRequests.push(request);
      return createResponse();
    },
  );

  const facadeResult = await invokeFacade();
  const explicitResult = await invokeExplicit(client);

  expect(facadeRequests).toHaveLength(1);
  expect(explicitRequests).toHaveLength(1);
  await expect(requestSnapshot(facadeRequests[0]!)).resolves.toEqual(
    await requestSnapshot(explicitRequests[0]!),
  );

  return { facadeResult, explicitResult };
}

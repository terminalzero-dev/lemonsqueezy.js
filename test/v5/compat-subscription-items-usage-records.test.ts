import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createUsageRecord,
  getSubscriptionItem,
  getSubscriptionItemCurrentUsage,
  getUsageRecord,
  lemonSqueezySetup,
  listSubscriptionItems,
  listUsageRecords,
  updateSubscriptionItem,
} from "../../src/compat";
import type { LemonSqueezyClient } from "../../src/client";
import {
  createClientWithAdapter,
  setDefaultAdapter,
} from "../../src/internal/testing";

const subscriptionItemResource = {
  type: "subscription-items",
  id: "1",
  attributes: { future_field: "preserved" },
  relationships: {},
  links: { self: "https://api.lemonsqueezy.com/v1/subscription-items/1" },
} as const;

const usageRecordResource = {
  type: "usage-records",
  id: "1",
  attributes: { future_field: "preserved" },
  relationships: {},
  links: { self: "https://api.lemonsqueezy.com/v1/usage-records/1" },
} as const;

const singleResponse = (
  resource: typeof subscriptionItemResource | typeof usageRecordResource,
) => ({
  jsonapi: { version: "1.0" },
  links: { self: resource.links.self },
  data: resource,
});

const listResponse = (
  resource: typeof subscriptionItemResource | typeof usageRecordResource,
) => ({
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
  data: [resource],
});

const currentUsageResponse = {
  jsonapi: { version: "1.0" },
  meta: {
    period_start: "2026-08-01T00:00:00.000000Z",
    period_end: "2026-09-01T00:00:00.000000Z",
    quantity: 5,
    interval_unit: "month",
    interval_quantity: 1,
  },
} as const;

const cases: readonly {
  readonly name: string;
  readonly response: unknown;
  readonly facade: () => Promise<unknown>;
  readonly explicit: (client: LemonSqueezyClient) => Promise<unknown>;
}[] = [
  {
    name: "getSubscriptionItem / subscriptionItems.get",
    response: singleResponse(subscriptionItemResource),
    facade: () => getSubscriptionItem(1, { include: ["price"] }),
    explicit: (client) =>
      client.subscriptionItems.get(1, { include: ["price"] }),
  },
  {
    name: "listSubscriptionItems / subscriptionItems.list",
    response: listResponse(subscriptionItemResource),
    facade: () =>
      listSubscriptionItems({ filter: { subscriptionId: 2, priceId: 3 } }),
    explicit: (client) =>
      client.subscriptionItems.list({
        filter: { subscriptionId: 2, priceId: 3 },
      }),
  },
  {
    name: "getSubscriptionItemCurrentUsage / subscriptionItems.currentUsage",
    response: currentUsageResponse,
    facade: () => getSubscriptionItemCurrentUsage(1),
    explicit: (client) => client.subscriptionItems.currentUsage(1),
  },
  {
    name: "updateSubscriptionItem object / subscriptionItems.update",
    response: singleResponse(subscriptionItemResource),
    facade: () =>
      updateSubscriptionItem(1, { quantity: 3, invoiceImmediately: false }),
    explicit: (client) =>
      client.subscriptionItems.update(1, {
        quantity: 3,
        invoiceImmediately: false,
      }),
  },
  {
    name: "updateSubscriptionItem number / subscriptionItems.update",
    response: singleResponse(subscriptionItemResource),
    facade: () => updateSubscriptionItem(1, 3),
    explicit: (client) => client.subscriptionItems.update(1, { quantity: 3 }),
  },
  {
    name: "createUsageRecord / usageRecords.create",
    response: singleResponse(usageRecordResource),
    facade: () =>
      createUsageRecord({ subscriptionItemId: 2, quantity: 5, action: "set" }),
    explicit: (client) =>
      client.usageRecords.create({
        subscriptionItemId: 2,
        quantity: 5,
        action: "set",
      }),
  },
  {
    name: "getUsageRecord / usageRecords.get",
    response: singleResponse(usageRecordResource),
    facade: () => getUsageRecord(1, { include: ["subscription-item"] }),
    explicit: (client) =>
      client.usageRecords.get(1, { include: ["subscription-item"] }),
  },
  {
    name: "listUsageRecords / usageRecords.list",
    response: listResponse(usageRecordResource),
    facade: () => listUsageRecords({ filter: { subscriptionItemId: 2 } }),
    explicit: (client) =>
      client.usageRecords.list({ filter: { subscriptionItemId: 2 } }),
  },
];

afterEach(() => {
  vi.unstubAllGlobals();
  setDefaultAdapter((request) => fetch(request));
});

describe("subscription item and usage record Compatibility projections", () => {
  it.each(cases)("compiles $name to the same CoreRequest", async (testCase) => {
    const facadeRequests: Request[] = [];
    const explicitRequests: Request[] = [];
    vi.stubGlobal("fetch", () => {
      throw new Error("Compatibility facade bypassed the Default Client");
    });
    setDefaultAdapter(async (request) => {
      facadeRequests.push(request);
      return Response.json(testCase.response);
    });
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
});

async function requestSnapshot(request: Request) {
  return {
    method: request.method,
    url: request.url,
    body: await request.clone().text(),
  };
}

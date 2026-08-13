import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cancelSubscription,
  getSubscription,
  lemonSqueezySetup,
  listSubscriptions,
  updateSubscription,
} from "../../src/compat";
import type { LemonSqueezyClient } from "../../src/client";
import {
  createClientWithAdapter,
  setDefaultAdapter,
} from "../../src/internal/testing";

const resource = {
  type: "subscriptions",
  id: "1",
  attributes: { future_field: "preserved" },
  relationships: {},
  links: { self: "https://api.lemonsqueezy.com/v1/subscriptions/1" },
} as const;

const singleResponse = {
  jsonapi: { version: "1.0" },
  links: { self: "https://api.lemonsqueezy.com/v1/subscriptions/1" },
  data: resource,
} as const;

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
  data: [resource],
} as const;

const cases: readonly {
  readonly name: string;
  readonly response: unknown;
  readonly facade: () => Promise<unknown>;
  readonly explicit: (client: LemonSqueezyClient) => Promise<unknown>;
}[] = [
  {
    name: "getSubscription / subscriptions.get",
    response: singleResponse,
    facade: () => getSubscription(1, { include: ["subscription-items"] }),
    explicit: (client) =>
      client.subscriptions.get(1, { include: ["subscription-items"] }),
  },
  {
    name: "listSubscriptions / subscriptions.list",
    response: listResponse,
    facade: () =>
      listSubscriptions({
        filter: { storeId: 1, userEmail: "", status: "paused" },
      }),
    explicit: (client) =>
      client.subscriptions.list({
        filter: { storeId: 1, userEmail: "", status: "paused" },
      }),
  },
  {
    name: "updateSubscription / subscriptions.update",
    response: singleResponse,
    facade: () =>
      updateSubscription(1, {
        pause: { mode: "free", resumesAt: null },
        cancelled: false,
        billingAnchor: 0,
      }),
    explicit: (client) =>
      client.subscriptions.update(1, {
        pause: { mode: "free", resumesAt: null },
        cancelled: false,
        billingAnchor: 0,
      }),
  },
  {
    name: "cancelSubscription / subscriptions.cancel",
    response: singleResponse,
    facade: () => cancelSubscription(1),
    explicit: (client) => client.subscriptions.cancel(1),
  },
];

afterEach(() => {
  vi.unstubAllGlobals();
  setDefaultAdapter((request) => fetch(request));
});

describe("subscription Compatibility projections", () => {
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

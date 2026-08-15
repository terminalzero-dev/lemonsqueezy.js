import { afterEach, describe, expect, it, vi } from "vitest";
import type { LemonSqueezyClient } from "../../src/client";
import {
  createWebhook,
  deleteWebhook,
  getWebhook,
  lemonSqueezySetup,
  listWebhooks,
  updateWebhook,
} from "../../src/compat";
import {
  createClientWithAdapter,
  setDefaultAdapter,
} from "../../src/internal/testing";

const webhookResource = {
  type: "webhooks",
  id: "42",
  attributes: { future_field: "preserved" },
  relationships: {},
  links: { self: "https://api.lemonsqueezy.com/v1/webhooks/42" },
} as const;

const webhookResponse = {
  jsonapi: { version: "1.0" },
  links: { self: webhookResource.links.self },
  data: webhookResource,
} as const;

const webhookListResponse = {
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
  data: [webhookResource],
} as const;

afterEach(() => {
  vi.unstubAllGlobals();
  setDefaultAdapter((request) => fetch(request));
});

describe("Webhook Management Compatibility projections", () => {
  it("uses the same CoreRequest for getWebhook and webhooks.get", async () => {
    const { facadeResult, explicitResult } = await invokeBoth(
      () => Response.json(webhookResponse),
      () => getWebhook(42, { include: ["store"] }),
      (client) => client.webhooks.get(42, { include: ["store"] }),
    );

    expect(facadeResult).toEqual({
      statusCode: 200,
      data: webhookResponse,
      error: null,
    });
    expect(explicitResult).toEqual(webhookResponse);
  });

  it("uses the same CoreRequest for createWebhook and webhooks.create", async () => {
    const webhook = {
      url: "https://example.com/webhooks",
      events: ["order_created", "affiliate_activated"],
      secret: "signing-secret",
      testMode: true,
    } as const;

    await invokeBoth(
      () => Response.json(webhookResponse, { status: 201 }),
      () => createWebhook(1, webhook),
      (client) => client.webhooks.create({ storeId: 1, ...webhook }),
    );
  });

  it("uses the same CoreRequest for updateWebhook and webhooks.update", async () => {
    const input = {
      url: "https://example.com/new-webhooks",
      events: ["customer_updated"],
      secret: "rotated-secret",
    } as const;

    await invokeBoth(
      () => Response.json(webhookResponse),
      () => updateWebhook(42, input),
      (client) => client.webhooks.update(42, input),
    );
  });

  it("uses the same CoreRequest for listWebhooks and webhooks.list", async () => {
    const params = { filter: { storeId: 1 }, page: { number: 1, size: 10 } };

    await invokeBoth(
      () => Response.json(webhookListResponse),
      () => listWebhooks(params),
      (client) => client.webhooks.list(params),
    );
  });

  it.each([204, 205])(
    "projects deleteWebhook %s as the actual status with null data and error",
    async (status) => {
      const { facadeResult, explicitResult } = await invokeBoth(
        () => new Response(null, { status }),
        () => deleteWebhook(42),
        (client) => client.webhooks.delete(42),
      );

      expect(facadeResult).toEqual({
        statusCode: status,
        data: null,
        error: null,
      });
      expect(explicitResult).toBeUndefined();
    },
  );
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

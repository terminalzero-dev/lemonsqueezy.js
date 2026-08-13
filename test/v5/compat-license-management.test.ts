import { afterEach, describe, expect, it, vi } from "vitest";
import type { LemonSqueezyClient } from "../../src/client";
import {
  getLicenseKey,
  getLicenseKeyInstance,
  lemonSqueezySetup,
  listLicenseKeyInstances,
  listLicenseKeys,
  updateLicenseKey,
} from "../../src/compat";
import {
  createClientWithAdapter,
  setDefaultAdapter,
} from "../../src/internal/testing";

const licenseKeyResource = {
  type: "license-keys",
  id: "42",
  attributes: { key: "business-license-key", future_field: "preserved" },
  relationships: {},
  links: { self: "https://api.lemonsqueezy.com/v1/license-keys/42" },
} as const;
const licenseKeyInstanceResource = {
  type: "license-key-instances",
  id: "51",
  attributes: { future_field: "preserved" },
  relationships: {},
  links: {
    self: "https://api.lemonsqueezy.com/v1/license-key-instances/51",
  },
} as const;

const singleResponse = (
  resource: typeof licenseKeyResource | typeof licenseKeyInstanceResource,
) => ({
  jsonapi: { version: "1.0" },
  links: { self: resource.links.self },
  data: resource,
});

const listResponse = (
  resource: typeof licenseKeyResource | typeof licenseKeyInstanceResource,
) => ({
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
});

const cases: readonly {
  readonly name: string;
  readonly response: unknown;
  readonly facade: () => Promise<unknown>;
  readonly explicit: (client: LemonSqueezyClient) => Promise<unknown>;
}[] = [
  {
    name: "getLicenseKey / licenseKeys.get",
    response: singleResponse(licenseKeyResource),
    facade: () => getLicenseKey(42, { include: ["order"] }),
    explicit: (client) => client.licenseKeys.get(42, { include: ["order"] }),
  },
  {
    name: "listLicenseKeys / licenseKeys.list",
    response: listResponse(licenseKeyResource),
    facade: () => listLicenseKeys({ filter: { storeId: 1, status: "active" } }),
    explicit: (client) =>
      client.licenseKeys.list({ filter: { storeId: 1, status: "active" } }),
  },
  {
    name: "updateLicenseKey / licenseKeys.update",
    response: singleResponse(licenseKeyResource),
    facade: () => updateLicenseKey(42, { activationLimit: 0 }),
    explicit: (client) => client.licenseKeys.update(42, { activationLimit: 0 }),
  },
  {
    name: "getLicenseKeyInstance / licenseKeyInstances.get",
    response: singleResponse(licenseKeyInstanceResource),
    facade: () => getLicenseKeyInstance(51, { include: ["license-key"] }),
    explicit: (client) =>
      client.licenseKeyInstances.get(51, { include: ["license-key"] }),
  },
  {
    name: "listLicenseKeyInstances / licenseKeyInstances.list",
    response: listResponse(licenseKeyInstanceResource),
    facade: () => listLicenseKeyInstances({ filter: { licenseKeyId: 42 } }),
    explicit: (client) =>
      client.licenseKeyInstances.list({ filter: { licenseKeyId: 42 } }),
  },
];

afterEach(() => {
  vi.unstubAllGlobals();
  setDefaultAdapter((request) => fetch(request));
  lemonSqueezySetup({});
});

describe("license management Compatibility projections", () => {
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
    lemonSqueezySetup({ apiKey: "facade-api-key" });
    const client = createClientWithAdapter(
      { apiKey: "explicit-api-key" },
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

  it("redacts a business License Key before the envelope and Error observer", async () => {
    const businessLicenseKey = "business-license-key-that-must-not-leak";
    let observedError: unknown;
    setDefaultAdapter(async () =>
      Response.json(
        {
          errors: [{ title: `Invalid License Key ${businessLicenseKey}` }],
        },
        { status: 422 },
      ),
    );
    lemonSqueezySetup({
      apiKey: "facade-api-key",
      onError(error) {
        observedError = error;
      },
    });

    const result = await getLicenseKey(42);

    expect(result).toMatchObject({
      statusCode: 422,
      data: null,
      error: {
        code: "http",
        responseBody: {
          errors: [
            {
              title: "[REDACTED]",
            },
          ],
        },
        apiErrors: [
          {
            title: "[REDACTED]",
          },
        ],
      },
    });
    expect(observedError).toBe(result.error);
    expect(JSON.stringify({ result, observedError })).not.toContain(
      businessLicenseKey,
    );
  });

  it("redacts a business License Key from facade network causes", async () => {
    const businessLicenseKey = "network-cause-business-key-that-must-not-leak";
    let observedError: unknown;
    setDefaultAdapter(async () => {
      throw new Error(businessLicenseKey);
    });
    lemonSqueezySetup({
      apiKey: "facade-api-key",
      onError(error) {
        observedError = error;
      },
    });

    const result = await getLicenseKey(42);

    expect(result).toMatchObject({
      error: { code: "network", cause: expect.any(Error) },
    });
    expect(result.error && String(result.error.cause)).toBe(
      "Error: [REDACTED]",
    );
    expect(observedError).toBe(result.error);
    expect(
      JSON.stringify({
        result,
        cause: result.error && String(result.error.cause),
      }),
    ).not.toContain(businessLicenseKey);
  });
});

async function requestSnapshot(request: Request) {
  return {
    method: request.method,
    url: request.url,
    body: await request.clone().text(),
  };
}

import { describe, expect, it } from "vitest";
import { createClientWithAdapter } from "../../internal/testing";

const licenseKeyInstanceResponse = {
  jsonapi: { version: "1.0" },
  links: {
    self: "https://api.lemonsqueezy.com/v1/license-key-instances/51",
  },
  data: {
    type: "license-key-instances",
    id: "51",
    attributes: {
      license_key_id: 42,
      identifier: "f70a79fa-6054-433e-9c1b-6075344292e4",
      name: "example.com",
      created_at: "2026-08-01T00:00:00.000000Z",
      updated_at: "2026-08-02T00:00:00.000000Z",
      future_field: { preserved: true },
    },
    relationships: {},
    links: {
      self: "https://api.lemonsqueezy.com/v1/license-key-instances/51",
    },
  },
} as const;

const licenseKeyInstanceListResponse = {
  jsonapi: { version: "1.0" },
  links: {
    first:
      "https://api.lemonsqueezy.com/v1/license-key-instances?page[number]=1",
    last: "https://api.lemonsqueezy.com/v1/license-key-instances?page[number]=1",
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
  data: [licenseKeyInstanceResponse.data],
} as const;

describe("licenseKeyInstances namespace", () => {
  it("retrieves a wire-native license key instance", async () => {
    const requests: Request[] = [];
    const client = createClientWithAdapter(
      { apiKey: "management-api-key" },
      async (request) => {
        requests.push(request);
        return Response.json(licenseKeyInstanceResponse);
      },
    );

    await expect(
      client.licenseKeyInstances.get("instance/51", {
        include: ["license-key"],
      }),
    ).resolves.toEqual(licenseKeyInstanceResponse);

    expect(requests).toHaveLength(1);
    expect(requests[0]?.method).toBe("GET");
    expect(requests[0]?.url).toBe(
      "https://api.lemonsqueezy.com/v1/license-key-instances/instance%2F51?include=license-key",
    );
    expect(requests[0]?.headers.get("authorization")).toBe(
      "Bearer management-api-key",
    );
  });

  it("lists license key instances with its documented filter and pagination", async () => {
    const requests: Request[] = [];
    const client = createClientWithAdapter(
      { apiKey: "management-api-key" },
      async (request) => {
        requests.push(request);
        return Response.json(licenseKeyInstanceListResponse);
      },
    );

    await expect(
      client.licenseKeyInstances.list({
        filter: { licenseKeyId: "key/42" },
        include: ["license-key"],
        page: { number: 0, size: 10 },
      }),
    ).resolves.toEqual(licenseKeyInstanceListResponse);

    const url = new URL(requests[0]!.url);
    expect(url.pathname).toBe("/v1/license-key-instances");
    expect(url.searchParams.get("filter[license_key_id]")).toBe("key/42");
    expect(url.searchParams.get("include")).toBe("license-key");
    expect(url.searchParams.get("page[number]")).toBe("0");
    expect(url.searchParams.get("page[size]")).toBe("10");
  });

  it("validates identifiers, request options, and API credentials before transport", async () => {
    let attempts = 0;
    const configured = createClientWithAdapter(
      { apiKey: "management-api-key" },
      async () => {
        attempts += 1;
        return Response.json(licenseKeyInstanceResponse);
      },
    );
    const unconfigured = createClientWithAdapter({}, async () => {
      attempts += 1;
      return Response.json(licenseKeyInstanceResponse);
    });

    await expect(configured.licenseKeyInstances.get("")).rejects.toMatchObject({
      code: "validation",
    });
    await expect(
      configured.licenseKeyInstances.list({}, { timeoutMs: 0 }),
    ).rejects.toMatchObject({ code: "validation" });
    await expect(
      unconfigured.licenseKeyInstances.get(51),
    ).rejects.toMatchObject({ code: "configuration" });

    expect(attempts).toBe(0);
  });

  it("redacts included business License Keys from invalid response errors", async () => {
    const businessLicenseKey = "included-business-key-that-must-not-leak";
    const client = createClientWithAdapter(
      { apiKey: "management-api-key" },
      async () =>
        Response.json({
          data: { type: "orders", id: "51", attributes: {} },
          included: [
            {
              type: "license-keys",
              id: "42",
              attributes: { key: businessLicenseKey },
            },
          ],
        }),
    );

    const error = await client.licenseKeyInstances
      .get(51, { include: ["license-key"] })
      .catch((reason) => reason);

    expect(error).toMatchObject({
      code: "invalid_response",
      statusCode: 200,
      responseBody: null,
    });
    expect(
      JSON.stringify({
        message: String(error),
        responseBody: error.responseBody,
        apiErrors: error.apiErrors,
        cause: error.cause,
      }),
    ).not.toContain(businessLicenseKey);
  });
});

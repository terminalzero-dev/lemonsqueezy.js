import { describe, expect, it } from "vitest";
import { createClientWithAdapter } from "../../internal/testing";

const licenseKeyResponse = {
  jsonapi: { version: "1.0" },
  links: { self: "https://api.lemonsqueezy.com/v1/license-keys/42" },
  data: {
    type: "license-keys",
    id: "42",
    attributes: {
      store_id: 1,
      customer_id: 2,
      order_id: 3,
      order_item_id: 4,
      product_id: 5,
      user_name: "Ada Lovelace",
      user_email: "ada@example.com",
      key: "business-license-key",
      key_short: "XXXX-license-key",
      activation_limit: 5,
      instances_count: 1,
      disabled: 0,
      status: "future_status",
      status_formatted: "Future status",
      expires_at: null,
      created_at: "2026-08-01T00:00:00.000000Z",
      updated_at: "2026-08-02T00:00:00.000000Z",
      future_field: { preserved: true },
    },
    relationships: {},
    links: { self: "https://api.lemonsqueezy.com/v1/license-keys/42" },
  },
} as const;

const licenseKeyListResponse = {
  jsonapi: { version: "1.0" },
  links: {
    first: "https://api.lemonsqueezy.com/v1/license-keys?page[number]=1",
    last: "https://api.lemonsqueezy.com/v1/license-keys?page[number]=1",
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
  data: [licenseKeyResponse.data],
} as const;

describe("licenseKeys namespace", () => {
  it("retrieves a wire-native license key with the API credential", async () => {
    const requests: Request[] = [];
    const client = createClientWithAdapter(
      { apiKey: "management-api-key" },
      async (request) => {
        requests.push(request);
        return Response.json(licenseKeyResponse);
      },
    );

    await expect(
      client.licenseKeys.get("key/42", {
        include: [
          "store",
          "customer",
          "order",
          "order-item",
          "product",
          "license-key-instances",
        ],
      }),
    ).resolves.toEqual(licenseKeyResponse);

    expect(requests).toHaveLength(1);
    expect(requests[0]?.method).toBe("GET");
    expect(requests[0]?.url).toBe(
      "https://api.lemonsqueezy.com/v1/license-keys/key%2F42?include=store%2Ccustomer%2Corder%2Corder-item%2Cproduct%2Clicense-key-instances",
    );
    expect(requests[0]?.headers.get("authorization")).toBe(
      "Bearer management-api-key",
    );
    expect(requests[0]?.headers.get("authorization")).not.toContain(
      "business-license-key",
    );
  });

  it("lists license keys with documented filters, includes, and pagination", async () => {
    const requests: Request[] = [];
    const client = createClientWithAdapter(
      { apiKey: "management-api-key" },
      async (request) => {
        requests.push(request);
        return Response.json(licenseKeyListResponse);
      },
    );

    await expect(
      client.licenseKeys.list({
        filter: {
          storeId: 1,
          orderId: 2,
          orderItemId: 3,
          productId: null,
          status: "active",
        },
        include: ["order"],
        page: { number: 0, size: 10 },
      }),
    ).resolves.toEqual(licenseKeyListResponse);

    const url = new URL(requests[0]!.url);
    expect(url.pathname).toBe("/v1/license-keys");
    expect(url.searchParams.get("filter[store_id]")).toBe("1");
    expect(url.searchParams.get("filter[order_id]")).toBe("2");
    expect(url.searchParams.get("filter[order_item_id]")).toBe("3");
    expect(url.searchParams.has("filter[product_id]")).toBe(false);
    expect(url.searchParams.get("filter[status]")).toBe("active");
    expect(url.searchParams.get("include")).toBe("order");
    expect(url.searchParams.get("page[number]")).toBe("0");
    expect(url.searchParams.get("page[size]")).toBe("10");
  });

  it("updates only explicit fields while preserving false, zero, and null", async () => {
    const requests: Request[] = [];
    const client = createClientWithAdapter(
      { apiKey: "management-api-key" },
      async (request) => {
        requests.push(request);
        return Response.json(licenseKeyResponse);
      },
    );

    await client.licenseKeys.update(42, { activationLimit: 0 });
    await client.licenseKeys.update(42, {
      activationLimit: null,
      expiresAt: null,
      disabled: false,
    });

    expect(requests).toHaveLength(2);
    expect(requests[0]?.method).toBe("PATCH");
    await expect(requests[0]?.json()).resolves.toEqual({
      data: {
        type: "license-keys",
        id: "42",
        attributes: { activation_limit: 0 },
      },
    });
    await expect(requests[1]?.json()).resolves.toEqual({
      data: {
        type: "license-keys",
        id: "42",
        attributes: {
          activation_limit: null,
          expires_at: null,
          disabled: false,
        },
      },
    });
  });

  it("rejects invalid inputs before transport", async () => {
    let attempts = 0;
    const client = createClientWithAdapter(
      { apiKey: "management-api-key" },
      async () => {
        attempts += 1;
        return Response.json(licenseKeyResponse);
      },
    );

    await expect(client.licenseKeys.get("")).rejects.toMatchObject({
      code: "validation",
    });
    await expect(
      client.licenseKeys.list({
        filter: { status: "future_status" as "active" },
      }),
    ).rejects.toMatchObject({ code: "validation" });
    await expect(client.licenseKeys.update(42, {})).rejects.toMatchObject({
      code: "validation",
    });
    await expect(
      client.licenseKeys.update(42, { activationLimit: -1 }),
    ).rejects.toMatchObject({ code: "validation" });
    await expect(
      client.licenseKeys.get(42, {}, { timeoutMs: 0 }),
    ).rejects.toMatchObject({ code: "validation" });

    expect(attempts).toBe(0);
  });

  it("requires an API credential without exposing a business License Key", async () => {
    let attempts = 0;
    const client = createClientWithAdapter({}, async () => {
      attempts += 1;
      return Response.json(licenseKeyResponse);
    });

    const error = await client.licenseKeys.get(42).catch((reason) => reason);

    expect(error).toMatchObject({ code: "configuration" });
    expect(String(error)).not.toContain("business-license-key");
    expect(attempts).toBe(0);
  });

  it("redacts business License Keys from failed response errors", async () => {
    const businessLicenseKey = "business-license-key-that-must-not-leak";
    const client = createClientWithAdapter(
      { apiKey: "management-api-key" },
      async () =>
        Response.json(
          {
            errors: [
              {
                title: `Invalid License Key ${businessLicenseKey}`,
                meta: { key: businessLicenseKey },
              },
            ],
            data: {
              type: "license-keys",
              id: "42",
              attributes: { key: businessLicenseKey },
            },
          },
          { status: 422 },
        ),
    );

    const error = await client.licenseKeys.get(42).catch((reason) => reason);

    expect(error).toMatchObject({
      code: "http",
      statusCode: 422,
      responseBody: null,
    });
    expect(error.apiErrors).toBeUndefined();
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

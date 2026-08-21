import { describe, expect, it, vi } from "vitest";
import { createClientWithAdapter } from "../../internal/testing";

const webhookResponse = {
  jsonapi: { version: "1.0" },
  links: { self: "https://api.lemonsqueezy.com/v1/webhooks/42" },
  data: {
    type: "webhooks",
    id: "42",
    attributes: {
      store_id: 1,
      url: "https://example.com/webhooks",
      events: ["subscription_created", "future_event"],
      last_sent_at: null,
      created_at: "2026-08-01T00:00:00.000000Z",
      updated_at: "2026-08-02T00:00:00.000000Z",
      test_mode: true,
      future_field: { preserved: true },
    },
    relationships: {},
    links: { self: "https://api.lemonsqueezy.com/v1/webhooks/42" },
  },
} as const;

const webhookListResponse = {
  jsonapi: { version: "1.0" },
  links: {
    first: "https://api.lemonsqueezy.com/v1/webhooks?page[number]=1",
    last: "https://api.lemonsqueezy.com/v1/webhooks?page[number]=1",
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
  data: [webhookResponse.data],
} as const;

describe("webhooks namespace", () => {
  it("retrieves a wire-native webhook", async () => {
    const requests: Request[] = [];
    const client = createClientWithAdapter(
      { apiKey: "webhooks-key" },
      async (request) => {
        requests.push(request);
        return Response.json(webhookResponse);
      },
    );

    await expect(
      client.webhooks.get("webhook/42", { include: ["store"] }),
    ).resolves.toEqual(webhookResponse);

    expect(requests).toHaveLength(1);
    expect(requests[0]?.method).toBe("GET");
    expect(requests[0]?.url).toBe(
      "https://api.lemonsqueezy.com/v1/webhooks/webhook%2F42?include=store",
    );
  });

  it("lists webhooks through the paginated list contract", async () => {
    const requests: Request[] = [];
    const client = createClientWithAdapter(
      { apiKey: "webhooks-key" },
      async (request) => {
        requests.push(request);
        return Response.json(webhookListResponse);
      },
    );

    await expect(
      client.webhooks.list({
        filter: { storeId: "store/1" },
        include: ["store"],
        page: { number: 0, size: 10 },
      }),
    ).resolves.toEqual(webhookListResponse);

    const url = new URL(requests[0]!.url);
    expect(url.pathname).toBe("/v1/webhooks");
    expect(url.searchParams.get("filter[store_id]")).toBe("store/1");
    expect(url.searchParams.get("include")).toBe("store");
    expect(url.searchParams.get("page[number]")).toBe("0");
    expect(url.searchParams.get("page[size]")).toBe("10");
  });

  it("creates a webhook with exact attributes and the Store relationship", async () => {
    const requests: Request[] = [];
    const client = createClientWithAdapter(
      { apiKey: "webhooks-key" },
      async (request) => {
        requests.push(request);
        return Response.json(webhookResponse, { status: 201 });
      },
    );

    await expect(
      client.webhooks.create({
        storeId: "store/1",
        url: "https://example.com/webhooks",
        events: ["customer_updated", "affiliate_activated"],
        secret: "signing-secret",
        testMode: true,
      }),
    ).resolves.toEqual(webhookResponse);

    expect(requests).toHaveLength(1);
    expect(requests[0]?.method).toBe("POST");
    expect(requests[0]?.url).toBe("https://api.lemonsqueezy.com/v1/webhooks");
    await expect(requests[0]?.json()).resolves.toEqual({
      data: {
        type: "webhooks",
        attributes: {
          url: "https://example.com/webhooks",
          events: ["customer_updated", "affiliate_activated"],
          secret: "signing-secret",
          test_mode: true,
        },
        relationships: {
          store: { data: { type: "stores", id: "store/1" } },
        },
      },
    });
    expect(webhookResponse.data.attributes).not.toHaveProperty("secret");
  });

  it("updates only provided webhook subscription fields", async () => {
    const requests: Request[] = [];
    const client = createClientWithAdapter(
      { apiKey: "webhooks-key" },
      async (request) => {
        requests.push(request);
        return Response.json(webhookResponse);
      },
    );

    await expect(
      client.webhooks.update("webhook/42", {
        events: ["subscription_payment_refunded"],
        secret: "rotated-secret",
      }),
    ).resolves.toEqual(webhookResponse);

    expect(requests).toHaveLength(1);
    expect(requests[0]?.method).toBe("PATCH");
    expect(requests[0]?.url).toBe(
      "https://api.lemonsqueezy.com/v1/webhooks/webhook%2F42",
    );
    await expect(requests[0]?.json()).resolves.toEqual({
      data: {
        type: "webhooks",
        id: "webhook/42",
        attributes: {
          events: ["subscription_payment_refunded"],
          secret: "rotated-secret",
        },
      },
    });
  });

  it.each([204, 205])(
    "deletes a webhook on empty %s success without reading the body",
    async (status) => {
      const requests: Request[] = [];
      const response = new Response(null, { status });
      const text = vi.spyOn(response, "text");
      const client = createClientWithAdapter(
        { apiKey: "webhooks-key" },
        async (request) => {
          requests.push(request);
          return response;
        },
      );

      await expect(client.webhooks.delete("webhook/42")).resolves.toBe(
        undefined,
      );

      expect(requests).toHaveLength(1);
      expect(requests[0]?.method).toBe("DELETE");
      expect(requests[0]?.url).toBe(
        "https://api.lemonsqueezy.com/v1/webhooks/webhook%2F42",
      );
      expect(text).not.toHaveBeenCalled();
    },
  );

  it("redacts a signing secret from Webhook Management failures", async () => {
    const secret = "sensitive-signing-secret";
    const client = createClientWithAdapter(
      { apiKey: "webhooks-key" },
      async () =>
        Response.json(
          {
            errors: [
              {
                title: "Invalid secret",
                detail: `The secret ${secret} was rejected.`,
                source: { pointer: "/data/attributes/secret" },
              },
            ],
            secret,
          },
          { status: 422 },
        ),
    );

    const error = await client.webhooks
      .create({
        storeId: 1,
        url: "https://example.com/webhooks",
        events: ["order_created"],
        secret,
      })
      .catch((cause: unknown) => cause);

    expect(error).toMatchObject({
      code: "http",
      statusCode: 422,
      responseBody: {
        errors: [
          {
            detail: "The secret [REDACTED] was rejected.",
            source: { pointer: "/data/attributes/secret" },
          },
        ],
        secret: "[REDACTED]",
      },
    });
    expect(JSON.stringify(error)).not.toContain(secret);
  });

  it("rejects invalid Webhook Management input before transport", async () => {
    let attempts = 0;
    const client = createClientWithAdapter(
      { apiKey: "webhooks-key" },
      async () => {
        attempts += 1;
        return Response.json(webhookResponse);
      },
    );

    await expect(client.webhooks.get("")).rejects.toMatchObject({
      code: "validation",
    });
    await expect(
      client.webhooks.create({
        storeId: 1,
        url: "not-a-url",
        events: ["order_created"],
        secret: "signing-secret",
      }),
    ).rejects.toMatchObject({ code: "validation" });
    await expect(
      client.webhooks.create({
        storeId: 1,
        url: "https://example.com/webhooks",
        events: ["inbound_unknown_event"],
        secret: "signing-secret",
      } as never),
    ).rejects.toMatchObject({ code: "validation" });
    await expect(client.webhooks.update(42, {})).rejects.toMatchObject({
      code: "validation",
    });
    await expect(
      client.webhooks.list({}, { timeoutMs: 0 }),
    ).rejects.toMatchObject({ code: "validation" });

    expect(attempts).toBe(0);
  });

  it("rejects authenticated operations without an API credential", async () => {
    let attempts = 0;
    const client = createClientWithAdapter({}, async () => {
      attempts += 1;
      return Response.json(webhookResponse);
    });

    await expect(client.webhooks.get(42)).rejects.toMatchObject({
      code: "configuration",
    });
    expect(attempts).toBe(0);
  });

  it("honors RequestOptions cancellation after one transport attempt", async () => {
    let attempts = 0;
    const controller = new AbortController();
    const client = createClientWithAdapter(
      { apiKey: "webhooks-key" },
      async () => {
        attempts += 1;
        controller.abort("caller-cancelled");
        return await new Promise<Response>(() => {});
      },
    );

    await expect(
      client.webhooks.list({}, { signal: controller.signal, timeoutMs: 1_000 }),
    ).rejects.toMatchObject({
      code: "aborted",
      cause: "caller-cancelled",
    });
    expect(attempts).toBe(1);
  });
});

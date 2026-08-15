import { describe, expect, it } from "vitest";
import { createClientWithAdapter } from "../../internal/testing";

const subscriptionResponse = {
  jsonapi: { version: "1.0" },
  links: { self: "https://api.lemonsqueezy.com/v1/subscriptions/42" },
  data: {
    type: "subscriptions",
    id: "42",
    attributes: {
      status: "active",
      payment_processor: "paypal",
      pause: null,
      urls: {
        update_payment_method: "https://example.com/payment",
        customer_portal: "https://example.com/portal",
        update_customer_portal: "https://example.com/paypal",
      },
      future_field: { preserved: true },
    },
    relationships: {},
    links: { self: "https://api.lemonsqueezy.com/v1/subscriptions/42" },
  },
} as const;

const subscriptionListResponse = {
  jsonapi: { version: "1.0" },
  links: {
    first: "https://api.lemonsqueezy.com/v1/subscriptions?page[number]=1",
    last: "https://api.lemonsqueezy.com/v1/subscriptions?page[number]=1",
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
  data: [subscriptionResponse.data],
} as const;

describe("subscriptions namespace", () => {
  it("retrieves a wire-native subscription without rejecting additive response data", async () => {
    const requests: Request[] = [];
    const client = createClientWithAdapter(
      { apiKey: "subscriptions-key" },
      async (request) => {
        requests.push(request);
        return Response.json(subscriptionResponse);
      },
    );

    await expect(
      client.subscriptions.get(
        "subscription/42",
        { include: ["subscription-items"] },
        { timeoutMs: 1_000 },
      ),
    ).resolves.toEqual(subscriptionResponse);

    expect(requests).toHaveLength(1);
    expect(requests[0]?.method).toBe("GET");
    expect(requests[0]?.url).toBe(
      "https://api.lemonsqueezy.com/v1/subscriptions/subscription%2F42?include=subscription-items",
    );
  });

  it("lists subscriptions with every documented filter", async () => {
    const requests: Request[] = [];
    const client = createClientWithAdapter(
      { apiKey: "subscriptions-key" },
      async (request) => {
        requests.push(request);
        return Response.json(subscriptionListResponse);
      },
    );

    await expect(
      client.subscriptions.list({
        filter: {
          storeId: 1,
          orderId: 2,
          orderItemId: 3,
          productId: 4,
          variantId: 5,
          userEmail: "",
          status: "paused",
        },
        include: ["product"],
        page: { number: 0, size: 10 },
      }),
    ).resolves.toEqual(subscriptionListResponse);

    const url = new URL(requests[0]!.url);
    expect(url.searchParams.get("filter[store_id]")).toBe("1");
    expect(url.searchParams.get("filter[order_id]")).toBe("2");
    expect(url.searchParams.get("filter[order_item_id]")).toBe("3");
    expect(url.searchParams.get("filter[product_id]")).toBe("4");
    expect(url.searchParams.get("filter[variant_id]")).toBe("5");
    expect(url.searchParams.get("filter[user_email]")).toBe("");
    expect(url.searchParams.get("filter[status]")).toBe("paused");
    expect(url.searchParams.get("include")).toBe("product");
    expect(url.searchParams.get("page[number]")).toBe("0");
  });

  it("updates only explicit fields and preserves nullable pause semantics", async () => {
    const requests: Request[] = [];
    const client = createClientWithAdapter(
      { apiKey: "subscriptions-key" },
      async (request) => {
        requests.push(request);
        return Response.json(subscriptionResponse);
      },
    );

    await client.subscriptions.update(42, {
      variantId: 7,
      pause: { mode: "void", resumesAt: null },
      cancelled: false,
      trialEndsAt: null,
      billingAnchor: 0,
      invoiceImmediately: false,
      disableProrations: false,
    });
    await client.subscriptions.update(42, { pause: null });

    expect(requests).toHaveLength(2);
    expect(requests[0]?.method).toBe("PATCH");
    await expect(requests[0]?.json()).resolves.toEqual({
      data: {
        type: "subscriptions",
        id: "42",
        attributes: {
          variant_id: 7,
          pause: { mode: "void", resumes_at: null },
          cancelled: false,
          trial_ends_at: null,
          billing_anchor: 0,
          invoice_immediately: false,
          disable_prorations: false,
        },
      },
    });
    await expect(requests[1]?.json()).resolves.toEqual({
      data: {
        type: "subscriptions",
        id: "42",
        attributes: { pause: null },
      },
    });
  });

  it("parses the Subscription body returned by cancellation", async () => {
    const requests: Request[] = [];
    const client = createClientWithAdapter(
      { apiKey: "subscriptions-key" },
      async (request) => {
        requests.push(request);
        return Response.json(subscriptionResponse);
      },
    );

    await expect(client.subscriptions.cancel(42)).resolves.toEqual(
      subscriptionResponse,
    );

    expect(requests).toHaveLength(1);
    expect(requests[0]?.method).toBe("DELETE");
    expect(requests[0]?.url).toBe(
      "https://api.lemonsqueezy.com/v1/subscriptions/42",
    );
  });

  it("rejects invalid input before transport and attempts a valid call once", async () => {
    let attempts = 0;
    const client = createClientWithAdapter(
      { apiKey: "subscriptions-key" },
      async () => {
        attempts += 1;
        return Response.json(subscriptionResponse);
      },
    );

    await expect(client.subscriptions.get("")).rejects.toMatchObject({
      code: "validation",
    });
    await expect(
      client.subscriptions.list({
        filter: { status: "future_status" as "active" },
      }),
    ).rejects.toMatchObject({ code: "validation" });
    await expect(
      client.subscriptions.update(42, {
        pause: { mode: "hold" as "void" },
      }),
    ).rejects.toMatchObject({ code: "validation" });
    await expect(
      client.subscriptions.get(42, {}, { timeoutMs: 0 }),
    ).rejects.toMatchObject({ code: "validation" });
    expect(attempts).toBe(0);

    await client.subscriptions.cancel(42);
    expect(attempts).toBe(1);
  });
});

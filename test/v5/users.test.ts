import { describe, expect, it, vi } from "vitest";
import { isLemonSqueezyError } from "../../src/client";
import { createClientWithAdapter } from "../../src/internal/testing";
import { userResponse } from "./fixtures";

describe("users.getAuthenticated", () => {
  it("retrieves the authenticated user through an immutable explicit client", async () => {
    const requests: Request[] = [];
    const client = createClientWithAdapter(
      { apiKey: "explicit-key" },
      async (request) => {
        requests.push(request);
        return Response.json(userResponse);
      },
    );

    await expect(client.users.getAuthenticated()).resolves.toEqual(
      userResponse,
    );
    expect(Object.isFrozen(client)).toBe(true);
    expect(Object.isFrozen(client.users)).toBe(true);
    expect(requests).toHaveLength(1);
    expect(requests[0]?.url).toBe("https://api.lemonsqueezy.com/v1/users/me");
    expect(requests[0]?.method).toBe("GET");
    expect(requests[0]?.headers.get("accept")).toBe("application/vnd.api+json");
    expect(requests[0]?.headers.get("content-type")).toBe(
      "application/vnd.api+json",
    );
    expect(requests[0]?.headers.get("authorization")).toBe(
      "Bearer explicit-key",
    );
  });

  it("rejects a missing API credential before transport", async () => {
    let attempts = 0;
    const client = createClientWithAdapter({}, async () => {
      attempts += 1;
      return Response.json(userResponse);
    });

    const error = await client.users.getAuthenticated().catch((cause) => cause);

    expect(isLemonSqueezyError(error)).toBe(true);
    expect(error).toMatchObject({
      name: "LemonSqueezyError",
      code: "configuration",
      statusCode: null,
      responseBody: null,
    });
    expect(attempts).toBe(0);
  });

  it.each([
    {
      name: "JSON:API errors",
      response: () =>
        Response.json(
          {
            errors: [
              { status: "422", title: "Unprocessable Entity", detail: "Bad" },
            ],
          },
          { status: 422 },
        ),
      expected: {
        statusCode: 422,
        responseBody: {
          errors: [
            { status: "422", title: "Unprocessable Entity", detail: "Bad" },
          ],
        },
        apiErrors: [
          { status: "422", title: "Unprocessable Entity", detail: "Bad" },
        ],
      },
    },
    {
      name: "text errors",
      response: () => new Response("upstream failed", { status: 500 }),
      expected: {
        statusCode: 500,
        responseBody: "upstream failed",
        apiErrors: undefined,
      },
    },
  ])("classifies $name as HTTP failures", async ({ response, expected }) => {
    const client = createClientWithAdapter(
      { apiKey: "explicit-key" },
      async () => response(),
    );

    await expect(client.users.getAuthenticated()).rejects.toMatchObject({
      name: "LemonSqueezyError",
      code: "http",
      ...expected,
    });
  });

  it.each([
    {
      name: "an empty body",
      response: () => new Response("", { status: 200 }),
      responseBody: null,
    },
    {
      name: "malformed JSON",
      response: () => new Response("not-json", { status: 200 }),
      responseBody: "not-json",
    },
    {
      name: "an invalid JSON:API resource",
      response: () => Response.json({ data: { type: "users", id: 1 } }),
      responseBody: { data: { type: "users", id: 1 } },
    },
  ])(
    "classifies $name on a successful status as an invalid response",
    async ({ response, responseBody }) => {
      const client = createClientWithAdapter(
        { apiKey: "explicit-key" },
        async () => response(),
      );

      await expect(client.users.getAuthenticated()).rejects.toMatchObject({
        name: "LemonSqueezyError",
        code: "invalid_response",
        statusCode: 200,
        responseBody,
      });
    },
  );

  it("classifies a transport failure as a single-attempt network error", async () => {
    const transportFailure = new TypeError("socket closed");
    let attempts = 0;
    const client = createClientWithAdapter(
      { apiKey: "explicit-key" },
      async () => {
        attempts += 1;
        throw transportFailure;
      },
    );

    await expect(client.users.getAuthenticated()).rejects.toMatchObject({
      code: "network",
      statusCode: null,
      responseBody: null,
      cause: transportFailure,
    });
    expect(attempts).toBe(1);
  });

  it("distinguishes caller cancellation from the SDK timeout", async () => {
    const caller = new AbortController();
    const callerReason = new Error("caller stopped");
    let attempts = 0;
    const client = createClientWithAdapter(
      { apiKey: "explicit-key", timeoutMs: 10_000 },
      (request) => {
        attempts += 1;
        return new Promise((_resolve, reject) => {
          request.signal.addEventListener(
            "abort",
            () => reject(request.signal.reason),
            { once: true },
          );
        });
      },
    );

    const cancelled = client.users.getAuthenticated({ signal: caller.signal });
    caller.abort(callerReason);

    await expect(cancelled).rejects.toMatchObject({
      code: "aborted",
      cause: callerReason,
    });
    await expect(
      client.users.getAuthenticated({ timeoutMs: 1 }),
    ).rejects.toMatchObject({ code: "timeout" });
    expect(attempts).toBe(2);
  });

  it("does not attempt transport for a pre-aborted signal or invalid timeout", async () => {
    let attempts = 0;
    const client = createClientWithAdapter(
      { apiKey: "explicit-key" },
      async () => {
        attempts += 1;
        return Response.json(userResponse);
      },
    );
    const caller = new AbortController();
    caller.abort("already stopped");

    await expect(
      client.users.getAuthenticated({ signal: caller.signal }),
    ).rejects.toMatchObject({ code: "aborted", cause: "already stopped" });

    for (const timeoutMs of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      await expect(
        client.users.getAuthenticated({ timeoutMs }),
      ).rejects.toMatchObject({ code: "validation" });
    }

    expect(attempts).toBe(0);
  });

  it.each([204, 205])("does not parse an empty %s response", async (status) => {
    const client = createClientWithAdapter(
      { apiKey: "explicit-key" },
      async () => new Response(null, { status }),
    );

    await expect(client.users.getAuthenticated()).resolves.toBeUndefined();
  });

  it("copies client configuration instead of observing later mutations", async () => {
    const requests: Request[] = [];
    const options: { apiKey?: string } = { apiKey: "captured-key" };
    const client = createClientWithAdapter(options, async (request) => {
      requests.push(request);
      return Response.json(userResponse);
    });

    options.apiKey = "mutated-key";
    await client.users.getAuthenticated();

    expect(requests[0]?.headers.get("authorization")).toBe(
      "Bearer captured-key",
    );
  });

  it("uses a 30-second default timeout", async () => {
    vi.useFakeTimers();
    let aborted = false;
    const client = createClientWithAdapter(
      { apiKey: "explicit-key" },
      (request) =>
        new Promise((_resolve, reject) => {
          request.signal.addEventListener(
            "abort",
            () => {
              aborted = true;
              reject(request.signal.reason);
            },
            { once: true },
          );
        }),
    );

    try {
      const result = client.users.getAuthenticated();
      const rejection = expect(result).rejects.toMatchObject({
        code: "timeout",
      });
      await vi.advanceTimersByTimeAsync(29_999);
      expect(aborted).toBe(false);
      await vi.advanceTimersByTimeAsync(1);
      expect(aborted).toBe(true);
      await rejection;
    } finally {
      vi.useRealTimers();
    }
  });

  it("keeps caller cancellation active while reading the response body", async () => {
    const caller = new AbortController();
    const reason = new Error("stop reading");
    const client = createClientWithAdapter(
      { apiKey: "explicit-key" },
      async () =>
        new Response(
          new ReadableStream({
            start() {
              // Keep the body pending until request cancellation wins the race.
            },
          }),
        ),
    );

    const result = client.users.getAuthenticated({ signal: caller.signal });
    caller.abort(reason);

    await expect(result).rejects.toMatchObject({
      code: "aborted",
      cause: reason,
    });
  });

  it("keeps the SDK timeout active while reading the response body", async () => {
    vi.useFakeTimers();
    const client = createClientWithAdapter(
      { apiKey: "explicit-key" },
      async () =>
        new Response(
          new ReadableStream({
            start() {
              // Keep the body pending until the SDK timeout wins the race.
            },
          }),
        ),
    );

    try {
      const result = client.users.getAuthenticated({ timeoutMs: 10 });
      const rejection = expect(result).rejects.toMatchObject({
        code: "timeout",
      });
      await vi.advanceTimersByTimeAsync(10);
      await rejection;
    } finally {
      vi.useRealTimers();
    }
  });
});

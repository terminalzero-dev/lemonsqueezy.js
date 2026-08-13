import { afterEach, describe, expect, it, vi } from "vitest";
import { getAuthenticatedUser, lemonSqueezySetup } from "../../src/compat";
import {
  createClientWithAdapter,
  setDefaultAdapter,
} from "../../src/internal/testing";
import { userResponse } from "./fixtures";

afterEach(() => {
  setDefaultAdapter((request) => fetch(request));
});

describe("getAuthenticatedUser compatibility facade", () => {
  it("shares the users operation while keeping explicit clients isolated", async () => {
    const facadeRequests: Request[] = [];
    const explicitRequests: Request[] = [];
    setDefaultAdapter(async (request) => {
      facadeRequests.push(request);
      return Response.json(userResponse);
    });
    const explicit = createClientWithAdapter(
      { apiKey: "explicit-key" },
      async (request) => {
        explicitRequests.push(request);
        return Response.json(userResponse);
      },
    );

    lemonSqueezySetup({ apiKey: "first-default-key" });
    lemonSqueezySetup({ apiKey: "second-default-key" });

    await expect(getAuthenticatedUser()).resolves.toEqual({
      statusCode: 200,
      data: userResponse,
      error: null,
    });
    await explicit.users.getAuthenticated();

    expect(facadeRequests[0]?.url).toBe(explicitRequests[0]?.url);
    expect(facadeRequests[0]?.method).toBe(explicitRequests[0]?.method);
    expect(facadeRequests[0]?.headers.get("authorization")).toBe(
      "Bearer second-default-key",
    );
    expect(explicitRequests[0]?.headers.get("authorization")).toBe(
      "Bearer explicit-key",
    );
  });

  it("isolates a throwing onError observer from one error envelope", async () => {
    const observer = vi.fn(() => {
      throw new Error("observer failed");
    });
    setDefaultAdapter(async () =>
      Response.json(
        { errors: [{ status: "401", title: "Unauthorized" }] },
        { status: 401 },
      ),
    );
    lemonSqueezySetup({ apiKey: "bad-key", onError: observer });

    const result = await getAuthenticatedUser();

    expect(result).toMatchObject({
      statusCode: 401,
      data: null,
      error: { code: "http", statusCode: 401 },
    });
    expect(observer).toHaveBeenCalledOnce();
    expect(observer).toHaveBeenCalledWith(result.error);
  });

  it("returns a missing-credential envelope without transport", async () => {
    const observer = vi.fn();
    const adapter = vi.fn(async () => Response.json(userResponse));
    setDefaultAdapter(adapter);
    lemonSqueezySetup({ apiKey: "", onError: observer });

    await expect(getAuthenticatedUser()).resolves.toMatchObject({
      statusCode: null,
      data: null,
      error: { code: "configuration" },
    });
    expect(adapter).not.toHaveBeenCalled();
    expect(observer).toHaveBeenCalledOnce();
  });

  it("projects an empty read response as invalid and rejects local validation", async () => {
    const observer = vi.fn();
    setDefaultAdapter(async () => new Response(null, { status: 204 }));
    lemonSqueezySetup({ apiKey: "default-key", onError: observer });

    await expect(getAuthenticatedUser()).resolves.toMatchObject({
      statusCode: 204,
      data: null,
      error: { code: "invalid_response", statusCode: 204 },
    });
    expect(observer).toHaveBeenCalledOnce();

    lemonSqueezySetup({
      apiKey: "default-key",
      timeoutMs: 0,
      onError: observer,
    });
    await expect(getAuthenticatedUser()).rejects.toMatchObject({
      code: "validation",
    });
    expect(observer).toHaveBeenCalledOnce();
  });

  it.each([
    {
      name: "text HTTP error",
      adapter: async () => new Response("upstream failed", { status: 500 }),
      timeoutMs: 30_000,
      expected: { code: "http", statusCode: 500 },
    },
    {
      name: "network error",
      adapter: async () => {
        throw new TypeError("socket closed");
      },
      timeoutMs: 30_000,
      expected: { code: "network", statusCode: null },
    },
    {
      name: "invalid response",
      adapter: async () => new Response("not-json", { status: 200 }),
      timeoutMs: 30_000,
      expected: { code: "invalid_response", statusCode: 200 },
    },
    {
      name: "timeout",
      adapter: async () => new Promise<Response>(() => {}),
      timeoutMs: 1,
      expected: { code: "timeout", statusCode: null },
    },
  ])(
    "projects one $name envelope and observer notification",
    async ({ adapter, timeoutMs, expected }) => {
      const observer = vi.fn();
      setDefaultAdapter(adapter);
      lemonSqueezySetup({
        apiKey: "default-key",
        timeoutMs,
        onError: observer,
      });

      const result = await getAuthenticatedUser();

      expect(result).toMatchObject({
        statusCode: expected.statusCode,
        data: null,
        error: expected,
      });
      expect(observer).toHaveBeenCalledOnce();
      expect(observer).toHaveBeenCalledWith(result.error);
    },
  );
});

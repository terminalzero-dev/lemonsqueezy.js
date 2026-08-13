import { afterEach, describe, expect, it, vi } from "vitest";
import { getAuthenticatedUser, lemonSqueezySetup } from "../../src/compat";
import {
  createClientWithAdapter,
  setDefaultAdapter,
} from "../../src/internal/testing";

const userResponse = {
  meta: { test_mode: true },
  jsonapi: { version: "1.0" },
  links: { self: "https://api.lemonsqueezy.com/v1/users/1" },
  data: {
    type: "users",
    id: "1",
    attributes: {
      name: "Ada Lovelace",
      email: "ada@example.com",
      color: "#898FA9",
      avatar_url: "https://example.com/avatar.png",
      has_custom_avatar: true,
      created_at: "2024-05-24T14:08:31.000000Z",
      updated_at: "2024-08-26T13:24:54.000000Z",
    },
    links: { self: "https://api.lemonsqueezy.com/v1/users/1" },
  },
} as const;

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

  it("projects empty success and rejects validation without notifying onError", async () => {
    const observer = vi.fn();
    setDefaultAdapter(async () => new Response(null, { status: 204 }));
    lemonSqueezySetup({ apiKey: "default-key", onError: observer });

    await expect(getAuthenticatedUser()).resolves.toEqual({
      statusCode: 204,
      data: null,
      error: null,
    });

    lemonSqueezySetup({
      apiKey: "default-key",
      timeoutMs: 0,
      onError: observer,
    });
    await expect(getAuthenticatedUser()).rejects.toMatchObject({
      code: "validation",
    });
    expect(observer).not.toHaveBeenCalled();
  });
});

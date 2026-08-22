import { afterEach, describe, expect, it, vi } from "vitest";
import type { LemonSqueezyClient } from "../../src/client";
import {
  activateLicense,
  deactivateLicense,
  lemonSqueezySetup,
  validateLicense,
} from "../../src/compat";
import {
  createClientWithAdapter,
  setDefaultAdapter,
} from "../../src/internal/testing";

const cases: readonly {
  readonly name: string;
  readonly response: Readonly<Record<string, unknown>>;
  readonly facade: () => Promise<unknown>;
  readonly explicit: (client: LemonSqueezyClient) => Promise<unknown>;
}[] = [
  {
    name: "activateLicense / license.activate",
    response: { activated: true, error: null },
    facade: () => activateLicense("business-key", "Work laptop"),
    explicit: (client) =>
      client.license.activate({
        licenseKey: "business-key",
        instanceName: "Work laptop",
      }),
  },
  {
    name: "validateLicense / license.validate",
    response: { valid: false, error: "License Key is invalid." },
    facade: () => validateLicense("business-key", "instance-42"),
    explicit: (client) =>
      client.license.validate({
        licenseKey: "business-key",
        instanceId: "instance-42",
      }),
  },
  {
    name: "deactivateLicense / license.deactivate",
    response: { deactivated: false, error: "Instance was not found." },
    facade: () => deactivateLicense("business-key", "instance-42"),
    explicit: (client) =>
      client.license.deactivate({
        licenseKey: "business-key",
        instanceId: "instance-42",
      }),
  },
];

afterEach(() => {
  vi.unstubAllGlobals();
  setDefaultAdapter((request) => fetch(request));
  lemonSqueezySetup({});
});

describe("License API Compatibility projections", () => {
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
    lemonSqueezySetup({ apiKey: "must-not-be-used" });
    const client = createClientWithAdapter({}, async (request) => {
      explicitRequests.push(request);
      return Response.json(testCase.response);
    });

    await expect(testCase.facade()).resolves.toEqual({
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

  it("preserves HTTP and invalid-response envelopes with redaction", async () => {
    setDefaultAdapter(async () =>
      Response.json(
        { error: "A required field was invalid." },
        { status: 422 },
      ),
    );
    await expect(validateLicense("business-key")).resolves.toMatchObject({
      statusCode: 422,
      data: null,
      error: {
        code: "http",
        responseBody: { error: "A required field was invalid." },
      },
    });

    const observer = vi.fn();
    setDefaultAdapter(async () =>
      Response.json({
        error: "Could not validate business-key for instance-42.",
        license_key: { key: "business-key" },
        instance: { id: "instance-42" },
      }),
    );
    lemonSqueezySetup({ onError: observer });
    const result = await validateLicense("business-key", "instance-42");

    expect(result).toMatchObject({
      statusCode: 200,
      data: null,
      error: {
        code: "invalid_response",
        responseBody: {
          error: "Could not validate [REDACTED] for [REDACTED].",
          license_key: "[REDACTED]",
          instance: "[REDACTED]",
        },
      },
    });
    expect(observer).toHaveBeenCalledOnce();
    expect(observer).toHaveBeenCalledWith(result.error);
  });

  it("sanitizes the Compatibility envelope before notifying the Error observer", async () => {
    const licenseKey = "secret-business-license-key";
    const observer = vi.fn();
    setDefaultAdapter(async () => {
      throw new Error(`Network rejected ${licenseKey}.`);
    });
    lemonSqueezySetup({ onError: observer });

    const result = await validateLicense(licenseKey);

    expect(result).toMatchObject({
      statusCode: null,
      data: null,
      error: {
        code: "network",
        cause: { message: "Network rejected [REDACTED]." },
      },
    });
    expect(observer).toHaveBeenCalledOnce();
    expect(observer).toHaveBeenCalledWith(result.error);
    expect(String(result.error?.cause)).not.toContain(licenseKey);
  });

  it("rejects positional validation before transport or observer notification", async () => {
    const adapter = vi.fn(async () => Response.json({ valid: true }));
    const observer = vi.fn();
    setDefaultAdapter(adapter);
    lemonSqueezySetup({ onError: observer });

    await expect(validateLicense("")).rejects.toMatchObject({
      code: "validation",
    });
    expect(adapter).not.toHaveBeenCalled();
    expect(observer).not.toHaveBeenCalled();
  });
});

async function requestSnapshot(request: Request) {
  return {
    method: request.method,
    url: request.url,
    accept: request.headers.get("accept"),
    contentType: request.headers.get("content-type"),
    authorization: request.headers.get("authorization"),
    body: await request.clone().text(),
  };
}

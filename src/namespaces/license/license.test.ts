import { describe, expect, it } from "vitest";
import { createClientWithAdapter } from "../../internal/testing";

describe("license namespace", () => {
  it("activates a License Key through the form-encoded License API without credentials", async () => {
    const requests: Request[] = [];
    const response = {
      activated: true,
      error: null,
      future_field: { preserved: true },
    } as const;
    const client = createClientWithAdapter({}, async (request) => {
      requests.push(request);
      return Response.json(response);
    });

    await expect(
      client.license.activate({
        licenseKey: "business-license-key",
        instanceName: "Work laptop",
      }),
    ).resolves.toEqual(response);

    expect(requests).toHaveLength(1);
    expect(requests[0]?.method).toBe("POST");
    expect(requests[0]?.url).toBe(
      "https://api.lemonsqueezy.com/v1/licenses/activate",
    );
    expect(requests[0]?.headers.get("accept")).toBe("application/json");
    expect(requests[0]?.headers.get("content-type")).toBe(
      "application/x-www-form-urlencoded",
    );
    expect(requests[0]?.headers.has("authorization")).toBe(false);
    expect(await requests[0]?.clone().text()).toBe(
      "license_key=business-license-key&instance_name=Work+laptop",
    );
  });

  it("validates an instance and preserves a business-negative response", async () => {
    const requests: Request[] = [];
    const response = {
      valid: false,
      error: "The License Key instance is not valid.",
    } as const;
    const client = createClientWithAdapter({}, async (request) => {
      requests.push(request);
      return Response.json(response);
    });

    await expect(
      client.license.validate({
        licenseKey: "business-license-key",
        instanceId: "instance-42",
        ignored: "must-not-be-sent",
      } as never),
    ).resolves.toEqual(response);

    expect(requests).toHaveLength(1);
    expect(await requests[0]?.clone().text()).toBe(
      "license_key=business-license-key&instance_id=instance-42",
    );
  });

  it("deactivates exactly one License Key instance", async () => {
    const requests: Request[] = [];
    const response = {
      deactivated: false,
      error: "Instance not found.",
    } as const;
    const client = createClientWithAdapter({}, async (request) => {
      requests.push(request);
      return Response.json(response);
    });

    await expect(
      client.license.deactivate({
        licenseKey: "business-license-key",
        instanceId: "instance-42",
      }),
    ).resolves.toEqual(response);

    expect(requests).toHaveLength(1);
    expect(requests[0]?.url).toBe(
      "https://api.lemonsqueezy.com/v1/licenses/deactivate",
    );
    expect(await requests[0]?.clone().text()).toBe(
      "license_key=business-license-key&instance_id=instance-42",
    );
  });

  it("classifies malformed success bodies without exposing License or instance data", async () => {
    const licenseKey = "secret-business-license-key";
    const instanceId = "secret-instance-id";
    const client = createClientWithAdapter({}, async () =>
      Response.json({
        error: `Could not validate ${licenseKey} for ${instanceId}.`,
        license_key: { key: licenseKey },
        instance: { id: instanceId },
      }),
    );

    const error = await client.license
      .validate({ licenseKey, instanceId })
      .catch((cause: unknown) => cause);

    expect(error).toMatchObject({
      code: "invalid_response",
      statusCode: 200,
      responseBody: {
        error: "Could not validate [REDACTED] for [REDACTED].",
        license_key: "[REDACTED]",
        instance: "[REDACTED]",
      },
    });
    expect(JSON.stringify(error)).not.toContain(licenseKey);
    expect(JSON.stringify(error)).not.toContain(instanceId);
  });

  it("retains an HTTP failure status and safe body without crossing protocol headers", async () => {
    const requests: Request[] = [];
    const responseBody = { error: "A required field was invalid." } as const;
    const client = createClientWithAdapter(
      { apiKey: "authenticated-api-key" },
      async (request) => {
        requests.push(request);
        return Response.json(responseBody, { status: 422 });
      },
    );

    await expect(
      client.license.activate({
        licenseKey: "business-license-key",
        instanceName: "Work laptop",
      }),
    ).rejects.toMatchObject({
      code: "http",
      statusCode: 422,
      responseBody,
    });
    expect(requests).toHaveLength(1);
    expect(requests[0]?.headers.has("authorization")).toBe(false);
  });

  it("rejects invalid inputs and RequestOptions before transport", async () => {
    let attempts = 0;
    const client = createClientWithAdapter({}, async () => {
      attempts += 1;
      return Response.json({ valid: true });
    });

    await expect(
      client.license.activate({ licenseKey: "", instanceName: "Laptop" }),
    ).rejects.toMatchObject({ code: "validation" });
    await expect(
      client.license.validate(
        { licenseKey: "business-license-key" },
        {
          timeoutMs: 0,
        },
      ),
    ).rejects.toMatchObject({ code: "validation" });
    await expect(
      client.license.deactivate({
        licenseKey: "business-license-key",
        instanceId: "",
      }),
    ).rejects.toMatchObject({ code: "validation" });
    expect(attempts).toBe(0);
  });
});

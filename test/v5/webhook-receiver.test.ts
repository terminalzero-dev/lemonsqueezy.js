import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { isWebhookError, parseWebhookEvent } from "../../src";

function signatureFor(rawBody: string | Uint8Array, secret = "test-secret") {
  return createHmac("sha256", secret).update(rawBody).digest("hex");
}

function caughtError(run: () => unknown): unknown {
  try {
    run();
  } catch (error) {
    return error;
  }

  throw new Error("Expected operation to throw");
}

describe("parseWebhookEvent", () => {
  it("authenticates an exact raw body before returning its signed event", () => {
    const rawBody =
      '{"meta":{"event_name":"order_created"},"data":{"type":"orders","id":"1"}}';

    expect(
      parseWebhookEvent({
        secret: "whsec_test",
        rawBody,
        signature:
          "af4b38ef6309cd13c5ba6a37b5032caeaddc0d2683278dbab2e3c3894e7d383a",
      }),
    ).toMatchObject({
      known: true,
      eventName: "order_created",
      meta: { event_name: "order_created" },
      data: { type: "orders", id: "1" },
    });
  });

  it.each([
    ["order_created", "orders"],
    ["order_refunded", "orders"],
    ["customer_updated", "customers"],
    ["subscription_created", "subscriptions"],
    ["subscription_updated", "subscriptions"],
    ["subscription_cancelled", "subscriptions"],
    ["subscription_resumed", "subscriptions"],
    ["subscription_expired", "subscriptions"],
    ["subscription_paused", "subscriptions"],
    ["subscription_unpaused", "subscriptions"],
    ["subscription_payment_success", "subscription-invoices"],
    ["subscription_payment_failed", "subscription-invoices"],
    ["subscription_payment_recovered", "subscription-invoices"],
    ["subscription_payment_refunded", "subscription-invoices"],
    ["license_key_created", "license-keys"],
    ["license_key_updated", "license-keys"],
    ["affiliate_activated", "affiliates"],
  ])("narrows %s to %s", (eventName, resourceType) => {
    const rawBody = JSON.stringify({
      meta: { event_name: eventName },
      data: { type: resourceType, id: "event-resource" },
    });

    expect(
      parseWebhookEvent({
        secret: "test-secret",
        rawBody,
        signature: signatureFor(rawBody),
      }),
    ).toMatchObject({ known: true, eventName, data: { type: resourceType } });
  });

  it("does not expose authenticated raw body content through payload errors", () => {
    const rawBody = "private-payload-content";

    try {
      parseWebhookEvent({
        secret: "private-signing-secret",
        rawBody,
        signature: signatureFor(rawBody, "private-signing-secret"),
      });
      expect.unreachable("invalid JSON should fail");
    } catch (error) {
      expect(isWebhookError(error)).toBe(true);
      expect(error).toMatchObject({ code: "invalid_payload" });
      expect(String(error)).not.toContain("private");
      expect(String((error as Error).cause)).not.toContain("private");
    }
  });

  it("authenticates Unicode string bodies as UTF-8 bytes", () => {
    const rawBody = JSON.stringify({
      meta: { event_name: "customer_updated", custom_data: { name: "柠檬🍋" } },
      data: { type: "customers", id: "unicode" },
    });

    expect(
      parseWebhookEvent({
        secret: "unicode-secret",
        rawBody,
        signature: signatureFor(rawBody, "unicode-secret"),
      }),
    ).toMatchObject({
      known: true,
      meta: { custom_data: { name: "柠檬🍋" } },
    });
  });

  it("authenticates only the exact Uint8Array view bytes", () => {
    const rawBody =
      '{"meta":{"event_name":"customer_updated"},"data":{"type":"customers","id":"2"}}';
    const framed = new TextEncoder().encode(`prefix:${rawBody}:suffix`);
    const view = framed.subarray(
      7,
      7 + new TextEncoder().encode(rawBody).length,
    );

    expect(
      parseWebhookEvent({
        secret: "view-secret",
        rawBody: view,
        signature:
          "cb98d818d34646fd9e480114aba557f80a1f99167ddfa041e386dea3d7755c0c",
      }),
    ).toMatchObject({ known: true, eventName: "customer_updated" });
  });

  it.each(["array-buffer", "node-buffer"])(
    "accepts exact bytes from a %s body",
    (bodyKind) => {
      const rawBody = JSON.stringify({
        meta: { event_name: "order_refunded" },
        data: { type: "orders", id: bodyKind },
      });
      const bytes = new TextEncoder().encode(rawBody);
      const body =
        bodyKind === "array-buffer"
          ? bytes.buffer
          : Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);

      expect(
        parseWebhookEvent({
          secret: "binary-secret",
          rawBody: body,
          signature: signatureFor(bytes, "binary-secret"),
        }),
      ).toMatchObject({ known: true, data: { id: bodyKind } });
    },
  );

  it("accepts uppercase hexadecimal signatures", () => {
    const rawBody = JSON.stringify({
      meta: { event_name: "order_created" },
      data: { type: "orders", id: "uppercase" },
    });

    expect(
      parseWebhookEvent({
        secret: "uppercase-secret",
        rawBody,
        signature: signatureFor(rawBody, "uppercase-secret").toUpperCase(),
      }),
    ).toMatchObject({ known: true });
  });

  it.each([
    ["too short", "abc"],
    ["non-hex", "g".repeat(64)],
    ["wrong digest", "0".repeat(64)],
  ])("rejects %s signatures before parsing JSON", (_case, signature) => {
    const error = caughtError(() =>
      parseWebhookEvent({
        secret: "signature-secret",
        rawBody: "private invalid json",
        signature,
      }),
    );

    expect(error).toMatchObject({ code: "invalid_signature" });
    expect(String(error)).not.toContain("signature-secret");
    expect(String(error)).not.toContain(signature);
    expect(String(error)).not.toContain("private");
  });

  it("rejects a body whose bytes changed after signing", () => {
    const originalBody = new TextEncoder().encode(
      '{"meta":{"event_name":"order_created"},"data":{"type":"orders","id":"1"}}',
    );
    const mutatedBody = originalBody.slice();
    mutatedBody[mutatedBody.length - 4] = "2".charCodeAt(0);

    expect(
      caughtError(() =>
        parseWebhookEvent({
          secret: "mutation-secret",
          rawBody: mutatedBody,
          signature: signatureFor(originalBody, "mutation-secret"),
        }),
      ),
    ).toMatchObject({ code: "invalid_signature" });
  });

  it("rejects a known event paired with the wrong resource type", () => {
    const rawBody = JSON.stringify({
      meta: { event_name: "order_created" },
      data: { type: "customers", id: "mismatch" },
    });

    expect(
      caughtError(() =>
        parseWebhookEvent({
          secret: "mismatch-secret",
          rawBody,
          signature: signatureFor(rawBody, "mismatch-secret"),
        }),
      ),
    ).toMatchObject({ code: "invalid_payload" });
  });

  it("does not expose an authenticated structured payload through routing errors", () => {
    const rawBody = JSON.stringify({
      meta: { event_name: "order_created", private_meta: "do-not-leak" },
      data: {
        type: "customers",
        id: "private-resource-id",
        attributes: { private_payload: "do-not-leak" },
      },
    });
    const error = caughtError(() =>
      parseWebhookEvent({
        secret: "structured-secret",
        rawBody,
        signature: signatureFor(rawBody, "structured-secret"),
      }),
    );

    expect(error).toMatchObject({ code: "invalid_payload" });
    expect(String(error)).not.toContain("do-not-leak");
    expect(String(error)).not.toContain("private-resource-id");
    expect(String((error as Error).cause)).not.toContain("do-not-leak");
  });

  it("preserves authenticated unknown events and additive JSON fields", () => {
    const rawBody =
      '{"meta":{"event_name":"future_event","trace":"keep"},"data":{"type":"future-resource","id":"3","future":{"ok":true}},"top_level":"keep"}';

    expect(
      parseWebhookEvent({
        secret: "unknown-secret",
        rawBody,
        signature:
          "662c3e76013b2641c41c9aedd2b26eb0c0ed810f1273487ddb7fbc22f013ebc9",
      }),
    ).toEqual({
      known: false,
      eventName: "future_event",
      meta: { event_name: "future_event", trace: "keep" },
      data: {
        type: "future-resource",
        id: "3",
        future: { ok: true },
      },
      top_level: "keep",
    });
  });

  it("does not apply closed-world validation to canonical attributes", () => {
    const rawBody = JSON.stringify({
      meta: { event_name: "order_created" },
      data: {
        type: "orders",
        id: "shallow",
        attributes: { future_status: ["preserved", 42] },
      },
    });

    expect(
      parseWebhookEvent({
        secret: "shallow-secret",
        rawBody,
        signature: signatureFor(rawBody, "shallow-secret"),
      }),
    ).toMatchObject({
      known: true,
      data: { attributes: { future_status: ["preserved", 42] } },
    });
  });

  it.each([
    ["array body", []],
    ["missing meta", { data: { type: "orders", id: "1" } }],
    ["missing data", { meta: { event_name: "order_created" } }],
    [
      "empty event name",
      { meta: { event_name: "" }, data: { type: "orders", id: "1" } },
    ],
    [
      "non-string resource type",
      {
        meta: { event_name: "order_created" },
        data: { type: 1, id: "1" },
      },
    ],
    [
      "non-string resource id",
      {
        meta: { event_name: "order_created" },
        data: { type: "orders", id: 1 },
      },
    ],
  ])("rejects authenticated payloads with %s", (_case, payload) => {
    const rawBody = JSON.stringify(payload);

    expect(
      caughtError(() =>
        parseWebhookEvent({
          secret: "payload-secret",
          rawBody,
          signature: signatureFor(rawBody, "payload-secret"),
        }),
      ),
    ).toMatchObject({ code: "invalid_payload" });
  });

  it("recognizes Webhook errors across package instances without instanceof", () => {
    const crossPackageError = {
      [Symbol.for("@terminalzero/lemonsqueezy/WebhookError")]: true,
      code: "invalid_signature",
    };

    expect(isWebhookError(crossPackageError)).toBe(true);
    expect(isWebhookError({ ...crossPackageError, code: "future_error" })).toBe(
      false,
    );
    expect(isWebhookError(new Error("invalid_signature"))).toBe(false);
  });
});

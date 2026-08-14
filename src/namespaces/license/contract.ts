import { LemonSqueezyError } from "../../client/error";
import { sanitizeLicenseApiErrorDetail } from "../../internal/v5/redaction";
import type { OperationContract } from "../../internal/v5/types";
import type {
  ActivateLicenseInput,
  ActivateLicenseResponse,
  DeactivateLicenseInput,
  DeactivateLicenseResponse,
  ValidateLicenseInput,
  ValidateLicenseResponse,
} from "./types";

const evidence = {
  activate:
    "https://docs.lemonsqueezy.com/api/license-api/activate-license-key",
  validate:
    "https://docs.lemonsqueezy.com/api/license-api/validate-license-key",
  deactivate:
    "https://docs.lemonsqueezy.com/api/license-api/deactivate-license-key",
} as const;

export const activateLicenseOperation = {
  key: "license.activate",
  compile: ([input]) => {
    assertNonEmptyString("licenseKey", input.licenseKey);
    assertNonEmptyString("instanceName", input.instanceName);
    return {
      protocol: "license",
      method: "POST",
      path: "/v1/licenses/activate",
      form: [
        ["license_key", input.licenseKey],
        ["instance_name", input.instanceName],
      ],
    };
  },
  success: { kind: "license-json", discriminator: "activated" },
  evidence: [evidence.activate],
  sanitizeErrorDetail: (value, [input]) =>
    sanitizeLicenseApiErrorDetail(value, [
      input.licenseKey,
      input.instanceName,
    ]),
} as const satisfies OperationContract<
  readonly [ActivateLicenseInput],
  ActivateLicenseResponse
>;

export const deactivateLicenseOperation = {
  key: "license.deactivate",
  compile: ([input]) => {
    assertNonEmptyString("licenseKey", input.licenseKey);
    assertNonEmptyString("instanceId", input.instanceId);
    return {
      protocol: "license",
      method: "POST",
      path: "/v1/licenses/deactivate",
      form: [
        ["license_key", input.licenseKey],
        ["instance_id", input.instanceId],
      ],
    };
  },
  success: { kind: "license-json", discriminator: "deactivated" },
  evidence: [evidence.deactivate],
  sanitizeErrorDetail: (value, [input]) =>
    sanitizeLicenseApiErrorDetail(value, [input.licenseKey, input.instanceId]),
} as const satisfies OperationContract<
  readonly [DeactivateLicenseInput],
  DeactivateLicenseResponse
>;

export const validateLicenseOperation = {
  key: "license.validate",
  compile: ([input]) => {
    assertNonEmptyString("licenseKey", input.licenseKey);
    if (input.instanceId !== undefined) {
      assertNonEmptyString("instanceId", input.instanceId);
    }
    return {
      protocol: "license",
      method: "POST",
      path: "/v1/licenses/validate",
      form: [
        ["license_key", input.licenseKey],
        ...(input.instanceId === undefined
          ? []
          : [["instance_id", input.instanceId] as const]),
      ],
    };
  },
  success: { kind: "license-json", discriminator: "valid" },
  evidence: [evidence.validate],
  sanitizeErrorDetail: (value, [input]) =>
    sanitizeLicenseApiErrorDetail(value, [
      input.licenseKey,
      ...(input.instanceId === undefined ? [] : [input.instanceId]),
    ]),
} as const satisfies OperationContract<
  readonly [ValidateLicenseInput],
  ValidateLicenseResponse
>;

function assertNonEmptyString(
  name: string,
  value: unknown,
): asserts value is string {
  if (typeof value !== "string" || value.length === 0) {
    throw new LemonSqueezyError(
      `${name} must be a non-empty string.`,
      "validation",
    );
  }
}

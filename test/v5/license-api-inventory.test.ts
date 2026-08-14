import { describe, expect, it } from "vitest";
import {
  activateLicenseOperation,
  deactivateLicenseOperation,
  validateLicenseOperation,
} from "../../src/namespaces/license/contract";

const operations = [
  activateLicenseOperation,
  validateLicenseOperation,
  deactivateLicenseOperation,
] as const;

describe("License API Contract inventory", () => {
  it("contains three unique reviewed License API Operation Contracts", () => {
    const keys = operations.map((operation) => operation.key);

    expect(keys).toEqual([
      "license.activate",
      "license.validate",
      "license.deactivate",
    ]);
    expect(new Set(keys).size).toBe(3);
    expect(operations.every((operation) => operation.evidence.length > 0)).toBe(
      true,
    );
    expect(operations.map((operation) => operation.success.kind)).toEqual([
      "license-json",
      "license-json",
      "license-json",
    ]);
    expect(
      operations.map((operation) => operation.success.discriminator),
    ).toEqual(["activated", "valid", "deactivated"]);
  });
});

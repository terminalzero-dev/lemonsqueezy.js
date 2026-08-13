import { describe, expect, it } from "vitest";
import {
  getLicenseKeyOperation,
  listLicenseKeysOperation,
  updateLicenseKeyOperation,
} from "../../src/namespaces/license-keys/contract";
import {
  getLicenseKeyInstanceOperation,
  listLicenseKeyInstancesOperation,
} from "../../src/namespaces/license-key-instances/contract";

const operations = [
  getLicenseKeyOperation,
  listLicenseKeysOperation,
  updateLicenseKeyOperation,
  getLicenseKeyInstanceOperation,
  listLicenseKeyInstancesOperation,
] as const;

describe("license management Contract inventory", () => {
  it("contains five unique reviewed Operation Contracts", () => {
    const keys = operations.map((operation) => operation.key);

    expect(keys).toEqual([
      "licenseKeys.get",
      "licenseKeys.list",
      "licenseKeys.update",
      "licenseKeyInstances.get",
      "licenseKeyInstances.list",
    ]);
    expect(new Set(keys).size).toBe(5);
    expect(operations.every((operation) => operation.evidence.length > 0)).toBe(
      true,
    );
    expect(operations.map((operation) => operation.success.kind)).toEqual([
      "jsonapi-single",
      "jsonapi-list",
      "jsonapi-single",
      "jsonapi-single",
      "jsonapi-list",
    ]);
    expect(
      operations.every(
        (operation) => typeof operation.sanitizeErrorDetail === "function",
      ),
    ).toBe(true);
  });
});

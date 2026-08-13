import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import * as clientExports from "../src/client";
import * as compatExports from "../src/compat";
import * as rootExports from "../src";

const expectedCompatRuntimeExports = JSON.parse(
  readFileSync(
    new URL("./package/expected-runtime-exports.json", import.meta.url),
    "utf8",
  ),
);
const compareNames = (left: string, right: string) => left.localeCompare(right);

describe("v4 compatibility baseline", () => {
  it("exports the documented runtime surface", () => {
    expect(Object.keys(compatExports).sort()).toEqual(
      expectedCompatRuntimeExports,
    );
  });
});

describe("v5 package entries", () => {
  const expectedClientRuntimeExports = [
    "LemonSqueezyError",
    "createClient",
    "isLemonSqueezyError",
  ];

  it("keeps Client runtime exports out of the Compatibility entry", () => {
    expect(Object.keys(clientExports).sort(compareNames)).toEqual(
      [...expectedClientRuntimeExports].sort(compareNames),
    );
    expect(Object.keys(rootExports).sort(compareNames)).toEqual(
      [...expectedCompatRuntimeExports, ...expectedClientRuntimeExports].sort(
        compareNames,
      ),
    );
  });
});

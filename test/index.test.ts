import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import * as exports from "../src";

const expectedRuntimeExports = JSON.parse(
  readFileSync(
    new URL("./package/expected-runtime-exports.json", import.meta.url),
    "utf8",
  ),
);

describe("v4 compatibility baseline", () => {
  it("exports the documented runtime surface", () => {
    expect(Object.keys(exports).sort()).toEqual(expectedRuntimeExports);
  });
});

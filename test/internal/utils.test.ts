import { describe, expect, it } from "vitest";
import { camelToUnderscore, getKV, isObject, setKV } from "../../src/internal";
import { type Config } from "../../src/internal/setup/types";

describe("Test isObject", () => {
  it("String is not an object type", () => {
    expect(isObject("test")).toBe(false);
  });
  it("Number is not an object type", () => {
    expect(isObject(1)).toBe(false);
  });
  it("Boolean is not an object type", () => {
    expect(isObject(true)).toBe(false);
  });
  it("null is not an object type", () => {
    expect(isObject(null)).toBe(false);
  });
  it("undefined is not an object type", () => {
    expect(isObject(undefined)).toBe(false);
  });
  it("symbol is not an object type", () => {
    expect(isObject(Symbol("test"))).toBe(false);
  });
  it("Array is not an object type", () => {
    expect(isObject([1])).toBe(false);
  });
  it("Function is not an object type", () => {
    expect(isObject(() => {})).toBe(false);
  });
  it("Date is not an object type", () => {
    expect(isObject(new Date())).toBe(false);
  });
  it("RegExp is not an object type", () => {
    expect(isObject(/(?:)/)).toBe(false);
  });
  it("Map is not an object type", () => {
    expect(isObject(new Map())).toBe(false);
  });
  it("Set is not an object type", () => {
    expect(isObject(new Set())).toBe(false);
  });
  it("Object is an object type", () => {
    expect(isObject(new Object())).toBe(true);
  });
  it("Object is an object type", () => {
    expect(isObject({})).toBe(true);
  });
});

describe("Test KV", () => {
  const config = { apiKey: "0123456789" };
  const key = "Store";

  it("Set value successfully", () => {
    expect(getKV(key)).toBeUndefined();

    setKV(key, config);
    expect(getKV<Config>(key)).toEqual(config);
  });

  it("Get value successfully", () => {
    const _config = getKV<Config>(key);
    expect(_config).toEqual(config);
    expect(_config.apiKey).toEqual(config.apiKey);
  });
});

describe("Test camelToUnderscore", () => {
  it("Convert camel to underscore successfully", () => {
    expect(camelToUnderscore("storeId")).toEqual("store_id");
  });

  it("Convert no camel to no camel successfully", () => {
    expect(camelToUnderscore("store")).toEqual("store");
  });

  it("Convert camel to camel successfully", () => {
    expect(camelToUnderscore("store_id")).toEqual("store_id");
  });
});

// todo: other utils test

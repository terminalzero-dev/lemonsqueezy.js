import { expect } from "vitest";

expect.extend({
  toBeArray(received) {
    return {
      pass: Array.isArray(received),
      message: () => `expected ${String(received)} to be an array`,
    };
  },
  toBeInteger(received) {
    return {
      pass: Number.isInteger(received),
      message: () => `expected ${String(received)} to be an integer`,
    };
  },
  toBeNumber(received) {
    return {
      pass: typeof received === "number",
      message: () => `expected ${String(received)} to be a number`,
    };
  },
  toBeString(received) {
    return {
      pass: typeof received === "string",
      message: () => `expected ${String(received)} to be a string`,
    };
  },
  toStartWith(received, prefix) {
    return {
      pass: typeof received === "string" && received.startsWith(prefix),
      message: () => `expected ${String(received)} to start with ${prefix}`,
    };
  },
});

declare module "vitest" {
  interface Assertion<T = any> {
    toBeArray(): T;
    toBeInteger(): T;
    toBeNumber(): T;
    toBeString(): T;
    toStartWith(prefix: string): T;
  }
}

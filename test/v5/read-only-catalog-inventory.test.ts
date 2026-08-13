import { describe, expect, it } from "vitest";
import {
  getAffiliateOperation,
  listAffiliatesOperation,
} from "../../src/namespaces/affiliates/contract";
import {
  getFileOperation,
  listFilesOperation,
} from "../../src/namespaces/files/contract";
import {
  getPriceOperation,
  listPricesOperation,
} from "../../src/namespaces/prices/contract";
import {
  getProductOperation,
  listProductsOperation,
} from "../../src/namespaces/products/contract";
import {
  getStoreOperation,
  listStoresOperation,
} from "../../src/namespaces/stores/contract";
import {
  getVariantOperation,
  listVariantsOperation,
} from "../../src/namespaces/variants/contract";

const operations = [
  getStoreOperation,
  listStoresOperation,
  getProductOperation,
  listProductsOperation,
  getVariantOperation,
  listVariantsOperation,
  getPriceOperation,
  listPricesOperation,
  getFileOperation,
  listFilesOperation,
  getAffiliateOperation,
  listAffiliatesOperation,
] as const;

describe("read-only catalog Contract inventory", () => {
  it("contains 12 unique reviewed read Operation Contracts", () => {
    const keys = operations.map((operation) => operation.key);

    expect(keys).toEqual([
      "stores.get",
      "stores.list",
      "products.get",
      "products.list",
      "variants.get",
      "variants.list",
      "prices.get",
      "prices.list",
      "files.get",
      "files.list",
      "affiliates.get",
      "affiliates.list",
    ]);
    expect(new Set(keys).size).toBe(12);
    expect(
      operations.every((operation) => operation.evidence.length >= 2),
    ).toBe(true);
    expect(
      operations.map((operation) => ({
        key: operation.key,
        success: operation.success.kind,
        resourceType: operation.success.resourceType,
      })),
    ).toEqual([
      { key: "stores.get", resourceType: "stores", success: "jsonapi-single" },
      { key: "stores.list", resourceType: "stores", success: "jsonapi-list" },
      {
        key: "products.get",
        resourceType: "products",
        success: "jsonapi-single",
      },
      {
        key: "products.list",
        resourceType: "products",
        success: "jsonapi-list",
      },
      {
        key: "variants.get",
        resourceType: "variants",
        success: "jsonapi-single",
      },
      {
        key: "variants.list",
        resourceType: "variants",
        success: "jsonapi-list",
      },
      { key: "prices.get", resourceType: "prices", success: "jsonapi-single" },
      { key: "prices.list", resourceType: "prices", success: "jsonapi-list" },
      { key: "files.get", resourceType: "files", success: "jsonapi-single" },
      { key: "files.list", resourceType: "files", success: "jsonapi-list" },
      {
        key: "affiliates.get",
        resourceType: "affiliates",
        success: "jsonapi-single",
      },
      {
        key: "affiliates.list",
        resourceType: "affiliates",
        success: "jsonapi-list",
      },
    ]);
  });
});

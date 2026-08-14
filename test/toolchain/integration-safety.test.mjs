import assert from "node:assert/strict";
import { test } from "node:test";
import {
  cleanupRegisteredFixtures,
  createFixtureDiscountCode,
  registerFixture,
} from "../integration/fixture-safety.mjs";

void test("fixture discount codes satisfy the public contract", () => {
  const code = createFixtureDiscountCode("sdk-ci-31785179293-1");

  assert.equal(code, "SDKCI317851792931");
  assert.match(code, /^[A-Z0-9]{3,256}$/);
});

void test("a created fixture remains cleanup-visible when journaling fails", async () => {
  const journal = { fixtures: [] };
  await assert.rejects(
    registerFixture({
      journal,
      type: "discount",
      resource: { id: "fixture-1", attributes: {} },
      storeId: "42",
      persist: async () => {
        throw new Error("journal unavailable");
      },
    }),
    /journal unavailable/,
  );
  assert.equal(journal.fixtures[0].id, "fixture-1");
});

void test("journal failures do not prevent the remaining cleanup attempts", async () => {
  const fixtures = [
    { id: "fixture-1", cleanupStatus: "pending" },
    { id: "fixture-2", cleanupStatus: "pending" },
  ];
  const attempted = [];
  const errors = await cleanupRegisteredFixtures({
    fixtures,
    cleanup: async (fixture) => {
      attempted.push(fixture.id);
      return "cleaned";
    },
    persist: async () => {
      throw new Error("journal unavailable");
    },
  });

  assert.deepEqual(attempted, ["fixture-2", "fixture-1"]);
  assert.deepEqual(
    fixtures.map(({ cleanupStatus }) => cleanupStatus),
    ["cleaned", "cleaned"],
  );
  assert.equal(errors.length, 2);
});

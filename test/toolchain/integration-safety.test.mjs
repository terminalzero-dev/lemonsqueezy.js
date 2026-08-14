import assert from "node:assert/strict";
import { test } from "node:test";
import {
  cleanupRegisteredFixtures,
  registerFixture,
} from "../integration/fixture-safety.mjs";

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

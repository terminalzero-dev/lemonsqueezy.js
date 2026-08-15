import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import {
  deleteDiscount,
  deleteWebhook,
  isLemonSqueezyError,
  lemonSqueezySetup,
} from "@terminalzero/lemonsqueezy";
import { createClient } from "@terminalzero/lemonsqueezy/client";
import { collectCandidates } from "./reaper-core.mjs";

const apiKey = process.env.LEMON_SQUEEZY_API_KEY;
const storeId = process.env.LEMON_SQUEEZY_TEST_STORE_ID;
const journalPath = process.env.LEMON_SQUEEZY_FIXTURE_JOURNAL;
assert.ok(
  apiKey && storeId && journalPath,
  "Missing protected reaper configuration",
);

const client = createClient({ apiKey });
lemonSqueezySetup({ apiKey });
const journal = {
  storeId,
  recoveredAt: new Date().toISOString(),
  fixtures: [],
};

const user = await client.users.getAuthenticated();
assert.equal(user.meta.test_mode, true);
const store = await client.stores.get(storeId);
assert.equal(store.data.id, storeId);

const candidates = [
  ...(await collectCandidates({
    type: "discount",
    list: (params) => client.discounts.list(params),
    storeId,
  })),
  ...(await collectCandidates({
    type: "webhook",
    list: (params) => client.webhooks.list(params),
    storeId,
  })),
];
const failures = [];
for (const fixture of candidates) {
  journal.fixtures.push(fixture);
  await persistJournal();
  try {
    await removeFixture(fixture);
    fixture.cleanupStatus = "cleaned";
  } catch (error) {
    fixture.cleanupStatus = "failed";
    failures.push(error);
  }
  await persistJournal();
}

console.log(`Recovered ${candidates.length - failures.length} stale fixtures.`);
if (failures.length > 0) {
  throw new AggregateError(failures, "One or more stale fixtures remain");
}

async function removeFixture(fixture) {
  const remove = fixture.type === "discount" ? deleteDiscount : deleteWebhook;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const result = await remove(fixture.id);
    if (result.error === null) {
      assert.equal(result.statusCode, 204);
      return;
    }
    if (result.statusCode === 404) return;
    if (!isTransient(result.error) || attempt === 3) throw result.error;
  }
}

function isTransient(error) {
  return (
    isLemonSqueezyError(error) &&
    (error.code === "network" ||
      (error.code === "http" &&
        (error.statusCode === 429 || (error.statusCode ?? 0) >= 500)))
  );
}

async function persistJournal() {
  await writeFile(journalPath, `${JSON.stringify(journal, null, 2)}\n`, {
    mode: 0o600,
  });
}

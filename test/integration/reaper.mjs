import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import {
  deleteDiscount,
  deleteWebhook,
  isLemonSqueezyError,
  lemonSqueezySetup,
} from "@terminalzero/lemonsqueezy";
import { createClient } from "@terminalzero/lemonsqueezy/client";

const MAX_PAGES = 10;
const MINIMUM_AGE_MS = 24 * 60 * 60 * 1_000;
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
  ...(await collectCandidates("discount")),
  ...(await collectCandidates("webhook")),
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

async function collectCandidates(type) {
  const namespace = type === "discount" ? client.discounts : client.webhooks;
  const candidates = [];

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const response = await namespace.list({
      filter: { storeId },
      page: { number: page, size: 100 },
    });
    for (const resource of response.data) {
      if (isReapable(type, resource)) {
        candidates.push({
          type,
          id: resource.id,
          storeId,
          createdAt: resource.attributes.created_at,
          cleanupAction: "delete",
          cleanupStatus: "pending",
        });
      }
    }

    const current = response.meta.page.current_page;
    const last = response.meta.page.last_page;
    if (current >= last) return candidates;
    if (page === MAX_PAGES) {
      throw new Error("Reaper page bound reached; manual inspection required");
    }
  }

  return candidates;
}

function isReapable(type, resource) {
  const createdAt = Date.parse(resource.attributes.created_at);
  if (
    resource.attributes.store_id !== Number(storeId) ||
    resource.attributes.test_mode !== true ||
    !Number.isFinite(createdAt) ||
    Date.now() - createdAt < MINIMUM_AGE_MS
  ) {
    return false;
  }

  if (type === "discount") {
    const name = resource.attributes.name;
    return (
      isFixtureName(name) && resource.attributes.code === name.toUpperCase()
    );
  }

  const url = resource.attributes.url;
  if (typeof url !== "string") return false;
  const prefix = "https://example.com/sdk-ci/";
  return url.startsWith(prefix) && isFixtureName(url.slice(prefix.length));
}

function isFixtureName(value) {
  return (
    typeof value === "string" &&
    /^sdk-ci-[a-z0-9][a-z0-9-]{0,48}-[1-9][0-9]*$/.test(value)
  );
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

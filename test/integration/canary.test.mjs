import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { writeFile } from "node:fs/promises";
import {
  deleteDiscount,
  deleteWebhook,
  isLemonSqueezyError,
  lemonSqueezySetup,
} from "@terminalzero/lemonsqueezy";
import { createClient } from "@terminalzero/lemonsqueezy/client";
import { describe, it } from "vitest";
import {
  cleanupRegisteredFixtures,
  createFixtureDiscountCode,
  registerFixture,
} from "./fixture-safety.mjs";

const apiKey = process.env.LEMON_SQUEEZY_API_KEY;
const storeId = process.env.LEMON_SQUEEZY_TEST_STORE_ID;
const productId = process.env.LEMON_SQUEEZY_TEST_PRODUCT_ID;
const licenseKey = process.env.LEMON_SQUEEZY_TEST_LICENSE_KEY;
const runId = process.env.LEMON_SQUEEZY_TEST_RUN_ID;
const journalPath = process.env.LEMON_SQUEEZY_FIXTURE_JOURNAL;

for (const [name, value] of Object.entries({
  LEMON_SQUEEZY_API_KEY: apiKey,
  LEMON_SQUEEZY_TEST_STORE_ID: storeId,
  LEMON_SQUEEZY_TEST_PRODUCT_ID: productId,
  LEMON_SQUEEZY_TEST_LICENSE_KEY: licenseKey,
  LEMON_SQUEEZY_TEST_RUN_ID: runId,
  LEMON_SQUEEZY_FIXTURE_JOURNAL: journalPath,
})) {
  assert.ok(value, `Missing required ${name}`);
}

const client = createClient({ apiKey });
lemonSqueezySetup({ apiKey });
const fixtureTag = `sdk-ci-${runId}-1`;
const journal = { runId, storeId, fixtures: [] };

describe("protected Test Mode release canary", () => {
  it("preflights read-only evidence and cleans every hard-delete fixture", async () => {
    let primaryError;
    const cleanupErrors = [];

    try {
      await preflight();
      await persistJournal();

      const discount = await client.discounts.create({
        storeId,
        name: fixtureTag,
        code: createFixtureDiscountCode(fixtureTag),
        amount: 10,
        amountType: "percent",
        testMode: true,
      });
      await registerFixture({
        journal,
        type: "discount",
        resource: discount.data,
        storeId,
        persist: persistJournal,
      });
      assertResource(discount.data, "discounts", journal.fixtures.at(-1).id);
      assert.equal(discount.data.attributes.store_id, Number(storeId));
      assert.equal(discount.data.attributes.test_mode, true);

      const retrievedDiscount = await client.discounts.get(discount.data.id);
      assertResource(retrievedDiscount.data, "discounts", discount.data.id);
      assert.equal(retrievedDiscount.data.attributes.name, fixtureTag);

      const webhook = await client.webhooks.create({
        storeId,
        url: `https://example.com/sdk-ci/${fixtureTag}`,
        events: ["order_created"],
        secret: randomBytes(32).toString("hex"),
        testMode: true,
      });
      await registerFixture({
        journal,
        type: "webhook",
        resource: webhook.data,
        storeId,
        persist: persistJournal,
      });
      assertResource(webhook.data, "webhooks", journal.fixtures.at(-1).id);
      assert.equal(webhook.data.attributes.store_id, Number(storeId));
      assert.equal(webhook.data.attributes.test_mode, true);

      const retrievedWebhook = await client.webhooks.get(webhook.data.id);
      assertResource(retrievedWebhook.data, "webhooks", webhook.data.id);
      const updatedWebhook = await client.webhooks.update(webhook.data.id, {
        events: ["customer_updated"],
      });
      assert.deepEqual(updatedWebhook.data.attributes.events, [
        "customer_updated",
      ]);
    } catch (error) {
      primaryError = error;
    } finally {
      cleanupErrors.push(
        ...(await cleanupRegisteredFixtures({
          fixtures: journal.fixtures,
          cleanup: cleanupFixture,
          persist: persistJournal,
        })),
      );
    }

    if (primaryError || cleanupErrors.length > 0) {
      throw new AggregateError(
        [primaryError, ...cleanupErrors].filter(Boolean),
        "Test Mode canary or fixture cleanup failed",
      );
    }
  });
});

async function preflight() {
  const user = await client.users.getAuthenticated();
  assertResource(user.data, "users");
  assert.equal(user.meta.test_mode, true);

  const store = await client.stores.get(storeId);
  assertResource(store.data, "stores", storeId);

  const product = await client.products.get(productId);
  assertResource(product.data, "products", productId);
  assert.equal(product.data.attributes.store_id, Number(storeId));
  assert.equal(product.data.attributes.test_mode, true);

  const products = await client.products.list({
    filter: { storeId },
    page: { size: 100 },
  });
  assert.ok(products.data.length > 0, "Seed store must contain products");
  assert.equal(
    products.data.every(
      (item) =>
        item.attributes.store_id === Number(storeId) &&
        item.attributes.test_mode === true,
    ),
    true,
  );

  const license = await client.license.validate({ licenseKey });
  assert.equal(typeof license.valid, "boolean");
  assert.equal(license.meta.store_id, Number(storeId));
  assert.equal(license.license_key.test_mode, true);
}

function assertResource(resource, type, id) {
  assert.equal(resource.type, type);
  assert.equal(typeof resource.id, "string");
  if (id !== undefined) assert.equal(resource.id, String(id));
}

async function cleanupFixture(fixture) {
  const remove = fixture.type === "discount" ? deleteDiscount : deleteWebhook;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const result = await remove(fixture.id);
      if (result.error === null) {
        assert.equal(result.statusCode, 204, "Hard delete must return 204");
        return "cleaned";
      }
      if (result.statusCode === 404) {
        return "already-cleaned";
      }
      if (!isTransient(result.error) || attempt === 3) throw result.error;
    } catch (error) {
      if (!isTransient(error) || attempt === 3) throw error;
    }
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

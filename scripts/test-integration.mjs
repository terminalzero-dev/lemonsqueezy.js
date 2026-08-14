import assert from "node:assert/strict";
import { cp, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { prepareConsumer, root, run } from "./lib/canonical-artifact.mjs";

const requiredConfiguration = [
  "LEMON_SQUEEZY_API_KEY",
  "LEMON_SQUEEZY_TEST_STORE_ID",
  "LEMON_SQUEEZY_TEST_PRODUCT_ID",
  "LEMON_SQUEEZY_TEST_LICENSE_KEY",
  "LEMON_SQUEEZY_TEST_RUN_ID",
];

for (const name of requiredConfiguration) {
  assert.ok(process.env[name]?.trim(), `Missing required ${name}`);
}
for (const name of [
  "LEMON_SQUEEZY_TEST_STORE_ID",
  "LEMON_SQUEEZY_TEST_PRODUCT_ID",
]) {
  assert.match(process.env[name], /^[1-9][0-9]*$/, `${name} must be an ID`);
}
assert.match(
  process.env.LEMON_SQUEEZY_TEST_RUN_ID,
  /^[a-z0-9][a-z0-9-]{0,48}$/,
  "LEMON_SQUEEZY_TEST_RUN_ID must be a safe fixture identifier",
);

const { consumerDirectory } = await prepareConsumer("test-mode-integration");
const integrationDirectory = join(consumerDirectory, "integration");
await mkdir(integrationDirectory, { recursive: true });
await cp(join(root, "test/integration"), integrationDirectory, {
  recursive: true,
});

run(
  process.execPath,
  [
    join(root, "node_modules/vitest/vitest.mjs"),
    "run",
    "--config",
    join(root, "vitest.integration.config.ts"),
  ],
  {
    cwd: consumerDirectory,
    env: {
      ...process.env,
      LEMON_SQUEEZY_FIXTURE_JOURNAL: join(
        consumerDirectory,
        "fixture-journal.json",
      ),
    },
  },
);

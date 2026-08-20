import assert from "node:assert/strict";
import { cp } from "node:fs/promises";
import { join } from "node:path";
import { prepareConsumer, root, run } from "./lib/canonical-artifact.mjs";

for (const name of ["LEMON_SQUEEZY_API_KEY", "LEMON_SQUEEZY_TEST_STORE_ID"]) {
  assert.ok(process.env[name]?.trim(), `Missing required ${name}`);
}
assert.match(
  process.env.LEMON_SQUEEZY_TEST_STORE_ID,
  /^[1-9][0-9]*$/,
  "LEMON_SQUEEZY_TEST_STORE_ID must be an ID",
);

const { consumerDirectory } = await prepareConsumer("test-mode-reaper");
const reaper = join(consumerDirectory, "reaper.mjs");
await cp(join(root, "test/integration/reaper.mjs"), reaper);
await cp(
  join(root, "test/integration/reaper-core.mjs"),
  join(consumerDirectory, "reaper-core.mjs"),
);
run(process.execPath, [reaper], {
  cwd: consumerDirectory,
  env: {
    ...process.env,
    LEMON_SQUEEZY_FIXTURE_JOURNAL: join(
      consumerDirectory,
      "reaper-journal.json",
    ),
  },
});

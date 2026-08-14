import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createContractDriftCandidate } from "./lib/contract-drift.mjs";

assert.equal(
  process.argv.length,
  3,
  "Usage: pnpm report:contract-drift <sanitized-observation.json>",
);
const observation = JSON.parse(await readFile(process.argv[2], "utf8"));
const candidate = createContractDriftCandidate(observation);
process.stdout.write(`${JSON.stringify(candidate, null, 2)}\n`);

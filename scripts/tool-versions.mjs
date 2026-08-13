import { join } from "node:path";
import { root, run } from "./lib/canonical-artifact.mjs";

const binaries = [
  ["tsdown", "tsdown"],
  ["Oxlint", "oxlint"],
  ["Oxfmt", "oxfmt"],
  ["Vitest", "vitest"],
];

console.log(`Node ${process.version}`);
run("corepack", ["pnpm", "--version"]);
console.log("TypeScript");
run(process.execPath, [
  join(root, "node_modules/typescript/bin/tsc"),
  "--version",
]);

for (const [label, binary] of binaries) {
  console.log(label);
  run(join(root, "node_modules/.bin", binary), ["--version"]);
}

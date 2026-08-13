import { join } from "node:path";
import { prepareConsumer, root, run } from "./lib/canonical-artifact.mjs";

const { consumerDirectory } = await prepareConsumer("type-contract");
const compilers = [
  ["TypeScript 5.4", join(root, "node_modules/typescript-5-4/bin/tsc")],
  ["TypeScript 6", join(root, "node_modules/typescript/bin/tsc")],
  ["TypeScript latest", join(root, "node_modules/typescript-latest/bin/tsc")],
];

for (const [label, compiler] of compilers) {
  console.log(label);
  run(process.execPath, [compiler, "--version"], { cwd: consumerDirectory });
  run(process.execPath, [compiler, "-p", "types/tsconfig.nodenext.json"], {
    cwd: consumerDirectory,
  });
  run(process.execPath, [compiler, "-p", "types/tsconfig.bundler.json"], {
    cwd: consumerDirectory,
  });
}

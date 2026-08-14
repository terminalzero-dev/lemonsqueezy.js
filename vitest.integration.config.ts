import { defineConfig } from "vitest/config";

export default defineConfig({
  root: process.cwd(),
  test: {
    environment: "node",
    fileParallelism: false,
    include: ["integration/**/*.test.mjs"],
    maxWorkers: 1,
    sequence: { concurrent: false },
  },
});

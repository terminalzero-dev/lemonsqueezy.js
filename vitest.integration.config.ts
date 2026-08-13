import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
    exclude: [
      "test/index.test.ts",
      "test/internal/configure.test.ts",
      "test/internal/utils.test.ts",
    ],
    sequence: {
      concurrent: false,
    },
    setupFiles: ["test/vitest-compat.ts", "test/integration-setup.ts"],
  },
});

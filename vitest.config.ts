import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: [
      "test/index.test.ts",
      "test/internal/configure.test.ts",
      "test/internal/utils.test.ts",
      "test/v5/**/*.test.ts",
      "src/namespaces/**/*.test.ts",
    ],
    setupFiles: ["test/vitest-compat.ts"],
  },
});

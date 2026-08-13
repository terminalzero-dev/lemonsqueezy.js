import { defineConfig } from "tsdown";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "client/index": "src/client/index.ts",
    "compat/index": "src/compat/index.ts",
    "types/index": "src/types/index.ts",
  },
  format: ["esm", "cjs"],
  target: "es2022",
  unbundle: true,
  dts: true,
  clean: true,
  minify: false,
  sourcemap: false,
  outDir: "dist",
  outExtensions({ format }) {
    return format === "cjs"
      ? { js: ".cjs", dts: ".d.cts" }
      : { js: ".js", dts: ".d.ts" };
  },
});

import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/server.ts"],
  format: ["cjs"],
  outDir: "dist",
  splitting: false,
  sourcemap: true,
  clean: true,
  noExternal: ["@hostiq/db", "@hostiq/shared"],
  external: ["@prisma/client"],
});

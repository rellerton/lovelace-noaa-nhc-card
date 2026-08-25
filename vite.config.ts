import { defineConfig } from "vite";

export default defineConfig({
  build: {
    lib: {
      entry: "src/noaa-nhc-card.ts",
      formats: ["es"],
      fileName: () => "noaa-nhc-card.js",
    },
    outDir: "dist",
    emptyOutDir: true,
    minify: "esbuild",
    sourcemap: false,
  },
  test: {
    environment: "jsdom",
    coverage: {
      provider: "v8",
      reporter: ["text"],
      include: ["src/**/*.ts"],
    },
  },
});

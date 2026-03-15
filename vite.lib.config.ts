/// vite.lib.config.ts

import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

export default defineConfig({
  build: {
    outDir: "dist",
    emptyOutDir: false,
    minify: "terser", // <-- Wechsel auf den aggressiveren Terser
    target: "esnext",
    lib: {
      entry: "src/index.ts",
      name: "SmallWorld",
      fileName: () => "small-world.js",
      formats: ["es"],
    },
    terserOptions: {
      format: {
        comments: false, // Wirft wirklich ALLE Kommentare restlos raus
      },
      compress: {
        drop_console: true,
        drop_debugger: true,
        passes: 2, // Jagt den Optimierer zweimal über den Code (für maximales Quetschen)
      },
      mangle: true, // Kürzt alle internen Variablennamen
    },
    rollupOptions: {
      output: {
        compact: true,
      },
    },
  },
  plugins: [
    dts({
      rollupTypes: true,
    }),
  ],
});

import { defineConfig } from "vitest/config";
import dts from "vite-plugin-dts";

export default defineConfig({
  build: {
    outDir: "dist",
    emptyOutDir: false,
    minify: "terser",
    target: "esnext",
    lib: {
      entry: "src/index.ts",
      name: "SmallWorld",
      fileName: () => "small-world.js",
      formats: ["es"],
    },
    terserOptions: {
      format: {
        comments: false, // Strips out absolutely ALL comments
      },
      compress: {
        drop_console: false,
        drop_debugger: true,
        passes: 2, // Runs the optimizer twice over the code (for maximum compression)
      },
      mangle: true, // Minifies all internal variable names
    },
    rollupOptions: {
      output: {},
    },
  },
  plugins: [
    dts({
      rollupTypes: false,
    }),
  ],
});

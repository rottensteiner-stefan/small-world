import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  publicDir: "public",
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        demo1: resolve(__dirname, "examples/demo1.html"),
        demo2: resolve(__dirname, "examples/demo2.html"),
        demo3: resolve(__dirname, "examples/demo3.html"),
        demo4: resolve(__dirname, "examples/demo4.html"),
        demo5: resolve(__dirname, "examples/demo5.html"),
        main: resolve(__dirname, "index.html"),
      },
      output: {
        entryFileNames: (assetInfo) => {
          if (assetInfo.name === "main") {
            return "main.js";
          }
          return `examples/[name]/demo.js`;
        },
        assetFileNames: "assets/[name].[ext]",
        chunkFileNames: "js/[name].js",
      },
    },
  },
});

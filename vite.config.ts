import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  publicDir: "public",
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      // Hier definieren wir unsere Startseite UND alle Demos
      input: {
        main: resolve(__dirname, "index.html"),
        demo1: resolve(__dirname, "examples/demo1.html"),
        // demo2: resolve(__dirname, "examples/demo2.html"), // Später einfach einkommentieren!
      },
      output: {
        // Dynamische Benennung: Packt jedes Demo in seinen eigenen Ordner
        entryFileNames: (assetInfo) => {
          if (assetInfo.name === 'main') {
            return "main.js"; // Für die Startseite
          }
          // Für 'demo1', 'demo2' etc. -> examples/demo1/demo.js
          return `examples/[name]/demo.js`;
        },
        assetFileNames: "assets/[name].[ext]",
        chunkFileNames: "js/[name].js",
      },
    },
  },
});
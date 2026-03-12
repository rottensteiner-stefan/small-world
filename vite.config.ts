import { defineConfig } from "vite";

export default defineConfig({
  // Vite kopiert automatisch den Inhalt von 'public' nach 'dist'
  publicDir: "public",
  build: {
    outDir: "dist",
    emptyOutDir: true, // Leert den dist-Ordner VOR dem Build
    rollupOptions: {
      input: "index.html",
      output: {
        entryFileNames: "demo.js", // Keine kryptischen Hashes im Dateinamen
        assetFileNames: "[name].[ext]",
      },
    },
  },
});

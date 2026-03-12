import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

export default defineConfig({
  build: {
    outDir: "dist",
    emptyOutDir: false, // WICHTIG: Die Demo-Dateien aus dem vorherigen Schritt NICHT löschen
    lib: {
      entry: "src/index.ts", // Der Einsprungspunkt deiner Engine
      name: "SmallWorld",
      fileName: () => "small-world.js",
      formats: ["es"], // Baut ein modernes ES-Modul
    },
  },
  plugins: [
    dts({
      rollupTypes: true, // Fasst alle Interfaces zu EINER small-world.d.ts zusammen!
    }),
  ],
});

import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  publicDir: "public",
  plugins: [
    {
      name: "serve-index-from-public",
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url === "/") {
            req.url = "/index.html";
          }
          next();
        });
      },
    },
  ],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        example1: resolve(__dirname, "examples/example1.html"),
        example2: resolve(__dirname, "examples/example2.html"),
        example3: resolve(__dirname, "examples/example3.html"),
        example4: resolve(__dirname, "examples/example4.html"),
        example5: resolve(__dirname, "examples/example5.html"),
        example6: resolve(__dirname, "examples/example6.html"),
        example7: resolve(__dirname, "examples/example7.html"),
      },
      output: {
        entryFileNames: () => {
          return `examples/[name]/demo.js`;
        },
        assetFileNames: "assets/[name].[ext]",
        chunkFileNames: "js/[name].js",
      },
    },
  },
});

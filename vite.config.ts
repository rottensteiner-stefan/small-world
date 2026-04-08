import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  publicDir: "public",
  plugins: [
    {
      name: "serve-index-from-public",
      configureServer(server) {
        server.middlewares.use((req, _res, next) => {
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
    minify: "terser",
    terserOptions: {
      format: {
        comments: false,
      },
      compress: {
        drop_console: true,
        drop_debugger: true,
        passes: 2,
      },
      mangle: true,
    },
    rollupOptions: {
      input: {
        example1: resolve(__dirname, "examples/example1.html"),
        example2: resolve(__dirname, "examples/example2.html"),
        example3: resolve(__dirname, "examples/example3.html"),
        example4: resolve(__dirname, "examples/example4.html"),
        example5: resolve(__dirname, "examples/example5.html"),
        example6: resolve(__dirname, "examples/example6.html"),
        example7: resolve(__dirname, "examples/example7.html"),
        example8: resolve(__dirname, "examples/example8.html"),
        example9: resolve(__dirname, "examples/example9.html"),
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

import { defineConfig } from "vitest/config";
import { resolve } from "path";
import mkcert from "vite-plugin-mkcert";

export default defineConfig({
  publicDir: "public",
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
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
    mkcert(),
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
        example1: resolve(__dirname, "public/examples/example1.html"),
        example2: resolve(__dirname, "public/examples/example2.html"),
        example3: resolve(__dirname, "public/examples/example3.html"),
        example4: resolve(__dirname, "public/examples/example4.html"),
        example5: resolve(__dirname, "public/examples/example5.html"),
        example6: resolve(__dirname, "public/examples/example6.html"),
        example7: resolve(__dirname, "public/examples/example7.html"),
        example8: resolve(__dirname, "public/examples/example8.html"),
        example9: resolve(__dirname, "public/examples/example9.html"),
        example10: resolve(__dirname, "public/examples/example10.html"),
        example11: resolve(__dirname, "public/examples/example11.html"),
        example12: resolve(__dirname, "public/examples/example12.html"),
        yad: resolve(__dirname, "public/examples/yad.html"),
        main: resolve(__dirname, "public/index.html"),
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

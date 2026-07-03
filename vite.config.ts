import { defineConfig } from "vitest/config";
import { resolve } from "path";
import mkcert from "vite-plugin-mkcert";
import http from "http";
import EventEmitter from "events";

EventEmitter.defaultMaxListeners = 50;

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
    {
      name: "http-to-https-redirect",
      configureServer(server) {
        server.httpServer?.once("listening", () => {
          const address = server.httpServer?.address();
          if (typeof address === "object" && address !== null) {
            const httpsPort = address.port;
            const redirectServer = http.createServer((req, res) => {
              const host = req.headers.host ? req.headers.host.split(":")[0] : "localhost";
              res.writeHead(301, { Location: `https://${host}:${httpsPort}${req.url || "/"}` });
              res.end();
            });

            // Versuche Port 80 (Standard HTTP), ansonsten Fallback auf httpsPort + 1
            redirectServer
              .listen(80, () => {
                console.log(
                  `\n  ➜  HTTP Redirect: http://localhost/ -> https://localhost:${httpsPort}/`,
                );
              })
              .on("error", () => {
                const altPort = httpsPort + 1;
                redirectServer.listen(altPort, () => {
                  console.log(
                    `\n  ➜  HTTP Redirect: http://localhost:${altPort}/ -> https://localhost:${httpsPort}/`,
                  );
                });
              });
          }
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
        example1: resolve(__dirname, "examples/1/index.html"),
        example2: resolve(__dirname, "examples/2/index.html"),
        example3: resolve(__dirname, "examples/3/index.html"),
        example4: resolve(__dirname, "examples/4/index.html"),
        example5: resolve(__dirname, "examples/5/index.html"),
        example6: resolve(__dirname, "examples/6/index.html"),
        example7: resolve(__dirname, "examples/7/index.html"),
        example8: resolve(__dirname, "examples/8/index.html"),
        example9: resolve(__dirname, "examples/9/index.html"),
        example10: resolve(__dirname, "examples/10/index.html"),
        example11: resolve(__dirname, "examples/11/index.html"),
        example12: resolve(__dirname, "examples/12/index.html"),
        example13: resolve(__dirname, "examples/13/index.html"),
        example14: resolve(__dirname, "examples/14/index.html"),
        example15_v1: resolve(__dirname, "examples/15_v1/index.html"),
        example15_v2: resolve(__dirname, "examples/15_v2/index.html"),
        example16: resolve(__dirname, "examples/16/index.html"),
        example17: resolve(__dirname, "examples/17/index.html"),
        yad: resolve(__dirname, "examples/yad/index.html"),
        pbrgen: resolve(__dirname, "public/tools/pbr-gen.html"),
        presentation: resolve(__dirname, "public/presentation.html"),
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

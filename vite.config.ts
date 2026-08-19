import { defineConfig } from "vitest/config";
import { resolve } from "path";
import mkcert from "vite-plugin-mkcert";
import http from "http";
import EventEmitter from "events";
import fs from "fs";
import path from "path";

EventEmitter.defaultMaxListeners = 50;

export default defineConfig({
  base: "./",
  publicDir: "public",
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["tests/setup.ts"],
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.d.ts", "src/enums/**", "src/interfaces/**"],
      reporter: ["text", "html"],
    },
  },
  plugins: [
    {
      name: "showcase-layout",
      transformIndexHtml(html) {
        const layoutRegex =
          /<showcase-layout\s+title="([^"]*)"\s+subtitle-b64="([^"]*)"\s+prev="([^"]*)"\s+next="([^"]*)"><\/showcase-layout>/;
        const match = html.match(layoutRegex);
        if (match) {
          const [full, title, subtitleB64] = match;
          const subtitle = Buffer.from(subtitleB64, "base64").toString("utf-8");
          const headerHtml = `
<header id="info">
  <h1>${title}</h1>
  ${subtitle}
</header>`;
          const footerHtml = `<footer class="app-footer">Copyright 2026 Stefan Rottensteiner // Small World</footer>`;
          html = html.replace(full, headerHtml);
          html = html.replace("</body>", footerHtml + "\n  </body>");
        }
        return html;
      },
    },
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
    {
      name: "copy-assets",
      closeBundle() {
        const copyRecursiveSync = (src: string, dest: string) => {
          if (!fs.existsSync(src)) return;
          const stats = fs.statSync(src);
          if (stats.isDirectory()) {
            fs.mkdirSync(dest, { recursive: true });
            fs.readdirSync(src).forEach((child) => {
              copyRecursiveSync(path.join(src, child), path.join(dest, child));
            });
          } else {
            if (!src.endsWith(".ts") && !src.endsWith(".html")) {
              fs.copyFileSync(src, dest);
            }
          }
        };
        copyRecursiveSync("showcases", "dist/showcases");
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
        drop_console: false,
        drop_debugger: true,
        passes: 2,
      },
      mangle: true,
    },
    rollupOptions: {
      input: {
        showcase8: resolve(import.meta.dirname, "showcases/8/index.html"),
        showcase9: resolve(import.meta.dirname, "showcases/9/index.html"),
        showcase10: resolve(import.meta.dirname, "showcases/10/index.html"),
        showcase11: resolve(import.meta.dirname, "showcases/11/index.html"),
        showcase12: resolve(import.meta.dirname, "showcases/12/index.html"),
        showcase13: resolve(import.meta.dirname, "showcases/13/index.html"),
        showcase14: resolve(import.meta.dirname, "showcases/14/index.html"),
        showcase15: resolve(import.meta.dirname, "showcases/15/index.html"),
        showcase16: resolve(import.meta.dirname, "showcases/16/index.html"),
        showcase17: resolve(import.meta.dirname, "showcases/17/index.html"),
        showcase18: resolve(import.meta.dirname, "showcases/18/index.html"),
        showcase19: resolve(import.meta.dirname, "showcases/19/index.html"),
        showcase20: resolve(import.meta.dirname, "showcases/20/index.html"),
        showcase21: resolve(import.meta.dirname, "showcases/21/index.html"),
        showcase22: resolve(import.meta.dirname, "showcases/22/index.html"),
        showcase23: resolve(import.meta.dirname, "showcases/23/index.html"),
        showcase24: resolve(import.meta.dirname, "showcases/24/index.html"),
        showcase25: resolve(import.meta.dirname, "showcases/25/index.html"),
        showcase26: resolve(import.meta.dirname, "showcases/26/index.html"),
        yad: resolve(import.meta.dirname, "showcases/yad/index.html"),
        neonLabyrinth: resolve(import.meta.dirname, "showcases/neon-labyrinth/index.html"),
        pbrgen: resolve(import.meta.dirname, "public/tools/pbr-gen.html"),
        iblgen: resolve(import.meta.dirname, "public/tools/ibl-gen.html"),
        pixler: resolve(import.meta.dirname, "public/tools/pixler.html"),
        mapgen: resolve(import.meta.dirname, "public/tools/map-gen.html"),
        xtractor: resolve(import.meta.dirname, "public/tools/xtractor.html"),
        splattergen: resolve(import.meta.dirname, "public/tools/splatter-gen.html"),
        gamepadtest: resolve(import.meta.dirname, "public/tools/gamepad-test.html"),
        presentation: resolve(import.meta.dirname, "public/presentation.html"),
        main: resolve(import.meta.dirname, "public/index.html"),
      },
      output: {
        entryFileNames: (chunk) => {
          const toolNames = [
            "pbrgen",
            "iblgen",
            "pixler",
            "mapgen",
            "xtractor",
            "splattergen",
            "gamepadtest",
          ];
          if (toolNames.includes(chunk.name)) {
            return `js/tools/[name].js`;
          }
          if (chunk.name === "main" || chunk.name === "presentation") {
            return `js/[name].js`;
          }
          return `showcases/[name]/showcase.js`;
        },
        assetFileNames: "assets/[name].[ext]",
        chunkFileNames: "js/[name].js",
      },
    },
  },
});

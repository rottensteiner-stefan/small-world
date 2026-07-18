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
    include: ["tests/**/*.test.ts"],
  },
  plugins: [
    {
      name: "showcase-layout",
      transformIndexHtml(html) {
        const layoutRegex =
          /<showcase-layout\s+title="([^"]*)"\s+subtitle-b64="([^"]*)"\s+prev="([^"]*)"\s+next="([^"]*)"><\/showcase-layout>/;
        const match = html.match(layoutRegex);
        if (match) {
          const [full, title, subtitleB64, prev, next] = match;
          const subtitle = Buffer.from(subtitleB64, "base64").toString("utf-8");
          const headerHtml = `
<div class="example-nav">
  <a href="${prev}" class="nav-btn">←<span class="hide-mobile"> Back</span></a>
  <a href="/" class="nav-btn"><span class="hide-mobile">Overview</span></a>
  <a href="${next}" class="nav-btn"><span class="hide-mobile">Next </span>→</a>
</div>
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
        showcase1: resolve(__dirname, "showcases/1/index.html"),
        showcase2: resolve(__dirname, "showcases/2/index.html"),
        showcase3: resolve(__dirname, "showcases/3/index.html"),
        showcase4: resolve(__dirname, "showcases/4/index.html"),
        showcase5: resolve(__dirname, "showcases/5/index.html"),
        showcase6: resolve(__dirname, "showcases/6/index.html"),
        showcase7: resolve(__dirname, "showcases/7/index.html"),
        showcase8: resolve(__dirname, "showcases/8/index.html"),
        showcase9: resolve(__dirname, "showcases/9/index.html"),
        showcase10: resolve(__dirname, "showcases/10/index.html"),
        showcase11: resolve(__dirname, "showcases/11/index.html"),
        showcase12: resolve(__dirname, "showcases/12/index.html"),
        showcase13: resolve(__dirname, "showcases/13/index.html"),
        showcase14: resolve(__dirname, "showcases/14/index.html"),
        showcase15_v1: resolve(__dirname, "showcases/15_v1/index.html"),
        showcase15_v2: resolve(__dirname, "showcases/15_v2/index.html"),
        showcase16: resolve(__dirname, "showcases/16/index.html"),
        showcase17: resolve(__dirname, "showcases/17/index.html"),
        showcase18: resolve(__dirname, "showcases/18/index.html"),
        showcase19: resolve(__dirname, "showcases/19/index.html"),
        showcase20: resolve(__dirname, "showcases/20/index.html"),
        showcase21: resolve(__dirname, "showcases/21/index.html"),
        showcase22: resolve(__dirname, "showcases/22/index.html"),
        showcase23: resolve(__dirname, "showcases/23/index.html"),
        yad: resolve(__dirname, "showcases/yad/index.html"),
        pbrgen: resolve(__dirname, "public/tools/pbr-gen.html"),
        presentation: resolve(__dirname, "public/presentation.html"),
        main: resolve(__dirname, "public/index.html"),
      },
      output: {
        entryFileNames: () => {
          return `showcases/[name]/showcase.js`;
        },
        assetFileNames: "assets/[name].[ext]",
        chunkFileNames: "js/[name].js",
      },
    },
  },
});

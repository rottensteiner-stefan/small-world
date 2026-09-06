import { defineConfig } from "vitest/config";
import { resolve } from "path";
import mkcert from "vite-plugin-mkcert";
import http from "http";
import net from "net";
import EventEmitter from "events";
import fs from "fs";
import path from "path";

EventEmitter.defaultMaxListeners = 50;

// The port everyone actually types/bookmarks (unchanged from before). The real Vite dev server
// listens on INTERNAL_HTTPS_PORT instead -- see the "https-only-port-5173" plugin below, which
// puts a raw TCP multiplexer on PUBLIC_PORT that inspects each connection's first byte and either
// forwards a genuine TLS handshake straight through to the internal server, or -- for plain-text
// HTTP -- answers with a redirect to the https:// URL itself. This is what makes
// `http://localhost:5173/...` (the same port the HTTPS dev server "appears" to run on) redirect
// instead of just failing to connect, which a same-process https.Server alone can't do: a single
// TCP port can't natively speak both plain HTTP and TLS at once.
const PUBLIC_PORT = 5173;
const INTERNAL_HTTPS_PORT = 5183;

export default defineConfig({
  base: "./",
  publicDir: "public",
  server: {
    // The real dev server binds here, internally -- see PUBLIC_PORT's doc comment above.
    port: INTERNAL_HTTPS_PORT,
    strictPort: true,
  },
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
      // Makes PUBLIC_PORT itself redirect plain HTTP to HTTPS instead of just failing to
      // connect -- see PUBLIC_PORT's doc comment up top for why a same-process https.Server
      // alone can't do this, and why the real dev server binds to INTERNAL_HTTPS_PORT instead.
      name: "https-only-port-5173",
      configureServer(server) {
        server.httpServer?.once("listening", () => {
          // Vite would otherwise print the internal port nobody is meant to connect to directly.
          server.printUrls = () => {
            console.log(`\n  ➜  Local:   https://localhost:${PUBLIC_PORT}/`);
          };

          // Peeks at each connection's first byte: 0x16 is a TLS ClientHello's content type, so
          // a connection starting with it is forwarded byte-for-byte to the real internal HTTPS
          // server (HMR websocket upgrades happen *inside* that forwarded TLS stream, so they
          // work completely transparently -- this never parses HTTP itself for the TLS case).
          // Anything else is plain-text HTTP, answered directly with a redirect.
          const multiplexer = net.createServer((socket) => {
            socket.once("data", (chunk: Buffer) => {
              if (chunk.length > 0 && chunk[0] === 0x16) {
                const upstream = net.connect(INTERNAL_HTTPS_PORT, "127.0.0.1", () => {
                  upstream.write(chunk);
                  socket.pipe(upstream);
                  upstream.pipe(socket);
                });
                upstream.on("error", () => socket.destroy());
              } else {
                const text = chunk.toString("utf8");
                const hostMatch = text.match(/^Host:\s*([^\r\n]+)/im);
                const host = hostMatch ? hostMatch[1]!.split(":")[0] : "localhost";
                const pathMatch = text.match(/^[A-Z]+\s+(\S+)/);
                const reqPath = pathMatch ? pathMatch[1] : "/";
                const location = `https://${host}:${PUBLIC_PORT}${reqPath}`;
                const body = `Redirecting to ${location}`;
                socket.end(
                  `HTTP/1.1 301 Moved Permanently\r\n` +
                    `Location: ${location}\r\n` +
                    `Content-Type: text/plain\r\n` +
                    `Content-Length: ${Buffer.byteLength(body)}\r\n` +
                    `Connection: close\r\n\r\n${body}`,
                );
              }
            });
            socket.on("error", () => socket.destroy());
          });
          multiplexer.on("error", (err: NodeJS.ErrnoException) => {
            console.error(
              `\n  ✖  Could not bind port ${PUBLIC_PORT} for the HTTP/HTTPS multiplexer: ${err.message}`,
            );
          });
          multiplexer.listen(PUBLIC_PORT);

          // Best-effort plain-HTTP redirect on port 80, for anyone who doesn't even know the dev
          // port (e.g. typing "http://localhost/"). Requires elevated privileges on most
          // systems, so this is allowed to silently fail -- the multiplexer above, not this, is
          // what guarantees every request that reaches PUBLIC_PORT gets redirected.
          const port80Redirect = http.createServer((req, res) => {
            const host = req.headers.host ? req.headers.host.split(":")[0] : "localhost";
            res.writeHead(301, { Location: `https://${host}:${PUBLIC_PORT}${req.url || "/"}` });
            res.end();
          });
          port80Redirect.on("error", () => {
            /* Needs root on most systems -- fine, the multiplexer above already covers it. */
          });
          port80Redirect.listen(80, () => {
            console.log(
              `\n  ➜  HTTP Redirect: http://localhost/ -> https://localhost:${PUBLIC_PORT}/`,
            );
          });
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
    ...(process.env.VITEST ? [] : [mkcert()]),
  ],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    chunkSizeWarningLimit: 800,
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
        showcase26: resolve(import.meta.dirname, "showcases/26/index.html"),
        showcase27: resolve(import.meta.dirname, "showcases/27/index.html"),
        showcase28: resolve(import.meta.dirname, "showcases/28/index.html"),
        showcase29: resolve(import.meta.dirname, "showcases/29/index.html"),
        showcase30: resolve(import.meta.dirname, "showcases/30/index.html"),
        showcase31: resolve(import.meta.dirname, "showcases/31/index.html"),
        showcase32: resolve(import.meta.dirname, "showcases/32/index.html"),
        showcase33: resolve(import.meta.dirname, "showcases/33/index.html"),
        showcase34: resolve(import.meta.dirname, "showcases/34/index.html"),
        andNowHub: resolve(import.meta.dirname, "src/apps/and-now/index.html"),
        andNowPrologue: resolve(import.meta.dirname, "src/apps/and-now/scenes/prologue/index.html"),
        andNowScene2: resolve(
          import.meta.dirname,
          "src/apps/and-now/scenes/flakturm-tunnel/index.html",
        ),
        andNowCharacterDiorama: resolve(
          import.meta.dirname,
          "src/apps/and-now/scenes/character-diorama/index.html",
        ),
        yad: resolve(import.meta.dirname, "showcases/yad/index.html"),
        neonLabyrinth: resolve(import.meta.dirname, "showcases/neon-labyrinth/index.html"),
        lightCycleArena: resolve(import.meta.dirname, "showcases/light-cycle-arena/index.html"),
        pbrgen: resolve(import.meta.dirname, "public/tools/pbr-gen.html"),
        iblgen: resolve(import.meta.dirname, "public/tools/ibl-gen.html"),
        pixler: resolve(import.meta.dirname, "public/tools/pixler.html"),
        mapgen: resolve(import.meta.dirname, "public/tools/map-gen.html"),
        xtractor: resolve(import.meta.dirname, "public/tools/xtractor.html"),
        splattergen: resolve(import.meta.dirname, "public/tools/splatter-gen.html"),
        gamepadtest: resolve(import.meta.dirname, "public/tools/gamepad-test.html"),
        maker: resolve(import.meta.dirname, "public/tools/maker.html"),
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
            "maker",
          ];
          if (toolNames.includes(chunk.name)) {
            return `js/tools/[name].js`;
          }
          if (chunk.name === "main" || chunk.name === "presentation") {
            return `js/[name].js`;
          }
          if (chunk.name === "andNowPrologue") {
            return "src/apps/and-now/scenes/prologue/prologue.js";
          }
          if (chunk.name === "andNowScene2") {
            return "src/apps/and-now/scenes/flakturm-tunnel/showcase.js";
          }
          if (chunk.name === "andNowCharacterDiorama") {
            return "src/apps/and-now/scenes/character-diorama/showcase.js";
          }
          return `showcases/[name]/showcase.js`;
        },
        assetFileNames: "assets/[name].[ext]",
        chunkFileNames: "js/[name].js",
      },
    },
  },
});

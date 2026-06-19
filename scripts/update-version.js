import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pkgPath = path.resolve(__dirname, "../package.json");
const swPath = path.resolve(__dirname, "../src/core/SmallWorld.ts");

try {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));

  if (fs.existsSync(swPath)) {
    let content = fs.readFileSync(swPath, "utf8");
    content = content.replace(
      /export const ENGINE_VERSION = "[^"]*";/,
      `export const ENGINE_VERSION = "${pkg.version}";`
    );
    fs.writeFileSync(swPath, content);
    console.log(`[Build] SmallWorld.ts (v${pkg.version}) aktualisiert.`);
  } else {
    console.error(`[Build] SmallWorld.ts nicht gefunden unter: ${swPath}`);
    process.exit(1);
  }
} catch (err) {
  console.error("[Build] Fehler:", err.message);
  process.exit(1);
}

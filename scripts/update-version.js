import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pkgPath = path.resolve(__dirname, "../package.json");

try {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));

  const tsContent = `// AUTO-GENERATED FILE - DO NOT EDIT
import { RendererType } from '../enums/RendererType.js';

export { RendererType }; // <--- WICHTIG: Re-Export hinzufügen
export const ENGINE_VERSION = "${pkg.version}";
export const DEFAULT_RENDERER = RendererType.BEST;
`;

  const outPath = path.resolve(__dirname, "../src/core/Engine.ts");
  fs.writeFileSync(outPath, tsContent);
  console.log(`[Build] Engine.ts (v${pkg.version}) aktualisiert.`);
} catch (err) {
  console.error("[Build] Fehler:", err.message);
  process.exit(1);
}

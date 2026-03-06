import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pkgPath = path.resolve(__dirname, '../package.json');

try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

    // Neuer Dateiname: Engine.ts
    const tsContent = `// AUTO-GENERATED FILE - DO NOT EDIT\nexport const ENGINE_VERSION = "${pkg.version}";\n`;
    const outPath = path.resolve(__dirname, '../src/constants/Engine.ts');

    fs.writeFileSync(outPath, tsContent);
    console.log(`[Build] Engine Version ${pkg.version} in Engine.ts aktualisiert.`);
} catch (err) {
    console.error('[Build] Fehler:', err.message);
    process.exit(1);
}
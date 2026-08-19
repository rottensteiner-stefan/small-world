import { describe, expect, it } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { MaterialType } from "../../src/enums/MaterialType.js";

const REPO_ROOT = path.resolve(__dirname, "../..");
const SCAN_ROOTS = ["src", "showcases"];
const EXCLUDED_DIRS = new Set(["node_modules", "dist", ".git"]);

/**
 * Collects every .ts file under the given roots, skipping build output and
 * dependency directories.
 */
function collectSourceFiles(): string[] {
  const files: string[] = [];

  function walk(dir: string): void {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (EXCLUDED_DIRS.has(entry.name)) continue;

      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile() && entry.name.endsWith(".ts") && !entry.name.endsWith(".d.ts")) {
        files.push(fullPath);
      }
    }
  }

  for (const root of SCAN_ROOTS) {
    walk(path.join(REPO_ROOT, root));
  }

  return files;
}

const sourceFiles = collectSourceFiles();
const fileContents = new Map<string, string>(
  sourceFiles.map((file) => [file, fs.readFileSync(file, "utf-8")]),
);

const materials = Object.values(MaterialType).map((className) => ({
  className,
  ownDefinitionFile: path.join(REPO_ROOT, "src", "core", "materials", `${className}.ts`),
}));

describe("Material usage", () => {
  it.each(materials)(
    "$className is actually instantiated somewhere outside its own definition",
    ({ className, ownDefinitionFile }) => {
      const constructorCall = `new ${className}(`;
      const usageSites = sourceFiles.filter(
        (file) => file !== ownDefinitionFile && fileContents.get(file)!.includes(constructorCall),
      );

      expect(
        usageSites.length,
        `${className} is never instantiated (no "${constructorCall}" found outside ` +
          `${path.relative(REPO_ROOT, ownDefinitionFile)}). A material that is only unit-tested ` +
          `but never actually used has never had its shaders compiled by a real renderer -- add it ` +
          `to a showcase or engine-internal call site before relying on it.`,
      ).toBeGreaterThan(0);
    },
  );
});

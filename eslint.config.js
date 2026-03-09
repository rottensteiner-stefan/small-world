import js from "@eslint/js";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";
import globals from "globals";

export default [
  // 1. Standard JavaScript & TypeScript Empfehlungen
  js.configs.recommended,
  ...tseslint.configs.recommended,

  // 2. Prettier-Konflikte deaktivieren
  prettier,

  // 3. Konfiguration für deinen Engine-Code (Browser-Umgebung)
  {
    files: ["src/**/*.ts", "examples/**/*.ts"],
    languageOptions: {
      globals: {
        ...globals.browser, // Erkennt window, document, navigator.gpu etc.
      },
    },
    rules: {
      // Da wir in der Engine aktuell noch oft "any" nutzen (z.B. beim Canvas-Fallback),
      // setzen wir diese Regel vorerst nur auf eine Warnung, statt einen Fehler zu werfen.
      "@typescript-eslint/no-explicit-any": "warn",

      // Warnung, wenn Variablen deklariert, aber nie genutzt werden
      "@typescript-eslint/no-unused-vars": "warn",
    },
  },

  // 4. Konfiguration für deine Build-Skripte (Node.js-Umgebung)
  {
    files: ["scripts/**/*.js"],
    languageOptions: {
      globals: {
        ...globals.node, // Erkennt process, __dirname, fs etc.
      },
    },
  },

  // 5. Globale Ignorier-Regeln (Kompilierte Dateien in Ruhe lassen)
  {
    ignores: ["node_modules/", "dist/", "build/", "**/*.d.ts"],
  },
];

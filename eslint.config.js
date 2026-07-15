import globals from "globals";
import importPlugin from "eslint-plugin-import";
import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import tseslint from "typescript-eslint";

export default [
  // 1. Standard JavaScript & TypeScript Empfehlungen
  js.configs.recommended,
  ...tseslint.configs.recommended,

  // 2. Prettier-Konflikte deaktivieren
  prettier,

  // 3. Konfiguration für deinen Engine-Code (Browser-Umgebung)
  {
    files: ["src/**/*.ts"],
    plugins: {
      import: importPlugin,
    },
    languageOptions: {
      globals: {
        ...globals.browser, // Erkennt window, document, navigator.gpu etc.
      },
    },
    rules: {
      // 1) Strikte Typisierung und Sichtbarkeit
      "@typescript-eslint/explicit-member-accessibility": [
        "error",
        { accessibility: "explicit", overrides: { constructors: "no-public" } },
      ],
      "@typescript-eslint/explicit-function-return-type": [
        "error",
        { allowExpressions: false, allowHigherOrderFunctions: true },
      ],

      // 2) Verbote & Best Practices
      "@typescript-eslint/no-explicit-any": "error",
      "prefer-const": "error",

      // 3) Naming Conventions gemäß AGENTS.md
      "@typescript-eslint/naming-convention": [
        "error",
        // Klassen, Interfaces, Enums, Type Aliases -> PascalCase
        { selector: ["class", "interface", "enum", "typeAlias"], format: ["PascalCase"] },
        // Interfaces dürfen NICHT mit I beginnen
        {
          selector: "interface",
          format: ["PascalCase"],
          custom: { regex: "^(?!I[A-Z])", match: true },
        },
        // Private Member mit führendem Unterstrich
        {
          selector: ["classProperty", "method"],
          modifiers: ["private"],
          leadingUnderscore: "require",
          format: null,
        },
      ],

      // 4) Hygiene
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],

      // 5) ESM-Imports benötigen .js-Endung (Packages sind ausgenommen)
      "import/extensions": ["error", "ignorePackages"],
      
      // Combine multiple imports from the same module
      "import/no-duplicates": "error",

      "no-restricted-syntax": [
        "error",
        {
          selector:
            "MethodDefinition[kind='constructor'] > FunctionExpression > Identifier[optional=true]:nth-child(3), MethodDefinition[kind='constructor'] > FunctionExpression > Identifier[optional=true]:nth-child(4), MethodDefinition[kind='constructor'] > FunctionExpression > Identifier[optional=true]:nth-child(5)",
          message:
            "Regel aus @AGENTS.md: Ein Konstruktor darf maximal 2 optionale Parameter haben. Nutze ab dem 3. Parameter ein 'Options Object'.",
        },
      ],
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
    ignores: ["node_modules/", "dist/", "build/", "docs/", "**/.*/**", "var/", "**/*.d.ts"],
  },
];

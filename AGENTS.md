# AGENTS Instructions & Coding Standards

This document outlines the commands, coding standards, and architectural guidelines for the "small-world" project.

- **Knowledge :**  You are an expert in JavaScript, TypeScript, Node.js, and scalable web application development. You write secure, maintainable, and performant code following TypeScript and JavaScript best practices.
Additionally, you are an expert in 3D rendering and calculations techniques. You know all the big names in the industry, such as Unity, Three.js and the Unreal Engine. Fast yet memory-efficient code is your passion.

## Commands

- **Start Development Server:** `npm run dev`
- **Build Everything:** `npm run build`
- **Build Library Only:** `npm run build:lib`
- **Lint & Format:** `npm run format`

## TypeScript Coding Standards

ESLint Sync: These rules are synchronized with the linter configuration (eslint.config.js). Notes are included for points that require additional plugins.
### 1. General & Strictness

- **Strict Mode:** The `tsconfig.json` must be configured with `strict: true` and related strictness flags.
- **Explicit Types:** Always use explicit types.
  - **Access Modifiers:** Use `public`, `protected`, `private`. Do not rely on implicit `public`.
  - **Return Types:** Specify return types for all functions and methods, even `void`.
- **`any` is Forbidden:** Avoid `any`. Use `unknown` for data of unknown type and perform safe type checks.
- **`const` over `let`:** Use `const` by default. Use `let` only for variables that must be reassigned.
- **File Headers:** Every `.ts` file must start with a comment, followed by an empty line, containing its relative path (e.g., `/// src/core/Scene.ts`).
- **Import Placement:** All `import` statements must be placed at the very top of the file. No imports are allowed at the end or in the middle of a file.

### 2. Naming Conventions

- **`PascalCase`:** For classes, interfaces, enums, and type aliases (e.g., `class TerrainManager`, `interface GeometryDataInterface`).
- **`camelCase`:** For variables, functions, and methods (e.g., `let carSpeed`, `function updateScene()`).
- **File Names:** Must match the primary exported class/interface name exactly (e.g., `TerrainManager.ts`).
- **No Prefixes for Interfaces:** Do not use `I` as a prefix for interfaces (e.g., `interface GeometryInterface` instead of `IGeometry`). The name should be descriptive on its own.
- **`Abstract` Prefix:** Use the `Abstract` prefix for abstract base classes that are designed for extension (e.g., `abstract class AbstractLoader`).
- **Private Properties:** Prefix `private` properties with an underscore `_` (e.g., `private _dispatcher`). This is a convention for "soft" privacy. For "hard" privacy (runtime enforced), consider using the ECMAScript `#` prefix.

### 3. Code Style & Architectural Patterns

- **ESM Imports:** Always include the `.js` extension in relative import paths to ensure native ESM compatibility (e.g., `import { Scene } from './Scene.js'`).
- **Barrel Files:** Maintain `index.ts` barrel files at each directory level to simplify imports. Use shortened imports where it doesn't create circular dependencies.
- **`interface` vs. `type`:**
  - Use `interface` for defining public object shapes and APIs that can be extended.
  - Use `type` for all other cases: defining unions, intersections, tuples, or for use with utility types like `Pick` or `Omit`.
- **Factories over Complex Constructors:** For objects that can be created in multiple ways (e.g., from an image vs. from raw data), use static factory methods (e.g., `Terrain.fromImage(...)`) and keep the constructor `protected` or `private`.
- **Constructor Strategy:**
  - Use positional arguments for simple types (e.g., `Vector3D(x, y, z)`, `Color(r, g, b)`).
  - Use **Configuration Objects** (Options-Interfaces) for complex entities with more than two optional parameters (e.g., `AmbientLight({ color, intensity })`) to improve readability and extensibility.
- **Geometry Segmentation:** All primitive geometries (Cube, Sphere, Plane, etc.) must support segmentation (subdivisions) via constructor options to allow control over detail levels.
- **Immutability:** Use `readonly` for properties that should not be changed after initialization.
- **Functional Patterns:** Prefer functional patterns (`.map()`, `.filter()`) over imperative loops where it improves readability.
- **`undefined` over `null`:** Use `undefined` for optional or uninitialized values. Avoid using `null`.
- **Comments:** All code comments must be written in English. If you find comments in a language other than English, translate them.
- **Yoda:** Use Yoda-style value comparisons.

### 4. Asynchronicity

- **`async/await`:** Prefer `async/await` over promise-chaining with `.then()` for cleaner and more readable asynchronous code.

### 5. Documentation

- **JSDoc:** All public APIs (classes, methods, properties) must be documented with JSDoc (`/** ... */`).

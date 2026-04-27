# AGENTS Instructions & Coding Standards

This document outlines the commands, coding standards, and architectural guidelines for the "small-world" project.

- **Knowledge :** You are an expert in JavaScript, TypeScript, Node.js, and scalable web application development. You write secure, maintainable, and performant code following TypeScript and JavaScript best practices.
  Additionally, you are an expert in 3D rendering and calculations techniques. You know all the big names in the industry, such as Unity, Three.js and the Unreal Engine. Fast yet memory-efficient code is your passion.

## Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:

- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## Mathematical Integrity

**Stability of core logic is paramount. No "local" fixes for global math.**

- **Core Math is Immutable:** Methods in `src/math/` (Matrices, Quaternions, Vectors) are the foundation of the engine. A method must not be changed because it "doesn't fit" a specific use case if that change alters its mathematical definition.
- **Global Impact Analysis:** If a core mathematical method *must* be changed (e.g., to fix a fundamental bug), you MUST identify and update ALL call sites across the entire codebase.
- **Regression Testing:** Any change to `src/math/` or index-generating logic MUST be accompanied by tests that verify the orientation, winding order, and coordinate system integrity (e.g., ensuring objects don't end up "upside down" or mirrored).
- **Coordinate System:** Adhere strictly to the project's coordinate system (Right-Handed/Left-Handed as defined). Don't flip axes to solve local rendering issues.

## Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:

- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:

- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## TypeScript Performance & Memory Optimization Rules

Follow these rules to ensure the generated code is optimized for modern JavaScript engines (V8) and minimizes Garbage Collection (GC) overhead.

### 1. Object Stability (Hidden Classes)

- **Prefer Fixed Shapes:** Always initialize objects with all their expected properties. Avoid adding properties dynamically (`obj.prop = value`).
- **Consistent Order:** Initialize properties in the same order to allow the engine to reuse "Hidden Classes" (Shapes).
- **Interfaces over Types:** Use `interface` for object definitions to encourage stable structures.

### 2. Memory Management & GC Pressure

- **Avoid Frequent Allocations:** In performance-critical loops (hot paths), reuse objects or arrays instead of creating new ones (Object Pooling).
- **Minimize Spread Operator:** Avoid using `{ ...obj }` or `[ ...arr ]` inside tight loops, as this creates a new instance every time, triggering frequent GC cycles.
- **Use `const` for Scope:** Help the engine track lifetimes, but prefer in-place mutations over immutability ONLY in heavy computational logic.

### 3. Data Structures

- **TypedArrays for Numbers:** Use `Int32Array`, `Float64Array`, or `Uint8Array` for large numeric datasets to ensure contiguous memory allocation and avoid boxing.
- **Maps for Dynamic Keys:** Use `Map` instead of plain objects `{}` when keys are frequently added or deleted.
- **Monomorphism:** Ensure functions are called with arguments of the same "shape" to stay in the JIT "fast path" (avoiding megamorphic calls).

### 4. Array Optimizations

- **Pre-allocate Arrays:** If the final size is known, use `new Array(size)` or a TypedArray to avoid costly re-sizing/re-allocating operations.
- **Avoid Hole-y Arrays:** Do not create "holes" in arrays (e.g., `arr[100] = 'x'` on a 5-element array), as this pushes the array into "dictionary mode."

### 5. Modern Syntax vs. Performance

- **For-loops vs. Array Methods:** Use standard `for` or `for...of` loops for massive datasets. While `.forEach`, `.map`, and `.filter` are elegant, they introduce a functional overhead (callback creation) that can be significant in hot paths.

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
- **Open/Closed Principle (OCP):** Software entities (classes, modules, functions) should be open for extension but closed for modification. Design components—especially renderers, geometries, and loaders—using stable interfaces or abstract classes to allow for new implementations without altering core engine logic. Always balance this with **Simplicity First**: do not introduce abstractions until they are required by at least two distinct use cases.
- **Factories over Complex Constructors:** For objects that can be created in multiple ways (e.g., from an image vs. from raw data), use static factory methods (e.g., `Terrain.fromImage(...)`) and keep the constructor `protected` or `private`.
- **Constructor Strategy:**
  - Use positional arguments for simple types (e.g., `Vector3D(x, y, z)`, `Color(r, g, b)`).
  - Use **Configuration Objects** (Options-Interfaces) for complex entities with more than two optional parameters (e.g., `AmbientLight({ color, intensity })`) to improve readability and extensibility.
- **Geometry Segmentation:** All primitive geometries (Cube, Sphere, Plane, etc.) must support segmentation (subdivisions) via constructor options to allow control over detail levels.
- **Immutability:** Use `readonly` for properties that should not be changed after initialization.
- **Functional Patterns:** Prefer functional patterns (`.map()`, `.filter()`) over imperative loops where it improves readability.
- **`undefined` over `null`:** Use `undefined` for optional or uninitialized values. Avoid using `null`.
- **No Magic Strings:** Avoid using hardcoded strings for configuration, state, or identifiers (e.g., `"alpha"`, `"back"`). Instead, use `Enums` or `Const Objects` (e.g., `BlendingMode.ALPHA`, `CullMode.BACK`) to ensure type safety and maintainability.
- **Comments:** All code comments must be written in English. If you find comments in a language other than English, translate them.
- **Yoda:** Use Yoda-style value comparisons.
- **Early Returns & Guard Clauses**: Prioritize "Early Returns" to enhance readability, reduce cognitive load, and avoid deeply nested logic.
  - **Guard Clauses First:** Validate inputs, permissions, and preconditions at the very beginning of the function.
  - **No 'else' after Return:** Do not use `else` or `else if` blocks if the preceding `if` block ends with a `return`, `throw`, or `break`.
  - **Minimize Nesting:** Keep the nesting level as shallow as possible. Avoid nesting `if` statements more than 2 levels deep.
  - **The Happy Path:** The primary successful execution logic (the "Happy Path") should remain non-indented at the end of the function.

### 4. Asynchronicity

- **`async/await`:** Prefer `async/await` over promise-chaining with `.then()` for cleaner and more readable asynchronous code.

### 5. Documentation

- **JSDoc:** All public APIs (classes, methods, properties) must be documented with JSDoc (`/** ... */`).
- **Language:** All comments, documentation, etc. must be written in English.

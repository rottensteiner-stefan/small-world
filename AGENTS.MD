# AGENTS instructions

## Commands

`<PROJECT>` is the folder where the `package.json` of the package is located.

- **Compile everything** `npm run build`
- **Compile the library:** `npm run build:lib`
- **Start Development Server:** `npm run dev`
- **Lint code:** `npm run lint`
- **Fix code:** `npm run format`

## TypeScript Coding Standards

### General

- **Strict Mode:** Always use `strict` mode in `tsconfig.json`.
- **Typing:** Prefer `interface` over `type` for object structures.
- **Explicit Return Types:** Always specify return types for functions and methods, even if it is `void`.
- **Explicit Accessibility:** Always use explicit access modifiers (`public`, `protected`, `private`). Do not rely on implicit `public`.
- **Security:** Avoid `any`. Use `unknown` for unknown data types and cast safely.

### Naming Conventions

- **Variables/Functions:** Use `camelCase`.
- **Classes/Types/Enums:** Use `PascalCase`.
- **Interfaces:** Use `I` prefix (e.g., `IGeometry`).
- **Abstract Classes:** Use `Abstract` prefix (e.g., `AbstractLoader`).
- **Files:** File names must match the exported class/interface name exactly (PascalCase).
- **Private Properties:** Prefix private properties with an underscore `_` (e.g., `private _dispatcher`).

### Formatting & Style

- **Prettier:** Follow Prettier standards (no semicolons, single quotes, 2 spaces indentation).
- **Functional Programming:** Use `.map()`, `.filter()`, `.reduce()` instead of imperative loops where possible.
- **Immutability:** Use `readonly` for properties that should not change after initialization.
- **Nullability:** Prefer `undefined` over `null`.

### Documentation

- **JSDoc:** Public methods and classes should be documented with JSDoc (`/** ... */`).

## Directory Structure

- `src/core`: Core engine logic (Renderer, Scene, Events).
- `src/enums`: Enumerations.
- `src/interfaces`: TypeScript interfaces.
- `src/geometry`: Geometry definitions and meshes.
- `src/materials`: Material definitions.
- `src/loaders`: Asset loaders.
- `src/math`: Mathematical helpers.

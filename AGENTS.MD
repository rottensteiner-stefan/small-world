# AGENTS instructions

## Commands

`<PROJECT>` is folder where package.json of the package is located.
- **Compile the library:** `npm run build:lib`

## TypeScript Coding Standards

- **Strict:** Always use `strict` mode in `tsconfig.json`.
- **Typing:** Prefer `interface` over `type` for object structures.
- **Consistency:** Use `camelCase` for variables/functions and `PascalCase` for types/classes.
- **Formatting:** Use Prettier standards (no semicolons, single quotes, two spaces).
- **Security:** Avoid `any`. Use "unknown" for unknown data types.

- **Best Practices:**

- Use `readonly` for immutable properties.
- Use functional patterns (map, filter, reduce) instead of imperative loops.
- Prefer "undefined" over "null".
- **Naming:** Use "I" prefixes for interfaces (e.g., `IUser` instead of `User`).
- **Naming:** "Abstract" prefixes for abstract class (e.g. `AbstractUser` instead of `User`).



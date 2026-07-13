# AGENTS Instructions & Coding Standards

**Context:** Small World is a custom, lightweight 3D engine written in strict TypeScript supporting hybrid WebGL2/WebGPU rendering pipelines.

## 1. Core Workflow & Token Saving

- **Planning:** Detailed plan required before any code/file change. Proceed only after user approval.
- **Surgical Changes:** Use `replace` tool for edits. NEVER use `write_file` on existing files.
- **Data Integrity:** Preserve historical entries in logs/changelogs.
- **File Storage:** Speichere Scratchpads, Skizzen und temporäre Dateien lokal im Projekt unter `.agents/scratches/`, nicht im schwer erreichbaren agent-spezifischen AppData-Verzeichnis. Ausgenommen sind reguläre Assets oder Artefakte, deren Ablageort bekannt und logisch ist.
- **Verification:** Run `npm run lint:fix`, `npm run build:lib` and `npm run test` proactively after making changes to catch errors before committing.
- **Communication:** Telegram-style (concise), use Markdown artifacts for plans/details, precise links (file/lines) instead of copying code, surgical diffs, delegate research to subagents.

## 2. Math & Coordinate System (Right-Handed)

- **Axes:** +X=Right, +Y=Up, +Z=Backward (-Z=Forward/Front).
- **Controls:** Look: theta/phi=0 at -Z. FPS (WASD): Look-relative. Formula: `dirX = -moveZ * sin; dirZ = moveZ * cos;` (W=-1, S=+1).

## 3. Rendering & WebGPU/WebGL

- **Order:** Opaque first, transparent sorted back-to-front (descending `distB - distA`).
- **Culling:** Frustum culling via `frustum.intersectsVolume(obj.bounds)`.
- **Colors:** Linear space math, final output gamma-corrected (sRGB). Diffuse + Specular <= 1.0.
- **Resources:** Explicit bitwise-OR usage flags. Bind `onuncapturederror`.
- **Shaders:** One final post-process pass (tone map, color grade, vignette, gamma). Compute shaders with workgroup memory for spatial ops.

## 4. Coding Constraints (TS strict: true)

- **Types:** Explicit types, access modifiers, and **NO `any`**. The linter will instantly reject it with `Unexpected any. Specify a different type @typescript-eslint/no-explicit-any`. Use explicit casting (e.g. `as BoundingBox`) or generics. In test files, if you MUST bypass a private method, explicitly mute the line with `// eslint-disable-next-line @typescript-eslint/no-explicit-any`. Every function and method MUST have an explicit return type (e.g., `(): void`, `(): string`).
- **Naming:** All `private` and `protected` class properties MUST start with exactly one leading underscore (e.g., `private _myProperty`).
- **Files & Imports:** Start `.ts` files with `/// path/to/file.ts`. Relative imports must end with `.js`.
- **UI/DOM:** Never use `@ts-nocheck` or `any` when dealing with DOM elements. Always cast explicitly to specific types like `HTMLElement`, `HTMLCanvasElement`, `HTMLInputElement`.
- **DOM Assignments:** Never use optional chaining on the left side of an assignment (e.g. `el?.style.cursor = 'pointer'`). It crashes bundlers like Esbuild/Rolldown. Always use explicit `if (el)` checks.
- **Simplicity:** Keep things as simple as possible. Strictly avoid overengineering or preemptive abstraction. "Kompliziert werden die Dinge eh immer von alleine."

## 5. Architectural Patterns

- **Behavior System:** Entities like Cameras use the Behavior system rather than specific controller arrays. Use `camera.addBehavior(new OrbitController())` instead of managing controllers directly.
- **Resource Loading:** Instantiate and load resources using static factory methods. For example, use `Texture.fromUrl()` instead of `new Texture().loadFrom()`.
- **Universal Singletons:** Small World enforces a "1 Engine Instance per Page" rule. To avoid prop-drilling core dependencies (like `events`), prefer using globally exported singletons (e.g., `UniversalEventBus`) over passing them through constructor options.

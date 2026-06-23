# AGENTS Instructions & Coding Standards

## 1. Core Workflow & Token Saving
- **Planning:** Detailed plan required before any code/file change. Proceed only after user approval.
- **Surgical Changes:** Use `replace` tool for edits. NEVER use `write_file` on existing files.
- **Data Integrity:** Preserve historical entries in logs/changelogs.
- **Verification:** Run `npm run build:lib && npm test` (and specific tests like `tests/core/FPSController.test.ts`).
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
- **Optimization:** Prefer analytical/procedural math calculations over texturing/memory lookups where feasible (Inigo Quilez: "Math is cheaper than memory").

## 4. Coding Standards (TS strict: true)
- **Types:** Explicit types, return types, access modifiers. No `any`.
- **Flow:** Guard clauses, early returns, minimize nesting, Yoda comparisons.
- **Files & Imports:** File name = primary export. Start `.ts` files with `/// path/to/file.ts`. Relative imports must end with `.js`.
- **Naming:** PascalCase for types/classes/enums, camelCase for variables/functions, `_` prefix for private properties.

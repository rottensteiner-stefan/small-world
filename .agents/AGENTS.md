# AGENTS Instructions & Coding Standards
**Context:** Small World is a custom, lightweight 3D engine written in strict TypeScript supporting hybrid WebGL2/WebGPU rendering pipelines.

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

## 4. Coding Constraints (TS strict: true)
- **Types:** Explicit types, return types, access modifiers. No `any`.
- **Files & Imports:** Start `.ts` files with `/// path/to/file.ts`. Relative imports must end with `.js`.

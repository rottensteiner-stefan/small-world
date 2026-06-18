# AGENTS Instructions & Coding Standards

This document outlines the commands, coding standards, and architectural guidelines for the "small-world" project.

- **Knowledge:** Expert in JavaScript, TypeScript, Node.js, and 3D rendering (WebGL/WebGPU).

## Core Rules & Workflow

- **Mandatory Planning:** ALWAYS create a detailed plan before making any code changes or file modifications. Code execution and modifications must only proceed AFTER the user has explicitly approved the plan.
- **Surgical Changes:** ALWAYS use the `replace` tool for existing files. NEVER use `write_file` unless explicitly replacing the entire content or after verifying full content.
- **Data Integrity:** Preserve all historical entries in logs and changelogs.
- **Verification:** Run `npm run build:lib` and `npm test` after any logic changes. Run `npm test tests/core/FPSController.test.ts` for movement verification.
- **Simplicity First:** Write the minimum code that solves the problem. No speculative features or abstractions.

## Mathematical Integrity & Coordinate System

- **Coordinate System (Right-Handed):**
  - **X:** Positive is **Right**.
  - **Y:** Positive is **Up**.
  - **Z:** Positive is **Backward**. Negative is **Forward/Front**.
- **Input & Controls:**
  - `theta = 0, phi = 0`: Camera looks **Forward** (`-Z`). `theta` increases looking **Right**.
  - **FPS Movement (WASD):** `W` (Forward, `-Z`) moves in look direction (`LookVector * moveSpeed`). `S` (Backward, `+Z`) moves opposite. `A/D` moves perpendicular.
  - `FPSController` calculation: `dirX = -moveZ * sin; dirZ = moveZ * cos;` (where W=-1, S=+1).
- **Global Impact:** Update all call sites if core mathematical logic is changed.

## Rendering & Post-Processing Architecture

- **Rendering Order:** Opaque objects MUST be drawn FIRST. Transparent objects MUST be drawn AFTER, sorted back-to-front (descending by squared distance from camera: `distB - distA`).
- **Frustum Culling:** Prune objects outside the frustum using `frustum.intersectsVolume(obj.bounds)`.
- **Lighting & Color:** Perform calculations in Linear Space (convert sRGB textures to Linear). Final output must be gamma-corrected (Linear to sRGB).
- **Energy Conservation (PBR):** `Diffuse + Specular <= 1.0`. Metallic surfaces have little to no diffuse component.
- **Resource Usage (WebGPU/WebGL):** Bitwise-OR exact usage flags explicitly when allocating textures/buffers. Bind error callbacks (`onuncapturederror`).
- **Post-Processing (Uber-Shader):** Consolidate tone mapping, color grading, vignette, and gamma correction into **one single final post-process pass**. Avoid modular ping-pong passes.
- **Compute Shaders:** Prefer WebGPU compute shaders with workgroup memory for heavy spatial operations (e.g., Gaussian Blur, Bloom).

## Coding Standards

- **Strictness:** TypeScript `strict: true`. Use explicit types, access modifiers (`public`, `protected`, `private`), and return types. Avoid `any`.
- **Early Returns & Guard Clauses:** Prioritize guard clauses at the beginning. No `else` after a return. Minimize nesting.
- **Naming:** `PascalCase` for classes/interfaces/enums. `camelCase` for variables/functions. Prefix private properties with `_`.
- **Files:** File name must match primary export. Every `.ts` file must start with its relative path as a comment (e.g. `/// src/core/Scene.ts`).
- **Imports:** Always include `.js` extension in relative ESM imports. Place imports at the very top.
- **Yoda Comparisons:** Use Yoda-style value comparisons.

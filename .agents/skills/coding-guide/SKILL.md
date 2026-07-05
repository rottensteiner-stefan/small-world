---
name: coding-guide
description: Coding standards, TypeScript templates, guard clauses, and shader math optimization references.
---

# Small World Coding Guide

This guide provides templates, clean code standards, and shader optimization patterns for the Small World Engine.

---

## 1. TypeScript Standards & Templates

All TypeScript source files must adhere to strict type-safety, explicit visibility modifiers, and correct relative imports.

### File Header and Import Template

Start every `.ts` file with its relative path as a comment, and ensure relative imports explicitly end in `.js` (required by runtime resolution).

```typescript
/// src/core/materials/ExampleMaterial.ts

import { Material } from "./Material.js";
import { Color } from "../../math/Color.js";
import { Vector3D } from "../../math/Vector3D.js";

export class ShowcaseMaterial extends Material {
  public color: Color;
  private _shininess: number;

  constructor(color: Color, shininess: number) {
    super();
    this.color = color;
    this._shininess = shininess;
  }

  public getShininess(): number {
    return this._shininess;
  }

  public setShininess(value: number): void {
    this._shininess = value;
  }
}
```

### Naming Conventions

- **PascalCase** for types, classes, interfaces, and enums (e.g. `ExampleMaterial`, `Vector3D`).
- **camelCase** for variables, properties, methods, and parameters (e.g. `color`, `setShininess`).
- **Underscore prefix (`_`)** for private and protected class members and properties (e.g. `_shininess`).

---

## 2. Control Flow: Guard Clauses & Early Returns

To maximize readability and reduce nesting, use guard clauses instead of deep `if-else` branching.

### ❌ Bad (Deeply Nested)

```typescript
public processInput(input: InputDevice): void {
  if (input.isConnected()) {
    if (input.hasKey("Space")) {
      if (this.canJump) {
        this.jump();
      }
    }
  }
}
```

### ✅ Good (Flat Guard Clauses)

```typescript
public processInput(input: InputDevice): void {
  if (!input.isConnected()) {
    return;
  }
  if (!input.hasKey("Space")) {
    return;
  }
  if (!this.canJump) {
    return;
  }

  this.jump();
}
```

---

## 3. Shader Math Optimizations ("Math is Cheaper than Memory")

When writing WGSL or GLSL shaders, minimize texture fetches and branching in favor of analytical math and branch-free step-wise interpolations.

### A. Replacing Noise Textures with Procedural Hash

Instead of sampling a high-latency noise texture for grain, water, or glitch effects, generate pseudo-random numbers analytically on the GPU.

```wgsl
// Fast procedural 2D hash/noise in WGSL
fn random(st: vec2f) -> f32 {
    var p3 = fract(vec3f(st.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}
```

### B. Branch-Free Interpolation (GLSL & WGSL)

Avoid branching (`if/else`) inside pixel shaders. Replace them with `clamp` and `mix` / `select` functions to keep GPU pipelines linear.

#### ❌ Bad (Branching Color Grading)

```wgsl
if (luma < 0.3) {
    srgb = mix(cold, warm, luma / 0.3);
} else if (luma < 0.7) {
    srgb = mix(warm, hot, (luma - 0.3) / 0.4);
} else {
    srgb = mix(hot, whiteHot, (luma - 0.7) / 0.3);
}
```

#### ✅ Good (Branch-Free Clamp and Mix)

````wgsl
let c1 = mix(cold, warm, clamp(luma / 0.3, 0.0, 1.0));
let c2 = mix(c1, hot, clamp((luma - 0.3) / 0.4, 0.0, 1.0));
srgb = mix(c2, whiteHot, clamp((luma - 0.7) / 0.3, 0.0, 1.0));

---

## 4. WebGL2 & WebGPU Shader Parity

Since the engine supports both pipelines, use this mapping guide to keep GLSL (WebGL2) and WGSL (WebGPU) shaders aligned.

### A. Common Syntax Translation Table

| Feature / Concept | WebGL2 GLSL (glsl300) | WebGPU WGSL (wgsl) | Notes / Details |
| :--- | :--- | :--- | :--- |
| **Float Vectors** | `vec2`, `vec3`, `vec4` | `vec2f`, `vec3f`, `vec4f` | Or use `vec2<f32>` format |
| **Integers / Unsigned** | `int`, `uint` | `i32`, `u32` | WGSL uses `u` suffix for unsigned (e.g. `1u`) |
| **Texture Sample** | `texture(sampler, uv)` | `textureSample(texture, sampler, uv)` | WGSL separates sampler and texture bindings |
| **Condition Mix / Selection** | `mix(a, b, t)` / `cond ? a : b` | `mix(a, b, t)` / `select(a, b, cond)` | WGSL **does not support** ternary `? :` operators |
| **Matrix Type** | `mat4` | `mat4x4f` | Or `mat4x4<f32>` |
| **Matrix Multiply** | `projection * view * pos` | `projection * view * pos` | Both are column-major, right-to-left evaluation |

### B. WGSL Uniform Buffer Layout (The 16-byte Alignment Rule)
WebGPU uniform buffers require strict memory alignments. Members of structs must align to 16 bytes for vector types:
*   `vec3f` (and `vec4f`) takes 16 bytes.
*   If a `vec3f` is followed by an `f32`, they can sit in the same 16-byte boundary (12 bytes for vec3 + 4 bytes for float).
*   If a `vec3f` is followed by another struct or array, it requires 4 bytes of padding.

```wgsl
struct PostUniforms {
    exposure: f32,          // offset 0 (4 bytes)
    inverseGamma: f32,      // offset 4 (4 bytes)
    toneMappingMode: u32,   // offset 8 (4 bytes)
    vignetteEnabled: u32,   // offset 12 (4 bytes) -> Total 16 bytes boundary

    vignetteOffset: f32,    // offset 16 (4 bytes)
    vignetteDarkness: f32,  // offset 20 (4 bytes)
    vignetteRoundness: f32, // offset 24 (4 bytes)
    grainEnabled: u32,      // offset 28 (4 bytes) -> Total 16 bytes boundary

    grainIntensity: f32,    // offset 32 (4 bytes)
    time: f32,              // offset 36 (4 bytes)
    bloomEnabled: u32,      // offset 40 (4 bytes)
    bloomIntensity: f32,    // offset 44 (4 bytes) -> Total 16 bytes boundary

    bloomColor: vec3f,      // offset 48 (12 bytes)
    filterMode: u32,        // offset 60 (4 bytes) -> Packs perfectly with vec3f into 16 bytes!
}
````

Ensure CPU-side memory mapping (`Float32Array` or `DataView`) matches this layout index-for-index.

---

## 5. Testing Guide & Mocking Patterns

We use **Vitest** for running unit tests on behaviors, math, and materials without requiring a browser window or GPU hardware.

### A. Material Parameter Test Template

Tests for materials should verify that parameter modifications update CPU storage correctly, and that shaders compile.

```typescript
import { describe, it, expect } from "vitest";
import { ExampleMaterial } from "../../src/core/materials/ExampleMaterial.js";
import { Color } from "../../src/math/Color.js";

describe("ExampleMaterial", () => {
  it("should store and update color and shininess parameters", () => {
    const mat = new ExampleMaterial(Color.RED, 30);
    expect(mat.color.equals(Color.RED)).toBe(true);
    expect(mat.getShininess()).toBe(30);

    mat.setShininess(50);
    expect(mat.getShininess()).toBe(50);
  });
});
```

### B. Mocking WebGL/Canvas Contexts

When a test instantiates parts of the renderer, mock the DOM `HTMLCanvasElement` using Vitest:

```typescript
import { vi } from "vitest";

// Mock minimal canvas and WebGL context
const mockContext = {
  viewport: vi.fn(),
  clearColor: vi.fn(),
  clear: vi.fn(),
  createShader: vi.fn(() => ({})),
  shaderSource: vi.fn(),
  compileShader: vi.fn(),
  getShaderParameter: vi.fn(() => true),
};

vi.stubGlobal("document", {
  createElement: vi.fn(() => ({
    getContext: vi.fn(() => mockContext),
    addEventListener: vi.fn(),
  })),
});
```

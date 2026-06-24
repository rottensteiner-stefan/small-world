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

export class ExampleMaterial extends Material {
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
```wgsl
let c1 = mix(cold, warm, clamp(luma / 0.3, 0.0, 1.0));
let c2 = mix(c1, hot, clamp((luma - 0.3) / 0.4, 0.0, 1.0));
srgb = mix(c2, whiteHot, clamp((luma - 0.7) / 0.3, 0.0, 1.0));
```
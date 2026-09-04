# Materials & Shaders

Small World utilizes a flexible, physically-based rendering (PBR) foundation with a strong focus on custom shader integration.

## Core Materials

- `StandardMaterial`: The primary PBR material based on the Cook-Torrance BRDF model. Supports `color`, `metallic`, `roughness`, and diffuse, normal, roughness, and emissive textures.
- `PhongMaterial` & `LambertMaterial`: Non-PBR specular and diffuse materials for classic stylized rendering.
- `BasicMaterial` & `WireframeMaterial`: Unlit materials for wireframe debugging, UI elements, or flat stylized assets.
- `GlassMaterial` & `FrostglassMaterial`: Real-time Screen-Space Refraction (SSR) with configurable `ior`, `thickness`, and `transmission`.
- `SpriteMaterial`: 2D/2.5D camera-facing billboards and particles.
- `RetroScreenMaterial`: Specialized material mimicking vintage CRT monitors with scanlines and chromatic aberration.

---

## Fluid & Liquid Surfaces (ADR 0013)

Per **ADR 0013**, Small World provides a unified architecture for liquids split into two main families sharing optimized shader chunks (`liquid_gerstner_wave`, `liquid_worley_noise`):

### 1. Wave Family (Transparent & Refractive)

Driven by mathematical Gerstner wave displacement in the vertex shader and Worley-noise intersection foam in the fragment shader.

- `OpenWaterMaterial`: Realistic PBR ocean/water with Gerstner waves, fresnel reflections, and **Opaque Depth-Fade** for soft shores.
- `StylizedWaterMaterial`: Lightweight toon/anime water with sharp foam cutoffs and cel-shading tint parameters.

```typescript
import { Object3D, Plane, OpenWaterMaterial, Color } from "small-world";

const ocean = new Object3D("Ocean");
ocean.geometry = new Plane({
  width: 100,
  height: 100,
  widthSegments: 128, // High tessellation for Gerstner wave vertex displacement
  heightSegments: 128,
}).getGeometryData();

ocean.material = new OpenWaterMaterial({
  waterColor: new Color(0.1, 0.4, 0.6),
  deepWaterColor: new Color(0.01, 0.05, 0.2),
  waveSpeed: 1.0,
  foamDistance: 0.8,
});

this.scene.add(ocean);
```

### 2. Flow Family (Noise-Driven & Emissive-Capable)

Driven by procedural noise flow and distortion on the surface, supporting opaque depth-writing or translucent blending.

- `FluidSurfaceMaterial`: The generalized base class for flow-based fluids.
- `LavaMaterial`: Opaque molten rock with customizable emissive glow intensity and thermal heat color ramps.
- `SlimeMaterial`: Translucent, oozing toxic goo with ambient edge glow and high surface viscosity.

```typescript
import { Object3D, Plane, LavaMaterial, Color } from "small-world";

const lavaPool = new Object3D("LavaPool");
lavaPool.geometry = new Plane({ width: 30, height: 30 }).getGeometryData();
lavaPool.material = new LavaMaterial({
  color: new Color(0.25, 0.03, 0.0),
  edgeColor: new Color(0.15, 0.02, 0.0),
  emissiveColor: new Color(1.0, 0.35, 0.05),
  emissiveStrength: 2.0,
  flowSpeed: 0.3,
  viscosity: 14.0,
});

this.scene.add(lavaPool);
```


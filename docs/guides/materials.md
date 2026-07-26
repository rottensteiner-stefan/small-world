# Materials & Shaders

Small World utilizes a flexible, physically-based rendering (PBR) foundation with a strong focus on custom shader integration.

## Core Materials

- `StandardMaterial`: The bread-and-butter PBR material. Supports `albedo`, `metallic`, `roughness`, and their respective map textures.
- `PhongMaterial`: A classic specular material for less physically-accurate but artistically controllable rendering.
- `GlassMaterial`: Real-time refraction using screen-space transmission mapping. Requires `ior` (Index of Refraction) and `thickness`.
- `RetroScreenMaterial`: A specialized material mimicking old CRT monitors, including scanlines and pixel chromatic aberration.

## Fluid Surface Materials

For water, lava, and oil puddles, the engine provides advanced fluid shaders.

### OpenWaterMaterial

The `OpenWaterMaterial` simulates open oceans using mathematical Gerstner Waves calculated in the Vertex Shader. This directly manipulates the vertices and recalculates normals/tangents for accurate lighting.

**Opaque Depth-Fade (Soft Shores)**:
The material automatically requests the `OpaqueDepth` buffer from the render pipeline (`WebGPURenderer.captureOpaqueDepth`). By sampling the actual depth of the scene behind the water, the shader calculates the optical distance through the water and creates a soft fade at the shores, eliminating hard intersections with the terrain.

```typescript
import { Object3D, Plane, OpenWaterMaterial, Color } from "small-world";

const ocean = new Object3D("Ocean");
ocean.geometry = new Plane({
  width: 100,
  height: 100,
  widthSegments: 128, // High tessellation needed for Gerstner waves
  heightSegments: 128
}).getGeometryData();

const waterMat = new OpenWaterMaterial({
  waterColor: new Color(0.1, 0.4, 0.6),
  deepWaterColor: new Color(0.01, 0.05, 0.2),
});

ocean.material = waterMat;
this.scene.add(ocean);
```

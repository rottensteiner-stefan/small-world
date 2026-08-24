# Coordinate System & Cameras

Understanding the engine's space alignment and camera strategies is crucial for spatial logic, culling, and inputs.

## Right-Handed Coordinate System

Small World uses a **Right-Handed Coordinate System**:

- **X Axis (+X):** Right
- **Y Axis (+Y):** Up
- **Z Axis (+Z):** Backward (pointing out of the screen)
- **-Z Axis (-Z):** Forward / Front (pointing into the screen)

```
        +Y
         ^   -Z (Forward)
         |  /
         | /
         |/
         +-------> +X (Right)
        /
       /
     +Z (Backward)
```

## Camera Controls & Look Formulas

When writing custom look/orbit math or relative movement controls (e.g. WASD), utilize look-relative trigonometry:

- **Angle orientation:** Theta ($\theta$) and phi ($\phi$) angles are defined relative to the $-Z$ vector.
- **Direction vector:**
  $$\text{dirX} = \sin(\theta) \cdot \cos(\phi)$$
  $$\text{dirY} = \sin(\phi)$$
  $$\text{dirZ} = -\cos(\theta) \cdot \cos(\phi)$$

## Camera Strategies

The camera system supports several strategy patterns:

1. **Fixed Camera:** Constant position and target. Used for isometric backgrounds.
2. **Smooth Follow:** Linearly interpolates position and target towards a target Object3D, easing focus.
3. **FPS Camera:** Full mouse/keyboard relative looking and WASD movement. Supports terrain height snapping.
4. **Isometric Camera:** Parallel orthographic projections with pixel-perfect viewport snapping.

```typescript
// Snapping FPS strategy on setup
this.camera.setStrategy(CameraStrategyType.FPS);
this.camera.addBehavior(
  new FPSController({
    moveSpeed: 8.0,
    enableCollision: false,
    scene: this.scene,
  }),
);
```

## Frustum Culling

To maximize performance, the engine dynamically discards geometry outside the viewport using **Frustum Culling**:

```typescript
// Called internally inside the renderer list assembler
if (frustum.intersectsVolume(object.bounds)) {
  renderList.opaque.add(object);
}
```

All geometries compute an axis-aligned bounding box (AABB) dynamically. You can disable frustum culling on static background overlays by setting `frustumCulled = false` on an object (e.g., Skybox).

## 2.5D Backgrounds & Texture Orientation

When creating 2.5D matte paintings, UI backdrops, or billboards:

1. **Use `Plane` Geometry:** Always use `Plane({ width, height })` for flat backdrops. `Plane` generates standard UV coordinates ($U \in [0, 1]$ left-to-right, $V \in [1, 0]$ top-to-bottom) facing $+Z$.
2. **WebGL Texture Vertical Flip (`flipY`) & WebP Format:** DOM/HTML images have their pixel origin $(0,0)$ at the top-left, whereas WebGL texture coordinates $(0,0)$ start at the bottom-left. Always pass `{ flipY: true }` when loading textures. Prefer **WebP (`.webp`)** over JPEG for 2D art to avoid dark block artifacts and enable alpha-channel transparency for foreground layers:
   ```typescript
   const bgTex = await Texture.fromUrl("/assets/path/image.webp", { flipY: true });
   ```
3. **No Negative Scale Hacks:** Never apply negative scale factors (e.g. `scale.set(-1, -1, 1)`) to 3D objects to flip textures. Negative scaling inverts spatial parity, flips winding order, and mirrors horizontal coordinates (swapping left and right).
4. **16:9 Aspect Ratio Standard:** Standardize 2.5D background planes and AI-generated matte paintings on a 16:9 ratio (e.g. `Plane({ width: 16, height: 9 })`). Centering at $Y = 4.5$ aligns the bottom edge flush with the stage floor at $Y = 0.0$.

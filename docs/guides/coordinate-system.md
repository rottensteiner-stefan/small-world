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

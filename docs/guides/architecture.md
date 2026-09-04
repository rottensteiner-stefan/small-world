# Architecture & Code Showcases

The Small World Engine has a modular design and uses composition over deep inheritance. Below is an overview of the most important classes, interfaces, and parameters that you will work with on a daily basis, as well as concrete code examples to get you started.

::: tip API Reference
For a complete list of _all_ classes, methods, and type declarations (incl. constructor parameters), please open the automatically generated **[API Reference](/api/index.html)**.
:::

---

## 1. Scene Graph (`Object3D`)

The heart of the engine is the `Object3D` class. Everything that exists in the world (meshes, cameras, virtual anchors) is or inherits from `Object3D`. It manages the local and global transformation matrices, geometry, and material.

### Showcase: Creating and placing an object

```typescript
import { Object3D, Cube, StandardMaterial, Color } from "small-world";

const player = new Object3D("Player");

// Position (X=Right, Y=Up, Z=Backward)
player.position.set(0, 1, 0);

// Scale and Rotation
player.scale.set(2, 2, 2);
player.rotation.y = Math.PI / 4; // 45 degrees

// Assign geometry and material
player.geometry = new Cube({ size: 1 }).getGeometryData();
player.material = new StandardMaterial({
  color: Color.RED,
  metallic: 0.1,
  roughness: 0.8,
});

// Attach child objects (Hierarchy)
const weapon = new Object3D("Weapon");
weapon.position.set(1, 0, 0); // Relative to the player!
player.add(weapon);

// Add to the scene
this.scene.add(player);
```

---

## 2. Cameras & Behaviors

The engine uses a unified camera architecture. The base `Camera` is parameterized by a projection (`PerspectiveProjection` or `OrthographicProjection`) and controlled dynamically via the **Behavior system**.

### Showcase: Camera with Controller and Shake Behavior

```typescript
import { Camera, PerspectiveProjection, FirstPersonController, ShakeBehavior } from "small-world";

// Create camera with perspective projection
const camera = new Camera(new PerspectiveProjection({ fov: 60, near: 0.1, far: 1000 }));

// Attach controllers and procedural effects directly as Behaviors
camera.addBehavior(
  new FirstPersonController({
    moveSpeed: 10.0,
    lookSensitivity: 0.002,
  })
);

// Add procedural trauma/shake behavior for impacts
const shake = new ShakeBehavior();
camera.addBehavior(shake);
```

---

## 3. Materials & Shaders (PBR & Shipped Presets)

Small World uses a hybrid rendering pipeline (WebGPU, WebGL2, WebGL1) based on the Cook-Torrance BRDF model with linear color space and sRGB gamma correction.

### Key Material Families

- `StandardMaterial`: Core PBR material with `albedo`, `metallic`, `roughness`, and diffuse/normal/roughness map slots.
- `GlassMaterial`: Real-time Screen-Space Refraction (SSR) with configurable `ior` and volumetric absorption.
- `SpriteMaterial`: 2D/2.5D camera-facing billboard material.
- **Wave Family (ADR 0013):**
  - `OpenWaterMaterial`: Realistic ocean water with Gerstner waves and opaque depth-fade (soft shores).
  - `StylizedWaterMaterial`: Stylized/toon water with customizable edge foam and cel tinting.
- **Flow Family (ADR 0013):**
  - `LavaMaterial`: Opaque, glowing molten rock with customizable emissive intensity and noise-driven viscosity.
  - `SlimeMaterial`: Translucent, oozing liquid preset with subtle luminous edge glow.

### Showcase: Lava Material with Emissive Glow

```typescript
import { LavaMaterial, Color, Object3D, Plane } from "small-world";

const lava = new Object3D("LavaLake");
lava.geometry = new Plane({ width: 50, height: 50, widthSegments: 32, heightSegments: 32 }).getGeometryData();
lava.material = new LavaMaterial({
  color: new Color(0.25, 0.03, 0.0),
  emissiveColor: new Color(1.0, 0.35, 0.05),
  emissiveStrength: 2.0,
  flowSpeed: 0.4,
});

this.scene.add(lava);
```

---

## 4. Behaviors & Finite State Machines (FSM)

You shouldn't write complex logic into a giant `update()` loop. Instead, use the **Behavior system** to attach isolated logic blocks (components) to an `Object3D`.

### Showcase: A Pulse Behavior

```typescript
import { Behavior, Object3D } from "small-world";

export class PulseBehavior extends Behavior {
  private _speed: number;
  private _baseScale: number;
  private _elapsed: number = 0;

  constructor(speed: number = 2.0) {
    super();
    this._speed = speed;
    this._baseScale = 1.0;
  }

  // Called when the behavior is attached to the object via obj.addBehavior()
  public override onAttach(target: Object3D): void {
    this._baseScale = target.scale.x;
  }

  // Called automatically every frame by the Scene, only receives deltaTime
  public override update(deltaTime: number): void {
    if (!this.target) return;
    this._elapsed += deltaTime;

    // Calculate sine pulse
    const scale = this._baseScale + Math.sin(this._elapsed * this._speed) * 0.2;
    this.target.scale.set(scale, scale, scale);
  }
}

// Usage:
const heart = new Object3D("Heart");
heart.addBehavior(new PulseBehavior(5.0));
```

If states become more complex (e.g., `IDLE` -> `WALK` -> `ATTACK`), use the built-in `StateMachine` module, which integrates seamlessly with Behaviors via `StateMachineBehavior`.

---

## 5. Resource Management & Garbage Collection

Unlike older graphics engines where you must manually call `dispose()` on geometries, textures, and materials to prevent GPU memory leaks, **Small World uses automated internal Reference Counting**.

### How it works
Every geometry buffer, shader program, and texture is tracked by the active renderer (WebGL1, WebGL2, or WebGPU).
When you remove an `Object3D` from the `Scene`, the engine decrements the reference counts for the object's resources. If a resource's reference count drops to zero, the engine automatically queues it for deletion and safely destroys the underlying GPU object.

```typescript
// Adding an object increments reference counts for its geometry and material textures
this.scene.add(myObject);

// ... Later ...

// Removing the object decrements the reference counts.
// If no other objects use the same geometry/textures, they are automatically purged from VRAM!
this.scene.remove(myObject);
```
*(Note: `RenderTarget` textures are excluded from this automated cleanup, as their lifecycles are explicitly managed by the render pipeline rather than individual objects.)*

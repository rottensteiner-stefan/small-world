# Architecture & Code Examples

The Small World Engine has a modular design and uses composition over deep inheritance. Below is an overview of the most important classes, interfaces, and parameters that you will work with on a daily basis, as well as concrete code examples to get you started.

::: tip API Reference
For a complete list of *all* classes, methods, and type declarations (incl. constructor parameters), please open the automatically generated **[API Reference](/api/index.html)**.
:::

---

## 1. Scene Graph (`Object3D`)

The heart of the engine is the `Object3D` class. Everything that exists in the world (meshes, cameras, virtual anchors) is or inherits from `Object3D`. It manages the local and global transformation matrices, geometry, and material.

### Example: Creating and placing an object
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
  roughness: 0.8 
});

// Attach child objects (Hierarchy)
const weapon = new Object3D("Weapon");
weapon.position.set(1, 0, 0); // Relative to the player!
player.add(weapon);

// Add to the scene
this.scene.add(player);
```

---

## 2. Cameras & Controllers

The engine does not use a rigid camera model. Instead, there is a base `Camera` that is controlled by flexible **strategies** (like `SmoothStrategy`, `IsometricStrategy`) and **controllers** (`FPSController`, `ZoomController`).

### Example: First-Person Shooter Camera (FPS)
```typescript
import { FPSController, StiffStrategy } from "small-world";

// The strategy defines how the camera interpolates updates (Stiff = direct, Smooth = soft)
this.camera.setStrategy(new StiffStrategy());

// The FPS controller directly accesses mouse input (PointerLock) and WASD
const fpsController = new FPSController(this.camera, {
  moveSpeed: 10.0,
  lookSpeed: 0.002
});

// Add it to the Application lifecycle so it receives updates
this.controllers.push(fpsController);
```

---

## 3. Materials (PBR & Specific Shaders)

Small World uses a hybrid rendering approach (WebGL2 & WebGPU) based on the Cook-Torrance BRDF model. Materials define parameters that are read by the shader.

### Overview of key materials
- `StandardMaterial`: For 90% of objects. Supports `color`, `metallic`, `roughness`, as well as diffuse, normal, and roughness maps.
- `GlassMaterial`: A refractive material for glass or water with true refraction (`ior`) and volume absorption (`absorptionColor`).
- `SpriteMaterial`: For 2D/2.5D billboards that always face the camera.

### Example: Glass/Water Material with Index of Refraction
```typescript
import { GlassMaterial, Color } from "small-world";

const water = new GlassMaterial({
  color: new Color(0.9, 0.95, 1.0),
  roughness: 0.05,
  ior: 1.33,               // Index of Refraction for water
  dispersion: 0.02,        // Slight chromatic aberration at edges
  absorptionColor: new Color(0.1, 0.5, 0.8),
  absorptionDistance: 5.0  // The deeper, the bluer
});

waterSurface.material = water;
```

---

## 4. Behaviors & Finite State Machines (FSM)

You shouldn't write complex logic into a giant `update()` loop. Instead, use the **Behavior system** to attach isolated logic blocks (components) to an `Object3D`.

### Example: A Pulse Behavior
```typescript
import { Behavior, Object3D } from "small-world";

export class PulseBehavior extends Behavior {
  private _speed: number;
  private _baseScale: number;

  constructor(speed: number = 2.0) {
    super();
    this._speed = speed;
    this._baseScale = 1.0;
  }

  // Called when the behavior is attached to the object via obj.addBehavior()
  public override onAttach(target: Object3D): void {
    this._baseScale = target.scale.x;
  }

  // Called automatically every frame by the Scene
  public override update(deltaTime: number, totalTime: number): void {
    if (!this.target) return;
    
    // Calculate sine pulse
    const scale = this._baseScale + Math.sin(totalTime * this._speed) * 0.2;
    this.target.scale.set(scale, scale, scale);
  }
}

// Usage:
const heart = new Object3D("Heart");
heart.addBehavior(new PulseBehavior(5.0));
```

If states become more complex (e.g., `IDLE` -> `WALK` -> `ATTACK`), use the built-in `StateMachine` module, which integrates seamlessly with Behaviors via `StateMachineBehavior`.

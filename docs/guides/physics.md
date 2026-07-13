# Physics & RigidBodies

Small World Engine includes a custom, lightweight, impulse-based physics engine designed around the **Semi-Implicit Euler** integration method. It handles collision detection, object separation, and physical bouncing (restitution) while strictly adhering to the engine's "zero allocation on the hot path" philosophy.

## Overview

The physics system is completely decoupled from the rendering loop. It operates within the `PhysicsSystem` class, evaluating all objects in the scene that have a `RigidBody` component.

To make an object physically active, simply instantiate and attach a `RigidBody` to it:

```typescript
import { Object3D, RigidBody } from "small-world";

const myCube = new Object3D();
const rb = new RigidBody(1.0); // Mass of 1.0 kg
myCube.rigidBody = rb;

// Set physical properties
rb.restitution = 0.8; // Bounciness (0 = no bounce, 1 = perfectly elastic)
rb.friction = 0.1; // Linear damping factor
rb.angularDamping = 0.05; // Rotational damping factor

// Add it to the scene
scene.add(myCube);
```

## Static vs. Dynamic Bodies

A `RigidBody` determines whether it is dynamic or static based on its `mass`.
If you pass `0` to the `RigidBody` constructor, its inverse mass becomes `0`, making it infinitely heavy (static).

- **Dynamic Body (`mass > 0`):** Reacts to gravity, forces, and collisions.
- **Static Body (`mass === 0`):** Does not move, but dynamic bodies will collide and bounce off of it.

## Collision Detection (Bounds)

The `PhysicsSystem` uses the `bounds` property of an `Object3D` to perform collision detection. Without `bounds`, an object cannot collide.
Small World currently supports resolving collisions between **BoundingSpheres** and **BoundingBoxes**.

```typescript
import { BoundingSphere } from "small-world";

// Set a bounding sphere with radius 1.0
myCube.bounds = new BoundingSphere(myCube.position, 1.0);
```

## Forces and Impulses

You can directly interact with a `RigidBody` by applying continuous forces or instantaneous impulses.

- **`applyForce(f: Vector3D)`:** Applies a continuous force (e.g., wind, thrusters). This force is cleared at the end of the step.
- **`applyImpulse(j: Vector3D)`:** Applies an immediate change in velocity (e.g., explosions, jumping, collisions).
- **`applyTorque(t: Vector3D)`:** Applies rotational force around the local axes.

```typescript
import { Vector3D } from "small-world";

// Make the object jump instantly
myCube.rigidBody.applyImpulse(new Vector3D(0, 10, 0));
```

## The Simulation Loop

The engine's `Application` base class automatically calls `PhysicsSystem.step(scene, dt)` before the rendering phase.

During this step, the engine:
1. **Integrates Velocity:** Applies gravity and accumulated forces to update linear and angular velocity.
2. **Integrates Position:** Moves and rotates the object based on its new velocity.
3. **Resolves Collisions:** Tests dynamic bodies against all colliders in the scene.
   - **Positional Correction:** Pushes overlapping objects apart to prevent "sinking".
   - **Impulse Resolution:** Applies opposing forces to make the objects bounce based on their `restitution`.

## Stability and Zero-Allocation

Physics engines are notoriously hard on memory due to the massive amount of vector mathematics required per frame. Small World mitigates this by exclusively utilizing the `MathPool`.
All temporary vectors and matrices used during collision checking and integration are acquired from and released back into the pool. This guarantees a flat memory profile and no GC stuttering during intense physics simulations.

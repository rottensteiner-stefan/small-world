# Gamification & Interactions

The Small World Engine provides a built-in interaction layer via the `InteractionManager`. This system allows you to easily react to mouse and touch events directly on 3D objects in the scene, using a performance-optimized Octree-based Raycasting pipeline.

## 1. Setup

The `InteractionManager` is automatically instantiated during the `SmallWorld` lifecycle and is available as `this.interactionManager`. 

To make an object react to pointer events, you simply need to flag it as pickable and assign your event callbacks:

```typescript
const mesh = new Object3D("InteractiveCube");
mesh.geometry = new Cube({ size: 1.0 }).getGeometryData();
mesh.material = new StandardMaterial({ color: Color.RED });

// 1. Enable picking
mesh.isPickable = true;

// 2. Define events
mesh.onPointerEnter = () => {
    mesh.scale.set(1.5, 1.5, 1.5);
};

mesh.onPointerLeave = () => {
    mesh.scale.set(1.0, 1.0, 1.0);
};

mesh.onPointerClick = () => {
    (mesh.material as StandardMaterial).color.set(Math.random(), Math.random(), Math.random());
};

this.scene.add(mesh);
```

## 2. Octree Acceleration (Performance)

A naive raycaster iterates over all $O(n)$ objects in the scene every frame, which ruins framerates for large scenes. Small World accelerates interactions natively to $O(\log n)$ using an **Octree**.

To take advantage of Octree acceleration, initialize the scene's octrees and declare your static objects:

```typescript
// Define the dimensions of your interactable world
const bounds = new BoundingBox(new Vector3D(-50, -50, -50), new Vector3D(50, 50, 50));
this.scene.initOctrees(bounds);

const mesh = new Object3D("Tree");
mesh.isStatic = true; // Flag the object as static so it enters the Static Octree
mesh.isPickable = true;
this.scene.add(mesh);

// Once you've added your static objects, build the octree:
this.scene.updateStaticOctree();
```

When an Octree is present, the `InteractionManager` automatically utilizes `Octree.queryRay()` to instantly discard thousands of objects without performing a single heavy intersection check.

## 3. Ready-To-Use Behaviors

Small World includes built-in Behaviors you can directly attach to objects for rapid prototyping.

### HoverBehavior

Automatically smoothly scales up an object and emits a neon glow when hovered.

```typescript
import { HoverBehavior } from "small-world";

// Scales to 1.5x on hover
const hover = new HoverBehavior(1.5);
mesh.addBehavior(hover);
```

> **Note:** These behaviors automatically set `isPickable = true` when attached to an object.

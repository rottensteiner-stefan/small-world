# Extensions & Ecosystem

The **Small World Engine** core focuses on rendering, math, and the basic scene graph. However, we also provide a powerful **Extensions** system that houses generic, reusable utilities and builders for your games.

## What is an Extension?

An Extension is a piece of modular logic that builds upon the core engine but isn't required for basic 3D rendering. They are designed to be "drop-in" utilities.

Examples of built-in extensions include:
- `GridLevelBuilder`: An ASCII-art based level generator for dungeon crawlers.
- *More coming soon...*

## Example: GridLevelBuilder

If you want to build a tile-based dungeon crawler, writing placement logic for every wall and enemy is tedious. The `GridLevelBuilder` extension allows you to define levels using simple ASCII arrays.

### Usage

```typescript
import { GridLevelBuilder } from "small-world/extensions";

const builder = new GridLevelBuilder({
  scene: this.scene,
  blockSize: 2.0,
});

// Define your legend mapping ASCII characters to meshes or logic
builder.setLegend({
  "#": {
    type: "custom",
    onBuild: (x, y, worldX, worldZ) => {
      const wall = new Object3D(`Wall_${x}_${y}`);
      // Add geometry, materials...
      wall.position.set(worldX, 1.0, worldZ);
      return wall; // Returns the built object to the scene automatically
    }
  },
  "P": {
    type: "playerSpawn",
    onBuild: (x, y, worldX, worldZ) => {
      this.camera.position.set(worldX, 1.0, worldZ);
      return undefined; // We don't add an object, we just move the camera
    }
  }
});

// Build the map
const myMap = [
  "#######",
  "#P    #",
  "#######"
];

builder.build(myMap);
```

By leveraging `Extensions`, you can drastically reduce boilerplate code while keeping the core engine bundle size absolutely minimal.

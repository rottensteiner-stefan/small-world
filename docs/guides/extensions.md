# Modular Ecosystem & Domain Layering

Per **ADR 0014**, Small World follows a strict 4-tier domain layering architecture rather than generic catch-all folders.

## Domain Structure

1. **Tier 1 — Core Engine (`src/core/`, `src/renderers/`, `src/geometry/`, `src/math/`):**
   Math, scene graph, cameras, renderers, passes, shaders, and core primitives (including `BillboardInstancer` and `ImposterBaker`).
2. **Tier 2 — Environment & Atmosphere (`src/environment/`):**
   Weather, atmospheric particle systems (`WeatherEmitter`), sky systems, and fluid surfaces.
3. **Tier 3 — Behaviors & Simulation (`src/core/behaviors/`):**
   Controllers, sensors, animation loops, and ambient creature life (`RatGroomingBehavior`, `GroomingRat`).
4. **Tier 4 — Tools & ProcGen (`src/tools/`, `src/tools/procgen/`):**
   Authoring tools (`MakerApp`, `MapGenerator`, `Pixler`, `Xtractor`, `Forge`) and procedural level generators (`GridLevelBuilder`).

## Example: Procedural Grid Generation (`GridLevelBuilder`)

`GridLevelBuilder` lives in `src/tools/procgen/` (exported via `small-world` tooling surface) and allows defining 3D levels from ASCII grids.

### Usage

```typescript
import { GridLevelBuilder, GridLevelConfig, Object3D } from "small-world";

const builder = new GridLevelBuilder();

// Define your legend mapping ASCII characters to meshes or logic
const config: GridLevelConfig = {
  gridSize: 2.0,
  legend: {
    "#": {
      type: "custom",
      onBuild: (x, y, worldX, worldZ) => {
        const wall = new Object3D(`Wall_${x}_${y}`);
        // Add geometry, materials...
        wall.position.set(worldX, 1.0, worldZ);
        return wall; // Returned object is added to the scene automatically
      },
    },
    "P": {
      type: "custom",
      onBuild: (x, y, worldX, worldZ) => {
        this.camera.position.set(worldX, 1.0, worldZ);
        return undefined; // We don't add an object, we just move the camera
      },
    },
  },
};

// Define your map as a single newline-separated string
const myMap = ["#######", "#P    #", "#######"].join("\n");

// Build the map (async — resolves to the world position of the first "P" spawn, or the map center)
await builder.build(this.scene, myMap, config);
```

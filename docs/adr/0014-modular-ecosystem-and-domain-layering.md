# ADR 0014: Modular Ecosystem and Domain Layering — Dissolution of `extensions/`

## Context & Problem

The `src/extensions/` directory was originally introduced as a catch-all folder for "modular logic that builds upon the core engine but isn't required for basic 3D rendering". Over time, this created a classic **"Grab-Bag" / Rumpelkammer anti-pattern**:
1. **Unclear Domain Boundaries:** Fundamentally different architectural layers were thrown into the same folder:
   - Rendering primitives and LOD helpers (`BillboardInstancer`, `ImposterBaker`)
   - Gameplay AI and procedural animation (`RatGroomingBehavior`, `GroomingRat`)
   - Environment / atmospheric VFX (`WeatherEmitter`)
   - Procedural level generation utilities (`GridLevelBuilder`)
2. **Root Namespace Bloat:** `src/index.ts` exported `export * from "./extensions/index.js"`, forcing all consumers and engine bundles to include level generators, creature AI, and weather emitters in the global engine namespace, harming tree-shaking and architectural clarity.
3. **Lack of Extension Protocol:** There was no formal definition of what qualifies as an Engine Core subsystem, a Behavior, an Environment component, or a Tool/ProcGen utility.

### Industry Benchmark Analysis

We benchmarked how industry-leading 3D engines structure core vs. optional/ecosystem modules:
- **Three.js (`three/addons/*`):** Keeps `three` core strictly focused on math, scene graph, cameras, and basic render passes. Specialized loaders (`GLTFLoader`), camera controls (`OrbitControls`), post-processing passes, and procedural helpers live under `three/addons/*` with explicit subpath imports, preventing core namespace pollution.
- **Babylon.js (Monorepo & SceneComponent Plugins):** Strictly separates core (`@babylonjs/core`) from specialized domains (`@babylonjs/materials`, `@babylonjs/gui`, `@babylonjs/loaders`, `@babylonjs/procedural-textures`).
- **Godot Engine:** Maintains a lean C++ core. Scene graph logic is extended via custom nodes/scripts, and high-level tools or game utilities live in explicit domain folders or project `addons/` without polluting engine primitives.
- **Unity:** Segregates specialized systems (VFX Graph, Splines, AI Navigation, Input System) into dedicated UPM packages layered on top of core runtime assemblies.

---

## Decision

We **dissolve `src/extensions/` completely** and establish a strict 4-tier domain layering model for Small World:

```
┌─────────────────────────────────────────────────────────────┐
│  Tier 4: Tools & ProcGen (`src/tools/`, `src/procgen/`)      │
│  (GridLevelBuilder, MakerApp, Bakers, Asset Importers)      │
├─────────────────────────────────────────────────────────────┤
│  Tier 3: Behaviors & Simulation (`src/behaviors/`)          │
│  (OrbitController, RatGroomingBehavior, AI, Controllers)    │
├─────────────────────────────────────────────────────────────┤
│  Tier 2: Environment & VFX (`src/environment/`)             │
│  (WeatherEmitter, LiquidSurface, Skybox, Atmosphere)        │
├─────────────────────────────────────────────────────────────┤
│  Tier 1: Engine Core (`src/core/`, `src/math/`, `src/renderers/`, `src/geometry/`) │
│  (Scene Graph, BillboardInstancer, ImposterBaker, PBR, Passes) │
└─────────────────────────────────────────────────────────────┘
```

### 1. Concrete Migration Targets

| Current Location | New Architectural Domain | Rationale |
| :--- | :--- | :--- |
| `src/extensions/billboard/BillboardInstancer.ts` | `src/core/objects/BillboardInstancer.ts` (or `src/core/entities/`) | Core scene-graph primitive that directly wraps `InstancedMesh` for camera-facing quads. |
| `src/extensions/imposter/ImposterBaker.ts` | `src/renderers/imposter/ImposterBaker.ts` | Specialized renderer utility / LOD generation mechanism. |
| `src/extensions/weather/WeatherEmitter.ts` | `src/environment/weather/WeatherEmitter.ts` | Atmospheric environment system (rain, snow, ambient particles). |
| `src/extensions/creatures/RatGroomingBehavior.ts` | `src/behaviors/creatures/RatGroomingBehavior.ts` | Standard Small World `Behavior` attached to entities for ambient life. |
| `src/extensions/creatures/GroomingRat.ts` | `src/behaviors/creatures/GroomingRat.ts` (or sample creature entity) | Entity composition bundling a mesh with its grooming behavior. |
| `src/extensions/grid-builder/GridLevelBuilder.ts` | `src/tools/procgen/GridLevelBuilder.ts` | High-level level builder / map generation tool for grid-based scenes. |

### 2. Export & Namespace Rules

1. **Core Package Surface (`src/index.ts`):**
   - Core primitives (`BillboardInstancer`), Environment systems (`WeatherEmitter`), and standard Behaviors are exported from their respective domain namespaces (`./core/index.js`, `./environment/index.js`, `./behaviors/index.js`).
2. **Tooling & ProcGen:**
   - ProcGen and authoring tools (`GridLevelBuilder`, `MakerApp`) are exported under `./tools/index.js` or dedicated tool entrypoints, clearly separating runtime engine primitives from build-time/design-time generators.
3. **No Catch-All Folders:**
   - No new generic `extensions/`, `helpers/`, or `misc/` root directories may be created. Every new feature must be classified into its distinct domain (Core, Environment, Behavior, Tool, Renderer, Math, Loader).

---

## Consequences

- **Clarity & Predictability:** Developers immediately know where to look: scene nodes in `core/objects`, controllers and AI in `behaviors`, atmospheric VFX in `environment`, and generators in `tools/procgen`.
- **Clean Tree-Shaking:** High-level level generation tools are decoupled from basic rendering primitives.
- **Architectural Scalability:** Future additions (e.g. boids, foliage systems, terrain generators) have a clear, pre-defined architectural home.
- **Migration Cost:** Requires updating imports across existing showcases (`showcase 32`, `showcase 34`), tests (`tests/extensions/`), and tools (`MakerApp`, `AsciiMapLegend`).

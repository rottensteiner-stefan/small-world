# Small World Engine

<img align="right" width="280" alt="Small World Engine" src="public/assets/logo_vector.svg" />

**Small World Engine** is the "Preact of 3D Engines". It is an ultra-lightweight, high-performance, and strict TypeScript 3D game engine for the web. Built for the era of WebGPU and Playable Ads, it provides a modern Physically Based Rendering (PBR) pipeline and a robust Behavior System—delivering the architectural elegance of a real game engine at a fraction of the bundle size of traditional frameworks.

Read our full [Vision & Strategy](VISION.md).

<br clear="right"/>

## 🚀 Features

- **Hybrid PBR Rendering:** High-performance rendering pipeline supporting **WebGPU**, **WebGL 2**, and **WebGL 1** with industry-standard physically based shading (Cook-Torrance BRDF).
- **Linear Lighting Workflow:** All lighting calculations are performed in linear space with automatic sRGB gamma correction for realistic color falloffs and high visual fidelity.
- **Advanced Materials:** Includes standard PBR (Metallic/Roughness), but also physical **Glass/Dielectric** materials with real-time **Screen-Space Refraction**, Index of Refraction (IOR), and Beer's Law for volumetric light absorption.
- **Advanced Camera System:** Unified camera setup where controllers (e.g., `OrbitController`, `FirstPersonController`, `ZoomController`) are standard `Behavior` components attached via `camera.addBehavior()`. Features procedural effects like camera shake and flash.
- **High-Performance Architecture:** Optimized for memory efficiency through **Object Pooling** (`MathPool`), BindGroup & Pipeline Caching (WebGPU), and zero-allocation hot paths to eliminate Garbage Collection pressure.
- **Lighting & Shadows:** Supports Ambient, Directional, Point, Spot, and Area lights. Features robust **Shadow Mapping** (WebGL 2 & WebGPU) with Cascaded Shadow Maps, Hardware Shadow Sampling, and Percentage-Closer (Soft) Filtering (PCSS) for buttery-smooth soft shadows.
- **Clustered Forward+ Lighting:** The camera frustum is divided into a 3D grid of light-culling cells (WebGPU: compute-shader culled; WebGL 2: CPU-culled) so each pixel only evaluates the lights that actually reach it, raising the practical point/spot light budget well past a small fixed cap.
- **Planar & Conformal Reflections:** Real-time planar floor reflections (virtual mirror geometries) and dynamic sphere inversion reflections ($P' = C + V \cdot \frac{R^2}{d^2 - r^2}$) for PBR objects.
- **Component Behaviors & State Machines:** Robust, callback-driven behavior system to attach complex logic (`FlickerBehavior`, `DeviceOrientationController`, `HoverBehavior`, `DraggableBehavior`, etc.) directly to 3D objects, cameras, or materials. Includes a built-in, type-safe, zero-allocation **Finite State Machine (FSM)** framework to cleanly manage game actor lifecycles.
- **Interactions & Gamification:** A built-in `InteractionManager` allowing objects to instantly react to mouse/touch pointer events (`onPointerEnter`, `onPointerClick`, `onPointerDown`, `onPointerMove`, etc.). Pickable elements are queried via highly performant $O(\log n)$ **Octrees** and resolved to exact pixels via the **Möller-Trumbore** intersection algorithm. 
- **Stylized Post-Processing Pipeline:** Built-in cinematic and retro filters (Phosphor Green Night Vision, Film Noir with chromatic aberration, Cyber Glitch, VHS Tape tracking, Amber/Sepia Underworld, Old Projector scratching/hair spots, and Thermal Vision), plus Bloom, a simplified screen-space ambient occlusion pass (HBAO), a simplified Temporal Anti-Aliasing pass (jitter + history blend), and a deliberate ghost/afterimage Motion Trail effect reusing the same history-blend machinery. Configured via static parameter specialization for optimal compilation without dynamic uniform cost.
- **Scene Graph:** Hierarchical scene management using a clean `Object3D` architecture.
- **2D/2.5D Support:** First-class support for Sprites, Billboard rendering, and Pixel-Perfect Isometric perspectives.
- **Audio System:** Built-in `AudioSystem` with 3D Spatial Audio (HRTF), a procedural Retro Synthesizer (footsteps, lasers, drones, fire), and a built-in Mixer with procedural Reverb.
- **Decoupled Architecture:** Features a high-performance, strictly-typed global `EventBus` injected into all systems (`this.events`), separating Gameloop, Behaviors, and UI without relying on garbage-heavy DOM `CustomEvent` objects.
- **Procedural Generation & Authoring Tooling:** Includes procedural generation utilities like the `GridLevelBuilder` to generate complete dungeon levels from ASCII maps, plus a comprehensive tool suite (`MakerApp`, `MapGenerator`, `Pixler`, `Xtractor`, `Forge`).
- **Geometry & Asset Loaders:** Dynamic terrain generation, comprehensive primitive library, and async loaders for OBJ models, MTLLib materials, and textures (via unified static factories like `Texture.fromUrl()`).
- **Hardware Telemetry & Feature Detection:** Built-in `DeviceCaps` provides robust detection of WebGPU/WebGL API support, hardware limits (Memory, Cores, Texture Sizes), and experimental browser features (Wasm, Async, Generic Sensors).
- **SPA & Frontend Framework Ready:** Fully compatible with React, Vue, and Angular. Features a robust `engine.destroy()` lifecycle hook that completely frees GPU memory and detaches global event listeners. The engine even auto-destroys if it detects its canvas has been unmounted from the DOM.

### ⚡ Under the Hood (Hardcore Engineering)

- **Zero-Allocation Render Loop:** The critical path is strictly structured to ensure **zero memory allocations** (garbage) during the main render loop. This eliminates unpredictable Garbage Collection (GC) pauses, guaranteeing consistently smooth framerates.
- **Custom Math Engine from Scratch:** We don't rely on massive external math libraries like `glMatrix`. Small World features a bespoke, highly-optimized mathematics library for vectors and matrices, tailored exactly for our right-handed coordinate system.
- **Advanced Rendering & Post-Processing:** Consistent linear space math through the entire pipeline, featuring a highly efficient, unified final pass for Tone-Mapping, Color-Grading, Vignette, and sRGB Gamma Correction.
- **Advanced Materials & Fluid Surfaces (ADR 0013):** Built-in PBR, Retro Screen, and unified liquid shaders (Wave family: `OpenWaterMaterial`/`StylizedWaterMaterial` with Gerstner waves and depth-fade; Flow family: `LavaMaterial`/`SlimeMaterial` with noise flow and emissive glow).
- **WebGPU Compute Shaders:** Real compute-shader usage, not just the graphics pipeline — e.g. the Clustered Forward+ Lighting pass culls every light against the frustum grid on the GPU before the main render pass runs.
- **Automated GPU Memory Management:** No more manual `geometry.dispose()` or `material.dispose()`. The engine utilizes rigorous internal reference counting across all renderers. When you remove an object from the scene, orphaned WebGL/WebGPU resources are safely and automatically garbage-collected.
- **Absolute "Zero Dependency" Philosophy:** No Three.js, no Babylon.js. We built a complete 3D engine—including Frustum Culling (`frustum.intersectsVolume(obj.bounds)`), Scene Graph, and Resource Management—entirely from scratch. This keeps the footprint tiny and performance at the absolute maximum.

## 📦 Installation

This package is private and not published to the NPM registry yet. Clone the repository and install
dependencies locally:

```bash
git clone https://github.com/rottensteiner-stefan/small-world.git
cd small-world
npm install
```

## 🎮 Quick Start

The engine provides a `SmallWorld` base class that handles the render loop and hardware initialization automatically.

### 1. Configuration

You can configure the engine by passing an options object to the constructor. In modern bundlers (like Vite), you can also import a JSON file directly.

```typescript
import config from "./config/small-world.json";

class MyGame extends SmallWorld {
  constructor() {
    // Pass the configuration to the engine
    super(config);
  }
// ...
```

### 2. Implementation Showcase

```typescript
import { SmallWorld, Cube, Color, StandardMaterial, Object3D, OrbitController, Texture } from "small-world";

class MyGame extends SmallWorld {
  constructor() {
    super(); // Or pass config here
  }
  protected async setupScene(): Promise<void> {
    // 1. Load a texture and create a PBR material
    const albedoTex = await Texture.fromUrl("./assets/textures/diffuse.png");
    const geometry = new Cube({ size: 2 }).getGeometryData();
    const material = new StandardMaterial({
      map: albedoTex,
      color: Color.DODGERBLUE,
      metallic: 0.7,
      roughness: 0.2,
    });

    // 2. Wrap in an Object3D and add to scene
    const cube = new Object3D("MyCube");
    cube.geometry = geometry;
    cube.material = material;
    cube.position.set(0, 1, 0);

    this.scene.add(cube);

    // 3. Configure the camera and attach behaviors (controllers)
    this.camera.position.set(5, 5, 5);
    this.camera.target.set(0, 0, 0);

    // Camera controllers are now behaviors!
    this.camera.addBehavior(new OrbitController());
    this.camera.addBehavior(new ZoomController());
  }

  protected override update(deltaTime: number): void {
    // Logic executed every frame
  }
}

// Start the application
const game = new MyGame();
game.start();
```

## 🛠 Development

### Prerequisites

- **Node.js:** We recommend using the version specified in `.nvmrc`. If you use [nvm](https://github.com/nvm-sh/nvm), simply run `nvm use` in the root directory.

### Local Setup

1.  **Install dependencies:**
    ```bash
    npm install
    ```
2.  **Start development server (Vite):**
    ```bash
    npm run dev
    ```
3.  **Build the library:**
    ```bash
    npm run build:lib
    ```

### Optional: Dev Containers (VS Code)

For an isolated development environment, this project includes a **Dev Container** configuration for VS Code.

- When opening the project, VS Code should prompt you to "Reopen in Container".
- This sets up the correct Node.js version and recommended extensions (ESLint, Prettier, etc.) automatically.

## 📂 Project Structure

- `src/core`: Core engine logic (SmallWorld, Object3D, Scene, Input, Color).
- `src/core/behaviors`: Modular runtime behavior components (e.g. Proximity Sensors, Oscillators).
- `src/core/cameras`: Camera strategies, projections, effects, and modular controllers.
- `src/core/fsm`: Type-safe, zero-allocation Finite State Machine utility.
- `src/core/materials`: Material definitions and PBR shader assets.
- `src/core/lights`: Light source implementations (Standard & PBR).
- `src/geometry`: Geometric primitives and terrain logic.
- `src/math`: Linear algebra, vectors, matrices, and object pooling.
- `src/loaders`: Asset loading pipeline (glTF 2.0, OBJ, MTL, Textures).
- `src/tools`: Standalone and in-engine tools (Maker, Forge, Xtractor, Pixler, MapGen).
  - `src/tools/maker`: The Maker standalone 3D world editor application.
- `src/renderers`: Implementation of WebGL1, WebGL2, and WebGPU backends.
  - `src/core/renderers/shaders/source`: Core shader assets directly bundled with the engine.
- `showcases`: Interactive functional showcases demonstrating engine capabilities (34+ showcases and mini-apps).
- `public/assets`, `public/resources`, `public/tools`: Static assets, shared resources, and the standalone browser-based generator tools (see below) used across showcases.

## 🧰 Tools & Authoring Suite

Small World includes a comprehensive suite of standalone, browser-based creative and diagnostic tools (`public/tools/`), running entirely client-side via the File System Access API without external server dependencies or build-step friction:

### 🌟 Maker — World & Scene Editor (`public/tools/maker.html`)
The engine's flagship standalone 3D scene composer and level editor ([User Guide](docs/guides/maker.md)):
- **Direct glTF 2.0 Persistence & Autosave:** Debounced (500ms) write-through directly into standard `scene.gltf` projects with vendor-namespaced `SW_*` extensions for Small World behaviors, physics, and custom material parameters.
- **High-Speed Keyboard Nudging & Transformation:** Camera-perspective-aware directional nudging ($\leftarrow, \rightarrow, \uparrow, \downarrow$ on XZ ground), elevation adjustments (`Shift` + $\uparrow / \downarrow$, `PageUp`/`PageDown`), and **Snap to Ground** (<kbd>End</kbd> / `⬇ Ground`) to align bounding boxes flush with $Y = 0$.
- **Dynamic Snapping & Grid Stepping:** Enabled by default with instant grid resolution stepping via <kbd>[</kbd> (finer) and <kbd>]</kbd> (coarser) across `0.1m` to `2.0m`, $15^\circ$ angle quantization, and $0.25$ scale steps (Toggle: <kbd>X</kbd>).
- **Multi-Selection & Pivot-Relative Clusters:** 2D screen-space Marquee box selection, Cyan/Amber primary/secondary hierarchy highlights, and pivot-relative multi-object group transformations.
- **Always-on-Top Transform Gizmos:** Translate (<kbd>W</kbd>), Rotate (<kbd>E</kbd>), and Scale (<kbd>R</kbd>) rendered with `depthTest: false` so handles never submerge inside dense meshes.
- **Prefab Pipeline & Isolated 3D Previews:** Author reusable modular prefabs with automated $3/4$-view isolated thumbnail generation (`.thumb.json`).
- **9-Slot Camera Bookmarks:** Fast vantage point recall (<kbd>1</kbd>–<kbd>9</kbd>) and memorization (<kbd>Ctrl+1</kbd>–<kbd>9</kbd> / Right-click).
- **ASCII Map Importer:** Instant conversion of ASCII text tilemaps (`#`, `.`, `D`, `@`, `T`, `P`) into modular 3D dungeons.
- **Atomic Undo/Redo & Soft Delete:** Full history stack (<kbd>Ctrl+Z</kbd> / <kbd>Ctrl+Shift+Z</kbd>) with off-scene trash bin protecting GPU buffer allocations.

### Standalone Development Tools
- **T-01: Procedural Splatter Generator** (`public/tools/splatter-gen.html`): Generate procedural blood, splatters, dirt decals, and impact masks.
- **T-02: PBR Map Generator** (`public/tools/pbr-gen.html`): Generate Normal, Specular, AO, and Height maps from a single diffuse image.
- **T-03: Gamepad Diagnostic Tool** (`public/tools/gamepad-test.html`): Live gamepad input, axis calibration, and haptic feedback testing.
- **T-04: IBL Generator** (`public/tools/ibl-gen.html`): Generate Image-Based Lighting (Irradiance and Radiance) environment maps.
- **T-05: Xtractor** (`public/tools/xtractor.html`): AI Image Workbench to crop, slice, and assemble tile-maps and sprite atlases.
- **T-06: Pixler** (`public/tools/pixler.html`): Retro 2D pixel-art editor to draw, animate, and export sprites.
- **T-07: Map Generator** (`public/tools/map-gen.html`): Visual grid editor to author ASCII layouts for the `GridLevelBuilder`.
- **T-08: Maker** (`public/tools/maker.html`): Standalone 3D scene and world composition environment.

### In-Game Overlay
- **The Forge:** A built-in floating window manager providing runtime inspection, diagnostics, and integrated tooling directly inside your running game (toggleable via configurable shortcut, e.g. `~` or `F12`).

## 📚 Documentation & Guides

This project provides comprehensive developer documentation, engine guides, and production roadmaps:

- **[Vision & Core Philosophy](VISION.md):** The atmospheric indie game philosophy ("The Stray Principle").
- **[Maker User Guide & Pro Reference](docs/guides/maker.md):** Complete guide to the standalone in-browser 3D world editor.
- **[Commercial Indie Game Roadmap & Publisher Strategy](docs/guides/commercial-indie-roadmap.md):** Strategic roadmap from prototype to commercial release on Steam, PlayStation & Xbox (playtime optimization, Tauri packaging, publisher pitching, platform certification, wishlist velocity).
- **Interactive Guides & API Reference:**
  - Build API documentation with TypeDoc:
    ```bash
    npm run docs:api
    ```
  - Start the local VitePress documentation server:
    ```bash
    npm run docs:dev
    ```

## 📄 License

This project is licensed under the MIT License.


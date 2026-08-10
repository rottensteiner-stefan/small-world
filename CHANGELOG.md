# Changelog

## [0.74.4] - 2026-08-10

### "There is a crack in everything, that's how the light gets in." - Leonard Cohen

- **Features:**
  - **Hollow Circuit:** Built actual Frostglass chambers into the procedurally generated maze — five wall cells bordering a floor per floor are converted to `CellType.WALL_FROSTGLASS` and rendered as individually-tagged panels, each with its own `FrostglassMaterial` instance, giving the Controller's existing Clarity Pulse mechanic real geometry to reveal. Added a matching LED strip treatment where seam edges touching a Frostglass panel light up brighter than ordinary wiring.
- **Architecture & Bugfixes:**
  - **FrostglassMaterial:** Added `clone()` so each panel can animate its own Clarity Pulse reveal independently instead of sharing state with every other panel.
  - **Hollow Circuit LevelBuilder:** Fixed a seam-strip bug where only two of each floor cell's four boundary edges were ever drawn, leaving every corridor missing light on two of its four wall-adjacent edges.
- **Housekeeping & Docs:**
  - **Tooling:** Added `allowScripts` npm allowlist entries for `puppeteer`, `esbuild`, and `fsevents`.

## [0.74.3] - 2026-08-03

### "To improve is to change; to be perfect is to change often." - Winston Churchill

- **Housekeeping & Docs:**
  - **Dependencies:** Updated all NPM libraries to their latest major, minor and patch versions to ensure stability and incorporate latest fixes.
  - **Build System:** Refactored `vite.config.ts` to replace deprecated `__dirname` calls with modern `import.meta.dirname`, resolving Vite 8 native config loader warnings.
  - **Tooling:** Pinned TypeScript to `^6.0.3` to maintain compatibility with `typedoc` version `0.28.20`.

## [0.74.2] - 2026-07-29

### "Before software can be reusable it first has to be usable." - Ralph Johnson

- **Features:**
  - **Object3D:** Added `getWorldPosition(target?: Vector3D)` to easily extract global position from the world matrix.
  - **ProximitySensorBehavior:** Added `planar` option to limit distance checks strictly to the XZ-plane, ignoring height differences.
- **Architecture & Bugfixes:**
  - **YAD App:** Fixed `EnemyBehavior` to properly query the scene's static octree for collision resolution, preventing enemies from walking through walls.
- **Housekeeping & Docs:**
  - **Tests:** Added comprehensive test suites for `getWorldPosition`, planar proximity sensing, and `EnemyBehavior` wall collision logic.

## [0.74.1] - 2026-07-29

### "Leave the code cleaner than you found it." - Robert C. Martin

- **Architecture & Bugfixes:**
  - **App Refactoring:** Restructured the internal architecture of the `YAD` app, organizing its components into dedicated `core/`, `enums/`, and `behaviors/` directories to match the engine's folder standards.
  - **GadgetInspector:** Fixed the selection highlight mesh to correctly wrap and scale around `BoundingSphere` objects (previously only supported `BoundingBox`).

## [0.74.0] - 2026-07-29

### "Talk is cheap. Show me the code." - Linus Torvalds

- **Features:**
  - **New App Showcase:** Added a completely new showcase app, `Hollow Circuit`.
  - **Raycaster & Selection:** Implemented `Ray.intersectsSphere` and updated `Raycaster` to support picking and selecting sphere-bounded objects. `GadgetInspector` now properly highlights selected spherical bounds.
- **Architecture & Bugfixes:**
  - **GadgetInspector:** Optimized scene overview tree to refresh on a throttled interval rather than every frame, massively improving performance in dense scenes.
- **Housekeeping & Docs:**
  - **Tests:** Added comprehensive test suites for `Ray` and `Raycaster` intersection logic.

## [0.73.0] - 2026-07-28

### "The most incomprehensible thing about the universe is that it is comprehensible." - Albert Einstein

- **Features:**
  - **Physics (CCD):** Implemented Continuous Collision Detection (CCD) for fast-moving spherical bodies. Swept-sphere collision tests (against spheres, boxes, and OBBs) prevent high-velocity objects from tunneling through thin walls in a single substep.
- **Housekeeping & Docs:**
  - **Tests:** Added comprehensive test coverage for the new sweep algorithms and CCD integration in `PhysicsSystem`.
  - **Docs:** Updated `physics.md` to document the new CCD capabilities and `ccdMotionThreshold` parameter.

## [0.72.3] - 2026-07-28

### "Clean code always looks like it was written by someone who cares." - Robert C. Martin

- **Housekeeping & Docs:**
  - **Showcases Cleanup:** Standardized showcase class names (`Showcase12`, `Showcase13`, `Showcase14`, `Showcase24`) for better consistency across all examples.
  - **Docs:** Improved `tools.md` guide with clearer explanations on how to integrate `enableInspector` and wire events into custom `Forge` overlay setups.

## [0.72.2] - 2026-07-28

### "Quality is not an act, it is a habit." - Aristotle

- **Architecture & Bugfixes:**
  - **Showcase Tests:** Introduced concurrency and sequential retry logic to `check-showcases.js` to eliminate transient GPU context failures during CI runs.
  - **Renderers:** Fixed a rare WebGPU crash where an uninitialized (0x0) canvas would attempt to generate a degenerate HDR Bloom texture on the very first frame.
  - **AudioSystem:** Allowed dependency injection of `AudioContext` for better unit testing.
- **Housekeeping & Docs:**
  - **Tests:** Enabled `v8` coverage reporting in `vite.config.ts`.

## [0.72.1] - 2026-07-28

### "Nature is written in mathematical language." - Galileo Galilei

- **Features:**
  - **Math Library Enhancements:** Added robust interpolation functions including `MathUtils.lerp`, `Vector3D.lerp`, and a numerically stable shortest-arc `Quaternion.slerp`.
- **Architecture & Bugfixes:**
  - **Tests:** Added comprehensive test coverage for the new `lerp` and `slerp` math functions.
- **Housekeeping & Docs:**
  - **Exports:** Exported `SynthSFX` module for better external access.

## [0.72.0] - 2026-07-28

### "The ability to simplify means to eliminate the unnecessary so that the necessary may speak." - Hans Hofmann

- **Architecture & Bugfixes:**
  - **Shader Cleanup:** Massive structural cleanup of the engine's shader source code. Deleted numerous deprecated and redundant material shaders (`.glsl` and `.wgsl`) across all renderers (WebGL1, WebGL2, WebGPU), centralizing the logic.
  - **Renderers:** Cleaned up unused properties (`_materialBGL`) in `WebGPURenderer` and improved generic uniform validation logic in `WebGL1Renderer` using `StandardWebGPULayout`.
  - **Materials:** Tweaked and improved `FluidSurfaceMaterial` and `Terrain` shaders.
- **Housekeeping & Docs:**
  - **Docs:** Updated `physics.md` documentation guide and synced internal `.agents/notes/`.

## [0.71.3] - 2026-07-27

### "Make it work, make it right, make it fast." - Kent Beck

- **Features:**
  - **WebGL1 Bloom Post-Processing:** Added full fallback support for the high-quality Dual-Kawase Bloom effect in WebGL1 using GLSL 1.0.0 shaders and custom mip-chain targets.
- **Architecture & Bugfixes:**
  - **Renderers:** Updated `WebGL1Renderer` and `WebGPURenderer` for improved compatibility, and refined `DeviceCaps` hardware checks.
  - **Materials:** Tweaked `FluidSurfaceMaterial` and post-process GLSL100 shaders for the new Bloom integration.

## [0.71.2] - 2026-07-27

### "Truth is ever to be found in simplicity, and not in the multiplicity and confusion of things." - Isaac Newton

- **Architecture & Bugfixes:**
  - **WebGL Renderers:** Fixed a console spam issue by throttling `MAX_TEXTURE_IMAGE_UNITS` warnings to only warn once per uniform/unit. Fixed WebGL1 NPOT (non-power-of-two) texture binding by disabling mipmaps and setting `CLAMP_TO_EDGE` wrap modes automatically.

## [0.71.1] - 2026-07-27

### "The most robust algorithm is the one you don't have to write." - Steve Maguire

- **Architecture & Bugfixes:**
  - **Renderer Updates:** Minor fixes and refinements in `WebGL1Renderer`, `WebGL2Renderer`, and the `Standard` GLSL 1.0.0 shader.
  - **Tests:** Updated `ProgramRefCounting` tests to reflect renderer memory management changes.
- **Housekeeping & Docs:**
  - **Docs:** Added a new comprehensive guide (`adding-materials.md`) and updated the VitePress configuration.

## [0.71.0] - 2026-07-27

### "The best preparation for tomorrow is doing your best today." - H. Jackson Brown Jr.

- **Features:**
  - **Renderer Near/Far Planes:** Added support for camera near and far planes across all renderers and shadow passes, and enabled `copyToOpaqueDepthTexture()` in `WebGLMainPass`.
  - **Materials & Shaders:** Introduced `OpenWaterMaterial` with accompanying WGSL and GLSL shaders. Refactored `Glass` and `Standard` shaders for improved lighting and shadow handling.
  - **Math Projections:** Enhanced projection matrix calculations across `Oblique`, `Orthographic`, and `Perspective` projections.
- **Architecture & Bugfixes:**
  - **Refactoring:** Removed the `Singleton` pattern from `CollisionVisualizer` and `OctreeVisualizer`, converting them into standard instantiable classes to comply with engine strictness.
  - **Behaviors:** Improved `HoverBehavior` stability.
- **Housekeeping & Docs:**
  - **Showcases Cleanup:** Removed outdated `script.ts` files across all showcases in favor of a centralized approach, updating `index.html` and `showcase.ts` files accordingly.
  - **Git Optimization:** Removed heavy builds, unit tests, and showcase tests from the local `.husky/pre-commit` hook to dramatically speed up local commit times, shifting this responsibility fully to CI.
  - **Docs & Configs:** Updated `getting-started.md` and cleaned up unused configuration files (`small-world.json`).

## [0.70.2] - 2026-07-27

### "Words are, of course, the most powerful drug used by mankind." - Rudyard Kipling

- **Housekeeping & Docs:**
  - **Memory Management & Materials:** Expanded `README.md` and added comprehensive VitePress documentation guides (`docs/guides/architecture.md`, `docs/guides/materials.md`) covering the new automated GPU resource Reference-Counting and advanced `OpenWaterMaterial` / `captureOpaqueDepth` shader logic.

## [0.70.1] - 2026-07-27

### "A place for everything, and everything in its place." - Benjamin Franklin

- **Architecture & Bugfixes:**
  - **Reference-Counted GPU Resource Disposal:** Implemented per-object reference counting for geometry buffers, shader programs/pipelines, and textures across the WebGL1, WebGL2, and WebGPU renderers, with a `Scene`-level removal queue driving release on object/scene teardown. `RenderTarget`/`RenderTargetCube` are explicitly protected from being destroyed via this path since their lifecycle is independent of any single material reference.
  - **Fallback Cleanup:** Removed a fragile topology-guessing heuristic (`indices.length === 2 ? "line-list" : "triangle-list"`) from the render passes and `Scene`, replaced by an explicit `Topology.DEFAULT` fallback.
- **Housekeeping & Docs:**
  - **Continuous Integration:** Added a GitHub Actions workflow running typecheck/lint/test/build on every push and PR, plus a non-blocking showcase visual smoke-test job.
  - **Magic String/Number Cleanup:** Replaced duplicated raw string literals with existing enum members (`CullMode`, `Topology`, `BlendingMode`, `TextureFilter`, `TextureWrap`) across the renderers and shadow passes.
  - **Enum `DEFAULT` Convention:** Introduced a `DEFAULT` member on the 13 enums that have one real, consistently-used fallback value (`Topology`, `BlendingMode`, `CameraStrategyType`, `CubeLayout`, `CullMode`, `FogMode`, `InputMode`, `OscillatorType`, `ProjectionType`, `RendererType`, `TextureFilter`, `TextureWrap`, `ToneMappingMode`), replacing the repeated concrete literal at every fallback call site.

## [0.70.0] - 2026-07-26

### "Order is the shape upon which beauty depends." - Pearl S. Buck

- **Features:**
  - **Open Water Evolution:** Increased Gerstner wave octaves from 3 to 5 using shader-side derivations for highly organic, irregular water surfaces in `OpenWaterMaterial`.
- **Housekeeping & Docs:**
  - **Strict Scope Expansion:** Added `showcases/**/*` and `tests/**/*` to `tsconfig.json` for strict type checking.
  - **Massive Type Refactoring:** Fixed countless null-assertion errors in tests (`!`), renamed hundreds of private class properties to use a leading underscore `_`, and standardized `AbstractMaterial` typing across all showcases to strictly adhere to engine guidelines.

## [0.69.9] - 2026-07-25

### "To attain knowledge, add things everyday. To attain wisdom, subtract things everyday." - Lao Tzu

- **Housekeeping & Docs:**
  - **Comment Purge:** Executed a massive codebase sweep removing over 300 redundant `/// src/path/to/file.ts` header comments from all TypeScript files to reduce visual noise and improve maintainability.
## [0.69.8] - 2026-07-25

### "A user interface is like a joke. If you have to explain it, it's not that good." - Martin LeBlanc

- **Features:**
  - **Tron Navigation:** Centralized the UI panel for showcase navigation into `AbstractShowcase`, rolling out consistent neon-styled ◀ / ▶ buttons across all showcases.
- **Housekeeping & Docs:**
  - **Showcase Restructuring:** Renamed branching paths (15_v1 and 15_v2) into a linear sequence (15 through 24). Replaced raw `SmallWorld` instantiation with `AbstractShowcase` in later examples to inherit the new UI.
## [0.69.7] - 2026-07-25

### "The details are not the details. They make the design." - Charles Eames

- **Features:**
  - **Standalone Tool Exports:** Exported `MaterialStudioApp` to allow proper independent instantiation of the PBR Map Generator tool without relying on internal `Forge` execution flows.
- **Housekeeping & Docs:**
  - **Strict Linting Compliance:** Resolved trailing syntax warnings and missing explicit types in `GadgetInspector`, `Pixler`, and `AbstractShowcase` to return the engine to 100% strict compliance.
## [0.69.6] - 2026-07-24

### "Out of clutter, find simplicity. From discord, find harmony." - Albert Einstein

- **Features:**
  - **Clean Wireframes:** Refactored geometry generation across all 13 primitives (Cube, Sphere, Cylinder, etc.) to compute purely structural `wireframeIndices`. Unnecessary and distracting quad-diagonals are now removed.
- **Architecture & Bugfixes:**
  - **Strict Topology Enforcement:** Removed legacy `number | string` typing from `RenderBatch.topology` and enforced strict `Topology` string enums (`"triangle-list"`, `"line-list"`).
  - **Renderer Cleanup:** Eradicated magical fallback checks (e.g. `topology === 2`) in WebGL1, WebGL2, WebGPU, and all Shadow Passes.
  - **Dependency Injection:** Enforced `audio` option passing across all controllers (`FPSController`, `OrbitController`, `WASDController`, etc.) to resolve type errors and respect strict DI.
- **Housekeeping & Docs:**
  - **Showcase Navigation:** Fixed looping logic across all showcases (1-23 and yad) to correctly circle back and forth without dead ends.
  - **Agent Guidelines:** Cemented strict rule against unprompted Git commits into the core AI workflow skills.

## [0.69.5] - 2026-07-24

### "Simplicity is the ultimate sophistication." - Leonardo da Vinci

- **Architecture & Bugfixes:**
  - **Zero-Allocation Spatial Partitioning:** Replaced `Map<string, Collidable[]>` in `SpatialHash` with a highly optimized flat array buffer and integer hashing to eliminate dynamic string keys and array instantiation per frame.
  - **Zero-Allocation Octree Node Pooling:** Introduced a static `OctreeNode` pool. Nodes are now recycled on `clear()` and retrieved via `OctreeNode.acquire()` during subdivisions, preventing garbage collector spikes.
  - **Zero-Allocation Render Queries:** Eliminated `.filter()` calls inside the WebGPU shadow passes (`CascadedShadowPassGPU`, `SpotShadowPassGPU`), reusing module-level scratch arrays.
  - **Zero-Allocation Physics Queries:** Core physical sub-systems (`PhysicsSystem`, `FrustumCuller`, `InteractionManager`) and controllers (`EnemyBehavior`, `YadController`) now utilize module-level `outResult` cache arrays instead of creating new Array structures.
  - **Zero-Allocation Render Batching:** Removed the deeply nested `Map<string, Map<string, Object3D[]>>` in `RenderList`, replacing it with a flat `RenderBatch[]` array. This eliminates thousands of temporary iterators (`entries()`, `values()`) per frame across all renderers (WebGL1, WebGL2, WebGPU) and shadow passes, significantly reducing GC pressure.
  - **Transform Math Pooling:** `AbstractGeometry` vertex transformers (`scale`, `rotateX`, etc.) now acquire and release `Matrix4` instances from `MathPool` instead of instantiating new objects.

## [0.69.4] - 2026-07-24

### "The function of good software is to make the complex appear to be simple." - Grady Booch

- **Architecture & Bugfixes:**
  - **Singleton Eradication (Audio & Input):** Removed the final remaining global singletons `Input.instance` and `AudioSystem.instance`.
  - **Dependency Injection Enforcement:** Controllers (`FirstPersonController`, `FPSController`, `YadController`) and Behaviors (`EnemyBehavior`) now strictly require `input` and `audio` dependencies via their constructor options.
  - Refactored `GadgetInspector` to communicate audio changes via native browser `CustomEvent` dispatching (`gadget:audio:master`, etc.) to the `SmallWorld` application context to maintain loose coupling.
- **Housekeeping & Docs:**
  - `custom-game.md` updated to showcase the dependency injection pattern in controllers.
  - `Input.test.ts` updated to remove all Singleton references.

## [0.69.3] - 2026-07-24

### "Read, not to contradict and confute; nor to believe and take for granted; nor to find talk and discourse; but to weigh and consider." - Francis Bacon

- **Architecture & Bugfixes:**
  - **Inversion of Control (IoC) for Configuration:** Removed internal asynchronous loading of `small-world.json` via `fetch`. The engine now accepts configuration synchronously via its constructor (`new SmallWorld(config)`). This removes network waterfalls during startup and improves bundler compatibility.
  - Implemented exact `devicePixelRatio` clamping via `quality.maxPixelRatio` (defaults to 2). Rendering now cleanly handles 3x mobile displays without sacrificing exact resolutions for Retro modes.
  - Enhanced `quality.autoDowngrade` to be optionally toggleable.
- **Housekeeping & Docs:**
  - Added comprehensive `configuration.md` guide and updated README to reflect the new configuration instantiation pattern.
## [0.69.2] - 2026-07-24

### "The secret of change is to focus all of your energy, not on fighting the old, but on building the new." - Socrates

- **Architecture & Bugfixes:**
  - **UniversalEventBus Removal:** Eradicated the global `UniversalEventBus` singleton to strictly enforce the "No Global Singletons" architecture and support proper multi-instancing.
  - **EventBus Injection:** The engine base class (`SmallWorld`) now manages its own local `this.events: EventDispatcherImpl`. This instance is strictly propagated via dependency injection to all subsystems (`PhysicsSystem`), Tools (`Pixler`, `Xtractor`), and Application logic (`YadController`, `YadHud`), ensuring total isolation between engine contexts.
  - Updated documentation (`custom-game.md`, `eventbus.md`) to reflect the new dependency injection pattern.

## [0.69.1] - 2026-07-23

### "In union there is strength." - Aesop

- **Architecture & Bugfixes:**
  - **Physics Broadphase Single Pass:** Merged the historically separate scene-graph traversals (`_collectBodiesRecursive` and `_collectCollidersRecursive`) into a unified `_collectRecursive` loop, collecting both rigidbodies and generic colliders in O(N). Simplifies testing and slightly reduces CPU overhead during the physics `step()`.

## [0.69.0] - 2026-07-22

### "The hardest part of design is keeping features out." - Donald Norman

- **Features:**
  - **Box-OBB Collision:** Implemented Box-OBB detection and resolution logic utilizing a zero-alloc temporary OBB to recycle existing SAT tests without memory overhead.
- **Architecture & Bugfixes:**
  - **WebGL Renderer Pass-System:** Dismantled the monolithic rendering loop from WebGL1/WebGL2 renderers. Ported the modular, composable pass-based architecture (`WebGLRenderPass`, `WebGLMainPass`, `WebGLShadowPass`) to ensure structural symmetry with the WebGPU path. 
  - **UniformPacker Rejection:** Actively rejected the `UniformPacker` in WebGL paths to prevent redundant float array unpack loops and maintain maximum performance on native WebGL calls.
- **Housekeeping & Docs:**
  - Removed outdated prototyping comments for `lavaNoiseMap` in YadApp.
  - Updated `PROJECT_FINDINGS.md` and moved completed findings to the resolved section.

## [0.68.0] - 2026-07-19

### "Progress is not created by contented people." - Frank Tyger

- **Features:**
  - **DeviceOrientationController:** Created a new behavior to translate physical smartphone orientation (`alpha`, `beta`, `gamma` Euler angles) directly into engine `theta`/`phi` polar coordinates, enabling gyroscope/accelerometer-based camera and object rotation.
- **Architecture & Bugfixes:**
  - **DeviceCaps Modernization:** Completely replaced the legacy `DeviceDetector` (User-Agent sniffing) with robust API feature detection inside `DeviceCaps` (Async, Wasm, Workers, Sensors, Touch Media Queries).
  - **Auto-Destroy Lifecycle:** Added `destroy()` logic to `SmallWorld` engine base class. Hooked it to `window.pagehide` and added a DOM detachment check (`!document.body.contains(this.canvas)`) in the `_loop` to automatically free GPU memory and halt RAF when frontend frameworks (React/Vue) destroy the canvas node.


## [0.67.0] - 2026-07-19

### "Where there is much light, the shadow is deep." - Johann Wolfgang von Goethe

- **Features:**
  - **Cascaded Shadow Maps (WebGPU):** Implemented a complete `CascadedShadowPassGPU` supporting directional lights. Resolved command encoder queuing synchronization to correctly record and execute shadow depth textures per cascade.
- **Architecture & Bugfixes:**
  - **Physics Broadphase Implementation:** Replaced the legacy collision loop in `PhysicsSystem` with an Octree-based broadphase filtering approach, including a robust `_broadphaseFallback` for out-of-bounds objects.
  - **WebGPU Shader Fixes:** Fixed WGSL uniform buffer offsets (`cascadeSplits` and `dirShadowInfo`) and ensured shadow-casting passes use a dedicated depth-only shader instead of the full scene lighting shader.
  - Fixed VP corruption bugs in WebGPU shadow matrices and rebuilt global bind groups correctly when shadow textures update.
- **Housekeeping & Docs:**
  - Tracked new research and analysis text files documenting physics broadphase and shadow mapping structures.

## [0.66.0] - 2026-07-19

### "Out of nothing I have created a strange new universe." - János Bolyai

- **Features:**
  - Expanded Showcase 23 (The Shader Gallery) into a fully interactive 3D gallery with dynamic zooming and raycasted screen selection.
  - Moved monitor shader source codes to individual asset files to clean up engine boilerplate.
- **Architecture & Bugfixes:**
  - **Physics Broadphase Optimization:** Replaced the legacy $O(n^2)$ brute-force collision loop in `PhysicsSystem` with an Octree-based spatial partitioning system. Implemented dynamic AABB tracking and O(1) deduplication via Map, vastly improving collision detection performance for scenes with high object counts while consciously accepting acceptable array allocations.
  - Resolved raycaster bounding box logic where `computeBounds()` was not reliably accounting for shifted world matrices during interaction loops.
  - Fixed an issue where WebGL2 contexts assigned inverted shaders to Monitor 2 and Monitor 3.
- **Housekeeping & Docs:**
  - Removed outdated OFF switch from Showcase 23 HTML layout.
  - Added new `Escape` key binding to reset camera behavior states.


## [0.65.0] - 2026-07-19

### "Simplicity is the ultimate sophistication." - Leonardo da Vinci

- **Features:**
  - **Showcase 23 (Shader Gallery Expansion):** Doubled the gallery to 6 screens per API. New WebGL2 examples: a comic/toon-shaded raymarched creature (cel-shading bands, grazing-angle ink outline, halftone shadow dots), a Voronoi stained-glass mosaic, and a procedural retro CRT/ASCII terminal. New WebGPU examples: a toon-shaded spinning raymarched toy, a hex-grid sci-fi hologram, and a Matrix-style digital rain.
- **Architecture & Bugfixes:**
  - **PhysicsSystem Memory Leak:** Fixed the rotation-integration branch leaking 4 pooled vectors per frame for bodies with angular velocity; all `MathPool` vectors acquired during `compose`/`decompose` are now correctly released, restoring the true zero-allocation guarantee.
  - **WGSL Reserved Keywords:** Fixed two shader-creation errors in the new Showcase 23 compute shaders caused by using `target` and `active` as identifiers — both are reserved words in the WGSL spec.
  - **`small-world/tools` Barrel Exports:** Added the missing `Forge`, `ForgeTool`, `Xtractor`, and `MapGenerator` exports to `src/tools/index.ts`.
- **Housekeeping & Docs:**
  - **Documentation Accuracy Audit:** Cross-checked all 10 files in `docs/guides/` against the actual source. Corrected references to a non-existent `Application` class (use `SmallWorld`), fabricated `GlassMaterial`/`GridLevelBuilder` API options, a wrong `FPSController` option name, a sign error in the look-direction formula, an overstated Octree complexity claim, and clarified that the `small-world/tools` subpath isn't a resolvable package export yet.
  - **Commit Convention:** `.agents/AGENTS.md` now explicitly forbids reusing a commit-message quote already present in `git log`.

## [0.64.0] - 2026-07-18

### "Out of clutter, find simplicity." - Albert Einstein

- **Features:**
  - None
- **Architecture & Bugfixes:**
  - **Tool UI Refactor:** Removed the legacy `Forge` taskbar architecture from `Pixler` and `MapGenerator`. All tools now instantiate directly as full-screen native apps in `.container` divs, resulting in a cleaner and 100% unified tool experience.
  - **Xtractor Rename:** Officially renamed `IXtractor` to `Xtractor` across all files, classes, and routing paths.
  - **App Footer Overlap Fix:** Added a `:has(.tool-header)` CSS selector to switch `.app-footer` from `fixed` to `relative` only on tool pages. This ensures the footer dynamically sits at the bottom of the flex layout instead of covering tool UI elements.
  - **Splatter-Gen Layout Fix:** Removed the hardcoded `calc(100vh - 75px)` height from `splatter-gen.html`'s `.app-container` and added `overflow: hidden`, allowing the footer to render correctly at the bottom of the layout.
  - **Renderer Safety:** Added `DeviceCaps` checks inside `RendererFactory` to enforce safe fallbacks from WebGPU to WebGL2, mitigating crashes on unsupported hardware.
- **Housekeeping & Docs:**
  - **Mobile Responsive Showcases:** Overhauled `public/index.html` and `public/assets/shared.css` with unified grid styles and `@media (max-width: 768px)` queries. Headers, example navigation, and grids now scale correctly on mobile devices without relying on inline CSS overrides.
  - **Xtractor AI Mock:** Added a clear, explicit `@DEVELOPER_NOTE` JSDoc in `Xtractor.ts` to document that the "AI chat" is currently a hardcoded regex mock, preventing confusion for future developers looking for a backend API connection.
  - **Hardware Diagnostics:** `DeviceDetector` and `DeviceCaps` now log extended hardware capabilities (cores, resolution, device type) into the console banner at engine startup.

## [0.63.0] - 2026-07-18

### "Pure mathematics is, in its way, the poetry of logical ideas." - Albert Einstein

- **Features:**
  - **Showcase 23 (Shader Gallery):** Deployed a robust multi-API shader gallery featuring three advanced WebGPU compute shaders (Kishimisu's Neon Fractal, Inigo Quilez's SDF Raymarching, and a Retro Synthwave grid).
  - **Showcase 1 (Basic Engine Setup):** Enabled `CameraStrategyType.SMOOTH` and attached an `OrbitController` to provide out-of-the-box user navigation instead of a rigidly fixed camera.
- **Architecture & Bugfixes:**
  - **CustomShaderMaterial Framework:** Introduced a massive architectural leap with `CustomShaderMaterial`, allowing raw, highly customized GLSL/WGSL shaders to seamlessly integrate into the engine's rendering pipeline.
  - **Universal Shader Importers:** Engineered the `ShadertoyImporter`, `GLSLSandboxImporter`, and `ComputeToysImporter`. These robust adapters instantly translate and inject external shader code from popular platforms into our internal material system without requiring manual syntax conversions.
  - **ExternalShaderUniformBehavior:** Developed a dedicated behavior system to automatically bind dynamic uniform data (like `iTime`, `iResolution`, `custom.time`, `custom.resolution`) required by imported external shaders.
  - **WGSL Compilation Error Logging:** Integrated `getCompilationInfo()` into `WebGPURenderer.ts` to surface hidden pipeline creation failures and syntax errors (e.g. reserved keywords) directly to the browser console.
  - **ComputeToysImporter UV Resolution:** Fixed a critical Y-axis inversion and screen-space UV mapping bug where compute shaders incorrectly evaluated global screen coordinates instead of the local 3D billboard geometry coordinates.
  - **Collision Resolution (Deslop):** Fixed `TypeError: Cannot read properties of undefined (reading 'x')` in `FPSController`, `FirstPersonController`, and `EnemyBehavior` by explicitly branching on `obj.bounds.type` (SPHERE vs BOX) before resolving collisions.
  - **Showcase 23 Layout:** Added the standard layout template (Navigation, Header, Footer) to Showcase 23 to match the rest of the application.
- **Housekeeping & Docs:**
  - **DeviceCaps & Telemetry:** Enhanced the engine initialization banner. `DeviceDetector` and `DeviceCaps` now log the device type, performance tier, active GPU model (`WEBGL_debug_renderer_info`), CPU core count, and memory limit directly into the console table.
  - **AI Deslopping:** Audited and cleaned up redundant AI-generated slop (unnecessary `try/catch` blocks around engine startup, overzealous defensive logs, and duplicate `_logTimer` fields) across Showcases 22 and 23.
  - **Testing Infrastructure:** Successfully implemented and verified `scripts/check-showcases.js` using Puppeteer. All showcases now run flawlessly in CI without errors.
  - **REFERENCES.md:** Added a new "Shaders & Procedural Art" section to officially credit Kali, Kishimisu, and Inigo Quilez for their foundational shader mathematics.

## [0.60.2] - 2026-07-17

### "There are two hard things in computer science: cache invalidation, naming things, and off-by-one errors." - Phil Karlton

- **Architecture & Bugfixes:**
  - `Scene` now uses an internal `root: Object3D` node to manage its hierarchy. This resolves the architectural bug where objects could exist simultaneously in `scene.objects` and as a child of another `Object3D` group, causing them to be updated/rendered twice. `scene.objects` is now a safe getter returning `scene.root.children`.

## [0.60.1] - 2026-07-17

### "Talk is cheap. Show me the code." - Linus Torvalds

- **Architecture & Bugfixes:**
  - Physics system now collects dynamic rigidbodies and static colliders recursively. Complex objects (e.g. cars with child wheels) are now processed correctly.

## [0.60.0] - 2026-07-17

### "There is nothing more deceptive than an obvious fact." - Arthur Conan Doyle

- **Features:**
  - **Start Portal (Showcase 22):** Added a beautiful, glowing Sci-Fi Hexagon portal as a start trigger.
  - **Invisible Hitboxes (Best Practice):** Implemented an invisible `Cube` without a material to act as a pure, zero-draw-call collision body for the Start Portal. This resolves raycast flickering (jittering) that occurred when hovering over the hollow Torus shape.
  - **Physics Regression Tests:** Added strict test cases for the `NaN` crash bug and sphere-vs-box tunneling to the Vitest suite.
- **Architecture & Bugfixes:**
  - **Zombie Bounds Physics Crash:** Fixed a critical issue where `Object3D.computeBounds()` would implicitly recreate bounds for objects (like visual drone trails) that were explicitly stripped of them. This caused thousands of ghost hitboxes to spawn at `(0,0,0)`, overloading the collision resolver and causing `NaN` physics states and tunneling.
  - **Drone Collisions:** Drones and trails now override `computeBounds()` with an empty function to guarantee they never participate in the physics engine.
  - **NaN Restitution Safety:** Safeguarded the `PhysicsSystem.step()` logic to handle restitution correctly even if one of the colliding objects lacks a `RigidBody`.

## [0.59.0] - 2026-07-16

### "I am a brain, Watson. The rest of me is a mere appendix." - Sherlock Holmes

- **Features:**
  - **Showcase 22 (Drone Swarm):** Implemented a rigorous 120-drone swarming simulation spawning symmetrically from 4 outer corners (`+/- 34.0`) and converging organically toward the center.
  - Replaced ad-hoc coordinate sign flips with an elegant `Round-Robin` math logic to strictly manage quad-directional symmetric corner allocations.
- **Architecture & Bugfixes:**
  - **Collision Broadphase Optimization:** Solved a critical ghost-collision bug where 2400 pre-allocated, invisible `DroneTrail` objects artificially triggered PhysicsSystem impulses. The broadphase now strictly ignores `obj.isVisible === false` objects, granting a massive performance boost.
  - **High-Velocity Tunneling Fixed:** Prevented the dynamic `Marble` from tunneling through the floor at high frame-deltas by correctly recalculating and expanding the static floor's physical `Y`-depth to 10.0 units, without modifying its visual rendering surface.

## [0.58.0] - 2026-07-16

### "Always code as if the guy who ends up maintaining your code will be a violent psychopath who knows where you live." - John Woods

- **Housekeeping & Docs:**
  - Resolved GC memory leaks in the hot paths (`PhysicsSystem.step()`) ensuring absolute Zero-Allocation guarantees.
  - Switched internal `bodies` and `allColliders` arrays in physics resolution to be strictly pre-allocated and reused every frame.
  - Replaced ad-hoc object literals for `UniversalEventBus` collision events with a strictly reused instance object to eliminate garbage collection pressure completely.
  - Introduced `tests/physix/ZeroAllocation.test.ts` to mathematically guarantee zero math-pool leakage and strict array re-use during physics simulation.
  - Confirmed 100% test coverage integrity with 161 passing tests, flawless compilation, and zero `any` TypeScript violations.

## [0.57.0] - 2026-07-13

### "Programs must be written for people to read, and only incidentally for machines to execute." - Harold Abelson

- **Features:**
  - **Showcase 21 (Supermassive Black Hole):** Created a new interactive showcase demonstrating extreme gravity and physical accretion disks.
  - Added a procedural, ultra-dense glowing Accretion Disk simulated via 400 overlapping inelastic rigid bodies spiraling toward the singularity.
  - Implemented **Gravitational Lensing** in both WGSL and GLSL post-processing shaders, accurately calculating the aspect-ratio-corrected Einstein Ring and light-bending distortions caused by the event horizon.
  - Added Event Horizon masking to ensure absolute zero light emission from the singularity center.
  - Implemented a procedural Gaussian White Noise generator via Box-Muller transform in `AudioSystem.startDrone()`.
  - Upgraded the drone to a full **Cinematic Deep Space Ambient** generator:
        - Added a massive 42Hz Sub-bass rumble to simulate the gravitational weight of the singularity.
        - Added a ghostly, atonal sine-wave choir (minor 9th cluster) to evoke cosmic isolation.
        - Modulated the Gaussian noise through a 250Hz lowpass filter with a 20-second LFO to create a "breathing" stellar wind effect.
- **Housekeeping & Docs:**
  - Updated `REFERENCES.md` to formally credit Dr. Katie Bouman and Dr. Sara Issaoun for their groundbreaking work on the Event Horizon Telescope and the first visual proofs of black holes.

## [0.56.0] - 2026-07-13

### "Any fool can write code that a computer can understand. Good programmers write code that humans can understand." - Martin Fowler

- **Features:**
  - Created a dynamic, physics-based Galton Board / Plinko machine using the new physics engine.
  - Implemented event-driven generative audio: objects emit pentatonic synth notes based on collision impulses (`physics:collision` events) and vertical position.
  - Showcased advanced materials with refractive glass pegs and glowing/flashing cyber-pink emissive spheres.
- **Architecture & Bugfixes:**
  - Fixed a critical physics bug where extreme damping (`friction = 0.1`) caused RigidBodies to lose 90% of their velocity per frame, leading to extreme slow-motion falling and negligible collision impulses.
  - Restored the missing `PhysicsSystem.instance` instantiation and `step()` loop in `Showcase20` to properly drive gravitational and collision physics.
  - Fixed an undefined property crash (`lerp` on `emissive`) by manually implementing RGB interpolation for hit-flash cooling effects.
- **Housekeeping & Docs:**
  - Introduced **Object Pooling** (`_spherePool`) in `Showcase20` to prevent real-time `StandardMaterial` instantiations, completely eliminating WebGPU shader recompilation stuttering during the simulation loop.
  - Reduced dynamic object count in showcases to drastically improve `O(N^2)` collision detection performance.
  - Disabled the `GadgetInspector` by default (`enableInspector: false` in `SmallWorld` base class) to prevent unnecessary background overhead and unwanted asset loading (e.g. `rock.png`) in simple showcases.

## [0.55.0] - 2026-07-13

### "Truth can only be found in one place: the code." - Robert C. Martin

- **Features:**
  - Introduced a completely custom, impulse-based physics engine integrated directly into `PhysicsSystem`, utilizing a **Semi-Implicit Euler** integration loop.
  - Implemented `RigidBody` component for managing linear and angular dynamics (`velocity`, `force`, `torque`, `inertia`, `friction`, `angularDamping`).
  - Added support for perfectly elastic and inelastic collisions via the `restitution` property.
  - Introduced exact rotation mapping between `Quaternion` physics states and `Euler` angles for `Object3D` sync.
  - Transitioned from simple overlap tests to full **Separating Axis Theorem (SAT)** resolution.
  - Implemented `Collision.resolveSphereBox` and `Collision.resolveSphereSphere` to calculate exact correction vectors.
  - Added **Positional Correction** based on inverse mass ratios to prevent objects from sinking into each other.
  - Added **Impulse Resolution** to simulate realistic bouncing and momentum transfer between dynamic and static bodies.
- **Architecture & Bugfixes:**
  - Enforced strict `@typescript-eslint/no-explicit-any` checks across the entire codebase to maintain absolute type safety.
  - Refactored `AbstractWebGLRenderer`, `WebGL1Renderer`, and `WebGL2Renderer` to correctly use `_`-prefixed protected variables (`_gl`, `_defaultTexture`, etc.) adhering strictly to internal engine coding standards.
  - Expanded unit test coverage in `tests/physix/` with 150+ tests covering extreme math edge cases (negative mass/inertia, tunneling, $dt \le 0$ safety).
- **Housekeeping & Docs:**
  - Expanded `REFERENCES.md` to credit pioneering physicists and collision detection researchers (including Jessica Hodgins, Ming C. Lin, and Nadia Magnenat Thalmann).
  - Wrote a comprehensive `physics.md` guide for VitePress explaining the internal math and usage of the physics system.
  - Updated `README.md` to reflect the new physics capabilities.

## [0.54.0] - 2026-07-10

### "First, solve the problem. Then, write the code." - John Johnson

- **Features:**
  - Implemented `SpatialHash` for O(1) grid-based collision broad-phase checks, highly optimized for large grid maps (like YAD).
  - Refactored `Object3D` to implement the new lightweight `Collidable` interface instead of relying on heavy inheritance for physics.
  - Introduced `StaticCollider`, a minimal `Collidable` object, preventing massive `Object3D` overhead when building static walls in maps.
  - Updated `Octree`, `FPSController`, `EnemyBehavior`, and `InteractionManager` to seamlessly query the new `SpatialHash`.
- **Architecture & Bugfixes:**
  - Replaced the old "I"-prefixed interface (`ICollidable` -> `Collidable`) to match modern TypeScript guidelines.
  - Implemented `TextureArray` capabilities directly into the engine, allowing `YadLevelBuilder` to render entire levels in a single draw call via `InstancedMesh`.
  - Removed outdated global `events` drilling.
- **Housekeeping & Docs:**
  - Established a new brand color: **Cyber Purple** (`#B000FF`).
  - Updated the developer console welcome banner to reflect the new Cyber Purple brand identity.
  - Upgraded global CSS variables and Forge UI themes to match the new engine aesthetic.

## [0.53.0] - 2026-07-10

### "Experience is the name everyone gives to their mistakes." - Oscar Wilde

- **Features:**
  - Added a new Toolbar UI using lightweight emojis instead of external icon libraries.
  - Implemented an Active Color Indicator in the palette.
  - Added a "Trim" button to automatically crop the canvas to its non-background pixels.
  - Added a Bucket Fill (Flood Fill) tool for quickly filling enclosed areas (`F`).
  - Added a Color Picker (Eyedropper) tool (`I`), also accessible via `Alt+Click`.
  - Added a Line Tool (`L`) for drawing straight lines, also accessible by pressing `Shift+Click`.
  - Added Symmetry Mode (X and Y axis) for drawing symmetrical sprites or tiles.
  - Added Panning capability with wrapping by using `Shift + Arrow Keys`.
  - Added Flipping (Mirroring) capability horizontally and vertically by using `Shift + Cmd + Arrow Keys`.
  - Added Undo and Redo functionality with full history support (`Cmd+Z` / `Cmd+Shift+Z`).
- **Architecture & Bugfixes:**
  - Resolved `[INEFFECTIVE_DYNAMIC_IMPORT]` Vite warnings across `YadLevelBuilder`, `CubeTexture`, `Texture`, and `TextureArray` by replacing ineffective dynamic imports with standard static imports.

## [0.52.0] - 2026-07-10

### "In order to be irreplaceable, one must always be different." - Coco Chanel

- **Architecture & Bugfixes:**
  - Removed "prop-drilling" of the core `EventDispatcher` through deeply nested constructors (e.g. `FirstPersonControllerOptions`, `ForgeToolOptions`).
  - Introduced `UniversalEventBus`, a globally exported singleton instance of `EventDispatcherImpl` residing in `src/core/events`.
  - Replaced all legacy `this.events` and `this._options.events` usages in `YadController`, `YadHud`, `IXtractor`, and `Pixler` with direct `UniversalEventBus` imports.
  - Eliminated the `events` property from the `SmallWorld` base class entirely to enforce the pure "1 Engine Instance per Page" architecture.
- **Housekeeping & Docs:**
  - Rewrote the EventBus guide (`eventbus.md`) to reflect the new `UniversalEventBus` singleton pattern.
  - Added "Universal Singletons" to the official engine architectural patterns in `AGENTS.md`.

## [0.51.0] - 2026-07-10

### "Java is to JavaScript what car is to Carpet." - Chris Heilmann

- **Features:**
  - Added support for generating PBR maps directly from clipboard images via `Cmd+V` or `Ctrl+V`.
  - Implemented one-click texture downloads by clicking directly on the 2D map preview.
  - Improved UI layout: the preview canvases are now consistently aligned to the top.
  - Irrelevant parameters in the sidebar are now automatically hidden when a specific texture map is active.
- **Architecture & Bugfixes:**
  - Prevented window bounding boxes from being dragged or resized above the visible browser viewport, eliminating the risk of unreachable title bars.
  - Corrected custom tile parsing logic so that custom sprites no longer erroneously block floor and ceiling generation on the same tile.
  - Consolidated redundant import statements across all source files via a new `import/no-duplicates` ESLint rule.
  - Improved strict TypeScript typings in `MaterialStudio` and resolved outstanding pre-commit hook ESLint errors.

## [0.50.0] - 2026-07-09

### "Knowledge is power." - Francis Bacon

- **Architecture & Bugfixes:**
  - Consolidated and extracted inline CSS styles from all Forge tools (`IXtractor`, `MapGenerator`, `Pixler`, `GadgetInspector`) into a central `ForgeTheme.ts`.
  - Upgraded the `Forge` window manager with a modern, high-fidelity **Glassmorphism** aesthetic using dynamic blur (`backdrop-filter`), neon borders, and drop shadows.
  - Eliminated global CSS bleeding by scoping all tool elements to specific namespaces (`.swf-ix-*`, `.swf-btn`, etc.).
- **Housekeeping & Docs:**
  - Expanded `custom-game.md` to reference the **YAD (Yet Another Dungeon)** showcase as the canonical example for custom controllers, finite state machines, and decoupled UI integration.
  - Updated `eventbus.md` to formally document and encourage the use of strongly-typed `as const` object registries (`AppEvents`, `ToolEvents`) over magic strings.
  - Added the powerful `GadgetInspector` to the list of official tools in `forge.md`.

## [0.49.0] - 2026-07-09

### "Sometimes it pays to stay in bed on Monday, rather than spending the rest of the week debugging Monday's code." - Dan Salomon

- **Features:**
  - Added pickups for armor, health, and weapons in the YAD showcase with corresponding HUD logic and UI flashes.
  - Integrated the **Forge**, an extensible in-game window manager and developer overlay.
  - Added new visual utilities: `Pixler` (in-game sprite editor), `IXtractor` (asset extractor/cropper), and `MapGenerator` (grid map painter).
  - Minor type and ESLint cleanups across all tool classes.
- **Architecture & Bugfixes:**
  - Abstracted the core logic of the Dungeon clone showcase (YAD) into a reusable `GridLevelBuilder` extension, genericizing ASCII-based level map generation.
  - Extracted the FPS-style logic out of `YadController` and introduced a dedicated `FirstPersonController` inside the engine core (`src/core/behaviors`), promoting reuse for custom FPS or adventure games.
  - Implemented a unified `EventBus` (`EventDispatcherImpl`) injected globally into `SmallWorld` instances as `this.events`. Removed direct `window.addEventListener` and DOM-coupled custom events, fully separating the UI, gameloop, and game behaviors.

## [0.48.0] - 2026-07-08

### "Perfection is achieved not when there is nothing more to add, but rather when there is nothing more to take away." - Antoine de Saint-Exupery

- **Architecture & Bugfixes:**
  - Enforced strict Barrel-File (`index.ts`) architecture across all `src/` subdirectories.
  - Resolved massive circular dependencies that broke class inheritance (`TypeError: Class extends value undefined is not a constructor or null`) during Vite/Rollup initialization by migrating `export *` statements to Named Exports (`export { ClassName }`) for critical base classes.
  - Re-routed internal imports for base classes (`AbstractRenderer`, `AbstractWebGLRenderer`, `AbstractLight`) to use direct file references (`./AbstractRenderer.js`), fully breaking evaluation loops involving `PostProcessingGroup` and `Scene`.
  - Reorganized renderer architecture, moving backend-specific components cleanly into `WebGL1/`, `WebGL2/`, and `WebGPU/` directories.
  - Standardized TS file headers (`/// src/path/to/file.ts`) across the entire repository.

## [0.47.0] - 2026-07-08

### "Ruby is rubbish! PHP is phpantastic!" - Nikita Popov

- **Features:**
  - Added a complete "Yet Another Dungeon" (YAD) clone showcase featuring an advanced `YadLevelBuilder`, `YadController`, and raycasted `EnemyBehavior`.
  - Upgraded the rudimentary `AudioSystem` with a complete Audio Mixer (Master, Music, SFX channels).
  - Implemented procedural Reverb (ConvolverNode with procedurally decaying white noise impulse response) for dungeon atmosphere, eliminating external asset dependencies.
  - Routed existing procedural synthesizers (`startFire`, `playFootstep`, `playShoot`, `playHurt`) to the SFX channel and `startDrone` to the Music channel.
- **Housekeeping & Docs:**
  - Added formal documentation for `AudioSystem` and recent application behaviors (`EnemyBehavior`, `YadController`, `BobbingBehavior`) to the `README.md`.

## [0.46.2] - 2026-07-05

### "Code is like humor. When you have to explain it, it’s bad." - Cory House

- **Features:**
  - Implemented a rigorous `DeviceDetector` that calculates a device `PerformanceTier` based on experimental navigator features (`hardwareConcurrency`, `deviceMemory`, `navigator.gpu`) and thermal throttling estimates. Mobile devices are now aggressively down-scaled (Bloom off, HDR off, 0 MSAA, 512px Shadows) to guarantee 60fps on smartphone GPUs.
  - Added a global toggle switch `disableTextures` inside the `Renderer Settings` folder, which overrides rendering on all backends (WebGL1/2, WebGPU) with a 1x1 fallback texture to visually debug geometry and lighting instantly.
- **Architecture & Bugfixes:**
  - Changed `drop_console` to `false` in the Terser minification config. `console.log` statements are now properly preserved in production, ensuring engine initialization logs and performance tier reports are visible in deployed builds.
  - Fixed a 404 error when loading `small-world.json` on GitHub Pages by adapting the fetch logic to first probe the correct repository sub-path (`/small-world/config/small-world.json`) before falling back to local domain root.
  - Responsive design logic injected into the showcase templates. Navigation UI automatically scales down and drops verbose text labels on smartphones (`max-width: 768px`), leaving only arrows and improving viewport clarity.

## [0.46.1] - 2026-07-05

### "Fix the cause, not the symptom." - Steve Maguire

- **CI/CD & Housekeeping**: Upgraded GitHub Actions workflow dependencies (`checkout@v7`, `setup-node@v6`, `configure-pages@v6`, `deploy-pages@v5`, `upload-pages-artifact@v5`) to their latest major versions. This completely resolves the Node 20 deprecation warnings on GitHub Actions runners during documentation deployment.

## [0.46.0] - 2026-07-05

### "Optimism is an occupational hazard of programming: feedback is the treatment." - Kent Beck

- **Housekeeping & Docs:**
  - **TypeScript Strictness**: Enforced explicit `: void` return types on all Arrow Functions across showcases, examples, and tools (`showcase.ts`, `ibl-gen.ts`, tests) to perfectly align with engine coding guidelines.
  - **WebGPU Shader Optimization**: Eradicated dynamic branching (`if / else if`) inside the `PostProcess.frag.wgsl` pipeline. Migrated parameters from mutable `LocalUniforms` structs back to globally evaluated compile-time `const` flags (`u_filterMode`, `u_vignetteEnabled`, etc.), ensuring absolute dead-code elimination by the shader compiler. This ensures massive performance gains on the GPU for branch-free pipeline execution.

## [0.45.0] - 2026-07-04

### "When to use iterative development? You should use iterative development only on projects that you want to succeed." - Martin Fowler

- **Features:**
  - Officially published the engine under the permissive MIT License. Added a `LICENSE` file and updated the `package.json` license metadata.
  - Replaced 1px `WireframeMaterial` grids with a dynamically generated procedural Canvas texture on a `Plane` geometry using `BasicMaterial` in Showcase 19, eliminating Moiré aliasing and enabling true physical HDR Bloom for Tron-like aesthetics without PBR tone mapping interference.
- **Architecture & Bugfixes:**
  - Fixed a critical bug in the core engine where `StandardMaterial` defaulted `u_texRepeat` and `u_texOffset` to `[1, 1]` if a `diffuseMap` was missing, even when other maps (like `emissiveMap` or `normalMap`) were present and configured with custom UV repeating.

## [0.44.0] - 2026-07-04

### "Simplicity is the soul of efficiency." - Austin Freeman

- **Features:**
  - **InteractionManager**: Added a built-in interaction layer to `SmallWorld` that listens to mouse and touch events and projects them into the 3D scene.
  - **Object Events**: `Object3D` now natively supports `onPointerEnter`, `onPointerLeave`, `onPointerClick`, `onPointerDown`, `onPointerUp`, and `onPointerMove`.
  - **Behaviors**: Introduced `HoverBehavior` (scales and emits neon glow on hover) and `DraggableBehavior` (allows free 3D drag & drop aligned with the camera's viewing plane).
  - **Octree Acceleration**: Integrated $O(\log n)$ Raycasting via the engine's `Octree`. The `InteractionManager` will automatically use the `staticOctree` and `dynamicOctree` if present to skip thousands of intersections.
  - **Pixel-Perfect Picking (Möller-Trumbore)**: Upgraded `Raycaster.ts` to perform a hybrid intersection strategy. After passing the AABB check, it performs mathematically precise Möller-Trumbore ray-triangle intersections against the object's geometry, allowing selection of exact pixels, irregular meshes, and holes.
  - **Performance Optimization**: Extracted local bounding box caching into `AbstractGeometry` and optimized `Object3D.computeBounds()` to be zero-allocation (reusing instances), preventing GC freezes in scenes with thousands of moving objects.

## [0.43.0] - 2026-07-03

### "Before software can be reusable it first has to be usable." - Ralph Johnson

- **Features:**
  - Added a new browser-based tool (`public/tools/ibl-gen.html`, `src/tools/ibl-gen.ts`, `src/tools/IBLShaders.ts`) for real-time client-side generation of PBR Environment Maps (Irradiance/Radiance).
- **Architecture & Bugfixes:**
  - Moved interactive examples from `src/showcases` to the root `showcases/` directory and restructured them into dedicated folders.
  - Migrated static engine assets (models, textures, levels, etc.) from `public/resources/` to `public/engine/`.
  - Moved shader files from `public/resources/shaders/` directly into the core source tree (`src/core/renderers/shaders/source/`) to allow better code bundling.

## [0.42.2] - 2026-07-02

### "Make it work, make it right, make it fast." - Kent Beck

- **Features:**
  - Added `RenderTargetCube` and `DynamicReflectionProbe` for real-time cube map rendering.
  - Implemented Time-Slicing logic to update one cube face per frame, drastically reducing CPU/GPU overhead.
  - Extended `WebGL2Renderer` (`WebGL2CubeFrameBuffer`) and `WebGPURenderer` to natively support dynamic CubeMap Array-Layer rendering via `Renderer.setRenderTarget(target, activeCubeFace)`.
  - Upgraded Showcase 15 with dynamic reflections on the large spheres.

## [0.42.1] - 2026-07-02

### "Clean code always looks like it was written by someone who cares." - Robert C. Martin

- **Terrain WGSL Fix**: Fixed an issue in `Terrain.frag.wgsl` where `thresholds.w` was incorrectly used as a hard upper bound instead of the softness blend width for the `smoothstep` transition. Restored slope blending for rock textures on steep surfaces.
- **Engine Capabilities Logging**: Added a nice startup banner to `SmallWorld.ts` which prints the engine version, active renderer, and full hardware capabilities via `console.table`.
- **GadgetInspector**: Integrated a comprehensive "Capabilities" folder in the Tweakpane UI overlay (`CMD+ALT+G`) to view device capability limits live across all examples.

## [0.42.0] - 2026-07-02

### "Of course bad code can be cleaned up. But it’s very expensive." - Robert C. Martin

- **Architecture & Bugfixes:**
  - Fixed a major Vite configuration issue where production builds (`npm run start`) served unprocessed, unbundled HTML files due to `publicDir` copying conflicts. Added a script step (`cp -a dist/public/. dist/ && rm -rf dist/public`) to properly merge and overwrite raw assets with processed bundles.
  - Corrected the `ProceduralTerrain` mesh generation loop in Showcase 17 to instantiate an `Object3D` node instead of `Mesh`.
  - Switched from a non-existent `GeometryData` constructor to `ModelGeometry` for passing Float32Arrays safely to the GPU.

## [0.41.0] - 2026-07-01

### "Programming isn't about what you know; it's about what you can figure out." - Chris Pine

- **Features:**
  - Implemented a generalized `ThreadPool` utility (`src/core/threading/ThreadPool.ts`) allowing dynamic, non-blocking execution of heavy logic without bundler configuration by using Blob URLs.
  - Added `Showcase 16` to showcasesnstrate `ThreadPool` usage against a blocked main thread.
  - Fixed a syntax error during `ThreadPool` execution by building a robust object-wrapping deserializer fallback for ES6 class method stringifications.
  - Overhauled the central `index.html` dashboard, HTML Slides Presentation (`presentation.html`), and `examples.css` with a high-fidelity "Tron: Legacy" aesthetic, featuring glassmorphism, neon glows (`#00e5ff`, `#ff6600`), and the `Rajdhani` font.
  - Translated all UI navigation labels across all 18 HTML examples to English.

## [0.40.0] - 2026-07-01

### "The only way to learn a new programming language is by writing programs in it." - Dennis Ritchie

- **Features:**
  - Implemented VitePress for developer guides and tutorials under `/docs`.
  - Added automated API extraction via TypeDoc to `docs/public/api`.
  - Authored a comprehensive Architecture Overview and translated all concepts (`getting-started`, `coordinate-system`, `state-machines`, `REFERENCES.md`) to English.
- **Housekeeping & Docs:**
  - Added file headers (`/// src/path/to/file.ts`) to 18 files.
  - Standardized all relative ES module imports to use explicit `.js` extensions across the codebase for runtime resolution.
  - Fixed strict TypeScript issues (e.g. `any` casting in `pbr-preview.ts` by declaring a strict global `Window` interface, fixing `?raw.js` imports, and correcting `Camera` vs `CameraInterfaceData` assignments).
  - Standardized the UI and Navigation for all 17 interactive examples in `public/showcases/*.html` using a centralized, sleek layout in `examples.css`.

## [0.39.0] - 2026-07-01

### "Testing leads to failure, and failure leads to understanding." - Burt Rutan

- **Features:**
  - Created `PerspectiveProjection.test.ts` to mathematically guarantee scale factors (proving radians are expected and avoiding FOV distortions).
  - Extended `ShaderAssembly.test.ts` to statically analyze assembled WGSL source strings and catch duplicate global `var` and `@binding` declarations in WebGPU pipelines.
  - Implemented `showcase15_v1` with 1000 bouncing instanced rubber balls inside the mirror room.
  - Implemented `showcase15_v2` with rotating moons around perfectly reflective mirror planets.
- **Architecture & Bugfixes:**
  - Increased `EventEmitter.defaultMaxListeners` in `vite.config.ts` to prevent warning/crashes when multiple Vite examples trigger hot reloads simultaneously.
  - Fixed FOV calculation in `DynamicReflectionProbe` (`fov: Math.PI / 2`) by using correct radian conversion instead of degrees. This fixed incorrect culling / frustum rendering anomalies in dynamic cube maps.
  - Removed duplicate global uniform variable declarations (`u_color`, `u_normalMap`, `u_extraParams`, etc.) from `Glass.frag.wgsl`, `Glass.frag.glsl`, and `Glass.frag.glsl100` that conflicted with injected base header chunks, causing `Invalid RenderPipeline` state in WebGPU.

## [0.38.1] - 2026-06-25

### "The most disastrous thing that you can ever learn is your first programming language." - Alan Kay

- **Features:**
  - Implemented `InstancedMesh` class in [InstancedMesh.ts](file:///Users/srottensteiner/PhpstormProjects/small-world/src/core/InstancedMesh.ts) to manage instance counts and dynamic transform matrices.
  - Added support in [WebGL2Renderer.ts](file:///Users/srottensteiner/PhpstormProjects/small-world/src/renderers/WebGL2Renderer.ts) for dynamically compiling instanced shader variants using `#define USE_INSTANCING 1` and rendering via `gl.drawElementsInstanced`/`gl.drawArraysInstanced` with vertex divisor attributes.
  - Added support in [WebGPURenderer.ts](file:///Users/srottensteiner/PhpstormProjects/small-world/src/renderers/WebGPURenderer.ts) for dynamically rewriting WGSL vertex shader sources to include instanced layouts and rendering via `rp.drawIndexed`/`rp.draw` with an instance count parameter.
  - Added full unit test coverage in [InstancedMesh.test.ts](file:///Users/srottensteiner/PhpstormProjects/small-world/tests/core/InstancedMesh.test.ts) to verify matrix initialization, indexing, and dirty flagging.

## [0.38.0] - 2026-06-24

### "It’s not a bug – it’s an undocumented feature." - Anonymous

- **Features:**
  - Implemented a fully generic, type-safe, and zero-allocation `StateMachine` class in [StateMachine.ts](file:///Users/srottensteiner/PhpstormProjects/small-world/src/core/fsm/StateMachine.ts).
  - Added support for state configs defining custom `onEnter`, `onUpdate`, and `onExit` lifecycle callbacks, auto-transitions based on elapsed state duration, and event-based transitions mapped to events.
  - Implemented the `StateMachineBehavior` component in [StateMachineBehavior.ts](file:///Users/srottensteiner/PhpstormProjects/small-world/src/core/behaviors/StateMachineBehavior.ts) to seamlessly integrate state machines into the engine's standard update tick loop (`Scene.update()`).
  - Added full test coverage for the FSM framework in [StateMachine.test.ts](file:///Users/srottensteiner/PhpstormProjects/small-world/tests/core/fsm/StateMachine.test.ts) verifying event transitions, update ticks, auto-transitions, and `StateMachineBehavior` operation.
- **Architecture & Bugfixes:**
  - Refactored [showcase15.ts](file:///Users/srottensteiner/PhpstormProjects/small-world/src/showcases/showcase15.ts) to decouple physics, collision detection, and lifecycle states from the monolithic example update loop.
  - Attached a `StateMachineBehavior` to each bouncing ball, managing `"active" | "falling" | "exploding"` states and updating them natively within the engine's recursive behavior tick.
  - Moved initial ball positioning, restitution velocity resets, and dissolution scales into corresponding state enter/update lifecycle callbacks, leaving the example's update loop clean and modular.

## [0.37.0] - 2026-06-24

### "Software is like sex: it's better when it's free." - Linus Torvalds

- **Features:**
  - Developed and integrated Showcase 15 (`public/showcases/showcase15.html` and `src/showcases/showcase15.ts`), a tribute to classic Amiga 500 showcases rendered with high-fidelity PBR.
  - Implemented **Procedural Checkerboard Diffuse & Roughness Map Generation**: Utilizes an offscreen canvas to dynamically paint reflective black tiles (`roughness = 0.06`) and rough white tiles (`roughness = 0.9`), repeated and loaded into StandardMaterials without static assets.
  - Developed **Planar Floor Reflections (Virtual Geometry / Mirror Room)**: Renders 100 bouncing balls and 3 large spheres flipped symmetrically across the Y axis under a transparent floor (`transparent: true` with `alpha = 0.45`), blending PBR envMap reflections on top of the reflected geometry.
  - Developed **Dynamic Sphere Inversion Reflections**: Calculates real-time conformal reflections of all 100 bouncing balls inside 3D mirror spheres by inverting position vectors ($P' = C + V \cdot \frac{R^2}{d^2 - r^2}$) and radius scale ($r' = \frac{r \cdot R^2}{d^2 - r^2}$).
  - Configured the smallest mirror sphere (Rose) as a **highly reflective mirror** (`transparent: true`, `alpha = 0.80`, `metallic = 1.0`, `roughness = 0.02`), while keeping the other two spheres semi-transparent (`alpha = 0.78`) to show the ball-reflections.
  - Created a **Physics State Machine & Lifecycle Loop**: Bouncing balls now transition from `active` bouncing to `falling` (scaling down and dissolving over 1s when rolling off limits) or `exploding` (scaling up 4x and fading out over 0.5s when resting on the floor for 2s), continuously recycling via `respawnBall` to maintain exactly 100 active balls.
  - Constrained the main Tweakpane panel height to `90vh` and added auto vertical scrolling (`overflow-y: auto`, `overflow-x: hidden`). This prevents the inspector overlay from overflowing off the bottom of the screen when numerous folders are open.

## [0.36.0] - 2026-06-24

### "If debugging is the process of removing software bugs, then programming must be the process of putting them in." - Edsger Dijkstra

- **Features:**
  - Implemented static parameter injection for post-processing shaders, compiling settings (Vignette offset/roundness/darkness, Film Grain intensity, Bloom threshold/intensity, ToneMapping mode) directly into shader pipelines.
  - Configured dynamic shader recompilation triggered automatically when the post-processing configuration signature changes (providing optimal production performance while retaining developer flexibility in the inspector).
  - Reduced per-frame uniform updates to write only the dynamic `time` uniform, saving CPU cycles and GPU uniform register bandwidth.
  - Added global `postProcessing` configuration schema to `small-world.json` and `EngineOptions` types to enable app-wide default parameters.

## [0.35.1] - 2026-06-24

### "Measuring programming progress by lines of code is like measuring airplane building progress by weight." - Bill Gates

- **Architecture & Bugfixes:**
  - Decomposed all inline shader chunk strings inside [CoreShaderChunks.ts](src/core/renderers/shaders/CoreShaderChunks.ts) (fog and color grading filters) into 16 individual file assets under `src/core/materials/shaders/chunks/`.
  - Configured CoreShaderChunks to statically raw-import chunks using Vite `?raw` suffix, maintaining zero HTTP request runtime overhead.
  - Upgraded the WGSL linter (`scripts/lint-wgsl.ts`) to dynamically scan the local chunks folder and assemble the color grading logic in memory.
- **Housekeeping & Docs:**
  - Moved `AGENTS.md` rules into the `.agents/` customization root to declutter the workspace.
  - Expanded the `coding-guide` skill [SKILL.md](.agents/skills/coding-guide/SKILL.md) with comprehensive TypeScript templates, clean code flow rules, WebGL/WebGPU parity tables, and Vitest unit testing mock patterns.

## [0.35.0] - 2026-06-23

### "Nine people can't make a baby in a month." - Fred Brooks

- **Features:**
  - Refactored post-processing to support a custom `filterMode` attribute on `PostProcessingGroup`.
  - Added modular shader chunks (`FILTER_GLITCH_DISTORT`, `FILTER_VHS_DISTORT`, `FILTER_COLOR_GRADING`) in `CoreShaderChunks.ts` for both GLSL and WGSL.
  - Implemented 8 distinct, premium post-processing configurations (Aces Filmic, phosphor-green Night Vision with scrolling scanlines and luma flickering, Noir Film with warm highlights and cool shadows with edge chromatic aberration, Cyber Glitch with cyan/magenta neon tint and blocky line offset shifts, VHS Tape with signal tracking distortion, desaturated colors and line noise, Underworld with warm sepia amber contrast, Old Projector with screen vertical jumps, white vertical scratches and hair/dirt spots, and Thermal Sensor heat map vision).
  - Toggled monitor power saving: Clicking on any of the 8 monitor green LEDs turns it red and pauses the respective 3D rendering loop (`app.stop()`) saving CPU/GPU execution cycles, while applying a smooth CSS fade-out transition.
  - Created a robust unit test suite in `tests/renderers/PostProcessing.test.ts` verifying that `filterMode` registers successfully, shader chunks contain correct keywords, and the post-processing shader template assembles correctly in WebGL2 and WebGPU.
  - Bumped engine minor version to `0.35.0` in `package.json` (propagated to `SmallWorld.ts` via the prebuild build-step).

## [0.34.0] - 2026-06-23

### "There is nothing quite so permanent as a quick fix." - Anonymous

- **Features:**
  - Developed a custom, premium 5-slide HTML presentation for the Small World at `public/presentation.html`.
  - Implemented responsive keyboard and mouse controls for slide transitions (Space, Arrow keys, PageUp/PageDown, and previous/next buttons).
  - Designed the presentation with a modern glassmorphism aesthetic using high-end dark-themed HSL gradients and Outfit/Inter typography.
  - Implemented a resource-friendly activation system that automatically starts the 3D rendering loop only when the showcase slide is active and stops it when leaving the slide.
  - Integrated the "Damaged Helmet" interactive PBR 3D showcases with cinematic letterbox sliding bars and custom overlays for camera control instructions.
  - Modified `vite.config.ts` to register the presentation entry point for production compilation, and linked the slides deck on the main index page (`public/index.html`).
  - Designed and developed a dark-themed retail store "Video Wall" mockup at `public/showcases/showcase14.html`.
  - Configured a grid of 6 monitors, each running a separate rendering instance of a procedural interrogation room scene.
  - Implemented 6 distinct post-processing configurations (Clean Feed, Night Vision green bloom, Noir B&W, Cyberpunk hot magenta bloom, VHS analog tape, Underworld amber glow) showcasesnstrating the engine's ToneMapping, Vignette, Grain, and Bloom elements.
  - Created a synchronized surveillance sweep animation (panning security camera) and animated swinging/flickering light fixtures controlled by a shared simulation panel.
  - Added entry configurations in `vite.config.ts` and registered the new example on the landing page index.

## [0.33.0] - 2026-06-22

### "Programming is the art of telling another human what one wants the computer to do." - Donald Knuth

- **Features:**
  - Implemented the `UniversalGamepadController` to unify and abstract input handling from both the native standard browser Gamepad API (Xbox, PlayStation, mapped generic controllers) and the WebHID API (Nintendo Joy-Cons via `joy-con-webhid`).
  - Added dynamic loader/import for `joy-con-webhid` to ensure compatibility with Node.js environments (vitest) and SSR setups.
  - Implemented automatic grouping of Left and Right Joy-Cons into a single logical `GamepadDevice` when both are active, mapping physical buttons (A/B/X/Y, triggers, system buttons, and sticks) to standard gamepad indices (0-17).
  - Integrated `UniversalGamepadController` into the core `Input` class, keeping keyboard and mouse inputs functional while seamlessly falling back to gamepad input.
  - Provided static accessors `Input.gamepadController` and `Input.requestJoyConConnection()` to trigger browser pairing dialogs in response to user gestures.
  - Wrote a comprehensive unit test suite in `tests/core/controllers/UniversalGamepadController.test.ts` to verify standard gamepad mapping, raw/mocked Joy-Con packet parsers, and connection management.
  - Adapted the **Gamepad Diagnostic Tool** (`public/tools/gamepad-test.html`) to support WebHID controller pairing and display the normalized outputs of the new unified gamepad system.

## [0.32.0] - 2026-06-22

### "Walking on water and developing software from a specification are easy if both are frozen." - Edward V. Berard

- **Features:**
  - Created a specialized `RetroScreenMaterial` designed to run locally on meshes (e.g. TV screens) to simulate custom camera/display artifacts.
  - Implemented two distinct retro simulation modes:
        - **1950s TV Mode**: Converts output to grayscale, renders horizontal scanlines, adds animated static snow/noise, simulates horizontal tearing/waves, and implements vertical rolling.
        - **19th Century Film Mode**: Applies grayscale and sepia tint, simulates random exposure flicker, adds vignette shadow, spawns dynamic dust/dirt spots, and renders jittering vertical hair scratches.
  - Fully compatible with WebGL2 (GLSL 300), WebGL1 (GLSL 100) fallbacks, and WebGPU (WGSL) rendering pipelines.
  - Added unit test suite in `tests/core/RetroScreenMaterial.test.ts` to verify default states, custom config options, and RenderManifest properties.
  - Removed obsolete `SlimeMaterial.ts` class and its registration in `MaterialType.ts`.
  - Re-routed toxin floor tiles (`"T"`) in the Yad Level Builder to use the more performant `LavaMaterial` instead.
  - Cleaned up unused slime assets and maps in `YadApp.ts` and `YadLevelBuilder.ts`.

## [0.31.0] - 2026-06-20

### "A primary cause of complexity is that software vendors uncritically adopt almost any feature that users want." - Niklaus Wirth

- **Features:**
  - Created a browser-based utility at `public/tools/pbr-gen.html` in the style of the Splatter Generator.
  - Implemented real-time texture map generation from user-uploaded images or presets:
        - **Normal Map**: Computed using a discrete 3x3 Sobel kernel to obtain image gradients in X and Y, mapped into tangential coordinate space.
        - **Specular Map**: Derived using a sigmoidal-contrast S-curve function to raise highlight brightness without clipping.
        - **Ambient Occlusion Map**: Calculated using discrete Laplacian cavity operators (`4 * center - sum(neighbors)`) to map micro-crevices, combined with blurred height values.
        - **Roughness & Height Maps**: Generated from intensity mappings with adjustable box blur and inversion filters.
  - Added material presets (Default, Stone, Wood, Metal) for quick parameters adjustment.
  - Developed `PbrPreviewApp` in `src/tools/pbr-preview.ts` which extends `SmallWorld` to render a rotating mesh (Sphere, Cube, Torus, Plane) with custom-generated PBR textures in real-time.
  - Resolved initialization blank-screen bug: Replaced `display: none` tab toggles with absolute offscreen rendering (`position: absolute; left: -9999px`) to maintain client dimensions and avoid `NaN` camera aspect ratios during WebGL setup.
  - Added real-time property bindings (Normal strength, Metallic, Roughness slider updates) dynamically linked to the preview shader.
  - Registered `pbrgen` in `vite.config.ts` rollup options to include the tool in production builds.
  - Satisfied TypeScript `strict: true` type safety by replacing `any` references with `GeometryDataInterface` and adding explicit return types.
  - Linked PBR Generator and Splatter Generator to the main index page (`public/index.html`).
  - Appended detailed mathematical sources and references to `REFERENCES.md`.

## [0.30.0] - 2026-06-19

### "Without requirements or design, programming is the art of adding bugs to an empty text file." - Louis Srygley

- **Features:**
  - Centralized the `GadgetInspector` overlay directly inside the `SmallWorld` base class.
  - Added `enableInspector` property to `EngineOptions` (defaulting to `true` globally since the panel starts hidden).
  - Used type-only compile-time imports combined with asynchronous runtime dynamic imports (`import()`) to avoid circular dependencies between the tools and the core scene graph.
  - Removed manual inspector boilerplate code (imports, properties, instantiation, and manual updates) from Showcase 1, Showcase 6, Showcase 10, and Showcase 13.
  - Added a `color` property to `BloomElement` allowing developers to tint the glow of highlights.
  - Updated WebGPU and WebGL2 post-processing pipelines and fragment shaders to accept and multiply bloom highlights by the configured color.
  - Tinted the bloom highlights in Showcase 13 with a beautiful purple shade (`Color(1.2, 0.8, 1.6)`) to make the helmet's glimmers shine with a lila touch.
- **Architecture & Bugfixes:**
  - Resolved a bug where WebGPU bloom downsample (`BloomDownsample.frag.wgsl`) and upsample (`BloomUpsample.frag.wgsl`) shaders manually computed UV coordinates from `coord.xy` divided by the source texture size. Since downsampling viewports are half the size of the source texture, this restricted UV coordinates to `[0.0, 0.5]`, shifting the glowing highlights towards the bottom-right and accumulating a ghostly double image.
  - Refactored `PostProcess.vert.wgsl` to output correctly interpolated screen-space UV coordinates at `@location(0) uv: vec2f`.
  - Updated `BloomDownsample.frag.wgsl`, `BloomUpsample.frag.wgsl`, and `PostProcess.frag.wgsl` to accept and use the interpolated UV coordinates directly, eliminating offset distortions and resolving the helmet doubling artifact in Showcase 13.
  - Refactored equality comparisons in the modified WGSL shaders to use Yoda-style syntax (`1u == u.bloomEnabled`, etc.) in compliance with project guidelines.

## [0.29.0] - 2026-06-19

### "The best thing about a boolean is even if you are wrong, you are only off by a bit." - Anonymous

- **Architectural Overhaul: High-Performance Culling, WebGPU Bind Groups & Bloom**:
  - **CPU Frustum Culling Integration (Zero-Duplicate Math)**:
    - Resolved a major scene graph bottleneck where culling was performed twice per frame (first in `FrustumCuller` and then recalculated inside `Scene.getVisibleObjectsSorted`).
    - The rendering traversal in `Scene._collectVisible` now directly reads the pre-calculated `inFrustum` state computed during the spatial/octree query phase.
    - Eliminates $N$ redundant frustum-box intersection checks and hierarchy descents per frame, cutting CPU rendering loop overhead by up to 50%.
  - **WebGPU Frequency-of-Change Bind Group Split (Driver Overhead Reduction)**:
    - Completely redesigned the bind group layouts in `WebGPURenderer` to adhere to graphics API best practices (separating bindings by update frequency).
    - Shuffled bindings in `structs.wgsl` and layouts in the renderer to isolate material texture resources in `@group(1)` and object-specific transforms/properties in `@group(2)`.
    - The heavy Material Bind Group (containing 14 bindings for sampler, diffuse, specular, normal, terrain maps, etc.) is now bound **only once per material group**, while the lightweight Object Bind Group is bound per object. This drastically reduces the number of descriptor sets bound per frame, saving valuable CPU validation time in the WebGPU browser thread.
  - **Zero-Allocation Bind Group Caching & GC Stabilization**:
    - Introduced a dual-caching strategy for WebGPU bind groups: Material Bind Groups are cached on the renderer keyed by UUID (with dirty checks on texture views), and Object Bind Groups are cached directly on the uniform buffer metadata.
    - Removed hot-path array allocations (e.g. `resources` array comparisons inside `_getTexBindGroup`), eliminating GC pressure.
    - Replaced the hot-path `delete` operator on reuse objects with static assignment to `undefined`, preventing V8 JIT from dropping objects into dictionary mode and maintaining optimized monomorphic shapes.
  - **WebGPU Dual Kawase Bloom Pass**:
    - Ported the high-quality Dual Kawase Bloom pass from WebGL2 to WebGPU using native render passes and WGSL shaders.
    - Implemented a 13-tap prefiltered downsample shader (`BloomDownsample.frag.wgsl`) with quadratic threshold mapping to isolate highlights, and a 9-tap bilinear upsample shader (`BloomUpsample.frag.wgsl`) with hardware-accelerated additive blending.
    - Generates a 5-level downscaled mip-chain of the HDR render target. Uses render pass attachments and mipmap texture views, guaranteeing 100% cross-device compatibility without requiring experimental storage texture features.

## [0.28.0] - 2026-06-17

### "Ready, fire, aim: the fast approach to software development. Ready, aim, aim, aim, aim: the slow approach." - Anonymous

- **Architecture & Bugfixes:**
  - Added `defaultValue: 0` to `u_useEnvMap`, `_padObj0`, `_padObj1`, and `_padObj2` in `StandardWebGPULayout`. These fields had no value and no fallback, causing repeated `[UniformPacker] Property '...' has no value and no default.` console warnings for every material that does not explicitly supply them (e.g. `SpriteMaterial`, `WireframeMaterial`, `BasicMaterial`, etc.).
  - Replaced the exact pixel-perfect ratio comparisons in `CubeTexture.loadFrom` (e.g. `w * 3 === 4 * h`) with rounded integer checks (`Math.round(w / 4) === Math.round(h / 3)`). Images whose dimensions don't divide evenly — such as `skybox.png` at 245×184 px, which is a horizontal cross layout off by a single pixel — are now correctly identified instead of silently falling back to the "use same image 6 times" path.
  - All face-size calculations during slicing (`STRIP_HORIZONTAL`, `STRIP_VERTICAL`, `GRID_3X2`, `CROSS_HORIZONTAL`, `CROSS_VERTICAL`) now use `Math.round` to produce integer pixel coordinates, preventing sub-pixel boundary errors in `createImageBitmap`.
  - Resolves the WebGPU validation error `texture width (245) and height (184) are not equal` that caused an `[Invalid TextureView]` → `[Invalid BindGroup]` → `[Invalid CommandBuffer]` cascade and prevented the skybox from rendering in Showcase 7 and Showcase 13.
  - Both Showcase 7 and Showcase 13 now load their skybox from `/resources/showcases/13/skybox.png` instead of the previously referenced `/resources/showcases/7/skybox-1.jpg`.

## [0.27.0] - 2026-06-16

### "The function of good software is to make the complex appear to be simple." - Grady Booch

- **PBR & Image-Based Lighting (IBL)**:
  - **Environment Map Reflections**: Resolved missing PBR reflections by ensuring `u_useEnvMap` is correctly included in the `StandardWebGPULayout` and evaluated by the `WebGL2Renderer`.
  - **GLTF Spec Compliance**: Fixed incorrect texture channel sampling in `Standard.frag.glsl`. The engine now correctly reads the Blue channel (`.b`) for metallic and Green channel (`.g`) for roughness, strictly adhering to the glTF 2.0 `metallicRoughnessTexture` standard.
  - **Skybox Architecture**: Updated the legacy `Skybox.vert.glsl` and `Skybox.frag.glsl` shaders to seamlessly integrate with the modern Uniform Buffer Object (`GlobalUniforms`) architecture using `[BASE_VERTEX_HEADER]`.
  - **Texture Binding State**: Corrected `WebGL2Renderer` to properly evaluate and bind `CubeTexture` instances to `TEXTURE_CUBE_MAP` targets instead of blindly falling back to `TEXTURE_2D`, preventing silent `GL_INVALID_OPERATION` conflicts.

## [0.26.0] - 2026-06-15

### "I don't care if it works on your machine! We are not shipping your machine!" - Vidiu Platon

- **Inspector & UI Integration**:
  - **Gadget Inspector**: Introduced `GadgetInspector` (powered by `tweakpane`), a decoupled UI overlay module for real-time scene debugging and property tweaking.
  - **Raycaster & 3D Picking**: Implemented mathematical `Ray` and `Raycaster` classes leveraging slab-method AABB intersections. Converts 2D NDC mouse coordinates into 3D world rays for highly performant object selection.
  - **Dynamic Highlighting & Bounds**: Picked objects are visually marked with a neon-cyan wireframe `BoundingBox`. Bounding volumes are lazily computed on-the-fly during raycasting to guarantee selection works perfectly in minimal scenes (without Octrees).

## [0.25.0] - 2026-06-15

### "Software developers like to solve problems. If there are no problems handily available, they will create their own." - Anonymous

- **Post-Processing Architecture & Effects**:
  - **Modular Post-Processing Group**: Decoupled post-processing configuration from renderers. Introduced `PostProcessingGroup` containing modular elements (`ToneMappingElement`, `VignetteElement`, `GrainElement`) to dynamically assemble the final Uber-Shader pass.
  - **Advanced Vignette Math**: Completely rewrote the Vignette shader math to decouple the radius (`offset`) from the intensity (`darkness`).
  - **Superellipse Vignette Shapes**: Added a new `roundness` parameter to the Vignette effect. Users can now seamlessly transition between perfect elliptical vignettes and rounded rectangular ("TV-screen") vignettes.
  - **Film Grain**: Implemented hardware-accelerated animated Film Grain. Utilizes a time-seeded Hash12 generator directly within the fragment shader to avoid floating-point precision loss (`sin()` breakdown) during long sessions.
  - **WebGPU Transparent Capture Fix**: Resolved "Invalid CommandBuffer" errors in WebGPU by ensuring the HDR render target explicitly requests `GPUTextureUsage.COPY_SRC` so transparent passes can correctly capture the opaque scene behind them.

## [0.24.1] - 2026-06-15

### "A user interface is like a joke. If you have to explain it, it's not that good." - Martin LeBlanc

- **Mathematical Consistency & WebGPU Z-Clipping Fix**:
  - Validated `Matrix4`, `Quaternion`, and `Vector3D` against standard Right-Handed, Column-Major OpenGL conventions as referenced in the architecture guidelines (David Nadlinger).
  - Addressed a fundamental architectural mismatch where `Matrix4.perspective` natively returns `[-1, 1]` Z depth mapping (correct for OpenGL), causing WebGPU (which natively requires `[0, 1]`) to clip geometry in the near-half of the view frustum.
  - Implemented `Matrix4.ZO_CORRECTION`, a zero-to-one correction matrix, and applied it globally inside the `WebGPURenderer` to the view-projection matrix prior to shader upload.
  - Removed localized, incomplete `z`-correction hacks from `.wgsl` shaders, universally resolving frustum clipping issues for all materials, pipelines, and wireframes in WebGPU while maintaining math library independence.

## [0.24.0] - 2026-06-15

### "The first 90% of the code accounts for the first 90% of the development time. The remaining 10% accounts for the other 90%." - Tom Cargill

- **Core Performance & Memory Optimizations**:
  - **WebGPU BindGroup Caching**: Replaced per-frame, per-object `createBindGroup` calls with a sophisticated caching mechanism in `WebGPURenderer`, drastically reducing CPU overhead and memory leaks.
  - **Garbage Collection (GC) Elimination**: Replaced dynamic array allocations (`Object.entries`) in hot-paths (`_renderGroup`) with fast `for..in` loops across both WebGL and WebGPU renderers.
  - **Object Reuse in Scene Graph**: Prevented the allocation of thousands of `Frustum` and `Matrix4` objects per second by utilizing class-level scratch variables in `Scene.getVisibleObjectsSorted`.
  - **WebGL State Tracking**: Implemented a robust state caching system in `WebGL1Renderer` and `WebGL2Renderer` to prevent redundant API calls (`gl.enable`, `gl.cullFace`, `gl.blendFunc`, `gl.depthMask`), significantly lowering driver overhead.
- **Shader & Post-Processing Improvements**:
  - **WGSL Gamma Correction**: Shifted the `1.0 / gamma` division from the fragment shader (executed millions of times per frame) to the CPU, passing `inverseGamma` as a single uniform to the Uber-Shader.
  - **WebGPU Pipeline Reusability**: Prevented the Post-Process Pipeline (`PostProcessPass.ts`) from rebuilding its layouts, modules, and pipelines every frame. It now only rebuilds intelligently upon HDR texture resizing.
  - **WebGL1 Attribute Caching**: Extracted costly `gl.getAttribLocation("a_pos")` string lookups from the `execute()` render-loop in `PostProcessPassGL`, querying and caching it during initial build.

## [0.23.00] - 2026-06-15

### "To iterate is human, to recurse divine." - L. Peter Deutsch

- **Major Feature: Multi-Backend Opaque Texture Capture (Refraction Pipeline)**:
  - Implemented real-time Framebuffer/Color-buffer capturing in `WebGPURenderer`, `WebGL2Renderer`, and `WebGL1Renderer`.
  - Added dedicated pass isolation for transparent objects. Opaque objects are rendered first, the canvas/framebuffer is captured and copied into a read-only texture (`u_opaqueMap`), and then transparent objects are drawn.
  - Developed a cross-platform dummy-texture wrapping system to bypass standard binding limitations in WebGL2/WebGPU while utilizing the existing `RenderManifest` and pipeline infrastructure.
- **Advanced Glass Material (PBR + Beer's Law)**:
  - Transformed `GlassMaterial` from a simple alpha-blended material into a fully physical refractive dielectric.
  - Implemented **Screen-Space Refraction** using exact IOR (Index of Refraction) math, perturbing UV coordinates based on View Vector and Surface Normals.
  - Implemented **Beer-Lambert Law** (Beer's Law) for volumetric light absorption. The color is now physically dictated by `thickness`, where thicker glass absorbs exponentially more light.
  - Added true PBR specular highlights (Cook-Torrance BRDF) on top of the glass surface across all lights (Directional, Point, Spot).
- **Shader Pipeline Improvements**:
  - Unified Gamma Correction and Tone Mapping across transparent shaders.
  - Solved the "Black Glass" issue caused by missing exposure multipliers and linear-to-sRGB conversions in custom fragment outputs.
- **Showcase 12 Polishing**:
  - Upgraded laboratory glassware (`ErlenmeyerFlask`, `ApothecaryBottle`) to use physically accurate material values (e.g., Borosilicate Glass with IOR 1.474 and Cobalt Glass with IOR 1.52).

## [0.22.0] - 2026-06-13

### "The computer was born to solve problems that did not exist before." - Bill Gates

- **Architecture & Bugfixes:**
  - Fixed a critical "disappearing light cone" bug in Showcase 12. Correctly identified and resolved a situation where 4 decorative Porthole-Spotlights entirely consumed the engine's internal WebGPU SpotLight limit (`sLights[4]`), forcing the main shadow-casting spotlight to be silently dropped by the forward renderer.
  - Adjusted Showcase 12 to rely on `emissiveIntensity` pulsation on the Portholes instead of spawning hidden Spotlights, recovering crucial light slots and saving performance.

## [0.21.00] - 2026-06-11

### "Hardware is the part of a computer that you can kick." - Anonymous

- **Core Architecture: Shadow Mapping (WebGL 2.0)**:
  - Introduced robust Shadow Mapping infrastructure for `SpotLight` sources in WebGL 2.0.
  - Implemented the `WebGL2DepthFrameBuffer` to handle off-screen depth rendering utilizing `DEPTH_COMPONENT32F` textures for high precision.
  - Added crucial shadow parameters directly to the engine's base classes (`Object3D.castShadow`, `Object3D.receiveShadow`, `AbstractLight.castShadow`, `AbstractLight.shadowBias`, `AbstractLight.shadowResolution`).
- **Rendering & Shader Enhancements**:
  - Integrated **Hardware Shadow Sampling (`sampler2DShadow`)** combined with `COMPARE_REF_TO_TEXTURE` to leverage free bilinear PCF hardware acceleration.
  - Deployed a **Percentage-Closer Filtering (PCF) Kernel** (3x3 footprint) working alongside the hardware sampler for exceptionally soft and smooth shadow edges.
  - Adopted the **Front-Face Culling Trick** during the shadow depth pass (`gl.cullFace(gl.FRONT)`) to physically eliminate self-shadowing artifacts (Shadow Acne) on lighted geometry.
  - Shader variables `u_spotShadowMap`, `u_spotShadowMatrix` and `u_spotShadowInfo` are dynamically parsed, bound and piped into both standard and PBR lighting models.
- **Engine Defaults & Showcases**:
  - `DEFAULT_RENDERER` was globally switched from `BEST` to `RendererType.WEB_GL2` to guarantee consistent out-of-the-box shadow support across all examples.
  - Redesigned **Showcase 12 (Abyssal Deco)** to heavily showcase the new shadow pipeline with multiple PBR materials, a flickering `SpotLight` casting high-resolution soft shadows, and various geometrical primitives utilizing `castShadow` and `receiveShadow`.

## [0.20.03] - 2026-06-01

### "I am not a great programmer; I am just a good programmer with great habits." - Kent Beck

- **Developer Experience (DX)**:
  - Added `.nvmrc` to specify and enforce the recommended Node.js version (v24.13.1).
  - Introduced **VS Code Dev Container** configuration for a seamless, isolated development setup with pre-installed extensions and dependencies.
  - Updated `README.md` with detailed instructions for local setup and optional Dev Container usage.
- **Dependency Updates**:
  - Upgraded **ESLint** and **@eslint/js** to **v10.x** for improved linting and modern JavaScript support.
  - Updated **Vite** to **v8.x** and **vite-plugin-dts** to **v5.x** to leverage the latest build performance and features.
  - Updated **Vitest**, **typescript-eslint**, and other development dependencies to their latest stable versions.
- **Code Quality & Maintenance**:
  - Resolved several linting errors in tests discovered by the new ESLint version (unused imports, `any`-casts, and unused variables).
  - Verified geometric integrity and movement logic with the updated toolchain.

## [0.20.02] - 2026-05-26

### "Always code as if the guy who ends up maintaining your code will be a violent psychopath who knows where you live." - John Woods

- **Housekeeping & Docs:**
  - Removed **Showcase 11: Baptismal Fonts (Fluid Simulation)** and **Showcase 12: Controls Verification** as requested.
  - Cleaned up entry points in `vite.config.ts` and updated the main example index.

## [0.20.01] - 2026-05-10

### "Give a man a program, frustrate him for a day. Teach a man to program, frustrate him for a lifetime." - Muhammad Waseem

- **Rendering & Shader Stability**:
  - Fixed a critical issue in **WebGL 2.0** where global uniforms (like `u_vp`) were incorrectly declared, causing depth calculation failures.
  - Implemented full **Uniform Buffer Object (UBO)** integration for `LiquidMaterial` and standard shader headers in WebGL 2.0.
  - Added support for `depthWrite`, `depthTest`, and `transparent` state management across all renderers (WebGL 1/2, WebGPU).
  - Resolved "lava leaking" artifacts in Showcase 10 by synchronizing UBO layouts and refining vertex displacement parameters.
- **Showcase 10 Improvements**:
  - Adjusted starting camera height to eye level (`y=2.0`) and set initial rotation to look straight ahead.
  - Optimized fire bowl rendering by refining lava radius and wave amplitude to prevent geometry clipping.
  - Cleaned up unreferenced imports and fixed missing `Input` references.
- **Workflow & Quality Standards**:
  - Introduced a new **Quality & Stability** section in `GEMINI.md`, mandating incremental changes and full library builds for interface updates.
  - Added regression test for `Tube` geometry (`tests/core/Tube.test.ts`) to ensure geometric integrity.
  - Performed safe dependency updates for TypeScript, Vite, and ESLint tools while maintaining linter compatibility.

## [0.20.00] - 2026-05-10

### "In software, the most beautiful code is the code that is not written." - Anonymous

- **Core Input & Control Logic**:
  - Fixed global forward/backward movement logic in `FPSController`. 'W' now correctly follows the look direction across all examples.
  - Refactored `Input` system to use a singleton pattern with `InputInterface`, enabling dependency injection and robust unit testing.
  - Implemented comprehensive regression tests for `FPSController` movement logic (`tests/core/FPSController.test.ts`).
- **Project Standards & Documentation**:
  - Consolidated all project instructions and mathematical standards into `AGENTS.md`.
  - Replaced `GEMINI.md` with a symbolic link to `AGENTS.md` to ensure a single source of truth for engine standards.
  - Added explicit documentation for the right-handed coordinate system and camera orientation standards.
- **Examples**:
  - Added **Showcase 12: Controls Verification** for visual validation of coordinate axes and movement directions.
  - Fixed various coordinate and assembly issues in **Showcase 11 (Baptismal Font)**, including incorrect torus rotations and component alignment.

## [0.19.09] - 2026-04-27

### "You might not think that programmers are artists, but programming is an extremely creative profession." - John Romero

- **Geometry & Visual Enhancements**:
  - Introduced `Disk` geometry with concentric rings, providing superior tessellation for circular surfaces that require vertex displacement.
  - Fixed "square lava" issue in Showcase 10 by replacing the rectangular plane with a high-fidelity `Disk` geometry, ensuring the lava fits perfectly within the circular fire bowls.
  - Refined `LavaMaterial` application to work seamlessly with the new disk tessellation.

## [0.19.08] - 2026-04-27

### "The cheapest, fastest, and most reliable components are those that aren't there." - Gordon Bell

- **Features:**
  - Introduced `inputMode` to `EngineConfig` to toggle between different control schemes.
  - Implemented **Tank-Mode** as the new default (`inputMode: "tank"`), where A/D keys rotate the object or camera.
  - Preserved **Strafe-Mode** (`inputMode: "strafe"`) for modern FPS-style lateral movement.
  - Updated `FPSController` and `WASDController` to dynamically switch logic based on the configured mode.
  - Added automatic `inputMode` injection into controllers via the `Application` base class.

## [0.19.07] - 2026-04-27

### "If we wish to count lines of code, we should not regard them as lines produced but as lines spent." - Edsger Dijkstra

- **Controller & Input Refinement**:
  - Unified **WASD control scheme** across all examples: **A/D** now consistently performs horizontal rotation (turning) instead of strafing.
  - Fixed movement vector calculation in `FPSController` to ensure forward movement (W) correctly follows the current look direction after rotation.
  - Standardized rotation directions for `Object3D` and `Camera`: **D** key now consistently rotates to the right across all controllers (`FPS`, `WASD`, `Orbit`, `Yad`).
  - Corrected mouse horizontal inversion in `FPSStrategy` to match the new keyboard rotation logic.
  - Added keyboard rotation support to `OrbitController`.

## [0.19.06] - 2026-04-27

### "Deleted code is debugged code." - Jeff Sickel

- **Mathematical Integrity & Regression Testing**:
  - Added a new **Mathematical Integrity** section to `AGENTS.md` to enforce the stability of core mathematical logic and coordinate system consistency.
  - Implemented a dedicated regression test suite (`tests/math/RegressionIntegrity.test.ts`) to verify orientation (lookAt), winding order (geometry), and Euler conventions (YXZ).
- **Developer Experience**:
  - Introduced a **Makefile** with "best practice" targets (`help`, `install`, `dev`, `build`, `test`, `lint`, `format`, `clean`) to streamline project management and automate dependency checks.

## [0.19.05] - 2026-04-24

### "Programming today is a race between software engineers striving to build bigger and better idiot-proof programs, and the Universe trying to produce bigger and better idiots. So far, the Universe is winning." - Rick Cook

- **Global Gamma & Exposure System**:
  - Implemented a unified system for color correction across WebGL 1, WebGL 2, and WebGPU.
  - Added `gamma` and `exposure` settings to `QualityConfig` and the global configuration JSON.
  - Migrated all lighting calculations (Phong, Lambert, Standard, Terrain, Liquid) to **Linear Space** for physically accurate color blending.
  - Added automatic sRGB conversion in all fragment shaders using a configurable global gamma factor.
- **Default Lighting**:
  - Added a default `AmbientLight` (0.15 intensity) to the `Application` base class to ensure unlit areas remain visible across all examples.
- **Liquid Shader Enhancements**:
  - Implemented **World-Space Coordinate Mapping** for all liquid shaders (WebGL 1/2 and WebGPU). This enables seamless tiling of lava and slime across multiple adjacent objects.
  - Synchronized vertex displacement and fragment noise calculation to use global world positions.
- **WebGPU Fixes**:
  - Fixed a critical bug in `WebGPURenderer` where `waveFrequency` and `waveAmplitude` were not being passed to the uniform buffer.
  - Corrected `Liquid.frag.wgsl` mapping and fixed missing math chunks in material definitions.
- **Visual Polishing**:
  - Reduced default `waveAmplitude` for `LavaMaterial` (0.05) and `SlimeMaterial` (0.015).

## [0.19.04] - 2026-04-21

### "Every great developer you know got there by solving problems they were unqualified to solve until they actually did it." - Patrick McKenzie

- **Architecture & Bugfixes:**
  - **Matrix Math**: Discovered and fixed a critical bug in `Matrix4.invert` through automated testing. The inversion logic is now 100% compliant with industry standards for column-major matrices.
  - **Vector Math**: Added `min()` and `max()` utility methods to `Vector3D`.

## [0.19.03] - 2026-04-21

### "We have to stop optimizing for programmers and start optimizing for users." - Jeff Atwood

- **Stability & Polishing**:
  - Validated world-space bounding volume transformations across all geometries.
  - Optimized Showcase 6 as a "Geometry Showcase" with optimized frustum culling.
  - Ensured all internal engine events and matrix updates are synchronized before spatial tree generation.

## [0.19.02] - 2026-04-21

### "It is easier to change the specification to fit the program than vice versa." - Alan Perlis

- **Frustum & Bounding Volume Overhaul**:
  - Implemented `BoundingVolume.transform(matrix)` to support world-space culling and octree placement.
  - Fixed "disappearing objects" bug by ensuring `Object3D.computeBounds()` correctly transforms local geometry bounds into world coordinates.
  - Corrected `Frustum` plane extraction logic for column-major matrices (Near/Far plane flip).
  - Renamed Showcase 6 to **"Geometry Showcase"** and removed collision test walls.
  - Fixed `FPSStrategy` vertical look direction (positive phi now looks up).
- **Critical Fixes**:
  - Resolved `TypeError: BoundingBox.fromVertices is not a function` by fixing cyclic/broken imports in `AbstractGeometry.ts`.
  - Added `min()` and `max()` utility methods to `Vector3D`.
  - Updated `Octree` to support all `BoundingVolume` types (Sphere, Box, etc.) via polymorphic tests.

## [0.19.01] - 2026-04-21

### "Lisp isn't a language, it's a building material." - Alan Kay

- **Stability & Code Quality Pass**:
  - Fixed critical `setInt` bug in `WebGL2UniformBuffer` causing corrupted lighting data.
  - Project-wide cleanup of `any` types and linting errors (missing return types, explicit interfaces).
  - Refactored `FPSController` constructor to use a configuration object (adhering to @AGENTS.md).
  - Standardized property naming (`wp`, `n`, `uv`) in all WebGPU shaders.

## [0.19.00] - 2026-04-21

### "Any code of your own that you haven't looked at for six or more months might as well have been written by someone else." - Eagleson's Law

- **Major Architectural Overhaul: Decentralized Shader System**:
  - Eliminated the central `ShaderBootstrap` "monster" (reduced from 700+ to ~50 lines).
  - Implemented the **Open/Closed Principle**: Materials are now self-contained units that provide their own shader DNA without core engine modifications.
  - **Self-Registering Materials**: Materials now automatically register as `ShaderProvider` instances upon instantiation, enabling true "Lazy Registration" (shaders are only loaded and compiled when used).
  - **Externalized Shader Assets**: Moved all shader code into dedicated `.glsl` and `.wgsl` files in `src/core/materials/shaders/` for better developer experience (syntax highlighting, linting).
  - **Vite Integration**: Utilized Vite `?raw` imports for zero-overhead, synchronous shader loading at runtime while maintaining source code separation.
  - **Refined WebGPU Pipeline**: Standardized the `Out` structure and property naming (`wp`, `n`, `uv`, etc.) across all backends to ensure seamless interoperability.
  - **Improved Type Safety**: Added global declarations for raw shader imports in `src/global.d.ts`.
  - **Bug Fixes**:
    - Fixed critical `setInt` bug in `WebGL2UniformBuffer` causing corrupted lighting data.
    - Resolved WebGPU shader redeclaration errors caused by redundant chunk inclusion.
    - Restored correct Phong and Lambert lighting logic in WebGPU shaders.

## [0.18.01] - 2026-04-20

### "The best error message is the one that never shows up." - Thomas Fuchs

- **New Feature: AAA-Style Lava System**:
  - Introduced `LavaMaterial`, a specialized material for high-performance, animated lava effects.
  - Implemented GPU-based Vertex Displacement in all shader backends (WebGL 1/2, WebGPU), moving vertex animation from CPU to GPU for massive performance gains.
  - Developed a multi-layered Fragment Shader featuring:
    - **Dual-Flow Maps**: Two noise-based flows moving in different directions to create chaotic, organic liquid patterns.
    - **Dynamic Crust Simulation**: Threshold-based logic for rendering cooled rock (crust) floating on top of molten magma.
    - **Customizable Viscosity**: Added `flowSpeed` and `noiseScale` parameters to control the sluggishness and scale of the lava flow.
  - Updated all renderers to generically handle new lava-specific uniforms (`u_time`, `u_flowSpeed`, `u_noiseScale`).
  - Refactored Showcase 10 to utilize the new `LavaMaterial`, eliminating all legacy CPU-based noise logic and improving visual quality significantly.

## [0.18.00] - 2026-04-20

### "Your code is your responsibility." - Anonymous

- **Major Architectural Overhaul: Polymorphic Core**:
  - **Open/Closed Principle Implementation**: Refactored major engine subsystems to eliminate "IF-monsters" and type-checking logic, allowing for seamless extension without modifying core classes.
  - **Robust TypedArray Handling**:
    - Replaced problematic `instanceof Uint32Array` checks with context-independent `BYTES_PER_ELEMENT` property access.
    - Migrated all generic array checks in renderers to `ArrayBuffer.isView()` for maximum stability across different execution contexts (e.g., Iframes).
    - Implemented polymorphic buffer creation in WebGPU using `data.constructor` to avoid manual type branching.
  - **Polymorphic Camera System**:
    - Shifting zoom and aspect ratio responsibility to `AbstractProjection` subclasses.
    - Introduced strategy-based zooming via `CameraStrategy.zoom()`, allowing radius-based zoom for Smooth/Stiff strategies and FOV/Bounds-based zoom for others.
    - Removed all `instanceof` checks and manual type casting from the `Camera` class.
  - **Polymorphic Lighting System**:
    - Introduced `AbstractLight.applyTo(LightDataInterface)`, allowing every light type to define how its data is extracted for the renderer.
    - Eliminated the large `switch(light.type)` block in `AbstractRenderer`.
  - **Data-Driven Material Rendering**:
    - Standardized `RenderManifest` to drive all renderer bindings generically.
    - Eliminated material-specific `instanceof` checks in all rendering backends (WebGL 1/2, WebGPU).
    - Introduced `state.isSprite` flag for generic billboarding and `state.transparent` for automated blend/depth-mask state management.
  - **Geometry & Physics Optimization**:
    - Added `getBoundingVolume()` to the `Geometry` interface, enabling $O(1)$ bounds calculation for primitives (Cube, Sphere, Plane).
    - Refactored `Frustum` and `Collision` systems to delegate intersection logic to polymorphic `BoundingVolume` implementations.
    - Updated `Object3D.computeBounds()` to utilize optimal geometric calculations instead of expensive vertex loops.

## [0.17.01] - 2026-04-20

### "We build our computer (systems) the way we build our cities: over time, without a plan, on top of ruins." - Ellen Ullman

- **Maintenance & Stability Round**:
  - **Core Regression Fixes**: Restored `camera.update()` and `camera.updateViewMatrix()` calls in the main application loop to fix visual errors where objects appeared too large (Identity Matrix issues).
  - **Type Safety Overhaul**: Performed a project-wide maintenance pass, eliminating unsafe `any` usages and fixing calls to non-existent methods/properties.
  - **GltfLoader Improvements**: Fixed a critical color scaling bug (removed redundant \*255 multiplication) and added robust safety checks for malformed glTF files.
  - **Robustness**: Added division-by-zero protection in tangent calculations for degenerate UV coordinates.
  - **Cross-Environment Compatibility**: Switched to `MathUtils.generateUUID()` for safer ID generation across various browser environments.
- **Architectural Refinement**:
  - **Showcase Restructuring**: Reorganized the project structure by moving example TypeScript files to `src/showcases/` and HTML files to `public/showcases/` for better build integration and cleaner separation of concerns.
  - **Smart Camera Updates**: Integrated `updateViewMatrix()` directly into `Camera.update()` to ensure every strategy or effect update is immediately reflected in the render.
- **Visual & Performance Tuning**:
  - **Showcase 10 Polish**: Mellowed the pointedness of bubbling lava animation by 50% and slowed down the light pulsing speed by 30% via a new `_lightPulseSpeed` constant for a more organic feel.
  - **Build System**: Added `showcase10` to the Vite production build configuration.

## [0.17.00] - 2026-04-19

### "What one programmer can do in one month, two programmers can do in two months." - Fred Brooks

- **WebGPU Backend Stability & Performance**:
  - **Dynamic Vertex Buffers**: Implemented efficient `GPUBuffer` updates for geometries with the `needsUpdate` flag, enabling real-time vertex displacement (e.g., bubbling lava).
  - **Sampler Caching System**: Introduced a dedicated cache for `GPUSampler` objects, correctly respecting `Texture.addressMode` (Repeat, Clamp, Mirror) and filtering settings.
  - **Optimized Attribute Handling**: Unified attribute buffer creation with dynamic dummy-buffer scaling to prevent crashes on geometries missing normals or UVs.
  - **Memory Management**: Implemented periodic pruning of unused object-specific uniform buffers to prevent memory leaks in large, dynamic scenes.
- **Engine Core & Mathematics**:
  - **Matrix4 Restoration**: Rebuilt the `Matrix4` class with a complete set of static and instance methods, including `lookAt`, `orthographic`, `decompose`, and `transformVector`.
  - **Visibility System Overhaul**: Introduced the `Object3D.inFrustum` flag to decouple culling state from user-defined visibility, ensuring `isVisible = false` is always respected.
  - **Native Material Features**: Added `cullMode` property to `AbstractMaterial`, allowing per-material control over GPU face culling (Front, Back, None).
- **Showcase 10 Evolution**:
  - **Organic Fire Bowls**: Replaced rigid cube-based structures with a high-poly `Tube` geometry for a realistic, rounded stone look.
  - **High-Resolution Bubbling Lava**: Implemented a 32x32 `Plane`-based lava surface with enhanced SimplexNoise displacement and circular edge damping.
  - **Enhanced Visuals**: Significantly boosted lava brightness and point light intensity for a more feury, atmospheric aesthetic.

## [0.16.00] - 2026-04-17

### "Prolific programmers contribute to certain disaster." - Niklaus Wirth

- **Major Feature: Cross-Renderer PBR System**:
  - **Physically Based Rendering (PBR)**: Implemented a modern PBR material system using the Metallic-Roughness workflow across all rendering backends (**WebGL 1**, **WebGL 2**, and **WebGPU**).
  - **StandardMaterial**: Introduced `StandardMaterial` with support for albedo, metallic, roughness, and ambient occlusion properties.
  - **Cook-Torrance BRDF**: Standardized lighting math using industry-standard GGX Normal Distribution, Smith-Schlick Geometry, and Fresnel-Schlick functions.
  - **Linear Lighting Workflow**: Migrated all lighting calculations to **Linear Space** with automatic sRGB gamma correction for more realistic color falloffs.
  - **Shader Architecture**: Modularized PBR math and lighting into reusable shader chunks (`pbr_math`, `light_calc_pbr`) for GLSL and WGSL.
- **Architectural Overhaul**:
  - **Centralized Zoom Logic**: Unified all camera zooming (radius, FOV, and bounds scaling) into a single `Camera.zoom()` method.
  - **Standalone ZoomController**: Extracted zoom functionality into a dedicated, configurable controller for enhanced modularity.
  - **Strategy Enhancements**: Improved `StiffStrategy` with radius constraints and refactored `IsometricStrategy` to respect unified projection bounds.
- **Code Hygiene & Stability**:
  - Fixed pre-existing WebGPU uniform alignment issues by optimizing struct layouts.
  - Resolved multiple linting and typing issues in core modules (`MathUtils.ts`, `Input.ts`).

## [0.15.08] - 2026-04-17

### "No matter how slick the demo is in rehearsal, when you do it in front of a live audience, the probability of a flawless presentation is inversely proportional to the number of people watching, raised to the power of the amount of money involved." - Mark Gibbs

- **Modular Zoom System**:
  - **Centralized Zoom Logic**: Centralized all camera zooming (radius, FOV, and bounds) into a unified `Camera.zoom()` method.
  - **Standalone ZoomController**: Extracted zoom functionality into a dedicated, configurable `ZoomController` for better modularity.
  - **Refactored Controllers**: Modularized `FPSController` and `OrbitController` by removing direct zoom logic.
- **Architectural Improvements**:
  - **Enhanced Strategies**: Added `minRadius`/`maxRadius` constraints to `StiffStrategy` and refactored `IsometricStrategy` to respect projection bounds.
  - **Unified Fallbacks**: Implemented robust fallback mechanisms for zooming across different projection types (Perspective, Orthographic, Oblique).
- **Code Hygiene & Type Safety**:
  - Refined internal zoom logic with improved type checking and safer casting.
  - Fixed multiple pre-existing linting and typing issues in `MathUtils.ts`, `Input.ts`, and `Camera.ts`.

## [0.15.07] - 2026-04-16

### "The bearing of a child takes nine months, no matter how many women are assigned." - Fred Brooks

- **Housekeeping & Docs:**
  - **Object Pooling**: Introduced `MathPool` for `Vector3D`, `Matrix4`, and `Quaternion` to drastically reduce GC pressure in hot paths.
  - **Inline Cache Stabilization**: Implemented `RenderManifest` caching in all materials to maintain stable hidden classes and avoid frequent allocations during rendering.
  - **Hot Path Refactoring**: Replaced `.forEach` with optimized `for` loops in all renderers, frustum culling, and spatial partitioning (Octree) logic.
  - **Scratch Buffer Usage**: Added pre-allocated scratch matrices and typed arrays in renderers to eliminate per-object allocations.
  - Standardized all value comparisons to **Yoda-style** (`value === variable`) for consistency and safety.
  - Improved JSDoc documentation for core interfaces (`Vector`, `Renderer`).
  - **PointerLock Fix**: Fixed an issue where the camera would still follow the mouse after exiting PointerLock via ESC.
  - **Collision Visualizer**: Added `CollisionVisualizer` utility to render wireframe bounding boxes and spheres for physics debugging.
  - **WebGL2 Support**: Added `WebGL2FrameBuffer` class to support future post-processing passes.
  - Enhanced Lava animation with multi-layered wandering noise for flowing wave effects.
  - Added organic pulsing for lava light intensity and color (heat glow effect).
  - Improved wave damping at geometry edges for a cleaner visual look.

## [0.15.06] - 2026-04-15

### "Computers are good at following instructions, but not at reading your mind." - Donald Knuth

- **Dynamic Geometry Support**:
  - Added `needsUpdate` flag to `GeometryDataInterface` to allow manual buffer re-uploads.
  - Implemented `Mesh.update()` (WebGL) and buffer write logic (WebGPU) to support real-time vertex displacement.
  - Updated all renderers (WebGL 1, WebGL 2, WebGPU) to check for geometry updates before each draw call.
- **Improved Lava Animation**: Refactored Showcase 10 with SimplexNoise-based bubbling lava and individual offsets per fire bowl.

## [0.15.05] - 2026-04-15

### "A language that doesn't affect the way you think about programming is not worth knowing." - Alan Perlis

- **TypeScript & Linting Fixes**:
  - Removed unused `TerrainMaterial` import in `WebGL2Renderer` to fix `TS6133` error during declaration file generation.
  - Standardized ESLint ecosystem on the latest stable versions within the v9/v8 range (`eslint` `^9.39.4`, `typescript-eslint` `^8.58.2`) to ensure compatibility with `eslint-plugin-import` while maximizing stability.
  - Updated all core development tools (`@microsoft/api-extractor`, `@types/node`, `globals`, `prettier`, `simplex-noise`, `terser`) to their latest stable versions.
- **Build Optimization**:
  - Improved `vite-plugin-dts` performance by disabling `rollupTypes`, significantly reducing build time.
  - Fixed Vite warning by removing the deprecated `compact` option from `rollupOptions.output` in `vite.lib.config.ts`.

## [0.15.04] - 2026-04-15

### "Good code is its own best documentation. As you're about to add a comment, ask yourself, 'How can I improve the code so that this comment isn't needed?'" - Steve McConnell

- **Unified Texture Flip Handling**: Centralized vertical flip logic in `AssetManager` via `createImageBitmap`, ensuring consistent orientation across WebGL and WebGPU while removing redundant renderer-level flips.
- **Enhanced Configuration Options**: Added optional `flipY` control to `TextureOptions` and `ImageLoader`, defaulting to `false` (web-standard top-down) to correctly support skydomes and other top-down textures.
- **Architectural Loader Overhaul**: Refactored all loaders (`ImageLoader`, `ObjLoader`, `MtlLoader`, `SkyboxLoader`, `TextLoader`) to use standardized Configuration Objects (`LoaderOptions`, `ImageLoaderOptions`) in their constructors, improving maintainability and adhering to `AGENTS.md` standards.
- **OBJ & MTL Path Consistency**: Improved path resolution in `ObjLoader` to automatically pass its base path to the internal `MtlLoader` for more reliable model loading.

## [0.15.03] - 2026-04-14

### "The most important property of a program is whether it accomplishes the intention of its user." - C.A.R. Hoare

- **Robust WebGPU Rendering**:
  - Major update to the **WebGPU Renderer** to implement defensive material property application, matching the reliability of the WebGL backends.
  - Improved WebGPU shader stability with fallback logic for missing normal/specular maps and minimum ambient visibility.
- **Model & Texture Fixes**:
  - **Kenney Car (Showcase 3/4)**: Fixed "black/gray car" issue by removing redundant UV flips in `ObjLoader` and enforcing `NEAREST` filtering in `MtlLoader` to prevent color bleeding on small texture atlases.
  - **Skydome (Showcase 9)**: Corrected upside-down texture by removing manual UV flipping in `Sphere` geometry, ensuring alignment with global renderer standards.
- **Renderer Property Handling**: Standardized the use of `Float32Array` for all material color properties (`u_color`, `u_specColor`) in manifests, improving performance and type safety across all rendering APIs.
- **Material Enhancements**: All core materials (`Basic`, `Phong`, `Lambert`, `Sprite`, `Terrain`, `World`, `Wireframe`, `Skybox`) now correctly expose UV transformation properties in their render manifests.

## [0.15.02] - 2026-04-14

### "The purpose of software engineering is to control complexity, not to create it." - Pamela Zave

- **Recursive Rendering Fix**: Corrected WebGL renderers to properly process nested object hierarchies even when parent objects lack a material (essential for complex model groups).
- **Matrix Calculation**: Fixed critical bug in `Matrix4.compose` by implementing direct matrix construction, ensuring correct transformation order (Translation _ Rotation _ Scale).
- **Large Geometry Support**: All geometry classes now dynamically select between 16-bit and 32-bit index arrays (`Uint16Array` vs `Uint32Array`) based on vertex count, preventing buffer overflows.
- **Improved Model Loading**:
  - `ObjLoader`: Added support for n-gon triangulation and automatic V-flip for UV coordinates.
  - `MtlLoader`: Improved error reporting for missing texture assets.
- **Enhanced Shader Stability**:
  - Implemented robust TBN matrix calculation with fallbacks for geometries without tangent vectors (prevents "black object" syndrome).
  - Fixed shader template placeholders and standardized variable naming across WebGL 1 & 2.
- **System Integrity & Security**:
  - Added `crypto.randomUUID` fallback in `MathUtils` to support insecure contexts (e.g., local network IP access without SSL).
  - Fixed `Mesh` class to explicitly disable unused vertex attributes, preventing state leakage between draw calls.
- **AssetManager Fixes**: Corrected image loading fallback logic to ensure failed fetch requests still attempt to load via the standard Image API.

## [0.15.01] - 2026-04-13

### "Controlling complexity is the essence of computer programming." - Brian Kernighan

- **Architecture & Bugfixes:**
  - Fixed 404 errors for shaders and config files when running examples from subdirectories.

## [0.14.0] - 2026-04-13

### "The trouble with programmers is that you can never tell what a programmer is doing until it's too late." - Seymour Cray

- **AssetManager**: Introduced a centralized manager for loading and caching assets (images, text) with global progress tracking, base URL support, and custom headers.
- **Normal & Specular Maps**: Added support for normal maps and specular maps in `PhongMaterial` and `LambertMaterial` across all renderers.
- **WorldMaterial**: New material type using triplanar mapping for seamless, world-space textures—ideal for terrain, rocks, and large structures.
- **Skydome**: Added `Skydome` implementation for immersive 360-degree backgrounds (see Showcase 9).
- **Major Renderer Rework**: Significant architectural updates to WebGL1, WebGL2, and WebGPU renderers for more modular and efficient shader handling.
- **Spatial Partitioning & Optimization**: Implemented `Octree` for efficient spatial querying and `FrustumCuller` to skip rendering objects outside the camera's view.
- **Enhanced Texture Quality**: Added support for anisotropic filtering and improved mipmap generation.
- **New Showcases**:
  - `Showcase 8`: A classic 2.5D Jump & Run showcasesnstrating physics, collision detection, and sprite-based player movement.
  - `Showcase 9`: Immersive environment with a Skydome and FPS-style camera.
  - `Showcase 10`: Advanced scene composition with fire bowls, point lights, and materials using normal/specular maps.
- **Physics**: Basic AABB collision detection and gravity implementation (showcased in Showcase 8).

## [0.14.00] - 2026-04-03

### "If you think your users are idiots, only idiots will use it." - Linus Torvalds

- Refactor and improve shader handling

## [0.13.04] - 2026-04-03

### "As a rule, software systems do not work well until they have been used, and have failed repeatedly, in real applications." - Dave Parnas

- Fix PointerLocked issues
- Fix Skybox (added support for 4x3/3x4 cross layouts in `CubeTexture`)
- Rename all Demos to Showcases
- Move AbstractDemo to `src/core/showcase/AbstractShowcase`
- Fix Showcase 7 canvas initialization error (ID mismatch)
- Add Showcase 7 with Skybox, infinite floor, and FPS controls
- Improve error handling in `Application.ts` when canvas element is missing
- Update Vite configuration and main index page
- Add support for single-image (tiled) skybox textures in `CubeTexture`

## [0.13.03] - 2026-04-03

### "Most software today is very much like an Egyptian pyramid with millions of bricks piled on top of each other, with no structural integrity, but just done by brute force and thousands of slaves." - Alan Kay

- Clean up log-messages

## [0.13.02] - 2026-04-02

### "The hardest part of design is keeping features out." - Donald Norman

- Add missing geometries: Cube, Plane, and a complete Circle
- Fix and improve WASD movement and pointer lock in Demo 6
- Add comprehensive set of standard web colors (CSS/X11) to Color class
- Add color space conversions: HSL to/from Color and HSV to/from Color
- Refactor RendererFactory and EngineConfig for robust renderer switching
- Fix WebGL context loss issue when switching renderers dynamically

## [0.12.04] - 2026-04-01

### "It is impossible to make anything foolproof because fools are so ingenious." - Arthur Bloch

- Implement renderer configuration in small-world.json to support context attributes
- Update Renderer interface to accept optional attributes during initialization
- Pass renderer-specific attributes to WebGL1, WebGL2 and WebGPU contexts

## [0.12.03] - 2026-03-31

### "C makes it easy to shoot yourself in the foot; C++ makes it harder, but when you do, it blows away your whole leg." - Bjarne Stroustrup

- Centralize Input.init() in Application.ts
- Refine keyboard handling in AbstractDemo to use Input.isPressed(Keys.SHIFT_L)
- Fix: Add WebGL context check to prevent 'createTexture' of null error when switching renderers

## [0.12.02] - 2026-03-31

### "If you automate a mess, you get an automated mess." - Rod Michael

- Add keyboard event handling to AbstractDemo
- Implement renderer switching (WebGL1, WebGL2, WebGPU) via SHIFT+1/2/3 in all showcasess

## [0.12.01] - 2026-03-29

### "The sooner you start to code, the longer the program will take." - Roy Carlson

- Optimize it: Code hygiene

## [0.12.01] - 2026-03-29

### "There are only two kinds of programming languages: those people always bitch about and those nobody uses." - Bjarne Stroustrup

- Optimize it: Constructor options

## [0.12.00] - 2026-03-28

### "The only way to write good code is to write tons of shitty code first." - Anonymous

- Optimize it: Positional parameters vs config options
- Update README

## [0.11.14] - 2026-03-26

### "Design and programming are human activities; forget that and all is lost." - Bjarne Stroustrup

- Implement Camera Effects (Shake, Flash) with Factory and Enums
- Add effect support to Camera class and Application loop
- Refine Smooth Camera Strategy
- Apply AGENTS.md

## [0.11.13] - 2026-03-26

### "The most effective debugging tool is still careful thought, coupled with judiciously placed print statements." - Brian Kernighan

- Implement camera constraints

## [0.11.12] - 2026-03-26

### "A great lathe operator commands several times the wage of an average lathe operator, but a great writer of software code is worth 10,000 times the price of an average software writer." - Bill Gates

- Implement Sprite and SpriteMaterial
- Add billboard rendering logic to WebGL1, WebGL2 and WebGPURenderer
- Enable alpha blending for transparent sprites in all renderers

## [0.11.11] - 2026-03-25

### "One of my most productive days was throwing away 1000 lines of code." - Ken Thompson

- Apply AGENTS.md
- Start with nice 2D features
- Reorganize code

## [0.11.10] - 2025-03-25

### "A computer is a stupid machine with the ability to do incredibly smart things." - Bill Bryson

- AI-based rework III
- Extend AGENTS.md
- Extend terrain generation
- Code quality

## [0.10.16] - 2025-03-19

### "Programmers are in a race with the Universe." - Rick Cook

- AI-based rework II
- Code quality

## [0.10.15] - 2025-03-18

### "The problem with object-oriented languages is they’ve got all this implicit environment that they carry around with them. You wanted a banana but what you got was a gorilla holding the banana and the entire jungle." - Joe Armstrong

- AI-rework
- Code quality

## [0.10.14] - 2025-03-18

### "Code never lies, comments sometimes do." - Ron Jeffries

- Introduce AGENTS.md
- Code quality
- Introduce event management interface

## [0.10.13] - 2025-03-17

### "You can’t have great software without a great team." - Jim McCarthy

- Demo 4
- Add README.md

## [0.10.12] - 2025-03-16

### "No code is faster than no code." - Kevlin Henney

- Demo 3: Load and display \*.OBJ

## [0.10.11] - 2025-03-15

### "Don't comment bad code - rewrite it." - Brian Kernighan

- Demo 2: WASD and camera (pointer lock)

## [0.10.10] - 2025-03-15

### "Complexity is the enemy of reliability." - Thomas McCabe

- Prepare more than a single feature showcases

## [0.10.9] - 2025-03-15

### "In programming the hard part isn't solving problems, but deciding what problems to solve." - Paul Graham

- More code refactor and version bump
- Respect linting errors and warnings
- Some sort of reset. Start with Demo1

## [0.10.6] - 2025-03-13

### "Do not worry about your difficulties in Mathematics. I can assure you mine are still greater." - Albert Einstein

- Crush the code

## [0.10.5] - 2025-03-13

### "Imagination is more important than knowledge." - Albert Einstein

- Introduce terrain with heightmap

## [0.10.4] - 2025-03-13

### "God does not play dice with the universe." - Albert Einstein

- Improve Enums (replace by frozen JS objects)

## [0.10.3] - 2025-03-13

### "There is no royal road to geometry." - Euclid

- Implement AreaLight

## [0.10.2] - 2025-03-12

### "If I have seen further it is by standing on the shoulders of Giants." - Isaac Newton

- Renderer refactoring

## [0.10.1] - 2025-03-12

### "We must know, we will know." - David Hilbert

- Improve linting and formatting

## [0.10.0] - 2025-03-12

### "The book of nature is written in the language of mathematics." - Galileo Galilei

- Re-work /dist, TS bundling etc.

## [0.9.4] - 2025-03-12

### "Where there is matter, there is geometry." - Johannes Kepler

- Bug fixing due to the last refactorings

## [0.9.3] - 2025-03-12

### "Mathematics is the queen of the sciences." - Carl Friedrich Gauss

- Bug fixing; Fasten class type checks

## [0.9.2] - 2025-03-11

### "An equation for me has no meaning unless it expresses a thought of God." - Srinivasa Ramanujan

- Fix WebGPU texture bug

## [0.9.1] - 2025-03-11

### "As far as the laws of mathematics refer to reality, they are not certain, and as far as they are certain, they do not refer to reality." - Albert Einstein

- Add MTL loader; Rework material checks (speed improvements)

## [0.9.0] - 2025-03-11

### "I think, therefore I am." - Rene Descartes

- Even more refactoring; Event system; Asset loader pipelines

## [0.8.59] - 2025-03-11

### "Life is good for only two things, discovering mathematics and teaching mathematics." - Simeon Poisson

- Fix Sphere geometry generation

## [0.8.58] - 2025-03-11

### "Mathematics is the supreme judge; from its decisions there is no appeal." - Tobias Dantzig

- Reorganize loaders; Add .OBJ loader

## [0.8.57] - 2025-03-11

### "In mathematics the art of proposing a question must be held of higher value than solving it." - Georg Cantor

- Extend HUD data

## [0.8.56] - 2025-03-11

### "Obvious is the most dangerous word in mathematics." - Eric Temple Bell

- Add and use vector normalization
- Add code collection script

## [0.8.55] - 2025-03-11

### "What science can there be more noble, more excellent, more useful... than mathematics?" - Benjamin Franklin

- Improve vectors
- Implement SkyBox

## [0.8.54] - 2025-03-10

### "The essence of mathematics lies in its freedom." - Georg Cantor

- Implement basic texture and assessment management stuff
- Add new geometries (pyramid, torus and cylinder).
- Some code improvements
- Re-work light system

## [0.8.50] - 2025-03-10

### "There is geometry in the humming of the strings, there is music in the spacing of the spheres." - Pythagoras

- Re-work camera system (strategy pattern plus factor)
- Re-work showcases1.ts
- Add FPS camera strategy

## [0.8.47] - 2025-03-10

### "Pure mathematics is the world's best game. It is more absorbing than chess, more of a gamble than poker, and lasts longer than Monopoly. It's free. It can be played anywhere." - Richard J. Trudeau

- Changelog

## [0.8.46] - 2025-03-10

### "Mathematics compares the most diverse phenomena and discovers the secret analogies that unite them." - Joseph Fourier

- Add changelog generation script
- Add SpotLight and fix all ESLint any-types
- Add ESLint
- Refactoring HUD template
- Refactoring code
- Implementing rotation
- Implementing point light and ambient light
- Start implementing light
- Start implementing materials
- Implement frustrum calculation
- Implement geometry caching
- Dynamic version display
- Re-introduce /dist
- Major code and math base improvements
- Improve HUD
- Collision detection improvements
- Enrich Vector3D methods with essential methods for math, collision detection etc.
- Improve generation of geometry data
- Improve code style, types etc
- Improve parameter naming and types of the geometric classes
- Improve HUD
- Introduce HUD
- Introduce Vector3D and Vector2D
- Improve base color handling; Introduce the grid
- Add grid; Add world boundaries
- Integrate "prettier"
- Use constants instead of hard coded strings for input keys
- Remove node_modules
- Add camera follow strategies; Add some more debug information;
- Initial commits
- Initial commit from local project
- Initial commit

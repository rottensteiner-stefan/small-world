# Changelog

## [0.57.0] - 2026-07-13

### The Gaussian Void Update ("In God we trust, all others pay cash.")

- **Feature (Audio):**
  - Implemented a procedural Gaussian White Noise generator via Box-Muller transform in `AudioSystem.startDrone()`.
  - Replaced uniform random noise with normal-distributed noise, filtered through a slow bandpass at 400Hz, perfectly simulating cosmic microwave background radiation and deep space solar winds.

## [0.56.0] - 2026-07-13

### The Showcase 20 & Optimization Update ("In God we trust, all others pay cash.")

- **Feature (Showcase 20 - Generative Audio Sculpture):**
  - Created a dynamic, physics-based Galton Board / Plinko machine using the new physics engine.
  - Implemented event-driven generative audio: objects emit pentatonic synth notes based on collision impulses (`physics:collision` events) and vertical position.
  - Showcased advanced materials with refractive glass pegs and glowing/flashing cyber-pink emissive spheres.
- **Performance Optimizations:**
  - Introduced **Object Pooling** (`_spherePool`) in `Showcase20` to prevent real-time `StandardMaterial` instantiations, completely eliminating WebGPU shader recompilation stuttering during the simulation loop.
  - Reduced dynamic object count in showcases to drastically improve `O(N^2)` collision detection performance.
  - Disabled the `GadgetInspector` by default (`enableInspector: false` in `SmallWorld` base class) to prevent unnecessary background overhead and unwanted asset loading (e.g. `rock.png`) in simple showcases.
- **Bug Fixes:**
  - Fixed a critical physics bug where extreme damping (`friction = 0.1`) caused RigidBodies to lose 90% of their velocity per frame, leading to extreme slow-motion falling and negligible collision impulses.
  - Restored the missing `PhysicsSystem.instance` instantiation and `step()` loop in `Showcase20` to properly drive gravitational and collision physics.
  - Fixed an undefined property crash (`lerp` on `emissive`) by manually implementing RGB interpolation for hit-flash cooling effects.

## [0.55.0] - 2026-07-13

### The Physics & Dynamics Update ("In God we trust, all others pay cash.")

- **Feature (Lightweight Physics Engine):**
  - Introduced a completely custom, impulse-based physics engine integrated directly into `PhysicsSystem`, utilizing a **Semi-Implicit Euler** integration loop.
  - Implemented `RigidBody` component for managing linear and angular dynamics (`velocity`, `force`, `torque`, `inertia`, `friction`, `angularDamping`).
  - Added support for perfectly elastic and inelastic collisions via the `restitution` property.
  - Introduced exact rotation mapping between `Quaternion` physics states and `Euler` angles for `Object3D` sync.
- **Feature (Collision Resolution):**
  - Transitioned from simple overlap tests to full **Separating Axis Theorem (SAT)** resolution.
  - Implemented `Collision.resolveSphereBox` and `Collision.resolveSphereSphere` to calculate exact correction vectors.
  - Added **Positional Correction** based on inverse mass ratios to prevent objects from sinking into each other.
  - Added **Impulse Resolution** to simulate realistic bouncing and momentum transfer between dynamic and static bodies.
- **Refactoring & Code Quality:**
  - Enforced strict `@typescript-eslint/no-explicit-any` checks across the entire codebase to maintain absolute type safety.
  - Refactored `AbstractWebGLRenderer`, `WebGL1Renderer`, and `WebGL2Renderer` to correctly use `_`-prefixed protected variables (`_gl`, `_defaultTexture`, etc.) adhering strictly to internal engine coding standards.
  - Expanded unit test coverage in `tests/physix/` with 150+ tests covering extreme math edge cases (negative mass/inertia, tunneling, $dt \le 0$ safety).
- **Documentation:**
  - Expanded `REFERENCES.md` to credit pioneering physicists and collision detection researchers (including Jessica Hodgins, Ming C. Lin, and Nadia Magnenat Thalmann).
  - Wrote a comprehensive `physics.md` guide for VitePress explaining the internal math and usage of the physics system.
  - Updated `README.md` to reflect the new physics capabilities.
## [0.54.0] - 2026-07-10

- **Feature (Physics & Collisions):**
  - Implemented `SpatialHash` for O(1) grid-based collision broad-phase checks, highly optimized for large grid maps (like YAD).
  - Refactored `Object3D` to implement the new lightweight `Collidable` interface instead of relying on heavy inheritance for physics.
  - Introduced `StaticCollider`, a minimal `Collidable` object, preventing massive `Object3D` overhead when building static walls in maps.
  - Updated `Octree`, `FPSController`, `EnemyBehavior`, and `InteractionManager` to seamlessly query the new `SpatialHash`.
- **Refactor (Engine Core):**
  - Replaced the old "I"-prefixed interface (`ICollidable` -> `Collidable`) to match modern TypeScript guidelines.
  - Implemented `TextureArray` capabilities directly into the engine, allowing `YadLevelBuilder` to render entire levels in a single draw call via `InstancedMesh`.
  - Removed outdated global `events` drilling.
- **Design & UX:**
  - Established a new brand color: **Cyber Purple** (`#B000FF`).
  - Updated the developer console welcome banner to reflect the new Cyber Purple brand identity.
  - Upgraded global CSS variables and Forge UI themes to match the new engine aesthetic.

## [0.53.0] - 2026-07-10

- **Feature (Pixler):**
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
- **Fix (Build):**
  - Resolved `[INEFFECTIVE_DYNAMIC_IMPORT]` Vite warnings across `YadLevelBuilder`, `CubeTexture`, `Texture`, and `TextureArray` by replacing ineffective dynamic imports with standard static imports.

## [0.52.0] - 2026-07-10

- **Refactor (Architecture & Universal EventBus):**
  - Removed "prop-drilling" of the core `EventDispatcher` through deeply nested constructors (e.g. `FirstPersonControllerOptions`, `ForgeToolOptions`).
  - Introduced `UniversalEventBus`, a globally exported singleton instance of `EventDispatcherImpl` residing in `src/core/events`.
  - Replaced all legacy `this.events` and `this._options.events` usages in `YadController`, `YadHud`, `IXtractor`, and `Pixler` with direct `UniversalEventBus` imports.
  - Eliminated the `events` property from the `SmallWorld` base class entirely to enforce the pure "1 Engine Instance per Page" architecture.
- **Documentation:**
  - Rewrote the EventBus guide (`eventbus.md`) to reflect the new `UniversalEventBus` singleton pattern.
  - Added "Universal Singletons" to the official engine architectural patterns in `AGENTS.md`.

## [0.51.0] - 2026-07-10

- **Feature (MaterialStudio):**
  - Added support for generating PBR maps directly from clipboard images via `Cmd+V` or `Ctrl+V`.
  - Implemented one-click texture downloads by clicking directly on the 2D map preview.
  - Improved UI layout: the preview canvases are now consistently aligned to the top.
  - Irrelevant parameters in the sidebar are now automatically hidden when a specific texture map is active.
- **Fix (Forge Window):**
  - Prevented window bounding boxes from being dragged or resized above the visible browser viewport, eliminating the risk of unreachable title bars.
- **Fix (GridLevelBuilder):**
  - Corrected custom tile parsing logic so that custom sprites no longer erroneously block floor and ceiling generation on the same tile.
- **Refactor (Code Quality):**
  - Consolidated redundant import statements across all source files via a new `import/no-duplicates` ESLint rule.
  - Improved strict TypeScript typings in `MaterialStudio` and resolved outstanding pre-commit hook ESLint errors.

## [0.50.0] - 2026-07-09

- **Refactor (Forge & Glassmorphism Theme):**
  - Consolidated and extracted inline CSS styles from all Forge tools (`IXtractor`, `MapGenerator`, `Pixler`, `GadgetInspector`) into a central `ForgeTheme.ts`.
  - Upgraded the `Forge` window manager with a modern, high-fidelity **Glassmorphism** aesthetic using dynamic blur (`backdrop-filter`), neon borders, and drop shadows.
  - Eliminated global CSS bleeding by scoping all tool elements to specific namespaces (`.swf-ix-*`, `.swf-btn`, etc.).
- **Documentation (Guides & Reference):**
  - Expanded `custom-game.md` to reference the **YAD (Yet Another Dungeon)** showcase as the canonical example for custom controllers, finite state machines, and decoupled UI integration.
  - Updated `eventbus.md` to formally document and encourage the use of strongly-typed `as const` object registries (`AppEvents`, `ToolEvents`) over magic strings.
  - Added the powerful `GadgetInspector` to the list of official tools in `forge.md`.

## [0.49.0] - 2026-07-09

- **Refactor (Engine Generalization):**
  - Abstracted the core logic of the Dungeon clone showcase (YAD) into a reusable `GridLevelBuilder` extension, genericizing ASCII-based level map generation.
  - Extracted the FPS-style logic out of `YadController` and introduced a dedicated `FirstPersonController` inside the engine core (`src/core/behaviors`), promoting reuse for custom FPS or adventure games.
  - Implemented a unified `EventBus` (`EventDispatcherImpl`) injected globally into `SmallWorld` instances as `this.events`. Removed direct `window.addEventListener` and DOM-coupled custom events, fully separating the UI, gameloop, and game behaviors.
- **Feature (Loot System):**
  - Added pickups for armor, health, and weapons in the YAD showcase with corresponding HUD logic and UI flashes.
- **Feature (Tools & Forge):**
  - Integrated the **Forge**, an extensible in-game window manager and developer overlay.
  - Added new visual utilities: `Pixler` (in-game sprite editor), `IXtractor` (asset extractor/cropper), and `MapGenerator` (grid map painter).
  - Minor type and ESLint cleanups across all tool classes.


## [0.48.0] - 2026-07-08

- **Refactor (Project Structure):**
  - Enforced strict Barrel-File (`index.ts`) architecture across all `src/` subdirectories.
  - Resolved massive circular dependencies that broke class inheritance (`TypeError: Class extends value undefined is not a constructor or null`) during Vite/Rollup initialization by migrating `export *` statements to Named Exports (`export { ClassName }`) for critical base classes.
  - Re-routed internal imports for base classes (`AbstractRenderer`, `AbstractWebGLRenderer`, `AbstractLight`) to use direct file references (`./AbstractRenderer.js`), fully breaking evaluation loops involving `PostProcessingGroup` and `Scene`.
  - Reorganized renderer architecture, moving backend-specific components cleanly into `WebGL1/`, `WebGL2/`, and `WebGPU/` directories.
  - Standardized TS file headers (`/// src/path/to/file.ts`) across the entire repository.

## [0.47.0] - 2026-07-08

- **Feature (YAD Showcase & Engine Features):**
  - Added a complete "Yet Another Dungeon" (YAD) clone showcase featuring an advanced `YadLevelBuilder`, `YadController`, and raycasted `EnemyBehavior`.
- **Feature (AudioSystem Upgrade):**
  - Upgraded the rudimentary `AudioSystem` with a complete Audio Mixer (Master, Music, SFX channels).
  - Implemented procedural Reverb (ConvolverNode with procedurally decaying white noise impulse response) for dungeon atmosphere, eliminating external asset dependencies.
  - Routed existing procedural synthesizers (`startFire`, `playFootstep`, `playShoot`, `playHurt`) to the SFX channel and `startDrone` to the Music channel.
- **Documentation:**
  - Added formal documentation for `AudioSystem` and recent application behaviors (`EnemyBehavior`, `YadController`, `BobbingBehavior`) to the `README.md`.

## [0.46.2] - 2026-07-05

- **Feature (Mobile Optimization):** Implemented a rigorous `DeviceDetector` that calculates a device `PerformanceTier` based on experimental navigator features (`hardwareConcurrency`, `deviceMemory`, `navigator.gpu`) and thermal throttling estimates. Mobile devices are now aggressively down-scaled (Bloom off, HDR off, 0 MSAA, 512px Shadows) to guarantee 60fps on smartphone GPUs.
- **Feature (Gadget Inspector):** Added a global toggle switch `disableTextures` inside the `Renderer Settings` folder, which overrides rendering on all backends (WebGL1/2, WebGPU) with a 1x1 fallback texture to visually debug geometry and lighting instantly.
- **Bugfix (Build Pipeline):** Changed `drop_console` to `false` in the Terser minification config. `console.log` statements are now properly preserved in production, ensuring engine initialization logs and performance tier reports are visible in deployed builds.
- **Bugfix (ConfigLoader):** Fixed a 404 error when loading `small-world.json` on GitHub Pages by adapting the fetch logic to first probe the correct repository sub-path (`/small-world/config/small-world.json`) before falling back to local domain root.
- **UI Enhancement:** Responsive design logic injected into the showcase templates. Navigation UI automatically scales down and drops verbose text labels on smartphones (`max-width: 768px`), leaving only arrows and improving viewport clarity.

## [0.46.1] - 2026-07-05

- **CI/CD & Housekeeping**: Upgraded GitHub Actions workflow dependencies (`checkout@v7`, `setup-node@v6`, `configure-pages@v6`, `deploy-pages@v5`, `upload-pages-artifact@v5`) to their latest major versions. This completely resolves the Node 20 deprecation warnings on GitHub Actions runners during documentation deployment.

## [0.46.0] - 2026-07-05

- **Housekeeping & Optimization**: 
  - **TypeScript Strictness**: Enforced explicit `: void` return types on all Arrow Functions across showcases, examples, and tools (`showcase.ts`, `ibl-gen.ts`, tests) to perfectly align with engine coding guidelines.
  - **WebGPU Shader Optimization**: Eradicated dynamic branching (`if / else if`) inside the `PostProcess.frag.wgsl` pipeline. Migrated parameters from mutable `LocalUniforms` structs back to globally evaluated compile-time `const` flags (`u_filterMode`, `u_vignetteEnabled`, etc.), ensuring absolute dead-code elimination by the shader compiler. This ensures massive performance gains on the GPU for branch-free pipeline execution.

## [0.45.0] - 2026-07-04

- **Bugfix: StandardMaterial UV Scaling**: Fixed a critical bug in the core engine where `StandardMaterial` defaulted `u_texRepeat` and `u_texOffset` to `[1, 1]` if a `diffuseMap` was missing, even when other maps (like `emissiveMap` or `normalMap`) were present and configured with custom UV repeating.
- **Feature: MIT License**: Officially published the engine under the permissive MIT License. Added a `LICENSE` file and updated the `package.json` license metadata.
- **Enhancement: Procedural Grid Rendering**: Replaced 1px `WireframeMaterial` grids with a dynamically generated procedural Canvas texture on a `Plane` geometry using `BasicMaterial` in Showcase 19, eliminating Moiré aliasing and enabling true physical HDR Bloom for Tron-like aesthetics without PBR tone mapping interference.

## [0.44.0] - 2026-07-04

- **Feature: Gamification & Interactions (Phase 1-4)**:
  - **InteractionManager**: Added a built-in interaction layer to `SmallWorld` that listens to mouse and touch events and projects them into the 3D scene.
  - **Object Events**: `Object3D` now natively supports `onPointerEnter`, `onPointerLeave`, `onPointerClick`, `onPointerDown`, `onPointerUp`, and `onPointerMove`.
  - **Behaviors**: Introduced `HoverBehavior` (scales and emits neon glow on hover) and `DraggableBehavior` (allows free 3D drag & drop aligned with the camera's viewing plane).
  - **Octree Acceleration**: Integrated $O(\log n)$ Raycasting via the engine's `Octree`. The `InteractionManager` will automatically use the `staticOctree` and `dynamicOctree` if present to skip thousands of intersections.
  - **Pixel-Perfect Picking (Möller-Trumbore)**: Upgraded `Raycaster.ts` to perform a hybrid intersection strategy. After passing the AABB check, it performs mathematically precise Möller-Trumbore ray-triangle intersections against the object's geometry, allowing selection of exact pixels, irregular meshes, and holes.
  - **Performance Optimization**: Extracted local bounding box caching into `AbstractGeometry` and optimized `Object3D.computeBounds()` to be zero-allocation (reusing instances), preventing GC freezes in scenes with thousands of moving objects.

## [0.43.0] - 2026-07-03

- **Feature: Image-Based Lighting (IBL) Generator Tool**:
  - Added a new browser-based tool (`public/tools/ibl-gen.html`, `src/tools/ibl-gen.ts`, `src/tools/IBLShaders.ts`) for real-time client-side generation of PBR Environment Maps (Irradiance/Radiance).
- **Refactor: Project Structure & Asset Management**:
  - Moved interactive examples from `src/showcases` to the root `showcases/` directory and restructured them into dedicated folders.
  - Migrated static engine assets (models, textures, levels, etc.) from `public/resources/` to `public/engine/`.
  - Moved shader files from `public/resources/shaders/` directly into the core source tree (`src/core/renderers/shaders/source/`) to allow better code bundling.

## [0.42.2] - 2026-07-02

- **Feature: Dynamic Environment Probes (Phase 2)**:
  - Added `RenderTargetCube` and `DynamicReflectionProbe` for real-time cube map rendering.
  - Implemented Time-Slicing logic to update one cube face per frame, drastically reducing CPU/GPU overhead.
  - Extended `WebGL2Renderer` (`WebGL2CubeFrameBuffer`) and `WebGPURenderer` to natively support dynamic CubeMap Array-Layer rendering via `Renderer.setRenderTarget(target, activeCubeFace)`.
  - Upgraded Showcase 15 with dynamic reflections on the large spheres.

## [0.42.1] - 2026-07-02

- **Terrain WGSL Fix**: Fixed an issue in `Terrain.frag.wgsl` where `thresholds.w` was incorrectly used as a hard upper bound instead of the softness blend width for the `smoothstep` transition. Restored slope blending for rock textures on steep surfaces.
- **Engine Capabilities Logging**: Added a nice startup banner to `SmallWorld.ts` which prints the engine version, active renderer, and full hardware capabilities via `console.table`.
- **GadgetInspector**: Integrated a comprehensive "Capabilities" folder in the Tweakpane UI overlay (`CMD+ALT+G`) to view device capability limits live across all examples.

## [0.42.0] - 2026-07-02

- **Bugfix: Production Build Path Resolution**:
  - Fixed a major Vite configuration issue where production builds (`npm run start`) served unprocessed, unbundled HTML files due to `publicDir` copying conflicts. Added a script step (`cp -a dist/public/. dist/ && rm -rf dist/public`) to properly merge and overwrite raw assets with processed bundles.
- **Bugfix: Showcase 17 Runtime / Types**:
  - Corrected the `ProceduralTerrain` mesh generation loop in Showcase 17 to instantiate an `Object3D` node instead of `Mesh`.
  - Switched from a non-existent `GeometryData` constructor to `ModelGeometry` for passing Float32Arrays safely to the GPU.

## [0.41.0] - 2026-07-01

- **Feature: Multithreading & Web Workers**:
  - Implemented a generalized `ThreadPool` utility (`src/core/threading/ThreadPool.ts`) allowing dynamic, non-blocking execution of heavy logic without bundler configuration by using Blob URLs.
  - Added `Showcase 16` to showcasesnstrate `ThreadPool` usage against a blocked main thread.
  - Fixed a syntax error during `ThreadPool` execution by building a robust object-wrapping deserializer fallback for ES6 class method stringifications.
- **UI/UX (Tron: Legacy Aesthetic)**:
  - Overhauled the central `index.html` dashboard, HTML Slides Presentation (`presentation.html`), and `examples.css` with a high-fidelity "Tron: Legacy" aesthetic, featuring glassmorphism, neon glows (`#00e5ff`, `#ff6600`), and the `Rajdhani` font.
  - Translated all UI navigation labels across all 18 HTML examples to English.

## [0.40.0] - 2026-07-01

- **Feature: Developer Documentation**:
  - Implemented VitePress for developer guides and tutorials under `/docs`.
  - Added automated API extraction via TypeDoc to `docs/public/api`.
  - Authored a comprehensive Architecture Overview and translated all concepts (`getting-started`, `coordinate-system`, `state-machines`, `REFERENCES.md`) to English.
- **Housekeeping**:
  - Added file headers (`/// src/path/to/file.ts`) to 18 files.
  - Standardized all relative ES module imports to use explicit `.js` extensions across the codebase for runtime resolution.
  - Fixed strict TypeScript issues (e.g. `any` casting in `pbr-preview.ts` by declaring a strict global `Window` interface, fixing `?raw.js` imports, and correcting `Camera` vs `CameraInterfaceData` assignments).
- **UI/UX**:
  - Standardized the UI and Navigation for all 17 interactive examples in `public/showcases/*.html` using a centralized, sleek layout in `examples.css`.

## [0.39.0] - 2026-07-01

- **Bugfix: Node EventEmitter Memory Leak in Dev Server**: Increased `EventEmitter.defaultMaxListeners` in `vite.config.ts` to prevent warning/crashes when multiple Vite examples trigger hot reloads simultaneously.
- **Bugfix: DynamicReflectionProbe FOV Calculation**: Fixed FOV calculation in `DynamicReflectionProbe` (`fov: Math.PI / 2`) by using correct radian conversion instead of degrees. This fixed incorrect culling / frustum rendering anomalies in dynamic cube maps.
- **Bugfix: WGSL Shader Compilation Errors (Duplicate Uniforms)**: Removed duplicate global uniform variable declarations (`u_color`, `u_normalMap`, `u_extraParams`, etc.) from `Glass.frag.wgsl`, `Glass.frag.glsl`, and `Glass.frag.glsl100` that conflicted with injected base header chunks, causing `Invalid RenderPipeline` state in WebGPU.
- **Feature: Robust Regression Integrity Tests**:
  - Created `PerspectiveProjection.test.ts` to mathematically guarantee scale factors (proving radians are expected and avoiding FOV distortions).
  - Extended `ShaderAssembly.test.ts` to statically analyze assembled WGSL source strings and catch duplicate global `var` and `@binding` declarations in WebGPU pipelines.
- **Feature: Showcase 15 "Mirror Planets" Variants**:
  - Implemented `showcase15_v1` with 1000 bouncing instanced rubber balls inside the mirror room.
  - Implemented `showcase15_v2` with rotating moons around perfectly reflective mirror planets.

## [0.38.1] - 2026-06-25

- **Feature: Instanced Draw Calls (Instancing) support**:
  - Implemented `InstancedMesh` class in [InstancedMesh.ts](file:///Users/srottensteiner/PhpstormProjects/small-world/src/core/InstancedMesh.ts) to manage instance counts and dynamic transform matrices.
  - Added support in [WebGL2Renderer.ts](file:///Users/srottensteiner/PhpstormProjects/small-world/src/renderers/WebGL2Renderer.ts) for dynamically compiling instanced shader variants using `#define USE_INSTANCING 1` and rendering via `gl.drawElementsInstanced`/`gl.drawArraysInstanced` with vertex divisor attributes.
  - Added support in [WebGPURenderer.ts](file:///Users/srottensteiner/PhpstormProjects/small-world/src/renderers/WebGPURenderer.ts) for dynamically rewriting WGSL vertex shader sources to include instanced layouts and rendering via `rp.drawIndexed`/`rp.draw` with an instance count parameter.
  - Added full unit test coverage in [InstancedMesh.test.ts](file:///Users/srottensteiner/PhpstormProjects/small-world/tests/core/InstancedMesh.test.ts) to verify matrix initialization, indexing, and dirty flagging.

## [0.38.0] - 2026-06-24

- **Feature: Core Generic Finite State Machine (FSM) Framework**:
  - Implemented a fully generic, type-safe, and zero-allocation `StateMachine` class in [StateMachine.ts](file:///Users/srottensteiner/PhpstormProjects/small-world/src/core/fsm/StateMachine.ts).
  - Added support for state configs defining custom `onEnter`, `onUpdate`, and `onExit` lifecycle callbacks, auto-transitions based on elapsed state duration, and event-based transitions mapped to events.
  - Implemented the `StateMachineBehavior` component in [StateMachineBehavior.ts](file:///Users/srottensteiner/PhpstormProjects/small-world/src/core/behaviors/StateMachineBehavior.ts) to seamlessly integrate state machines into the engine's standard update tick loop (`Scene.update()`).
  - Added full test coverage for the FSM framework in [StateMachine.test.ts](file:///Users/srottensteiner/PhpstormProjects/small-world/tests/core/fsm/StateMachine.test.ts) verifying event transitions, update ticks, auto-transitions, and `StateMachineBehavior` operation.
- **Refactor: FSM-Driven Bouncing Balls Simulation (Showcase 15)**:
  - Refactored [showcase15.ts](file:///Users/srottensteiner/PhpstormProjects/small-world/src/showcases/showcase15.ts) to decouple physics, collision detection, and lifecycle states from the monolithic example update loop.
  - Attached a `StateMachineBehavior` to each bouncing ball, managing `"active" | "falling" | "exploding"` states and updating them natively within the engine's recursive behavior tick.
  - Moved initial ball positioning, restitution velocity resets, and dissolution scales into corresponding state enter/update lifecycle callbacks, leaving the example's update loop clean and modular.

## [0.37.0] - 2026-06-24

- **Feature: Showcase 15 "Amiga Zen Nostalgia" & Advanced Planar/Sphere Reflections**:
  - Developed and integrated Showcase 15 (`public/showcases/showcase15.html` and `src/showcases/showcase15.ts`), a tribute to classic Amiga 500 showcases rendered with high-fidelity PBR.
  - Implemented **Procedural Checkerboard Diffuse & Roughness Map Generation**: Utilizes an offscreen canvas to dynamically paint reflective black tiles (`roughness = 0.06`) and rough white tiles (`roughness = 0.9`), repeated and loaded into StandardMaterials without static assets.
  - Developed **Planar Floor Reflections (Virtual Geometry / Mirror Room)**: Renders 100 bouncing balls and 3 large spheres flipped symmetrically across the Y axis under a transparent floor (`transparent: true` with `alpha = 0.45`), blending PBR envMap reflections on top of the reflected geometry.
  - Developed **Dynamic Sphere Inversion Reflections**: Calculates real-time conformal reflections of all 100 bouncing balls inside 3D mirror spheres by inverting position vectors ($P' = C + V \cdot \frac{R^2}{d^2 - r^2}$) and radius scale ($r' = \frac{r \cdot R^2}{d^2 - r^2}$).
  - Configured the smallest mirror sphere (Rose) as a **highly reflective mirror** (`transparent: true`, `alpha = 0.80`, `metallic = 1.0`, `roughness = 0.02`), while keeping the other two spheres semi-transparent (`alpha = 0.78`) to show the ball-reflections.
  - Created a **Physics State Machine & Lifecycle Loop**: Bouncing balls now transition from `active` bouncing to `falling` (scaling down and dissolving over 1s when rolling off limits) or `exploding` (scaling up 4x and fading out over 0.5s when resting on the floor for 2s), continuously recycling via `respawnBall` to maintain exactly 100 active balls.
- **Feature: Scrollable Gadget Inspector Overlay**:
  - Constrained the main Tweakpane panel height to `90vh` and added auto vertical scrolling (`overflow-y: auto`, `overflow-x: hidden`). This prevents the inspector overlay from overflowing off the bottom of the screen when numerous folders are open.

## [0.36.0] - 2026-06-24

- **Feature: Global Post-Processing Configuration & Static Shader Specialization**:
  - Implemented static parameter injection for post-processing shaders, compiling settings (Vignette offset/roundness/darkness, Film Grain intensity, Bloom threshold/intensity, ToneMapping mode) directly into shader pipelines.
  - Configured dynamic shader recompilation triggered automatically when the post-processing configuration signature changes (providing optimal production performance while retaining developer flexibility in the inspector).
  - Reduced per-frame uniform updates to write only the dynamic `time` uniform, saving CPU cycles and GPU uniform register bandwidth.
  - Added global `postProcessing` configuration schema to `small-world.json` and `EngineOptions` types to enable app-wide default parameters.

## [0.35.1] - 2026-06-24

- **Optimization: Shader Performance refactoring ("Math is Cheaper than Memory")**:
  - Eliminated redundant texture sampling inside [Standard.frag.wgsl](src/core/materials/shaders/Standard.frag.wgsl) (WGSL diffuse map) and PBR lighting chunks (`light_calc_pbr.frag.glsl` for WebGL1 & 2), reducing memory fetch bandwidth.
  - Converted divergent branch logic inside the Thermal Vision post-processing filters (WGSL & GLSL) into flat, branch-free step-wise linear interpolation mixes.
  - Replaced nested branching inside [Terrain.frag.wgsl](src/core/materials/shaders/Terrain.frag.wgsl) with clamp/mix linear structures.
  - Removed conditional normal mapping branch logic in Phong shaders ([Phong.frag.glsl](src/core/materials/shaders/Phong.frag.glsl) & `glsl100`), running normal perturbations unconditionally.
  - Added length-based mathematical fast-path for vignettes in post-processing shaders (`PostProcess.frag.wgsl` and `glsl`), avoiding slow power calculations (`pow`) for circular shapes.
- **Refactor: Modular Shader Chunk Extraction**:
  - Decomposed all inline shader chunk strings inside [CoreShaderChunks.ts](src/core/renderers/shaders/CoreShaderChunks.ts) (fog and color grading filters) into 16 individual file assets under `src/core/materials/shaders/chunks/`.
  - Configured CoreShaderChunks to statically raw-import chunks using Vite `?raw` suffix, maintaining zero HTTP request runtime overhead.
  - Upgraded the WGSL linter (`scripts/lint-wgsl.ts`) to dynamically scan the local chunks folder and assemble the color grading logic in memory.
- **Documentation & Customization Rules**:
  - Moved `AGENTS.md` rules into the `.agents/` customization root to declutter the workspace.
  - Expanded the `coding-guide` skill [SKILL.md](.agents/skills/coding-guide/SKILL.md) with comprehensive TypeScript templates, clean code flow rules, WebGL/WebGPU parity tables, and Vitest unit testing mock patterns.

## [0.35.0] - 2026-06-23

- **Feature: Highly Stylized Surveillance Video Wall Filters**:
  - Refactored post-processing to support a custom `filterMode` attribute on `PostProcessingGroup`.
  - Added modular shader chunks (`FILTER_GLITCH_DISTORT`, `FILTER_VHS_DISTORT`, `FILTER_COLOR_GRADING`) in `CoreShaderChunks.ts` for both GLSL and WGSL.
  - Implemented 8 distinct, premium post-processing configurations (Aces Filmic, phosphor-green Night Vision with scrolling scanlines and luma flickering, Noir Film with warm highlights and cool shadows with edge chromatic aberration, Cyber Glitch with cyan/magenta neon tint and blocky line offset shifts, VHS Tape with signal tracking distortion, desaturated colors and line noise, Underworld with warm sepia amber contrast, Old Projector with screen vertical jumps, white vertical scratches and hair/dirt spots, and Thermal Sensor heat map vision).
  - Toggled monitor power saving: Clicking on any of the 8 monitor green LEDs turns it red and pauses the respective 3D rendering loop (`app.stop()`) saving CPU/GPU execution cycles, while applying a smooth CSS fade-out transition.
- **Maintenance & Testing**:
  - Created a robust unit test suite in `tests/renderers/PostProcessing.test.ts` verifying that `filterMode` registers successfully, shader chunks contain correct keywords, and the post-processing shader template assembles correctly in WebGL2 and WebGPU.
  - Bumped engine minor version to `0.35.0` in `package.json` (propagated to `SmallWorld.ts` via the prebuild build-step).

## [0.34.0] - 2026-06-23

- **Feature: Interactive HTML Slide Presentation & Live 3D Showcase**:
  - Developed a custom, premium 5-slide HTML presentation for the Small World at `public/presentation.html`.
  - Implemented responsive keyboard and mouse controls for slide transitions (Space, Arrow keys, PageUp/PageDown, and previous/next buttons).
  - Designed the presentation with a modern glassmorphism aesthetic using high-end dark-themed HSL gradients and Outfit/Inter typography.
  - Implemented a resource-friendly activation system that automatically starts the 3D rendering loop only when the showcase slide is active and stops it when leaving the slide.
  - Integrated the "Damaged Helmet" interactive PBR 3D showcases with cinematic letterbox sliding bars and custom overlays for camera control instructions.
  - Modified `vite.config.ts` to register the presentation entry point for production compilation, and linked the slides deck on the main index page (`public/index.html`).

- **Feature: Surveillance Video Wall Showcase (Showcase 14)**:
  - Designed and developed a dark-themed retail store "Video Wall" mockup at `public/showcases/showcase14.html`.
  - Configured a grid of 6 monitors, each running a separate rendering instance of a procedural interrogation room scene.
  - Implemented 6 distinct post-processing configurations (Clean Feed, Night Vision green bloom, Noir B&W, Cyberpunk hot magenta bloom, VHS analog tape, Underworld amber glow) showcasesnstrating the engine's ToneMapping, Vignette, Grain, and Bloom elements.
  - Created a synchronized surveillance sweep animation (panning security camera) and animated swinging/flickering light fixtures controlled by a shared simulation panel.
  - Added entry configurations in `vite.config.ts` and registered the new example on the landing page index.

## [0.33.0] - 2026-06-22

- **Feature: Unified Gamepad Support & WebHID Nintendo Integration**:
  - Implemented the `UniversalGamepadController` to unify and abstract input handling from both the native standard browser Gamepad API (Xbox, PlayStation, mapped generic controllers) and the WebHID API (Nintendo Joy-Cons via `joy-con-webhid`).
  - Added dynamic loader/import for `joy-con-webhid` to ensure compatibility with Node.js environments (vitest) and SSR setups.
  - Implemented automatic grouping of Left and Right Joy-Cons into a single logical `GamepadDevice` when both are active, mapping physical buttons (A/B/X/Y, triggers, system buttons, and sticks) to standard gamepad indices (0-17).
  - Integrated `UniversalGamepadController` into the core `Input` class, keeping keyboard and mouse inputs functional while seamlessly falling back to gamepad input.
  - Provided static accessors `Input.gamepadController` and `Input.requestJoyConConnection()` to trigger browser pairing dialogs in response to user gestures.
  - Wrote a comprehensive unit test suite in `tests/core/controllers/UniversalGamepadController.test.ts` to verify standard gamepad mapping, raw/mocked Joy-Con packet parsers, and connection management.
  - Adapted the **Gamepad Diagnostic Tool** (`public/tools/gamepad-test.html`) to support WebHID controller pairing and display the normalized outputs of the new unified gamepad system.

## [0.32.0] - 2026-06-22

- **Feature: Local Retro Screen Effects (RetroScreenMaterial)**:
  - Created a specialized `RetroScreenMaterial` designed to run locally on meshes (e.g. TV screens) to simulate custom camera/display artifacts.
  - Implemented two distinct retro simulation modes:
    - **1950s TV Mode**: Converts output to grayscale, renders horizontal scanlines, adds animated static snow/noise, simulates horizontal tearing/waves, and implements vertical rolling.
    - **19th Century Film Mode**: Applies grayscale and sepia tint, simulates random exposure flicker, adds vignette shadow, spawns dynamic dust/dirt spots, and renders jittering vertical hair scratches.
  - Fully compatible with WebGL2 (GLSL 300), WebGL1 (GLSL 100) fallbacks, and WebGPU (WGSL) rendering pipelines.
  - Added unit test suite in `tests/core/RetroScreenMaterial.test.ts` to verify default states, custom config options, and RenderManifest properties.

- **Cleanup: Removed Toxin/Slime Material**:
  - Removed obsolete `SlimeMaterial.ts` class and its registration in `MaterialType.ts`.
  - Re-routed toxin floor tiles (`"T"`) in the Yad Level Builder to use the more performant `LavaMaterial` instead.
  - Cleaned up unused slime assets and maps in `YadApp.ts` and `YadLevelBuilder.ts`.

## [0.31.0] - 2026-06-20

- **Feature: PBR Map Generator Tool (Client-Side Canvas Processing)**:
  - Created a browser-based utility at `public/tools/pbr-gen.html` in the style of the Splatter Generator.
  - Implemented real-time texture map generation from user-uploaded images or presets:
    - **Normal Map**: Computed using a discrete 3x3 Sobel kernel to obtain image gradients in X and Y, mapped into tangential coordinate space.
    - **Specular Map**: Derived using a sigmoidal-contrast S-curve function to raise highlight brightness without clipping.
    - **Ambient Occlusion Map**: Calculated using discrete Laplacian cavity operators (`4 * center - sum(neighbors)`) to map micro-crevices, combined with blurred height values.
    - **Roughness & Height Maps**: Generated from intensity mappings with adjustable box blur and inversion filters.
  - Added material presets (Default, Stone, Wood, Metal) for quick parameters adjustment.

- **Feature: Custom 3D Engine PBR Preview**:
  - Developed `PbrPreviewApp` in `src/tools/pbr-preview.ts` which extends `SmallWorld` to render a rotating mesh (Sphere, Cube, Torus, Plane) with custom-generated PBR textures in real-time.
  - Resolved initialization blank-screen bug: Replaced `display: none` tab toggles with absolute offscreen rendering (`position: absolute; left: -9999px`) to maintain client dimensions and avoid `NaN` camera aspect ratios during WebGL setup.
  - Added real-time property bindings (Normal strength, Metallic, Roughness slider updates) dynamically linked to the preview shader.

- **Infrastructure & Maintenance**:
  - Registered `pbrgen` in `vite.config.ts` rollup options to include the tool in production builds.
  - Satisfied TypeScript `strict: true` type safety by replacing `any` references with `GeometryDataInterface` and adding explicit return types.
  - Linked PBR Generator and Splatter Generator to the main index page (`public/index.html`).
  - Appended detailed mathematical sources and references to `REFERENCES.md`.

## [0.30.0] - 2026-06-19

- **Feature: Engine-Wide Integrated Gadget Inspector**:
  - Centralized the `GadgetInspector` overlay directly inside the `SmallWorld` base class.
  - Added `enableInspector` property to `EngineOptions` (defaulting to `true` globally since the panel starts hidden).
  - Used type-only compile-time imports combined with asynchronous runtime dynamic imports (`import()`) to avoid circular dependencies between the tools and the core scene graph.
  - Removed manual inspector boilerplate code (imports, properties, instantiation, and manual updates) from Showcase 1, Showcase 6, Showcase 10, and Showcase 13.

- **Feature: Configurable Bloom Highlight Color Tinting**:
  - Added a `color` property to `BloomElement` allowing developers to tint the glow of highlights.
  - Updated WebGPU and WebGL2 post-processing pipelines and fragment shaders to accept and multiply bloom highlights by the configured color.
  - Tinted the bloom highlights in Showcase 13 with a beautiful purple shade (`Color(1.2, 0.8, 1.6)`) to make the helmet's glimmers shine with a lila touch.

- **Bugfix: WebGPU Bloom Ghosting & Doubling (Kawase Filtering UV Alignment)**:
  - Resolved a bug where WebGPU bloom downsample (`BloomDownsample.frag.wgsl`) and upsample (`BloomUpsample.frag.wgsl`) shaders manually computed UV coordinates from `coord.xy` divided by the source texture size. Since downsampling viewports are half the size of the source texture, this restricted UV coordinates to `[0.0, 0.5]`, shifting the glowing highlights towards the bottom-right and accumulating a ghostly double image.
  - Refactored `PostProcess.vert.wgsl` to output correctly interpolated screen-space UV coordinates at `@location(0) uv: vec2f`.
  - Updated `BloomDownsample.frag.wgsl`, `BloomUpsample.frag.wgsl`, and `PostProcess.frag.wgsl` to accept and use the interpolated UV coordinates directly, eliminating offset distortions and resolving the helmet doubling artifact in Showcase 13.
  - Refactored equality comparisons in the modified WGSL shaders to use Yoda-style syntax (`1u == u.bloomEnabled`, etc.) in compliance with project guidelines.

## [0.29.0] - 2026-06-19

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

- **Bugfix: UniformPacker Console Warnings**:
  - Added `defaultValue: 0` to `u_useEnvMap`, `_padObj0`, `_padObj1`, and `_padObj2` in `StandardWebGPULayout`. These fields had no value and no fallback, causing repeated `[UniformPacker] Property '...' has no value and no default.` console warnings for every material that does not explicitly supply them (e.g. `SpriteMaterial`, `WireframeMaterial`, `BasicMaterial`, etc.).

- **Bugfix: CubeTexture Layout Detection for Non-Standard Dimensions**:
  - Replaced the exact pixel-perfect ratio comparisons in `CubeTexture.loadFrom` (e.g. `w * 3 === 4 * h`) with rounded integer checks (`Math.round(w / 4) === Math.round(h / 3)`). Images whose dimensions don't divide evenly — such as `skybox.png` at 245×184 px, which is a horizontal cross layout off by a single pixel — are now correctly identified instead of silently falling back to the "use same image 6 times" path.
  - All face-size calculations during slicing (`STRIP_HORIZONTAL`, `STRIP_VERTICAL`, `GRID_3X2`, `CROSS_HORIZONTAL`, `CROSS_VERTICAL`) now use `Math.round` to produce integer pixel coordinates, preventing sub-pixel boundary errors in `createImageBitmap`.
  - Resolves the WebGPU validation error `texture width (245) and height (184) are not equal` that caused an `[Invalid TextureView]` → `[Invalid BindGroup]` → `[Invalid CommandBuffer]` cascade and prevented the skybox from rendering in Showcase 7 and Showcase 13.

- **Asset: Unified Skybox Source**:
  - Both Showcase 7 and Showcase 13 now load their skybox from `/resources/showcases/13/skybox.png` instead of the previously referenced `/resources/showcases/7/skybox-1.jpg`.

## [0.27.0] - 2026-06-16

- **PBR & Image-Based Lighting (IBL)**:
  - **Environment Map Reflections**: Resolved missing PBR reflections by ensuring `u_useEnvMap` is correctly included in the `StandardWebGPULayout` and evaluated by the `WebGL2Renderer`.
  - **GLTF Spec Compliance**: Fixed incorrect texture channel sampling in `Standard.frag.glsl`. The engine now correctly reads the Blue channel (`.b`) for metallic and Green channel (`.g`) for roughness, strictly adhering to the glTF 2.0 `metallicRoughnessTexture` standard.
  - **Skybox Architecture**: Updated the legacy `Skybox.vert.glsl` and `Skybox.frag.glsl` shaders to seamlessly integrate with the modern Uniform Buffer Object (`GlobalUniforms`) architecture using `[BASE_VERTEX_HEADER]`.
  - **Texture Binding State**: Corrected `WebGL2Renderer` to properly evaluate and bind `CubeTexture` instances to `TEXTURE_CUBE_MAP` targets instead of blindly falling back to `TEXTURE_2D`, preventing silent `GL_INVALID_OPERATION` conflicts.

## [0.26.0] - 2026-06-15

- **Inspector & UI Integration**:
  - **Gadget Inspector**: Introduced `GadgetInspector` (powered by `tweakpane`), a decoupled UI overlay module for real-time scene debugging and property tweaking.
  - **Raycaster & 3D Picking**: Implemented mathematical `Ray` and `Raycaster` classes leveraging slab-method AABB intersections. Converts 2D NDC mouse coordinates into 3D world rays for highly performant object selection.
  - **Dynamic Highlighting & Bounds**: Picked objects are visually marked with a neon-cyan wireframe `BoundingBox`. Bounding volumes are lazily computed on-the-fly during raycasting to guarantee selection works perfectly in minimal scenes (without Octrees).

## [0.25.0] - 2026-06-15

- **Post-Processing Architecture & Effects**:
  - **Modular Post-Processing Group**: Decoupled post-processing configuration from renderers. Introduced `PostProcessingGroup` containing modular elements (`ToneMappingElement`, `VignetteElement`, `GrainElement`) to dynamically assemble the final Uber-Shader pass.
  - **Advanced Vignette Math**: Completely rewrote the Vignette shader math to decouple the radius (`offset`) from the intensity (`darkness`).
  - **Superellipse Vignette Shapes**: Added a new `roundness` parameter to the Vignette effect. Users can now seamlessly transition between perfect elliptical vignettes and rounded rectangular ("TV-screen") vignettes.
  - **Film Grain**: Implemented hardware-accelerated animated Film Grain. Utilizes a time-seeded Hash12 generator directly within the fragment shader to avoid floating-point precision loss (`sin()` breakdown) during long sessions.
  - **WebGPU Transparent Capture Fix**: Resolved "Invalid CommandBuffer" errors in WebGPU by ensuring the HDR render target explicitly requests `GPUTextureUsage.COPY_SRC` so transparent passes can correctly capture the opaque scene behind them.

## [0.24.1] - 2026-06-15

- **Mathematical Consistency & WebGPU Z-Clipping Fix**:
  - Validated `Matrix4`, `Quaternion`, and `Vector3D` against standard Right-Handed, Column-Major OpenGL conventions as referenced in the architecture guidelines (David Nadlinger).
  - Addressed a fundamental architectural mismatch where `Matrix4.perspective` natively returns `[-1, 1]` Z depth mapping (correct for OpenGL), causing WebGPU (which natively requires `[0, 1]`) to clip geometry in the near-half of the view frustum.
  - Implemented `Matrix4.ZO_CORRECTION`, a zero-to-one correction matrix, and applied it globally inside the `WebGPURenderer` to the view-projection matrix prior to shader upload.
  - Removed localized, incomplete `z`-correction hacks from `.wgsl` shaders, universally resolving frustum clipping issues for all materials, pipelines, and wireframes in WebGPU while maintaining math library independence.

## [0.24.0] - 2026-06-15

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

- **Core Architecture: Behavior System Refactoring**:
  - Transformed algorithmic behaviors (`PulsatingBehavior`, `FlickerBehavior`, `ProximitySensorBehavior`) into generic, callback-driven components (`onUpdate: (val, target) => void`). This drastically enhances composability by fully decoupling complex state-machine logic (timers, noise functions, random cuts) from specific 3D properties (emissive intensity, scale, transforms).
  - Replaced the hardcoded `EmissivePulsateBehavior` with the fully agnostic `PulsatingBehavior`.
  - Generalized `LightFlickerBehavior` into `FlickerBehavior`, retaining the organic and hard-cut algorithms while allowing attachment to any object property.
  - Cleaned up outdated mechanics (`ProceduralLiquidGenerator`, `UVScrollBehavior`) to maintain architectural simplicity.
- **Testing & Quality Assurance**:
  - Implemented 3 extensive new test suites (`PulsatingBehavior.test.ts`, `FlickerBehavior.test.ts`, `ProximitySensorBehavior.test.ts`) covering simulated frame runtimes to strictly verify mathematical bounds, linear interpolations, and phase transitions.
  - Total test suite now spans 66 rigorously passing unit tests across Mathematics, Materials, Rendering, and Behaviors.
- **Bugfixes & Rendering Fixes**:
  - Fixed a critical "disappearing light cone" bug in Showcase 12. Correctly identified and resolved a situation where 4 decorative Porthole-Spotlights entirely consumed the engine's internal WebGPU SpotLight limit (`sLights[4]`), forcing the main shadow-casting spotlight to be silently dropped by the forward renderer.
  - Adjusted Showcase 12 to rely on `emissiveIntensity` pulsation on the Portholes instead of spawning hidden Spotlights, recovering crucial light slots and saving performance.

## [0.21.00] - 2026-06-11

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

- **Housekeeping**:
  - Removed **Showcase 11: Baptismal Fonts (Fluid Simulation)** and **Showcase 12: Controls Verification** as requested.
  - Cleaned up entry points in `vite.config.ts` and updated the main example index.

## [0.20.01] - 2026-05-10

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

- **Geometry & Visual Enhancements**:
  - Introduced `Disk` geometry with concentric rings, providing superior tessellation for circular surfaces that require vertex displacement.
  - Fixed "square lava" issue in Showcase 10 by replacing the rectangular plane with a high-fidelity `Disk` geometry, ensuring the lava fits perfectly within the circular fire bowls.
  - Refined `LavaMaterial` application to work seamlessly with the new disk tessellation.

## [0.19.08] - 2026-04-27

- **Feature: Configurable Input Modes**:
  - Introduced `inputMode` to `EngineConfig` to toggle between different control schemes.
  - Implemented **Tank-Mode** as the new default (`inputMode: "tank"`), where A/D keys rotate the object or camera.
  - Preserved **Strafe-Mode** (`inputMode: "strafe"`) for modern FPS-style lateral movement.
  - Updated `FPSController` and `WASDController` to dynamically switch logic based on the configured mode.
  - Added automatic `inputMode` injection into controllers via the `Application` base class.

## [0.19.07] - 2026-04-27

- **Controller & Input Refinement**:
  - Unified **WASD control scheme** across all examples: **A/D** now consistently performs horizontal rotation (turning) instead of strafing.
  - Fixed movement vector calculation in `FPSController` to ensure forward movement (W) correctly follows the current look direction after rotation.
  - Standardized rotation directions for `Object3D` and `Camera`: **D** key now consistently rotates to the right across all controllers (`FPS`, `WASD`, `Orbit`, `Yad`).
  - Corrected mouse horizontal inversion in `FPSStrategy` to match the new keyboard rotation logic.
  - Added keyboard rotation support to `OrbitController`.

## [0.19.06] - 2026-04-27

- **Mathematical Integrity & Regression Testing**:
  - Added a new **Mathematical Integrity** section to `AGENTS.md` to enforce the stability of core mathematical logic and coordinate system consistency.
  - Implemented a dedicated regression test suite (`tests/math/RegressionIntegrity.test.ts`) to verify orientation (lookAt), winding order (geometry), and Euler conventions (YXZ).
- **Developer Experience**:
  - Introduced a **Makefile** with "best practice" targets (`help`, `install`, `dev`, `build`, `test`, `lint`, `format`, `clean`) to streamline project management and automate dependency checks.

## [0.19.05] - 2026-04-24

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

- **Testing Infrastructure**:
  - Integrated **Vitest** for high-performance unit testing.
  - Implemented a dedicated `tests/` directory following "Separation of Concerns" (mirrored `src/` structure).
  - Added comprehensive test suites for `Vector3D`, `Matrix4`, `Quaternion`, and `MathUtils`.
- **Bugfixes**:
  - **Matrix Math**: Discovered and fixed a critical bug in `Matrix4.invert` through automated testing. The inversion logic is now 100% compliant with industry standards for column-major matrices.
  - **Vector Math**: Added `min()` and `max()` utility methods to `Vector3D`.

## [0.19.03] - 2026-04-21

- **Stability & Polishing**:
  - Validated world-space bounding volume transformations across all geometries.
  - Optimized Showcase 6 as a "Geometry Showcase" with optimized frustum culling.
  - Ensured all internal engine events and matrix updates are synchronized before spatial tree generation.

## [0.19.02] - 2026-04-21

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

- **Stability & Code Quality Pass**:
  - Fixed critical `setInt` bug in `WebGL2UniformBuffer` causing corrupted lighting data.
  - Project-wide cleanup of `any` types and linting errors (missing return types, explicit interfaces).
  - Refactored `FPSController` constructor to use a configuration object (adhering to @AGENTS.md).
  - Standardized property naming (`wp`, `n`, `uv`) in all WebGPU shaders.

## [0.19.00] - 2026-04-21

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

- **Performance & Memory Optimization**:
  - **Object Pooling**: Introduced `MathPool` for `Vector3D`, `Matrix4`, and `Quaternion` to drastically reduce GC pressure in hot paths.
  - **Inline Cache Stabilization**: Implemented `RenderManifest` caching in all materials to maintain stable hidden classes and avoid frequent allocations during rendering.
  - **Hot Path Refactoring**: Replaced `.forEach` with optimized `for` loops in all renderers, frustum culling, and spatial partitioning (Octree) logic.
  - **Scratch Buffer Usage**: Added pre-allocated scratch matrices and typed arrays in renderers to eliminate per-object allocations.
- **Project-Wide Standards**:
  - Standardized all value comparisons to **Yoda-style** (`value === variable`) for consistency and safety.
  - Improved JSDoc documentation for core interfaces (`Vector`, `Renderer`).
- **Core Engine Fixes & Utilities**:
  - **PointerLock Fix**: Fixed an issue where the camera would still follow the mouse after exiting PointerLock via ESC.
  - **Collision Visualizer**: Added `CollisionVisualizer` utility to render wireframe bounding boxes and spheres for physics debugging.
  - **WebGL2 Support**: Added `WebGL2FrameBuffer` class to support future post-processing passes.
- **Showcase 10 Improvements**:
  - Enhanced Lava animation with multi-layered wandering noise for flowing wave effects.
  - Added organic pulsing for lava light intensity and color (heat glow effect).
  - Improved wave damping at geometry edges for a cleaner visual look.

## [0.15.06] - 2026-04-15

- **Dynamic Geometry Support**:
  - Added `needsUpdate` flag to `GeometryDataInterface` to allow manual buffer re-uploads.
  - Implemented `Mesh.update()` (WebGL) and buffer write logic (WebGPU) to support real-time vertex displacement.
  - Updated all renderers (WebGL 1, WebGL 2, WebGPU) to check for geometry updates before each draw call.
- **Improved Lava Animation**: Refactored Showcase 10 with SimplexNoise-based bubbling lava and individual offsets per fire bowl.

## [0.15.05] - 2026-04-15

- **TypeScript & Linting Fixes**:
  - Removed unused `TerrainMaterial` import in `WebGL2Renderer` to fix `TS6133` error during declaration file generation.
  - Standardized ESLint ecosystem on the latest stable versions within the v9/v8 range (`eslint` `^9.39.4`, `typescript-eslint` `^8.58.2`) to ensure compatibility with `eslint-plugin-import` while maximizing stability.
  - Updated all core development tools (`@microsoft/api-extractor`, `@types/node`, `globals`, `prettier`, `simplex-noise`, `terser`) to their latest stable versions.
- **Build Optimization**:
  - Improved `vite-plugin-dts` performance by disabling `rollupTypes`, significantly reducing build time.
  - Fixed Vite warning by removing the deprecated `compact` option from `rollupOptions.output` in `vite.lib.config.ts`.

## [0.15.04] - 2026-04-15

- **Unified Texture Flip Handling**: Centralized vertical flip logic in `AssetManager` via `createImageBitmap`, ensuring consistent orientation across WebGL and WebGPU while removing redundant renderer-level flips.
- **Enhanced Configuration Options**: Added optional `flipY` control to `TextureOptions` and `ImageLoader`, defaulting to `false` (web-standard top-down) to correctly support skydomes and other top-down textures.
- **Architectural Loader Overhaul**: Refactored all loaders (`ImageLoader`, `ObjLoader`, `MtlLoader`, `SkyboxLoader`, `TextLoader`) to use standardized Configuration Objects (`LoaderOptions`, `ImageLoaderOptions`) in their constructors, improving maintainability and adhering to `AGENTS.md` standards.
- **OBJ & MTL Path Consistency**: Improved path resolution in `ObjLoader` to automatically pass its base path to the internal `MtlLoader` for more reliable model loading.

## [0.15.03] - 2026-04-14

- **Robust WebGPU Rendering**:
  - Major update to the **WebGPU Renderer** to implement defensive material property application, matching the reliability of the WebGL backends.
  - Improved WebGPU shader stability with fallback logic for missing normal/specular maps and minimum ambient visibility.
- **Model & Texture Fixes**:
  - **Kenney Car (Showcase 3/4)**: Fixed "black/gray car" issue by removing redundant UV flips in `ObjLoader` and enforcing `NEAREST` filtering in `MtlLoader` to prevent color bleeding on small texture atlases.
  - **Skydome (Showcase 9)**: Corrected upside-down texture by removing manual UV flipping in `Sphere` geometry, ensuring alignment with global renderer standards.
- **Renderer Property Handling**: Standardized the use of `Float32Array` for all material color properties (`u_color`, `u_specColor`) in manifests, improving performance and type safety across all rendering APIs.
- **Material Enhancements**: All core materials (`Basic`, `Phong`, `Lambert`, `Sprite`, `Terrain`, `World`, `Wireframe`, `Skybox`) now correctly expose UV transformation properties in their render manifests.

## [0.15.02] - 2026-04-14

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

- **Texture Animation**: Added support for UV offset animation in the update loop (showcased with flowing lava in Showcase 10).
- **AssetManager Fix**: Improved URL resolution to correctly handle root-relative paths (starting with `/`) even when no `baseUrl` is set.
- **Improved Path Handling**: Standardized on absolute paths for core assets like shaders and global configuration.
- **Canvas ID Synchronization**: Unified `canvasId` across `small-world.json` and all example HTML files (standardized to `SmallWorld`).
- **Bugfixes**: Fixed 404 errors for shaders and config files when running examples from subdirectories.

## [0.14.0] - 2026-04-13

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

- Refactor and improve shader handling

## [0.13.04] - 2026-04-03

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

- Clean up log-messages

## [0.13.02] - 2026-04-02

- Add missing geometries: Cube, Plane, and a complete Circle
- Fix and improve WASD movement and pointer lock in Demo 6
- Add comprehensive set of standard web colors (CSS/X11) to Color class
- Add color space conversions: HSL to/from Color and HSV to/from Color
- Refactor RendererFactory and EngineConfig for robust renderer switching
- Fix WebGL context loss issue when switching renderers dynamically

## [0.12.04] - 2026-04-01

- Implement renderer configuration in small-world.json to support context attributes
- Update Renderer interface to accept optional attributes during initialization
- Pass renderer-specific attributes to WebGL1, WebGL2 and WebGPU contexts

## [0.12.03] - 2026-03-31

- Centralize Input.init() in Application.ts
- Refine keyboard handling in AbstractDemo to use Input.isPressed(Keys.SHIFT_L)
- Fix: Add WebGL context check to prevent 'createTexture' of null error when switching renderers

## [0.12.02] - 2026-03-31

- Add keyboard event handling to AbstractDemo
- Implement renderer switching (WebGL1, WebGL2, WebGPU) via SHIFT+1/2/3 in all showcasess

## [0.12.01] - 2026-03-29

- Optimize it: Code hygiene

## [0.12.01] - 2026-03-29

- Optimize it: Constructor options

## [0.12.00] - 2026-03-28

- Optimize it: Positional parameters vs config options
- Update README

## [0.11.14] - 2026-03-26

- Implement Camera Effects (Shake, Flash) with Factory and Enums
- Add effect support to Camera class and Application loop
- Refine Smooth Camera Strategy
- Apply AGENTS.md

## [0.11.13] - 2026-03-26

- Implement camera constraints

## [0.11.12] - 2026-03-26

- Implement Sprite and SpriteMaterial
- Add billboard rendering logic to WebGL1, WebGL2 and WebGPURenderer
- Enable alpha blending for transparent sprites in all renderers

## [0.11.11] - 2026-03-25

- Apply AGENTS.md
- Start with nice 2D features
- Reorganize code

## [0.11.10] - 2025-03-25

- AI-based rework III
- Extend AGENTS.md
- Extend terrain generation
- Code quality

## [0.10.16] - 2025-03-19

- AI-based rework II
- Code quality

## [0.10.15] - 2025-03-18

- AI-rework
- Code quality

## [0.10.14] - 2025-03-18

- Introduce AGENTS.md
- Code quality
- Introduce event management interface

## [0.10.13] - 2025-03-17

- Demo 4
- Add README.md

## [0.10.12] - 2025-03-16

- Demo 3: Load and display \*.OBJ

## [0.10.11] - 2025-03-15

- Demo 2: WASD and camera (pointer lock)

## [0.10.10] - 2025-03-15

- Prepare more than a single feature showcases

## [0.10.9] - 2025-03-15

- More code refactor and version bump
- Respect linting errors and warnings
- Some sort of reset. Start with Demo1

## [0.10.6] - 2025-03-13

- Crush the code

## [0.10.5] - 2025-03-13

- Introduce terrain with heightmap

## [0.10.4] - 2025-03-13

- Improve Enums (replace by frozen JS objects)

## [0.10.3] - 2025-03-13

- Implement AreaLight

## [0.10.2] - 2025-03-12

- Renderer refactoring

## [0.10.1] - 2025-03-12

- Improve linting and formatting

## [0.10.0] - 2025-03-12

- Re-work /dist, TS bundling etc.

## [0.9.4] - 2025-03-12

- Bug fixing due to the last refactorings

## [0.9.3] - 2025-03-12

- Bug fixing; Fasten class type checks

## [0.9.2] - 2025-03-11

- Fix WebGPU texture bug

## [0.9.1] - 2025-03-11

- Add MTL loader; Rework material checks (speed improvements)

## [0.9.0] - 2025-03-11

- Even more refactoring; Event system; Asset loader pipelines

## [0.8.59] - 2025-03-11

- Fix Sphere geometry generation

## [0.8.58] - 2025-03-11

- Reorganize loaders; Add .OBJ loader

## [0.8.57] - 2025-03-11

- Extend HUD data

## [0.8.56] - 2025-03-11

- Add and use vector normalization
- Add code collection script

## [0.8.55] - 2025-03-11

- Improve vectors
- Implement SkyBox

## [0.8.54] - 2025-03-10

- Implement basic texture and assessment management stuff
- Add new geometries (pyramid, torus and cylinder).
- Some code improvements
- Re-work light system

## [0.8.50] - 2025-03-10

- Re-work camera system (strategy pattern plus factor)
- Re-work showcases1.ts
- Add FPS camera strategy

## [0.8.47] - 2025-03-10

- Changelog

## [0.8.46] - 2025-03-10

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

# Changelog

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
  - Optimized Example 6 as a "Geometry Showcase" with optimized frustum culling.
  - Ensured all internal engine events and matrix updates are synchronized before spatial tree generation.

## [0.19.02] - 2026-04-21

- **Frustum & Bounding Volume Overhaul**:
  - Implemented `BoundingVolume.transform(matrix)` to support world-space culling and octree placement.
  - Fixed "disappearing objects" bug by ensuring `Object3D.computeBounds()` correctly transforms local geometry bounds into world coordinates.
  - Corrected `Frustum` plane extraction logic for column-major matrices (Near/Far plane flip).
  - Renamed Example 6 to **"Geometry Showcase"** and removed collision test walls.
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
  - Refactored Example 10 to utilize the new `LavaMaterial`, eliminating all legacy CPU-based noise logic and improving visual quality significantly.

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
  - **Example Restructuring**: Reorganized the project structure by moving example TypeScript files to `src/examples/` and HTML files to `public/examples/` for better build integration and cleaner separation of concerns.
  - **Smart Camera Updates**: Integrated `updateViewMatrix()` directly into `Camera.update()` to ensure every strategy or effect update is immediately reflected in the render.
- **Visual & Performance Tuning**:
  - **Example 10 Polish**: Mellowed the pointedness of bubbling lava animation by 50% and slowed down the light pulsing speed by 30% via a new `_lightPulseSpeed` constant for a more organic feel.
  - **Build System**: Added `example10` to the Vite production build configuration.

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
- **Example 10 Evolution**:
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
- **Example 10 Improvements**:
  - Enhanced Lava animation with multi-layered wandering noise for flowing wave effects.
  - Added organic pulsing for lava light intensity and color (heat glow effect).
  - Improved wave damping at geometry edges for a cleaner visual look.

## [0.15.06] - 2026-04-15

- **Dynamic Geometry Support**:
  - Added `needsUpdate` flag to `GeometryDataInterface` to allow manual buffer re-uploads.
  - Implemented `Mesh.update()` (WebGL) and buffer write logic (WebGPU) to support real-time vertex displacement.
  - Updated all renderers (WebGL 1, WebGL 2, WebGPU) to check for geometry updates before each draw call.
- **Improved Lava Animation**: Refactored Example 10 with SimplexNoise-based bubbling lava and individual offsets per fire bowl.

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
  - **Kenney Car (Example 3/4)**: Fixed "black/gray car" issue by removing redundant UV flips in `ObjLoader` and enforcing `NEAREST` filtering in `MtlLoader` to prevent color bleeding on small texture atlases.
  - **Skydome (Example 9)**: Corrected upside-down texture by removing manual UV flipping in `Sphere` geometry, ensuring alignment with global renderer standards.
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

- **Texture Animation**: Added support for UV offset animation in the update loop (showcased with flowing lava in Example 10).
- **AssetManager Fix**: Improved URL resolution to correctly handle root-relative paths (starting with `/`) even when no `baseUrl` is set.
- **Improved Path Handling**: Standardized on absolute paths for core assets like shaders and global configuration.
- **Canvas ID Synchronization**: Unified `canvasId` across `small-world.json` and all example HTML files (standardized to `SmallWorld`).
- **Bugfixes**: Fixed 404 errors for shaders and config files when running examples from subdirectories.

## [0.14.0] - 2026-04-13

- **AssetManager**: Introduced a centralized manager for loading and caching assets (images, text) with global progress tracking, base URL support, and custom headers.
- **Normal & Specular Maps**: Added support for normal maps and specular maps in `PhongMaterial` and `LambertMaterial` across all renderers.
- **WorldMaterial**: New material type using triplanar mapping for seamless, world-space textures—ideal for terrain, rocks, and large structures.
- **Skydome**: Added `Skydome` implementation for immersive 360-degree backgrounds (see Example 9).
- **Major Renderer Rework**: Significant architectural updates to WebGL1, WebGL2, and WebGPU renderers for more modular and efficient shader handling.
- **Spatial Partitioning & Optimization**: Implemented `Octree` for efficient spatial querying and `FrustumCuller` to skip rendering objects outside the camera's view.
- **Enhanced Texture Quality**: Added support for anisotropic filtering and improved mipmap generation.
- **New Examples**:
  - `Example 8`: A classic 2.5D Jump & Run demonstrating physics, collision detection, and sprite-based player movement.
  - `Example 9`: Immersive environment with a Skydome and FPS-style camera.
  - `Example 10`: Advanced scene composition with fire bowls, point lights, and materials using normal/specular maps.
- **Physics**: Basic AABB collision detection and gravity implementation (showcased in Example 8).

## [0.14.00] - 2026-04-03

- Refactor and improve shader handling

## [0.13.04] - 2026-04-03

- Fix PointerLocked issues
- Fix Skybox (added support for 4x3/3x4 cross layouts in `CubeTexture`)
- Rename all Demos to Examples
- Move AbstractDemo to `src/core/example/AbstractExample`
- Fix Example 7 canvas initialization error (ID mismatch)
- Add Example 7 with Skybox, infinite floor, and FPS controls
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
- Implement renderer switching (WebGL1, WebGL2, WebGPU) via SHIFT+1/2/3 in all demos

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

## [0.11.10] - 2026-03-25

- AI-based rework III
- Extend AGENTS.md
- Extend terrain generation
- Code quality

## [0.10.16] - 2026-03-19

- AI-based rework II
- Code quality

## [0.10.15] - 2026-03-18

- AI-rework
- Code quality

## [0.10.14] - 2026-03-18

- Introduce AGENTS.md
- Code quality
- Introduce event management interface

## [0.10.13] - 2026-03-17

- Demo 4
- Add README.md

## [0.10.12] - 2026-03-16

- Demo 3: Load and display \*.OBJ

## [0.10.11] - 2026-03-15

- Demo 2: WASD and camera (pointer lock)

## [0.10.10] - 2026-03-15

- Prepare more than a single feature demo

## [0.10.9] - 2026-03-15

- More code refactor and version bump
- Respect linting errors and warnings
- Some sort of reset. Start with Demo1

## [0.10.6] - 2026-03-13

- Crush the code

## [0.10.5] - 2026-03-13

- Introduce terrain with heightmap

## [0.10.4] - 2026-03-13

- Improve Enums (replace by frozen JS objects)

## [0.10.3] - 2026-03-13

- Implement AreaLight

## [0.10.2] - 2026-03-12

- Renderer refactoring

## [0.10.2] - 2026-03-12

- Improve linting and formatting
- Re-work /dist, TS bundling etc.
- Bug fixing due to the last refactorings
- Bug fixing
- Bug fixing; Fasten class type checks
- Fix WebGPU texture bug
- Add MTL loader; Rework material checks (speed improvements)
- Even more refactoring; Event system; Asset loader pipelines
- Fix Sphere geometry generation
- Reorganize loaders; Add .OBJ loader
- Extend HUD data
- Add and use vector normalization
- Add code collection script
- Improve vectors
- Implement SkyBox
- Implement basic texture and assessment management stuff
- Add new geometries (pyramid, torus and cylinder).
- Some code improvements
- Re-work light system
- Re-work camera system (strategy pattern plus factor)
- Re-work cube-demo1.ts
- Add FPS camera strategy
- Changelog
- Add changelog generation script
- Add SpotLight and fix all ESLint any-types
- Code style; Add ESLint
- Refactoring HUD template
- Refactoring code; Implementing rotation
- Implementing point light and ambient light
- Start implementing light
- Start implementing materials
- Implement frustrum calculation
- Implement geometry caching
- Set version 0.8.30
- Clean up
- Dynamic version display; Re-introduce /dist
- Fix of the day
- Major code and math base improvements
- Code style;
- Improve HUD; Code style; Collision detection improvements
- Improve HUD; Code style
- Enrich Vector2D methods with essential methods for math, collision detection etc.
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

## [0.10.1] - 2026-03-12

- Improve linting and formatting

## [0.10.0] - 2026-03-12

- Re-work /dist, TS bundling etc.

## [0.9.4] - 2026-03-12

- Bug fixing due to the last refactorings

## [0.9.3] - 2026-03-12

- Bug fixing; Fasten class type checks

## [0.9.2] - 2026-03-11

- Fix WebGPU texture bug

## [0.9.1] - 2026-03-11

- Add MTL loader; Rework material checks (speed improvements)

## [0.9.0] - 2026-03-11

- Even more refactoring; Event system; Asset loader pipelines

## [0.8.59] - 2026-03-11

- Fix Sphere geometry generation

## [0.8.58] - 2026-03-11

- Reorganize loaders; Add .OBJ loader

## [0.8.57] - 2026-03-11

- Extend HUD data

## [0.8.56] - 2026-03-11

- Add and use vector normalization
- Add code collection script

## [0.8.55] - 2026-03-11

- Improve vectors
- Implement SkyBox

## [0.8.54] - 2026-03-10

- Implement basic texture and assessment management stuff
- Add new geometries (pyramid, torus and cylinder).
- Some code improvements
- Re-work light system
- Re-work camera system (strategy pattern plus factor)
- Re-work cube-demo1.ts
- Add FPS camera strategy
- Changelog
- Add changelog generation script
- Add SpotLight and fix all ESLint any-types
- Code style; Add ESLint
- Refactoring HUD template
- Refactoring code; Implementing rotation
- Implementing point light and ambient light
- Start implementing light
- Start implementing materials
- Implement frustrum calculation
- Implement geometry caching
- Set version 0.8.30
- Clean up
- Dynamic version display; Re-introduce /dist
- Fix of the day
- Major code and math base improvements
- Code style;
- Improve HUD; Code style; Collision detection improvements
- Improve HUD; Code style
- Enrich Vector2D methods with essential methods for math, collision detection etc.
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

## [0.8.54] - 2026-03-10

- Implement basic texture and assessment management stuff
- Add new geometries (pyramid, torus and cylinder).
- Some code improvements
- Re-work light system

## [0.8.50] - 2026-03-10

- Re-work camera system (strategy pattern plus factor)
- Re-work demo1.ts
- Add FPS camera strategy

## [0.8.47] - 2026-03-10

- Changelog

## [0.8.46] - 2026-03-10

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

# Changelog

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

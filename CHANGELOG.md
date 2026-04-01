# Changelog

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

# Sources & References

This document serves to record external sources, algorithms, mathematical derivations, and inspirations that flowed into the development of **small-world**.

## Geometry & Mathematics

### `Gear`

- **File:** `src/geometry/Gear.ts`
- **Source:** [Rechneronline - Zahnrad berechnen](https://rechneronline.de/pi/zahnrad.php)
- **Usage:** The underlying formulas for generating isometric trapezoidal teeth, pitch circles, and radii for the 3D gear were taken from this tool and adapted.

### Matrix and Quaternion Derivations (General Reference)

- **File:** Mainly affects `src/math/Matrix4.ts`, `src/math/Quaternion.ts`, `src/math/Matrix3.ts` as well as cameras/projections.
- **Source:** [Mathematische Grundlagen der 3D-Grafik (David Nadlinger, 2008/2009)](https://klickverbot.at/science/3d-mathematics/3d-mathematics.pdf)
- **Usage:** An excellent and compact German summary of the underlying 3D mathematics. Contains derivations for rotations (avoiding gimbal lock via quaternions), view matrix, and projection matrix (incl. frustum and clipping). Serves as a general reference for the engine's math, since `small-world` uses the OpenGL convention (right-handed system, column vectors) as described there.

### Introduction to 3D Graphics and Rendering Pipeline (David Scherfgen)

- **File:** Affects the general architecture of the engine (e.g., lighting, shaders, geometry buffers, cameras).
- **Source:** [Einführung in die 3D-Grafik (David Scherfgen)](https://www.david-scherfgen.de/downloads/neues-buch-kapitel-3d-grafik.pdf)
- **Usage:** This book chapter provides a phenomenal overview of the entire rendering pipeline (from vector to pixel on the screen). It details topics such as the Phong lighting model (Ambient, Diffuse, Specular), shading types (Flat, Gouraud, Phong), texturing (MIP-mapping, Anti-Aliasing), and the Z-Buffer. **Note:** In contrast to `small-world` (OpenGL convention), this script primarily uses the Direct3D convention (left-handed coordinate system, row vectors).

### Fast, Minimum Storage Ray/Triangle Intersection (Möller-Trumbore)

- **File:** `src/physix/Raycaster.ts`
- **Authors/Gurus:** Tomas Möller and Ben Trumbore (1997)
- **Source:** [Fast, Minimum Storage Ray-Triangle Intersection](https://cadxfem.org/inf/Fast%20MinimumStorage%20RayTriangle%20Intersection.pdf)
- **Usage:** This is the mathematical gold standard for ray-triangle intersection testing without requiring precomputed plane equations. Used in the `Raycaster` to provide mathematically exact, pixel-perfect polygon picking of 3D objects, directly against their `GeometryDataInterface` vertices after accelerating the queries with `Octree` AABB bounding box checks.

### Octree Spatial Partitioning

- **File:** `src/core/Octree.ts`
- **Authors/Gurus:** Donald Meagher (1980)
- **Source:** [Octree Encoding: A New Solid Representation for Computer Graphics](https://rpi.edu/)
- **Usage:** Used as the fundamental spatial acceleration structure for the engine. It recursively divides 3D space into eight octants, allowing collision detection, frustum culling, and raycasting (picking) to operate in $O(\log n)$ time instead of $O(n)$, drastically improving performance in scenes with many objects.

### `AxesHelper` (3D Cartesian Coordinate System Visualization)

- **File:** `src/core/helpers/AxesHelper.ts`
- **Source:** Standard Computer Graphics RGB Coordinate Convention ($+X$ = Red, $+Y$ = Green, $+Z$ = Blue) and OpenGL Right-Handed System.
- **Usage:** Visualizes local and world coordinate systems using neon unlit cylinder shafts, cone arrowheads, and camera-facing billboarded text labels (`Sprite` + `TextTexture`). Integrated into `GadgetInspector` to visually track scene origin and animated bone transforms in real time.

## Physics & Collision Detection

### Gravitational Lensing (Black Hole Shadow & Einstein Ring)

- **File:** `src/core/materials/shaders/PostProcess.frag.glsl`, `showcases/21/showcase.ts`
- **Inspiration:** Dr. Katie Bouman, Dr. Sara Issaoun, and the Event Horizon Telescope (EHT) Collaboration (2019, 2022)
- **Source:** First imaging of M87* and Sagittarius A* (Sgr A*).
- **Usage:** The visual representation of the Super Massive Black Hole in Showcase 21 is profoundly inspired by the groundbreaking imaging work of the EHT team. The custom post-processing shader approximates the gravitational lensing, deflecting light rays near the simulated event horizon to recreate the iconic asymmetric glowing ring and the absolute black shadow at its core.


### Sequential Impulse & Rigid Body Dynamics

- **Authors/Gurus:** Erin Catto (Creator of Box2D)
- **Usage:** Essential concepts for resolving constraints, joints, and stable resting contacts using sequential impulses, which heavily influence how we stabilize physics loops and design our collision impulse resolution.

### Fixed-Timestep Render Interpolation

- **File:** `src/physix/PhysicsSystem.ts`
- **Authors/Gurus:** Glenn Fiedler (Gaffer On Games)
- **Source:** ["Fix Your Timestep!"](https://gafferongames.com/post/fix_your_timestep/)
- **Usage:** The canonical explanation of why a fixed-timestep physics accumulator needs to hand rendering an interpolated blend (`alpha = accumulator / fixedTimeStep`) between the two most recent physics states, rather than snapping to the latest completed step. Used as the basis for decoupling `small-world`'s variable render framerate from its fixed physics tick, eliminating visual stutter/judder.

### Real-Time Collision Detection

- **Authors/Gurus:** Christer Ericson
- **Usage:** The ultimate reference for implementing the Separating Axis Theorem (SAT), efficient intersection testing, and robust handling of floating-point inaccuracies in spatial math.

### Advanced Collision Detection and Simulation

- **Authors/Gurus:** Ming C. Lin and Nadia Magnenat Thalmann
- **Usage:** Prof. Ming C. Lin is a pioneer in the field of collision detection (I-COLLIDE, SWIFT, V-COLLIDE). Her foundational research in bounding volume hierarchies and fast continuous collision detection provided the theoretical groundwork for modern rigid body physics. Nadia Magnenat Thalmann's pioneering work in simulating virtual humans and deformable objects is a profound inspiration for expanding interactive 3D systems beyond simple rigid bodies.

### Physics-based Character Animation

- **Authors/Gurus:** Jessica Hodgins
- **Usage:** Her foundational research in integrating physical simulations with character animation serves as an ongoing inspiration for adding complex kinematics and physics-driven behaviors to game engines.

## Game Feel & Player Experience

### Trauma-Based Camera Shake

- **File:** `src/core/cameras/effects/ShakeEffect.ts`
- **Authors/Gurus:** Squirrel Eiserloh
- **Source:** ["Math for Game Programmers: Juicing Your Cameras With Math"](https://gdcvault.com/play/1023146/Math-for-Game-Programmers-Juicing) — GDC 2016
- **Usage:** Drives our screen-shake as a decaying "trauma" value with a squared (trauma²) falloff envelope, sampled through continuous simplex noise per axis instead of per-frame white noise — reads as a smooth wobble that eases out, rather than a jittery flicker that cuts off abruptly.

### Hit-Stop / Freeze-Frame

- **File:** `src/core/SmallWorld.ts`
- **Authors/Gurus:** common technique across fighting/action games (e.g. Street Fighter, Bayonetta)
- **Source:** ["Juice It or Lose It"](https://www.gdcvault.com/play/1016487/Juice-It-or-Lose) — Martin Jonasson & Petri Purho, GDC Europe 2012
- **Usage:** Briefly scales down gameplay-facing deltaTime (app update, physics step, scene behaviors) on impact while the camera keeps updating at full speed, so its shake/flash effects still play — sells the weight of a hit without pausing the whole engine loop.

## Rendering Architecture & Best Practices

### Physically Based Rendering (PBR)

- **Authors/Gurus:** Matt Pharr, Wenzel Jakob, Greg Humphreys
- **Source:** [Physically Based Rendering: From Theory to Implementation (PBRT)](https://www.pbrt.org/)
- **Usage:** The mathematical basis for PBR, raytracing, refraction, and energy conservation (`Diffuse + Specular <= 1.0`).

### Cook-Torrance Microfacet BRDF (GGX / Smith / Schlick)

- **File:** `src/core/renderers/shaders/source/web_gl2/chunks/light_calc_pbr.frag.glsl`, `src/core/renderers/shaders/source/web_gpu/chunks/pbr_math.wgsl`, `src/core/renderers/shaders/source/web_gpu/chunks/lighting_pbr.wgsl`
- **Authors/Gurus:** Robert L. Cook & Kenneth E. Torrance (1982), Bruce Walter et al. (GGX/Trowbridge-Reitz, 2007), Christophe Schlick (1994)
- **Source:**
  - [Cook & Torrance: "A Reflectance Model for Computer Graphics" (1982)](https://dl.acm.org/doi/10.1145/357290.357293)
  - [Walter et al.: "Microfacet Models for Refraction through Rough Surfaces" (2007)](https://www.cs.cornell.edu/~srm/publications/EGSR07-btdf.pdf)
  - [Schlick: "An Inexpensive BRDF Model for Physically-based Rendering" (1994)](https://citeseerx.ist.psu.edu/viewdoc/download?doi=10.1.1.50.2297&rep=rep1&type=pdf)
- **Usage:** The core specular reflectance model used across both WebGL2 and WebGPU standard PBR pipelines. Composes the microfacet distribution $D$ (Trowbridge-Reitz/GGX for long-tailed specular highlights), geometric shadowing/masking $G$ (Smith model with Schlick-GGX approximation), and Fresnel reflectance $F$ (Schlick approximation) with energy-conserving diffuse split ($k_D = (1 - k_S) \cdot (1 - \text{metallic})$).

### Real-Time Rendering Pipeline & State Minimization

- **Authors/Gurus:** Tomas Akenine-Möller, Eric Haines, Naty Hoffman
- **Source:** [Real-Time Rendering (RTR)](https://www.realtimerendering.com/)
- **Usage:** The bible for real-time rendering. Fundamental concepts such as Opaque vs. Transparent rendering order, back-to-front sorting, and state minimization (minimizing draw calls by efficiently grouping by pass -> shader -> material) are derived from here.

### Percentage-Closer Filtering (PCF) for Soft Shadows

- **File:** `WebGL2Renderer.ts`, `Phong.frag.glsl`, `Standard.frag.glsl`
- **Authors/Gurus:** William T. Reeves, David H. Salesin, and Robert L. Cook (1987)
- **Source:** [Rendering antialiased shadows with depth maps (SIGGRAPH 1987)](https://dl.acm.org/doi/10.1145/37402.37425)
- **Usage:** The foundational technique for generating soft edges on shadow maps. By sampling the depth map multiple times around the target fragment and averaging the binary visibility results, jagged aliased shadows become smoothly blurred (especially when combined with hardware `sampler2DShadow`).

### Percentage-Closer Soft Shadows (PCSS)

- **File:** `light_calc.frag.glsl`, `light_calc_pbr.frag.glsl` (GLSL300), `pbr_math.wgsl`, `lighting.wgsl`, `lighting_pbr.wgsl`, `WebGL2Renderer.ts`
- **Authors/Gurus:** Randima Fernando (NVIDIA)
- **Source:** ["Percentage-Closer Soft Shadows"](https://download.nvidia.com/developer/presentations/2005/I3D/I3D_05_Percentage_Closer_Soft_Shadows.pdf) — SIGGRAPH 2005
- **Usage:** Upgrades the directional-light PCF pass to a variable-radius filter: a blocker search over a small ring of raw (non-comparison) depth reads estimates how far the average occluder sits below the receiver, which then scales the PCF sample radius so contact shadows stay sharp while shadows further from their caster soften — contact-hardening soft shadows from a single shadow map, no extra light samples or pre-pass needed.

### Image-Space Horizon-Based Ambient Occlusion (HBAO)

- **File:** `AO.frag.glsl`, `AO.frag.wgsl`, `AOPassGL.ts`, `AOPassGPU.ts`
- **Authors/Gurus:** Louis Bavoil, Miguel Sainz, Rouslan Dimitrov (NVIDIA)
- **Source:** ["Image-Space Horizon-Based Ambient Occlusion"](https://developer.download.nvidia.com/presentations/2008/SIGGRAPH/HBAO_SIG08b.pdf) — SIGGRAPH 2008
- **Usage:** The reference for our screen-space ambient occlusion pass (`HbaoElement` in code) — marching a handful of screen-space directions per pixel and taking `dot(directionToSample, normal)` as the sine of that direction's horizon elevation angle, then darkening by how much of the hemisphere those horizons block. Simplified relative to the paper: a single max-sample per direction instead of true horizon-angle accumulation via the sine-integration formula, and no per-pixel direction rotation or bilateral blur pass to turn banding into noise.

### Normal-Offset Shadow Bias

- **File:** `light_calc.frag.glsl`, `light_calc_pbr.frag.glsl` (GLSL300), `base_vertex_main.vert.glsl`, `lighting.wgsl`, `lighting_pbr.wgsl`
- **Authors/Gurus:** Jasper Flick (Catlike Coding)
- **Source:** [Directional Shadows (Custom SRP) — Catlike Coding](https://catlikecoding.com/unity/tutorials/custom-srp/directional-shadows/)
- **Usage:** The reference for offsetting the shadow-map sample position along the surface normal (scaled by NdotL) before the light-space transform, instead of only biasing the compared depth value. Separates the fix for shadow acne from depth manipulation, reducing both acne and peter-panning simultaneously across our directional and spot light shadows.

### Temporal Supersampling / TAA (Jitter + History Blend)

- **File:** `HistoryBlend.frag.glsl`, `HistoryBlend.frag.wgsl`, `HistoryBlendPassGL.ts`, `HistoryBlendPassGPU.ts`, `TaaElement.ts`, `Camera.ts`, `SmallWorld.ts`
- **Authors/Gurus:** Brian Karis (Epic Games)
- **Source:** ["High-Quality Temporal Supersampling"](http://advances.realtimerendering.com/s2014/#_HIGH-QUALITY_TEMPORAL_SUPERSAMPLING) — SIGGRAPH 2014, Advances in Real-Time Rendering
- **Usage:** The canonical reference for sub-pixel camera jitter (we use a Halton(2,3) sequence, cycling 16 samples) combined with a history buffer accumulated across frames to reconstruct anti-aliased detail beyond a single frame's sample rate. We implement only the simplified half of the technique — jitter plus an exponential history blend, no motion-vector reprojection or neighborhood clamping — which smooths edges in static/slow scenes but visibly ghosts on fast movement, an accepted trade-off documented in `docs/research/aaa-engine-techniques.md`.

### Accumulation Buffer (Motion Trail / Afterimage Effect)

- **File:** `HistoryBlendPassGL.ts`, `HistoryBlendPassGPU.ts`, `MotionTrailElement.ts`
- **Authors/Gurus:** Paul Haeberli, Kurt Akeley (SGI)
- **Source:** ["The Accumulation Buffer: Hardware Support for High-Quality Rendering"](https://graphics.stanford.edu/courses/cs248-02/haeberli-akeley-accumulation-buffer-sig90.pdf) — SIGGRAPH 1990
- **Usage:** The original paper generalizing "blend this frame with an accumulated buffer of prior frames" beyond anti-aliasing to motion blur, depth-of-field, and soft shadows — the same family of technique as our TAA history blend above, just aimed at a deliberately visible result instead of an invisible one. `MotionTrailElement` reuses the identical `HistoryBlendPassGL`/`HistoryBlendPassGPU` infrastructure as TAA (its own separate instance/history buffer, no camera jitter), tuned with a much higher feedback value so fast-moving objects intentionally leave a ghost/afterimage trail — an honest stylistic effect, not a mislabeled anti-aliasing technique.

### Dual Kawase Bloom (Post-Processing)

- **File:** `BloomDownsample.frag.wgsl`, `BloomUpsample.frag.wgsl`, `PostProcessPass.ts`
- **Authors/Gurus:** Masaki Kawase (2003) and Marius Bjørge (2014)
- **Source:** [Bandwidth-Efficient Rendering (ARM)](https://community.arm.com/cfs-file/__key/communityserver-blogs-components-weblogfiles/00-00-00-20-66/siggraph2015_2D00_mmg_2D00_marius_2D00_notes.pdf)
- **Usage:** Used as the high-performance WebGPU bloom filter. By downsampling using a 13-tap filter and upsampling using a 9-tap tent filter across a mip-chain, this technique produces extremely soft, high-quality glows spanning large screen areas at a fraction of the cost of a traditional Gaussian blur.

### Linear Color Space & Gamma Correctness

- **Authors/Gurus:** Naty Hoffman, Sebastien Lagarde (Frostbite Engine)
- **Source:** SIGGRAPH Presentations & "Moving Frostbite to Physically Based Rendering"
- **Usage:** The law of linear color space: All color textures (albedo) must be converted to linear space (sRGB -> Linear) in the shader before lighting calculations. After all lighting calculations, the result must be converted back to sRGB space (Gamma Correction) before being output to the screen.

### Data-Oriented Design (DOD)

- **Authors/Gurus:** Mike Acton (Insomniac Games, Unity)
- **Usage:** The architectural guideline that data structures (like TypedArrays and flat arrays) should be preferred over OOP and deeply nested objects to avoid CPU cache misses during the rendering loop.

### Component & Behavior Architecture

- **Concepts:** Component-based programming, Unity Behaviors.
- **Usage:** Small World uses a strict behavior-driven architecture where logical components (`Behavior`) are attached directly to nodes like `Object3D` or `Camera` via `.addBehavior()`. This eliminates rigid inheritance structures for controllers (like `OrbitController` or `FPSController`), allowing them to be dynamically composed at runtime.

### Asynchronous Asset Loading

- **Usage:** Provides unified static factories like `Texture.fromUrl()` with promise-based loading. This ensures asynchronous image decoding integrates smoothly into the synchronous render loop, often falling back to a placeholder pixel until the GPU upload is fully complete.

## Graphics APIs (WebGPU / WebGL)

### W3C WebGPU Specification

- **Source:** [WebGPU W3C Working Draft](https://www.w3.org/TR/webgpu/)
- **Usage:** The absolute single source of truth for WebGPU mechanisms. It establishes the strict validation rules and explicit resource requirements (e.g., why `GPUTextureUsage` must be exactly defined before an operation like `copyTextureToTexture` can be executed).

### WebGPU Fundamentals

- **Authors/Gurus:** Gregg Tavares
- **Source:** [WebGPU Fundamentals](https://webgpufundamentals.org/)
- **Usage:** An excellent source for understanding the conceptual difference between implicit state (WebGL) and explicit pipelines/layouts (WebGPU). Serves as a template for best practices around texture bindings, memory alignments (Uniforms/UBOs), and the safe handling of render passes.

### Tour of WebGPU

- **Authors/Gurus:** Alain Galvan
- **Source:** [Raw WebGPU (Tour of WebGPU)](https://alain.xyz/blog/raw-webgpu)
- **Usage:** Serves as an important architectural reference for understanding bind group layouts, command buffer encoding, and mapping concepts like Vulkan/Metal/D3D12 to the web standard.

## Image Processing & Texture Generation

### Perlin Noise (2D Noise)

- **File:** `public/tools/splatter-gen.html` (as well as engine noise in `src/utils/Noise.ts`)
- **Authors/Gurus:** Ken Perlin (1985 / Improved Noise 2002)
- **Source:** [Making Noise (Ken Perlin)](https://mrl.cs.nyu.edu/~perlin/doc/oscar.html)
- **Usage:** 2D Perlin noise is used to calculate soft, organic disturbances and ripples on circles (Noise Warp). This creates natural-looking splash edges for liquids and mud splatters from simple geometric shapes.

### Liquid Metaballs (Liquid Blobs)

- **File:** `public/tools/splatter-gen.html`
- **Authors/Gurus:** James Blinn (1982)
- **Usage:** The physical concept of metaballs describes organically merging spherical surfaces. In the splatter generator, we draw multiple circles on an offscreen canvas, blur them (density field), and cut them off sharply using a threshold (alpha thresholding). This allows adjacent drops to merge into each other like liquids.

### Box-Blur

- **File:** `public/tools/splatter-gen.html`, `public/tools/pbr-gen.html`
- **Usage:** To simulate Gaussian blur on pixel arrays, a two-stage, linear box-blur (horizontal and vertical pass) is implemented in pure JavaScript. This enables extremely fast real-time image smoothing with O(N) complexity (independent of the radius).

### Normal Map Generation (Sobel Filter)

- **File:** `public/tools/pbr-gen.html`, `src/tools/pbr-preview.ts`
- **Authors/Gurus:** Irwin Sobel (1968)
- **Source:** Sobel operators for image segmentation / edge detection.
- **Usage:** The normal map is generated by calculating the derivatives of the height map in the X and Y directions using a discrete 3x3 Sobel convolution kernel. The normal vector is calculated from n = normalize(-dx _ s, -dy _ s, 1.0) and encoded into RGB color values in the range [0, 255].

### Sigmoidal Contrast (Specular S-Curves)

- **File:** `public/tools/pbr-gen.html`
- **Source:** ImageMagick `-sigmoidal-contrast` function.
- **Usage:** To raise highlights softly but with high contrast, a sigmoidal curve function f(x) = 1 / (1 + exp(-c \* (x - t))) is applied to the brightness values. This prevents hard clipping and simulates more realistic specular behavior.

### Laplacian Crevice Cavity Mapping (Ambient Occlusion)

- **File:** `public/tools/pbr-gen.html`
- **Source:** Discrete Laplace filters / edge operators.
- **Usage:** To approximate local self-shadowing (ambient occlusion / crevices), the curvature (second derivative) of the height values is calculated using a Laplace kernel (4 \* center - sum(neighbors)). This highlights depressions and crevices, which are multiplied with a blurred macro height map.

## Assets & Fonts

### Dungeon Font (Yet Another Dungeon HUD)

- **File:** `showcases/yad/assets/fonts/Dungeon.ttf`
- **Source:** [DooM Font auf DaFont](https://www.dafont.com/doom.font)
- **Usage:** Used to render the iconic red numbers and UI text in the YAD (Yet Another Dungeon) showcase. A huge thanks to the unknown author who originally created and shared this authentic TTF replica!
  *Note: While the project uses the name "Yet Another Dungeon" (YAD), its aesthetic and assets are deeply inspired by the legendary DOOM (1993).*

### Retro Dungeon Texture & Sprite Pack

- **File:** `showcases/yad/assets/dungeon_pack/`
- **Source:** Original assets by **id Software** (DOOM, 1993). 
- **Usage:** Used in the YAD showcase for authentic wall textures, flats, and weapon/enemy sprites. Thank you to the DOOM community and id Software for making these legendary assets available for educational and nostalgic projects!

### Mixamo Mannequin (Rigged Proxy Character)

- **File:** `src/apps/and-now/raw/mannequin/mannequin.glb`
- **Authors/Gurus:** Mixamo / Adobe
- **Source:** [Mixamo Characters](https://www.mixamo.com/#/?page=1&query=Mannequin&type=Character)
- **Usage:** Served as the initial 3D dummy/proxy character for early movement prototyping and animation testing in the "And Now?" app, allowing robust iteration on the 2.5D and isometric controllers.

### Player / Spieler (Protagonist Character Rig & Motion Clips)

- **File:** `public/assets/and-now/mannequin/player-female/character.glb`, `public/assets/and-now/mannequin/player-male/character.glb`, `public/assets/and-now/mannequin/shared/anim/`, `src/apps/and-now/raw/mannequin/`
- **Authors/Gurus:** Adobe Mixamo (Auto-Rigging & Animation Library)
- **Source:** [Adobe Mixamo](https://www.mixamo.com/)
- **Usage:** Provides the rigged skeletal hierarchy (`mixamorig:LeftHand`, spine, limbs) and converted binary glTF motion clips (`idle_torch.glb`, `walk_torch.glb`, `ascending_stairs.glb`) driving the player character in the "And Now?" bunker scenes.

### Yoshi (Easter Egg Character)

- **File:** `public/assets/and-now/mannequin/yoshi/character.glb`, `src/apps/and-now/raw/mannequin/yoshi/`
- **Authors/Gurus:** akennedy007 ([Sketchfab](https://sketchfab.com/akennedy007)) / Nintendo
- **Source:** [Yoshi on Sketchfab](https://sketchfab.com/3d-models/yoshi-9d6d7b5685a442039a555b2c1cd887c4) (CC-BY-4.0)
- **Usage:** Provides the 3D geometry of Yoshi rigged against the standard Mixamo biped armature for a fun, hidden Easter Egg character playable via `[C]`.

### Procedural Rodent Grooming FSM & Spline Wave Kinematics (`RatGroomingBehavior`)

- **File:** `src/extensions/creatures/RatGroomingBehavior.ts`, `src/extensions/creatures/GroomingRat.ts`
- **Concept:** Procedural rodent grooming state machine (Finite State Machine) combining Lissajous paw scrubbing trajectories with phase-delayed spline wave propagation for multi-segment tails.
- **Formulas:**
  - *Face/Whisker Scrubbing Trajectory:* $x(t) = \pm 0.015 + \sin(18t) \cdot 0.008$, $y(t) = 0.125 + \cos(18t) \cdot 0.014$ synchronized with resonant head nodding ($\Delta \theta_X = 0.12 + 0.06 \sin(18t)$).
  - *Phase-Shifted Tail Wave Kinematics:* $\theta_Y(s, t) = \sin(2.8t + s \cdot 0.75) \cdot (0.16 + s \cdot 0.09)$ across $s \in [0, 5]$ cylinder vertebra nodes to achieve organic whip/serpentine momentum without skeletal skinning.
- **Usage:** Provides lightweight, zero-rigging procedural living creature ambient animations running at 60 FPS with zero bundle overhead.

## Shaders & Procedural Art

### Star Nest (Volumetric Cosmic Raymarching)

- **File:** `showcases/23/showcase.ts` (SHADERTOY_STAR_NEST)
- **Authors/Gurus:** Kali
- **Source:** [Star Nest on Shadertoy](https://www.shadertoy.com/view/XlfGRj)
- **Usage:** This iconic Shadertoy creates a stunning, volumetric deep-space effect using iterative distance folding. It beautifully demonstrates how WebGL2 handles heavy loops and spatial transformations on our dynamic billboards.

### Neon Fractal (Kishimisu)

- **File:** `showcases/23/showcase.ts` (COMPUTETOYS_KISHIMISU and SHADERTOY_FRACTAL)
- **Authors/Gurus:** Kishimisu
- **Source:** [An introduction to Shader Art Coding](https://www.youtube.com/watch?v=f4s1h2YETNY)
- **Usage:** This hypnotic, colorful fractal shader is a direct adaptation of Kishimisu's legendary shader art tutorial. It uses space folding, sine-wave color palettes, and iterative distance field manipulation to create an infinitely zooming neon landscape. A masterpiece of procedural math, featured in both the WebGL2 and WebGPU galleries!

### Plasma (GLSLSandbox)

- **File:** `showcases/23/showcase.ts` (GLSLSANDBOX_PLASMA)
- **Source:** Generic / Public Domain (GLSLSandbox)
- **Usage:** A classic, foundational plasma effect built using overlaid sine/cosine waves and time offsets. It serves as a minimalist, high-performance reference implementation for WebGL2 custom materials.

### Raymarching & SDFs

- **File:** `src/core/renderers/shaders/source/web_gl2/chunks/sdf_math.glsl`, `src/core/renderers/shaders/source/web_gpu/chunks/sdf_math.wgsl`, `showcases/24/showcase.ts`
- **Authors/Gurus:** Inigo Quilez
- **Source:** [Inigo Quilez - Computer Graphics, Mathematics, Shaders](https://iquilezles.org/)
- **Usage:** Provides core Signed Distance Field (SDF) mathematical primitives (sphere, box, torus, cylinder, capsule, plane), polynomial smooth CSG operators (smooth union, subtraction, intersection), and domain modifiers (twist, repetition, rotation). Standardizes raymarching and procedural distance evaluations across WebGL2 and WebGPU shaders.

### Retro Synthwave Grid

- **File:** `showcases/23/showcase.ts` (COMPUTETOYS_SYNTHWAVE)
- **Usage:** A classic 80s outrun-style shader featuring an endless glowing grid and a sunset. It demonstrates the use of simple coordinate manipulations and smoothstep functions to recreate nostalgic procedural aesthetics.

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

## Physics & Collision Detection

### Sequential Impulse & Rigid Body Dynamics

- **Authors/Gurus:** Erin Catto (Creator of Box2D)
- **Usage:** Essential concepts for resolving constraints, joints, and stable resting contacts using sequential impulses, which heavily influence how we stabilize physics loops and design our collision impulse resolution.

### Real-Time Collision Detection

- **Authors/Gurus:** Christer Ericson
- **Usage:** The ultimate reference for implementing the Separating Axis Theorem (SAT), efficient intersection testing, and robust handling of floating-point inaccuracies in spatial math.

### Advanced Collision Detection and Simulation

- **Authors/Gurus:** Ming C. Lin and Nadia Magnenat Thalmann
- **Usage:** Prof. Ming C. Lin is a pioneer in the field of collision detection (I-COLLIDE, SWIFT, V-COLLIDE). Her foundational research in bounding volume hierarchies and fast continuous collision detection provided the theoretical groundwork for modern rigid body physics. Nadia Magnenat Thalmann's pioneering work in simulating virtual humans and deformable objects is a profound inspiration for expanding interactive 3D systems beyond simple rigid bodies.

### Physics-based Character Animation

- **Authors/Gurus:** Jessica Hodgins
- **Usage:** Her foundational research in integrating physical simulations with character animation serves as an ongoing inspiration for adding complex kinematics and physics-driven behaviors to game engines.

## Rendering Architecture & Best Practices

### Physically Based Rendering (PBR)

- **Authors/Gurus:** Matt Pharr, Wenzel Jakob, Greg Humphreys
- **Source:** [Physically Based Rendering: From Theory to Implementation (PBRT)](https://www.pbrt.org/)
- **Usage:** The mathematical basis for PBR, raytracing, refraction, and energy conservation (`Diffuse + Specular <= 1.0`).

### Real-Time Rendering Pipeline & State Minimization

- **Authors/Gurus:** Tomas Akenine-Möller, Eric Haines, Naty Hoffman
- **Source:** [Real-Time Rendering (RTR)](https://www.realtimerendering.com/)
- **Usage:** The bible for real-time rendering. Fundamental concepts such as Opaque vs. Transparent rendering order, back-to-front sorting, and state minimization (minimizing draw calls by efficiently grouping by pass -> shader -> material) are derived from here.

### Percentage-Closer Filtering (PCF) for Soft Shadows

- **File:** `WebGL2Renderer.ts`, `Phong.frag.glsl`, `Standard.frag.glsl`
- **Authors/Gurus:** William T. Reeves, David H. Salesin, and Robert L. Cook (1987)
- **Source:** [Rendering antialiased shadows with depth maps (SIGGRAPH 1987)](https://dl.acm.org/doi/10.1145/37402.37425)
- **Usage:** The foundational technique for generating soft edges on shadow maps. By sampling the depth map multiple times around the target fragment and averaging the binary visibility results, jagged aliased shadows become smoothly blurred (especially when combined with hardware `sampler2DShadow`).

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

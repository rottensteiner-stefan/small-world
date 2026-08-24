# Recommended External Toolchain

While the **Small World** engine and its Node/Vite ecosystem handle the core rendering and logic, building a complete 3D/2.5D game requires a supporting ecosystem of external art and asset tools. 

Here is the recommended toolchain for working with the engine efficiently:

## 1. 3D Modeling & Rigging: Blender
* **Role:** The absolute standard for 3D modeling, rigging, and animation.
* **Usage:** 
  * Importing Mixamo/Sketchfab models to edit skeletons, adjust weights, or combine animations.
  * Designing levels and exporting NavMeshes (invisible collision/walkable areas) for the engine.
  * Optimizing geometry (reducing polygons) and baking PBR textures into single atlases to reduce WebGL/WebGPU draw calls.
* **Status:** Must-Have.

## 2. GLTF/GLB Optimization: glTF-Transform
* **Role:** CLI tool suite by the Khronos Group for heavy asset compression.
* **Usage:** 
  * Unoptimized `.glb` files (e.g., direct Mixamo exports) often contain uncompressed data, unused bones, or massive animation tracks (30MB+).
  * `gltf-transform` allows applying **Draco** or **Meshopt** compression, quantization, and pruning directly from the terminal, often shrinking assets down to 1-2 MB.
  * *Tip:* Can be executed locally via `npx @gltf-transform/cli`.
* **Status:** Highly Recommended (for production builds).

## 3. 2.5D Art & Textures: Krita / Photoshop / Affinity
* **Role:** 2D image editing, Matte Painting, and Layer Cutouts.
* **Usage:** 
  * Creating the static 2.5D backgrounds ("Guckkasten-Prinzip") by painting over 3D blockouts or AI-generated concepts.
  * Authoring foreground cutouts (transparent layers like pillars, railings, pipes) where characters can walk behind.
  * Creating alpha masks for depth-compositing in the shader.
  * **File Format Standard:** Export final 2D assets as **WebP (`.webp`)** for lossless/lossy compression without JPEG block artifacts, with full alpha transparency support and small footprint (~200KB per 1080p plate).
* **Status:** Must-Have.

## 4. Audio Engineering: Audacity
* **Role:** Free, open-source audio editor.
* **Usage:** 
  * Trimming, looping, and mixing raw sound effects (footsteps, UI clicks, ambient tracks).
  * Exporting optimized `.ogg` or `.mp3` files for the engine's Audio Context.
* **Status:** Must-Have (once audio implementation begins).

## 5. FBX to GLTF Conversion: fbx2gltf / Web Converters
* **Role:** Format conversion for 3D assets.
* **Usage:** 
  * Small World exclusively uses the open `glTF/GLB` standard via `GltfLoader`. 
  * When downloading `.fbx` files (like from Mixamo), they must be converted. This can be done via the `fbx2gltf` CLI tool or quickly via web converters like [AnyConv](https://anyconv.com/fbx-to-glb-converter/).
* **Status:** Necessary utility.

## 6. AI Concept Art & Background Inpainting: Integrated Image Generator
* **Role:** Automated generation and editing of 2.5D matte painting backgrounds and concept art.
* **Usage:**
  * Generating consistent Graphic-Noir styled environmental sketches and scene backgrounds.
  * Image-to-Image editing / inpainting (e.g. removing temporary characters/objects from background plates to create clean, empty 2.5D stages).
  * Direct execution via the agent's `generate_image` tool with reference image inputs.
  * **Aspect Ratio Standard:** Always enforce `AspectRatio: "16:9"` to match the 3D stage `Plane({ width: 16, height: 9 })` 1:1 without distortion.
* **Status:** Integrated Agent Capability.

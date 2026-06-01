# Small World Engine

**Small World** is a lightweight, high-performance, modular 3D game engine for the web, built with TypeScript. It provides a modern, Physically Based Rendering (PBR) pipeline and a simple API for managing 3D scenes, cameras, lighting, and geometry—with a particular focus on flexible camera orchestration and native support for 2D/2.5D workflows.

## 🚀 Features

- **Hybrid PBR Rendering:** High-performance rendering pipeline supporting **WebGPU**, **WebGL 2**, and **WebGL 1** with industry-standard physically based shading (Cook-Torrance BRDF).
- **Linear Lighting Workflow:** All lighting calculations are performed in linear space with automatic sRGB gamma correction for realistic color falloffs and high visual fidelity.
- **Advanced Camera System:** Unified, strategy-based camera control (Smooth, Stiff, Fixed, FPS, Isometric). Features a modular `ZoomController` and procedural effects like Shake and Flash.
- **High-Performance Architecture:** Optimized for memory efficiency through **Object Pooling** (`MathPool`), **RenderManifest Caching**, and zero-allocation hot paths.
- **Scene Graph:** Hierarchical scene management using a clean `Object3D` architecture.
- **Lighting & Materials:** Support for Standard PBR (Metallic/Roughness), Phong, Lambert, and specialized materials like Triplanar Mapping and Splatmapped Terrain. Supports Ambient, Directional, Point, Spot, and Area lights.
- **2D/2.5D Support:** First-class support for Sprites, Billboard rendering, and Pixel-Perfect Isometric perspectives.
- **Geometry Library:** Comprehensive set of primitives (Cube, Sphere, Pyramid, Torus, Cylinder, Plane, etc.) and dynamic terrain generation.
- **Asset Loaders:** Integrated async loaders for OBJ models, MTLLib materials, textures, and engine configurations.

## 📦 Installation

Install the package via NPM:

```bash
npm install small-world
```

## 🎮 Quick Start

The engine provides an `Application` base class that handles the render loop and hardware initialization automatically.

### 1. Configuration (`small-world.json`)

By default, the engine looks for a configuration file at `/config/small-world.json`.

```json
{
  "canvasId": "SmallWorld",
  "rendererType": "BEST",
  "projection": "PERSPECTIVE",
  "fullscreen": true,
  "renderer": [
    {
      "type": "WEB_GPU",
      "attributes": { "antialias": true }
    }
  ]
}
```

### 2. Implementation Example

```typescript
import { Application, Cube, Color, StandardMaterial, Object3D, ZoomController } from "small-world";

class MyGame extends Application {
  protected async setupScene(): Promise<void> {
    // 1. Create a PBR geometry and material
    const geometry = new Cube({ size: 2 }).getGeometryData();
    const material = new StandardMaterial({
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

    // 3. Configure the camera and modular controllers
    this.camera.position.set(5, 5, 5);
    this.camera.target.set(0, 0, 0);

    // Add a standalone zoom controller
    this.controllers.push(new ZoomController(this.camera));
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

- `src/core`: Core engine logic (Application, Object3D, Scene, Input, Color).
- `src/core/cameras`: Camera strategies, projections, effects, and modular controllers.
- `src/core/materials`: Material definitions and PBR shader assets.
- `src/core/lights`: Light source implementations (Standard & PBR).
- `src/geometry`: Geometric primitives and terrain logic.
- `src/math`: Linear algebra, vectors, matrices, and object pooling.
- `src/loaders`: Asset loading pipeline (OBJ, MTL, Textures, Shaders).
- `src/renderers`: Implementation of WebGL1, WebGL2, and WebGPU backends.
- `examples`: Interactive functional demos showcasing engine capabilities.

## 📄 License

This project is licensed under the MIT License.

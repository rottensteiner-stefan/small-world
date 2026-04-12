# Small World Engine

**Small World** is a lightweight, modular 3D game engine for the web, built with TypeScript. It provides a clean and simple API for managing 3D scenes, cameras, lighting, and geometry—with a particular focus on flexible camera orchestration and native support for 2D/2.5D workflows.

## 🚀 Features

- **Hybrid Rendering:** High-performance rendering pipeline supporting **WebGPU**, **WebGL 2**, and **WebGL 1** with dynamic runtime switching and automatic fallback mechanisms.
- **Scene Graph:** Hierarchical scene management using an `Object3D` architecture.
- **Materials & Lighting:** Built-in support for standard shading models (Phong, Lambert, Wireframe, Sprite, and Splatmapped Terrain) and diverse light types (Ambient, Directional, Point, Spot, and Area lights).
- **Advanced Camera System:** Strategy-based camera control (Smooth, Stiff, Fixed, FPS, Isometric) with configurable constraints and procedural effects like Shake and Flash.
- **2D/2.5D Support:** First-class support for Sprites, Billboard rendering, and Pixel-Perfect Isometric perspectives.
- **Geometry Library:** Comprehensive set of primitives (Cube, Sphere, Pyramid, Torus, Cylinder, Plane, etc.) and dynamic terrain generation.
- **Robust Math & Color:** Custom implementations for `Vector3D`, `Vector2D`, and `Matrix4`, alongside a feature-rich `Color` class supporting CSS/X11 standards and multiple color space conversions (HEX, HSL, HSV).
- **Asset Loaders:** Integrated loaders for OBJ models, MTLLib materials, textures, and engine configurations.
- **Input System:** Built-in handler for Keyboard and Mouse interaction, including Pointer Lock support.

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
import { Application, Cube, Color, PhongMaterial, Object3D } from "small-world";

class MyGame extends Application {
  protected async setupScene(): Promise<void> {
    // 1. Create a geometry and material
    const geometry = new Cube({ size: 2 }).getGeometryData();
    const material = new PhongMaterial({ color: Color.DODGERBLUE });

    // 2. Wrap in an Object3D and add to scene
    const cube = new Object3D("MyCube");
    cube.geometry = geometry;
    cube.material = material;
    cube.position.set(0, 1, 0);

    this.scene.add(cube);

    // 3. Configure the camera
    this.camera.position.set(5, 5, 5);
    this.camera.target.set(0, 0, 0);
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

To contribute or run the internal demos:

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

## 📂 Project Structure

- `src/core`: Core engine logic (Application, Object3D, Scene, Input, Color).
- `src/core/cameras`: Camera strategies, projections, and effects.
- `src/core/materials`: Material definitions and shaders.
- `src/core/lights`: Light source implementations.
- `src/geometry`: Geometric primitives and terrain logic.
- `src/math`: Linear algebra, vectors, and matrices.
- `src/loaders`: Asset loading pipeline (OBJ, MTL, Textures).
- `src/renderers`: Implementation of WebGL1, WebGL2, and WebGPU backends.
- `examples`: Interactive functional demos showcasing engine capabilities.

## 📄 License

This project is licensed under the MIT License.

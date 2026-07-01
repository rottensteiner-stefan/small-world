# Getting Started

Small World is a lightweight, high-performance, modular 3D game engine for the web built with TypeScript.

## Installation

Install the package via NPM:

```bash
npm install small-world
```

## Basic Setup

The engine uses a strategy-based lifecycle. You subclass `AbstractExample` (or `Application` depending on your wrapper) and override the `setupScene` and `update` lifecycle methods.

### 1. Engine Configuration (`public/config/small-world.json`)

By default, the engine loads its configuration from a static JSON file. This file controls backend preferences, viewport options, and post-processing setups.

```json
{
  "canvasId": "SmallWorldCanvas",
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

### 2. Basic Example Implementation

Create a file named `app.ts` to boot the engine:

```typescript
import {
  AbstractExample,
  Color,
  Cube,
  Object3D,
  RendererType,
  StandardMaterial,
} from "small-world";

class MyFirstWorld extends AbstractExample {
  protected override async setupScene(): Promise<void> {
    // 1. Create a green PBR cube
    const cubeObj = new Object3D("RotatingCube");
    cubeObj.geometry = new Cube({ size: 1.5 }).getGeometryData();
    cubeObj.material = new StandardMaterial({
      color: Color.GREEN,
      metallic: 0.5,
      roughness: 0.3,
    });
    cubeObj.setPosition(0, 1.0, 0);

    // 2. Add to scene
    this.scene.add(cubeObj);

    // 3. Move the camera back to view the scene
    this.camera.position.set(0, 3.0, 6.0);
    this.camera.target.set(0, 1.0, 0);
  }

  protected override update(deltaTime: number): void {
    super.update(deltaTime);

    // Rotate the cube object
    const cube = this.scene.getObjectByName("RotatingCube");
    if (cube) {
      cube.rotation.y += 1.0 * deltaTime;
    }

    // Tick/render loop
    this.scene.update(deltaTime);
  }
}

// Instantiate and start
const app = new MyFirstWorld({
  rendererType: RendererType.BEST,
});

app.start().then(() => {
  console.log("Small World initialized!");
});
```

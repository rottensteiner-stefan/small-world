# smallworld-engine

smallworld-engine is a lightweight 3D engine written in TypeScript.

## Installation

```bash
npm install smallworld-engine
```

## Usage

To use the engine, you need to create a `smallworld.json` configuration file in your project's root directory. This file specifies the canvas element to use, the renderer, and other options.

```json
{
  "canvasId": "render-canvas",
  "rendererType": "webgpu",
  "worldSize": 1000,
  "skyColor": "#111111",
  "showHUD": true
}
```

Then, you can initialize the engine in your code:

```typescript
import { SmallWorld } from "smallworld-engine";

const world = new SmallWorld();
world.init("smallworld.json").then(() => {
  // Your code here
});
```

## Features

The engine provides the following features:

*   **Core:** Application, AssetManager, Camera, Engine, HUD, Input, Object3D, Scene, SmallWorld
*   **Textures:** CubeTexture, Skybox, Texture
*   **Enums:** CameraStrategyType, Keys, LightType, MaterialType, ProjectionType, RendererType, TextureFilter, TextureWrap
*   **Math:** AbstractProjection, Matrix4, OrthographicProjection, PerspectiveProjection, Vector2D, Vector3D
*   **Colors:** Color, ColorUtils
*   **Geometries:** Cube, Cylinder, Grid, Plane, Pyramid, Sphere, Torus, Circle, Triangle, Line, ModelGeometry, Terrain
*   **Materials:** AbstractMaterial, BasicMaterial, LambertMaterial, PhongMaterial, SkyboxMaterial, TerrainMaterial, WireframeMaterial
*   **Lights:** AmbientLight, DirectionalLight, AbstractLight, PointLight, SpotLight, AreaLight
*   **Physics & Utils:** BoundingBox, BoundingSphere, Collision, FrustumCuller, TextureGenerator
*   **Events:** EventDispatcher, EventType
*   **Loaders:** ImageLoader, Loader, ObjLoader, ShaderLoader, SkyboxLoader, TextLoader

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

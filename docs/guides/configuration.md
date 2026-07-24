# Configuration (EngineOptions)

Small World is designed to be highly configurable. By passing an `EngineOptions` object to the `SmallWorld` constructor, you can fine-tune rendering capabilities, post-processing pipelines, quality limits, and physics.

> **Note:** The engine previously attempted to fetch `small-world.json` at runtime via an internal HTTP request. This has been removed in favor of **Inversion of Control (IoC)**. You must now explicitly pass your configuration.

## Basic Setup

In modern build tools like Vite or Webpack, you can simply import your JSON file and pass it to the engine.

```typescript
import config from "./config/small-world.json"; // Bundler handles this automatically
import { SmallWorld } from "small-world";

class MyGame extends SmallWorld {
  constructor() {
    super(config); // Inject configuration
  }

  protected async setupScene() {
    // ...
  }
}
```

## The EngineOptions Structure

The `EngineOptions` object defines the entire state of the core engine. Below are the primary sections of the configuration object.

### Root Options

- `canvasId` (string): The ID of the HTML canvas element to render into.
- `rendererType` (string): The preferred renderer (e.g. `BEST`, `WEB_GPU`, `WEB_GL2`).
- `projectionType` (string): Either `PERSPECTIVE` or `ORTHOGRAPHIC`.
- `fullscreen` (boolean): Whether the canvas should automatically scale to fit the window.
- `gravity` (number[]): A 3-element array defining the physics gravity vector (e.g. `[0, -9.81, 0]`).

### Renderers Array

A list of fallback renderers if the preferred `rendererType` is not supported.

```json
"renderers": [
  { "type": "WEB_GPU" },
  { "type": "WEB_GL2", "attributes": { "antialias": false } },
  { "type": "WEB_GL1" }
]
```

### Quality Options (`quality`)

These control the graphical fidelity of the engine.

- `autoDowngrade` (boolean, default: true): If `true`, the engine will automatically override heavy settings (like MSAA or HDR) when it detects a low-performance device (e.g., mobile phones).
- `maxPixelRatio` (number, default: 2): Clamps the `window.devicePixelRatio`. Extremely high-DPI displays (like modern smartphones with 3.0 or 4.0 DPR) can cause massive GPU bottlenecks. Limiting this to `2` or `1.5` ensures smooth framerates without visual degradation.
- `msaa` (number): Multisample anti-aliasing level (0, 2, 4, 8).
- `maxAnisotropy` (number): Anisotropic filtering level (1, 4, 8, 16) for sharper textures at glancing angles.
- `hdr` (boolean): Enables High Dynamic Range (Float16) rendering pipelines.
- `toneMapping` (string): The tone mapping algorithm to use (e.g., `aces`, `reinhard`, `none`).
- `maxShadowResolution` (number): Maximum texture size for shadow maps.
- `disableTextures` (boolean): If `true`, bypasses all textures, rendering fallback colors (useful for debugging).

### Post-Processing (`postProcessing`)

Configures the post-processing pipeline. The engine supports chaining multiple effects.

```json
"postProcessing": {
  "enabled": true,
  "effects": [
    { "type": "bloom", "intensity": 1.2 },
    { "type": "vignette", "darkness": 0.8 },
    { "type": "filmGrain", "noiseIntensity": 0.3 },
    { "type": "retro", "mode": "tv50s" }
  ]
}
```

### Projections & Audio

- `projection`: Camera options, like `fov`, `near`, `far`, etc.
- `audio`: Sound configurations (e.g., global volume, distance model).

## Full Configuration Example

```json
{
  "canvasId": "SmallWorld",
  "rendererType": "BEST",
  "projectionType": "PERSPECTIVE",
  "fullscreen": true,
  "gravity": [0, -9.81, 0],
  "quality": {
    "autoDowngrade": true,
    "maxPixelRatio": 2,
    "hdr": true,
    "toneMapping": "aces",
    "msaa": 4,
    "maxAnisotropy": 16,
    "maxShadowResolution": 2048
  },
  "postProcessing": {
    "enabled": true,
    "effects": [
      { "type": "bloom", "intensity": 0.8 }
    ]
  }
}
```

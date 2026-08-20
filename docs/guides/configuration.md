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

Configures the post-processing pipeline. General pipeline settings (`enabled`, `filterMode`)
sit at the top level; every individual effect's own tunables are nested one level deeper, under
`effects` — a flat object with one optional key per effect, not a `type`-tagged array (the
pipeline's effect order is fixed internally, not driven by config order). Each individual effect
also has its own `enabled` flag, so you can register settings for an effect without turning it
on yet.

```json
"postProcessing": {
  "enabled": true,
  "effects": {
    "toneMapping": { "enabled": true, "mode": "aces", "exposure": 1.0, "gamma": 2.2 },
    "vignette": { "enabled": true, "offset": 0.8, "darkness": 0.5, "roundness": 2.0 },
    "grain": { "enabled": true, "intensity": 0.05 },
    "bloom": { "enabled": true, "threshold": 1.0, "softThreshold": 0.5, "intensity": 1.0, "radius": 0.85 },
    "quantize": { "enabled": false, "steps": 8 },
    "hbao": { "enabled": false, "radius": 0.5, "intensity": 1.0 },
    "taa": { "enabled": false, "feedback": 0.9 },
    "motionTrail": { "enabled": false, "feedback": 0.92 }
  }
}
```

Every field is optional and only overrides that specific value on top of the effect's own
default — you don't need to specify fields you're not changing.

- **`bloom`** — soft glow around bright areas via a dual Kawase-filter blur (see
  `REFERENCES.md`). `color` can also be set as `{ "r", "g", "b" }` or a 3-element array.
- **`vignette`** / **`grain`** / **`quantize`** — classic screen darkening at the edges,
  film-grain noise, and color-banding/posterization respectively.
- **`hbao`** — screen-space ambient occlusion (a simplified HBAO, not GTAO — see
  `docs/research/aaa-engine-techniques.md` for the exact scope). WebGL2/WebGPU only.
- **`taa`** — simplified temporal anti-aliasing: sub-pixel camera jitter + an exponential
  history blend, no motion-vector reprojection. Smooths edges in static/slow scenes; visibly
  ghosts under fast movement. WebGL2/WebGPU only.
- **`motionTrail`** — a *deliberate* ghost/afterimage effect (not anti-aliasing), reusing the
  same history-blend mechanism as `taa` at a much higher feedback value. WebGL2/WebGPU only.

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
    "effects": {
      "bloom": { "enabled": true, "intensity": 0.8 }
    }
  }
}
```

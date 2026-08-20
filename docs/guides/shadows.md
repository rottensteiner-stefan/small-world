# Shadows

Small World renders real-time shadows via shadow mapping: Cascaded Shadow Maps (CSM) for
`DirectionalLight`, and single shadow maps for `SpotLight`. Both are fully implemented on
**WebGL2 and WebGPU only** — WebGL1 has no shadow-mapping path at all today, so shadow-related
properties are simply ignored there.

## Overview

Any light can cast shadows, and any object can receive and/or cast them:

```typescript
import { DirectionalLight, Object3D, Color } from "small-world";

const sun = new DirectionalLight({ color: Color.WHITE, intensity: 1.0 });
sun.direction.set(-1, -1, -1);
sun.castShadow = true;
scene.add(sun);

const cube = new Object3D("Cube");
cube.castShadow = true;
cube.receiveShadow = true;
scene.add(cube);
```

- `light.castShadow` (boolean, default `false`) — whether this light renders a shadow map at all.
- `object.castShadow` / `object.receiveShadow` (boolean, default `false` each) — whether this
  object is rendered into shadow maps, and whether its own shading samples them.

## Shared Light Properties (`AbstractLight`)

Every shadow-casting light shares these tunables:

- `shadowResolution` (number, default `512`) — texture size of the shadow map. Directional
  lights pack all of their cascades into one atlas of this size (see below); spot lights get
  one map at this size per light.
- `shadowBias` (number) — depth bias to avoid shadow acne. Too small causes acne (self-shadowing
  stripes); too large causes peter-panning (the shadow visibly detaches from its caster).
- `shadowNormalBias` (number) — normal-offset bias: instead of only biasing the compared depth
  value, the shadow-map *sample position* is offset along the surface normal (scaled by NdotL,
  see `REFERENCES.md`'s Catlike Coding credit). Reduces both acne and peter-panning at once, so
  in practice you need much less `shadowBias` once this is tuned.

## Cascaded Shadow Maps (Directional Light)

`DirectionalLight` splits the camera frustum into multiple cascades — near cascades get more of
the shadow-map's texel budget (sharper shadows close to the camera), far cascades cover more
world-space area at lower texel density.

```typescript
const sun = new DirectionalLight({
  numCascades: 4, // default; 1-4 supported
  cascadeSplitLambda: 0.5, // 0 = uniform splits, 1 = logarithmic splits
});
```

On WebGL2, all cascades share a single shadow-map **texture atlas** (packed into a
`ceil(sqrt(numCascades))`-column grid), so `shadowResolution` is the *atlas* size, not each
cascade's own resolution. On WebGPU, each cascade is a full-resolution layer of a
`texture_depth_2d_array` — no atlas packing needed there.

Two polish passes run automatically, with no configuration needed:

- **Texel snapping** — each cascade's light-space center is rounded to that cascade's own texel
  grid before the ortho projection is built, so it doesn't drift by sub-texel amounts as the
  camera moves smoothly. Without this, CSM shadows visibly "shimmer"/crawl frame to frame.
- **Cascade blending** — near the far edge of a cascade, the shader fades towards the next
  cascade's shadow sample instead of a hard cut, so the resolution seam between cascades doesn't
  visibly pop as the camera moves through the scene.

## Spot Light Shadows

`SpotLight` renders a single perspective shadow map from the light's position, shaped by its own
`angle`/`penumbra`/`distance`. No cascades, no texel snapping (a single perspective frustum
doesn't shimmer the same way CSM's tiled ortho frustums do).

## Filtering: PCF and PCSS

Both light types use **Percentage-Closer Filtering** (PCF) — a 3×3 tap average around the
shadow-map sample, softening the hard binary in-shadow/out-of-shadow edge (see `REFERENCES.md`
for the original 1987 Reeves/Salesin/Cook paper).

Directional-light shadows go one step further with **PCSS** (Percentage-Closer Soft Shadows,
Fernando 2005): a *blocker search* reads the raw (non-comparison) shadow-map depth around the
sample to estimate how far away the nearest occluder is, then scales the PCF radius based on
that distance — shadows read as sharp right at the point of contact and progressively softer
further from their caster, instead of a uniform soft edge everywhere. This only applies to the
**primary** cascade a fragment falls into; the secondary cascade-blend sample (see above) still
uses fixed-radius PCF, to avoid doubling the cost in the blend zone. **Spot-light shadows use
fixed-radius PCF only** — no PCSS — since they're typically smaller/less prominent in scenes
today; see `docs/research/aaa-engine-techniques.md` for the exact scope and trade-off reasoning.

## Tuning Tips

- Start with `shadowNormalBias` around `0.02–0.05` and `shadowBias` around `0.001–0.005`; raise
  `shadowNormalBias` first if you see acne, since it fixes acne without introducing
  peter-panning the way raising `shadowBias` does.
- Raising `numCascades` sharpens near shadows but costs more atlas space per cascade on WebGL2
  (each cascade gets a smaller slice of the same `shadowResolution` atlas) — raise
  `shadowResolution` alongside it if cascades start looking blocky.
- Shadows are relatively expensive; the engine's `DeviceCaps` auto-downgrade path lowers
  `maxShadowResolution` on low-performance-tier devices (see `docs/guides/configuration.md`).

# Unified Liquid Surface Material: One Core Mechanism, Presets for Look

## Context & Problem

`OpenWaterMaterial` (realistic PBR water) and `StylizedWaterMaterial` (toon water) are two
independent classes with two independent shader stacks, but their vertex shaders implement the
same Gerstner-wave displacement loop nearly verbatim (`OpenWater.vert.wgsl` vs.
`StylizedWater.vert.wgsl` differ only in wave count — 5 vs. 3 — and a zero-wavelength guard), and
their fragment shaders implement the same Worley-noise edge/intersection foam
(`foamCutoff`/`foamNoiseScale`/`foamNoiseSpeed`/`foamDistance`/`foamColor`) with near-identical
code. `FluidSurfaceMaterial` already claims a broader mandate — its own doc comment says "for
water, lava, or slime" — but nothing in the codebase actually uses it for lava or slime, so that
generalization is unvalidated. A fourth shader set, `Liquid.*.wgsl`/`Liquid.*.glsl`, exists on
disk but is imported by zero TypeScript material — dead weight from an earlier, abandoned attempt
at the same generalization.

We want to add Lava and Slime as shipped materials without a fourth (and fifth) copy of the same
wave/foam math, and we need a documented rule for what future liquid-like materials should look
like.

We looked at how Godot and Unity split this:
- **Godot** ships no water/lava material at all — only generic shading infrastructure
  (`ShaderMaterial`, `SubViewport` for reflection/refraction). Every liquid, realistic or
  stylized, is a community shader built from those primitives.
- **Unity** (HDRP, since 2022.2/2023.1) ships exactly one first-class liquid system — a
  physically-based ocean/river/lake water system with buoyancy hooks — as core engine
  functionality, because the simulation is complex enough to be worth building once and the
  gameplay hook (buoyancy) is generic. Stylized water, lava, swamp, and toxic-waste variants are
  Shader-Graph-based presets/asset-store content layered on the same node graph, not separate
  engine subsystems.

## Decision

We follow the Unity split: **one core mechanism, shipped presets for look**, rather than the
Godot split (no core mechanism at all) or our previous state (N full copies of the mechanism).

**Implementation correction found during rollout:** `OpenWaterMaterial`/`StylizedWaterMaterial`
had already consumed every spare float slot in the fixed `StandardWebGPULayout`/`structs.wgsl`
uniform layout for foam parameters — there was no room left for a new field (e.g. lava's emissive
strength) without changing that struct in lockstep across `DepthPrePassGPU`,
`CascadedShadowPassGPU`, `SpotShadowPassGPU`, `MainRenderPass`, and `WebGLMainPass`, which is a
disproportionate blast radius for this goal. `FluidSurfaceMaterial`, by contrast, only used 3 of
its available uniform slots and had real headroom. So "one core mechanism" is implemented as
**two sibling mechanisms sharing shader text, not one shared uniform layout**:

1. **Wave family** (transparent, refractive): `OpenWaterMaterial` and `StylizedWaterMaterial` now
   both extend `LiquidWaveMaterial`, a shared abstract base holding the common option surface
   (wave1-3, speed, refraction, absorption, foam params) and the identical `getRenderManifest()`
   packing logic that used to be duplicated between the two classes byte-for-byte. Their Gerstner
   wave-displacement and Worley-noise shader code is deduplicated at the **shader-chunk level**
   (the engine's existing `ShaderRegistry.registerChunk()`/`[TOKEN]` mechanism, already used for
   `FOG_CALC`/`PBR_MATH`) via two new chunks: `liquid_gerstner_wave.{wgsl,glsl}` and
   `liquid_worley_noise.{wgsl,glsl}`. Each subclass still supplies its own 6 shader-source files
   (this codebase has no dynamic per-material shader-source composition, only static per-class
   imports), but the actual duplicated *code* inside those files is gone.

2. **Flow family** (opaque/emissive-capable, noise-driven): `FluidSurfaceMaterial` — already
   generalized for "water, lava, or slime" per its own doc comment but previously unused for
   either — is the shared base. `LavaMaterial` and `SlimeMaterial` are thin preset subclasses
   (own `MaterialType`, own default colors/viscosity/flow, reuse `FluidSurfaceMaterial`'s existing
   shader files unmodified except for a new optional emissive-glow term packed into previously
   free uniform slots). Lava sets `transparent = false`/`depthWrite = true` for an opaque molten
   look; Slime keeps the base's transparent/no-depth-write defaults.

3. **Public API stays stable.** `new OpenWaterMaterial(options)` and
   `new StylizedWaterMaterial(options)` keep working unchanged for existing scenes/showcases —
   the consolidation is an internal refactor of what backs those constructors, not a breaking
   rename (see [[project_public_api_surface]]).

4. **Cleanup:** the orphaned `Liquid.*.wgsl`/`Liquid.*.glsl` files (confirmed zero imports
   anywhere in `src/` or `showcases/`) were deleted rather than promoted — they predated and did
   not overlap with the new chunk-based mechanism.

**Note on the enum name:** `MaterialType` is a plain opaque shader-ID string with no
renderer-side dispatch keyed on individual material types (confirmed: `SKYBOX`/`DEPTH` are the
only two special-cased anywhere, purely for cache-lookup purposes) — so despite this ADR's title,
there is no single `LiquidSurfaceMaterial` enum value or class; `LAVA`/`SLIME` were added as
independent enum entries, each material's own type, with no renderer changes required.

## Consequences

- Adding a new liquid look (e.g. a future "toxic sludge") is a preset (colors + a few numeric
  knobs), not a new shader stack — the actual ask that motivated this ADR.
- A wave-math or foam bug fixed once in `LiquidSurfaceMaterial` fixes it for every liquid look,
  instead of needing to be re-applied across N copies (the failure mode that produced the
  drifted 5-wave-vs-3-wave, guarded-vs-unguarded divergence this ADR was written to end).
- `FluidSurfaceMaterial`'s generic ambition is finally exercised by a second real look (lava),
  which either validates its design or forces changes to it — either way it stops being
  unvalidated.
- Cost: one non-trivial refactor touching `OpenWaterMaterial`, `StylizedWaterMaterial`,
  `FluidSurfaceMaterial`, and their shader files across all three renderer backends
  (WebGPU/GLSL/GLSL100), plus resolving whichever fate `Liquid.*` gets.

**Reconsider this if:** a future liquid look needs a genuinely different vertex/fragment
algorithm (not just different colors/coefficients/refractive-vs-emissive) — e.g. a
particle-based or SPH-simulated liquid. That's new work justifying its own material, not a
preset on `LiquidSurfaceMaterial`.

# Hierarchical-Z occlusion culling: WebGPU-only, sphere bounds, one-frame-stale

Hierarchical-Z (HZB) occlusion culling ships for WebGPU only, opt-in via
`EngineOptions.enableOcclusionCulling` (default off). Unlike Clustered Lighting
([0007](0007-clustered-lighting-webgl2-webgpu-only.md)), there is no WebGL2 fallback path at
all -- clustering had a CPU-side analogue (iterate lights, test coverage ranges in JS) that
WebGL2 could run without compute shaders; HZB has no equivalent CPU shortcut. Building the
depth-mip pyramid needs a max-reduction compute pass, and testing object bounds against it needs
per-object compute dispatch with a results buffer read back to the CPU -- both fundamentally
require compute, which WebGL1/WebGL2 don't have. `Object3D.occlusionCulled` is never written on
those backends, so `Scene._collectVisible()`'s occlusion check is a permanent no-op there; no
config gate is needed on that check itself, the field's own default (`false`) is the source of
truth.

The visibility test always lags the depth it's tested against by exactly one frame, and this is
structural, not a shortcut taken for convenience: WebGPU's `GPUBuffer.mapAsync()` for a
GPU-written buffer is *always* asynchronous, so a test dispatched against frame N's own
just-finished depth can, at the very earliest, have its result read back and applied starting
frame N+1. This is the same latency Frostbite and Unreal accept for their own
temporally-reprojected HZB systems -- not a corner this implementation cut. In steady state
(camera moving smoothly, not teleporting) the assumption holds: an object occluded last frame is
overwhelmingly likely to still be occluded this frame.

The test uses each object's bounding **sphere**, not a tight AABB. `BoundingVolume` (the
interface `Object3D.bounds` is typed as) only generically exposes `center`/`getBroadRadius()`
across its three concrete shapes (Box/Sphere/OBB) -- getting a tight axis-aligned box would need
downcasting per bounds type. A sphere is a conservative approximation: it can only ever
*under*-cull (test an object as visible when a tighter box would have found it occluded), never
wrongly hide something the camera can actually see.

The AABB and results buffers (`_hzbAabbBuffer`/`_hzbResultsBuffer`, and the ping-pong
`_hzbStagingBuffers` pair) are fixed-capacity, sized for `MAX_HZB_TESTED_OBJECTS` (8192) --
no dynamic regrowth, no atomics, the same fixed-capacity-no-atomics reasoning 0007 already uses
for the cluster light buffers. Objects beyond the cap (among those that already passed frustum
culling) are simply never occlusion-tested; they always draw, the same safe default
`occlusionCulled`'s own initial value already is.

Occlusion culling only runs for the main canvas pass. `WebGPURenderer._buildHzbPyramid()`/
`_dispatchHzbTest()` both no-op whenever `_activeRenderTarget` is set (reflection probes,
`bakeImposter()`, any other offscreen `RenderTarget`/`RenderTargetCube` render) -- a second HZB
pyramid per render target, rebuilt every time that target renders, would be real additional
scope this iteration deliberately doesn't take on.

**Reconsider this if:** a showcase needs occlusion culling on a heavily-overdrawn offscreen
render target (e.g. a reflection probe scene dense enough that skipping occluded draws there
would matter) -- that needs a per-render-target HZB pyramid, not just reusing the main one. Or if
the one-frame staleness causes visible pop-in on fast camera cuts/teleports -- that needs
explicit HZB invalidation (e.g. clearing `occlusionCulled` scene-wide) on detected large camera
jumps, which isn't part of this ADR's steady-state-only reasoning.

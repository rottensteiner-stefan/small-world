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

`applyPendingOcclusionResults()` reads readiness by polling `GPUBuffer.mapState === "mapped"` on
each pending staging slot directly, every frame -- not by reacting to `mapAsync()`'s own promise
resolving. An earlier version did the latter (set a `resultsReady` flag from the promise's
`.then()`), and it deadlocked: `_hzbStagingSlot` only ever advances on a *new* successful
dispatch, and dispatch refuses to touch a slot still marked pending, so if that promise callback
is ever slow or never fires, the slot -- and with it the whole two-slot ping-pong -- wedges
permanently, without a WebGPU validation error or anything else surfacing the deadlock. Reading
`mapState` (the GPU's own ground truth for the buffer's mappedness, spec-guaranteed to update
whether or not anything is listening for it) has no such failure mode: whichever slot's mapping
has genuinely completed gets consumed on the very next call, regardless of what happened to its
promise.

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

`_dispatchHzbTest()` derives its candidate list by walking the `Scene` it's given directly
(`isVisible && inFrustum && bounds`), rather than reading `FrustumCuller.lastVisibleObjects` --
even though that field exists as exactly this kind of byproduct list. `FrustumCuller`'s fields
are `static`, shared across every `SmallWorld` instance on the page; GadgetInspector's
`MaterialStudioApp` material-preview panel is itself a `SmallWorld` running its own `_loop()`
(and therefore its own `FrustumCuller.cull()`) on its own tiny preview scene, and since
`enableInspector: true` is the default for showcases, it's running alongside almost every scene
this renderer ever tests. Reading the static field meant testing whichever scene's `cull()` ran
last -- almost never the one actually being rendered. The scene-scoped walk costs one extra
recursive traversal per frame; the static field stays as a debug/introspection utility only.

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

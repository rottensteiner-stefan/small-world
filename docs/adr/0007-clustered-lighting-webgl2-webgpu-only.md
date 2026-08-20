# Clustered/tiled forward+ lighting: fixed-capacity grid, WebGPU-only capacity increase

Clustered light culling ships for WebGPU (compute-based) and WebGL2 (CPU-culling + integer
texture lookup) only; WebGL1 keeps the old flat 16-light loop unchanged, with no clustering path
at all -- it has neither compute shaders nor `texelFetch`/integer textures, and Godot's own
Forward+ volumetric fog (a closely related feature) draws the same line on its Mobile/
Compatibility renderers for the same reason.

WebGL2's CPU culling doesn't test every cluster cell against every light (that's ~190k cells x
16 lights per frame in JS at the default grid size) -- for each light it first computes a
screen-space + radial-distance coverage range (`lightClusterCoverage()` in
`src/math/ClusterGrid.ts`, the same formula `cluster_cull.wgsl`'s `lightCoverage()` uses on
WebGPU) and only visits the cells within that range. Both backends therefore share one light-vs-
cluster test, just run on different sides of the GPU/CPU boundary and in a different loop order
(WebGPU: one thread per cell, loop over lights; WebGL2: one JS iteration per light, loop over its
own cell range).

Each cluster cell gets a **fixed-size slot** (`maxLightsPerCluster`, default 32) for light
indices plus a count -- no atomics, no dynamic per-cluster growth. Atomics don't exist on
WebGL2's shader model at all, so an atomics-based design would force WebGPU and WebGL2 onto
architecturally different cluster representations, defeating the point of sharing one
fragment-shader lookup formula across both backends. At the chosen grid defaults (16x16px
tiles, 24 log-spaced Z-slices), a 1080p frame has on the order of 190k cluster cells; at 32
u32 slots each, the point- and spot-light index buffers run to roughly 25 MB apiece on WebGPU.
That's within default WebGPU storage-buffer limits but is a real memory cost, not a
rounding error -- tune `quality.clusteredLighting.tileSize`/`maxLightsPerCluster` down for
memory-constrained targets.

The scene-wide point/spot light cap (`MAX_CLUSTERED_LIGHTS_PER_TYPE`, see
[0004](0004-point-spot-light-global-cap.md)) went from 16 to 64 -- but only WebGPU actually
consumes lights beyond 16. WebGL2's raw per-light UBO array (position/color/etc.) deliberately
stays at its existing 16-slot std140 layout in this iteration: growing that byte-accurate,
hand-computed layout *and* introducing clustering at the same time would have bundled two
independently risky changes into one. Clustering on WebGL2 therefore only ever reduces the
number of lights each fragment iterates over (fewer than 16, picked by proximity); it doesn't
raise WebGL2's ceiling above 16. WebGL1 also stays at 16, unaffected by the higher scene-wide
cap (it clamps its own consumption explicitly).

Disabling clustering (`quality.clusteredLighting.enabled = false`) doesn't need a separate
shader code path: it just collapses the grid to a single 1x1x1 cell covering the whole frustum
with `maxLightsPerCluster` raised to the full light cap, which is mathematically identical to
the old "iterate every light" behavior, computed through the exact same cluster-lookup code.

**Reconsider this if:** a scene needs more than 16 simultaneous lights of one type on WebGL2 --
that requires growing the UBO layout (a new, separately-risky change), not just enabling
clustering. Or if the ~25 MB/light-type buffer cost becomes a real constraint on a target
device -- lower `maxLightsPerCluster` or coarsen `tileSize` first before anything more invasive.

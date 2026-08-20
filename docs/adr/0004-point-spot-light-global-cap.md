# Point/spot light cap is global, not per-object

`PointLight.applyTo()`/`SpotLight.applyTo()` push into one flat, scene-wide array capped at 16
active lights each (`if (16 > data.pLights.length) ...`) — not a per-object "nearest N lights"
selection. Whichever lights happen to get iterated first each frame win; every other light of
that type in the scene contributes nothing, silently, with no warning. We raised the cap from 4
to 16 in one session, but stopped short of true per-object distance-based selection: that would
touch three different upload mechanisms (WebGL2 UBO sub-range per object, WebGL1 uniform
re-upload per object, WebGPU storage-buffer indexing per object) and is a substantially bigger
project — in practice the on-ramp to full Clustered/Tiled Forward+ lighting, not a small
follow-up. The cap is also baked into shader source across all three backends
(`u_pointLights[16]`/`u_spotLights[16]`), so raising it again means touching WebGL2's UBO byte
layout, WebGL1's uniform arrays, and (cheaply, since it's already dynamic there) WebGPU.

**Reconsider this if:** a scene needs more than 16 simultaneous lights of one type, or needs
lights to be selected by actual proximity to each object rather than scene-traversal order —
budget real time for either a coordinated cap increase across all three renderers, or the
per-object selection project described above.

**Update:** the per-object selection project happened — see
[0007](0007-clustered-lighting-webgl2-webgpu-only.md). The scene-wide cap is now 64, but only
WebGPU consumes lights beyond 16 (selected per-cluster by proximity); WebGL2/WebGL1 still only
ever read the first 16.

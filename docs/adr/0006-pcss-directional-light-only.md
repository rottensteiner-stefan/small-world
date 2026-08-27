# PCSS (soft shadows): directional lights everywhere, spot lights on WebGPU only

The blocker-search + variable-radius PCF pass runs for the directional light's primary cascade
on all backends, and (as of this update) for spot lights on WebGPU. The directional light's
secondary cascade-blend sample keeps the older fixed-radius 3x3 PCF everywhere, to avoid doubling
the blocker-search cost in the cascade-blend zone specifically.

**WebGPU spot lights use PCSS** (`getShadowPCSS` in `lighting.wgsl`/`lighting_pbr.wgsl`): the
function is fully generic (`(map: texture_depth_2d_array, samp: sampler_comparison, shadowPos,
layer, bias) -> f32`, no directional-specific uniform access in its body), and
`textureLoad`+`textureSampleCompareLevel` already coexist on the same `texture_depth_2d_array`
binding without a second sampler -- unlike WebGL2 (see below). Swapping the spot-light call from
`getShadowPCF` to `getShadowPCSS` needed no new bindings, no struct changes, nothing beyond the
function name at the two call sites.

**WebGL2 spot lights stay on fixed-radius PCF.** Not a technical blocker: the same
comparison/non-comparison dual-sampler trick already used for the directional light
(`u_dirShadowMap` + `u_dirShadowMapRaw`, a `_rawDepthSampler` WebGLSampler object bound to a
second texture unit with `TEXTURE_COMPARE_MODE = NONE`) would work identically for the 4 spot
shadow maps -- it's pure repetition, not a new mechanism. The actual cost is texture-unit
*budget*: WebGL2 only guarantees 16 image units, and this project already reserves units 8-18
(4x spot compare, 1x directional compare, 1x dummy fallback, 1x directional raw-depth, 4x cluster
grid/index) -- on spec-minimum hardware the cluster system already hits its existing
warn/fallback path before any PCSS work is added. Four more non-comparison spot units would make
that worse, not introduce a new risk.

**WebGL1 has no shadow mapping at all** (no depth textures, no shadow pass, `WEBGL_depth_texture`
unused) -- PCSS there would be a ground-up feature, not an extension of anything.

**Reconsider WebGL2 spot-light PCSS if:** a showcase leans on spot-light shadows as a primary
visual (e.g. a flashlight-driven horror scene) on hardware known to exceed the 16-unit minimum,
where the fixed-PCF edge becomes noticeably worse than the directional/WebGPU-spot PCSS edge next
to it.

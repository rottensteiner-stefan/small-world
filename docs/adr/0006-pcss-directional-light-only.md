# PCSS (soft shadows) covers directional lights only, spot lights stay fixed-radius PCF

The blocker-search + variable-radius PCF pass runs for the directional light's primary cascade
only. Spot-light shadows, and the directional light's secondary cascade-blend sample, both keep
the older fixed-radius 3x3 PCF. Extending PCSS to spot lights would need the same
non-comparison-sampler plumbing again (a second `WebGLSampler`/texture-unit pair on WebGL2 for
each of up to 4 spot shadow maps; WebGPU needs no extra plumbing there either way via
`textureLoad`) for a light type that, in the current showcases, casts shadows less prominently
and less often than the directional light. The blend-sample was left on fixed PCF too, to avoid
doubling the blocker-search cost in the cascade-blend zone specifically.

**Reconsider this if:** a showcase leans on spot-light shadows as a primary visual (e.g. a
flashlight-driven horror scene) where the fixed-PCF edge becomes noticeably worse than the
directional light's PCSS edge next to it.

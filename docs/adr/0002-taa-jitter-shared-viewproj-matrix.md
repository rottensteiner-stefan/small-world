# TAA jitter is baked into the shared view-projection matrix, not a separate one

`Camera.jitterX`/`jitterY` are added directly into `Camera._viewProjMatrix` inside
`updateViewMatrix()` — the same matrix used for culling (`FrustumCuller`), and read by HBAO's
view-space reconstruction. We did not introduce a second, unjittered matrix for those other
consumers. The reasoning: TAA's sub-pixel jitter (well under one texel) is negligible for
frustum culling (no meaningful risk of wrongly culling/keeping an object) and for HBAO's depth
reconstruction (the resulting occlusion error is imperceptible), so paying for a second matrix
computed and threaded through every frame — for every camera, every shadow pass, every AO pass —
bought nothing. Shadow-map matrices are unaffected either way, since they come from each light's
own camera, never the main camera's `_viewProjMatrix`.

**Reconsider this if:** a future effect reads the view-projection matrix in a way where
sub-pixel error actually matters (e.g. precise screen-space picking at sub-pixel accuracy), or
if TAA's jitter amplitude is ever increased beyond roughly one texel.

# Config sub-structures use named keys, not `{ type, ... }` arrays

When a config object groups several "kinds" of settings (post-processing effects, renderer
backends), we key them by name (`effects: { bloom: {...}, vignette: {...} }`,
`renderer: { WEB_GPU: {...}, WEB_GL2: {...} }`) instead of a `type`-tagged array
(`effects: [{ type: "bloom", ... }]`). We hit this twice in one session
(`PostProcessingConfig.effects`, `EngineOptions.renderer`) and both times the array shape was
actively misleading: it implied an order the code didn't actually use — post-processing's
effect chain is fixed inside the shader (Bloom → HBAO → Tonemapping → Vignette → Grain →
Quantize) regardless of config order, and the renderer fallback chain
(WebGPU → WebGL2 → WebGL1) is hardcoded in `RendererFactory`, with the array only ever queried
via `.find(x => x.type === ...)` — a keyed lookup wearing an ordered-list costume. Named keys
also give per-kind type safety without a discriminated union, and structurally rule out
duplicate/conflicting entries for the same kind.

**When this doesn't apply:** if order is genuinely semantically meaningful (e.g. a real
priority-fallback list the code iterates in sequence), an array is the right and honest choice
— don't force everything into named keys reflexively. Check first whether the code actually
reads the array's order before assuming it does.

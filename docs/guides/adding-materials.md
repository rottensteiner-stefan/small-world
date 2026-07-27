# Adding a New Material

This guide is for engine contributors: it explains how a new material gets added to Small World, not how to use the built-in ones (see [Materials & Shaders](/guides/materials) for that).

## Two ways to add a material

**`CustomShaderMaterial`** — write raw shader source(s) and hand them to a single, ready-made material class. No new TypeScript class, no engine changes. Good for one-off effects, Shadertoy/ComputeToys imports, or prototyping.

**A new `AbstractMaterial` subclass** — write a proper TypeScript class with typed constructor options and public properties (`material.roughness = 0.4`, etc.), backed by its own shader. Good for anything meant to be reused across a project, documented, and exported from the engine.

The rest of this guide covers the second path — it's also what `CustomShaderMaterial` does internally, just without a dedicated class wrapping it.

## The two methods every material implements

`AbstractMaterial` (`src/core/materials/AbstractMaterial.ts`) requires exactly two methods:

```typescript
public abstract getRenderManifest(): RenderManifest;
public abstract getShaderDefinition(): ShaderDefinition;
```

`getShaderDefinition()` is called once per shader variant and describes the shader itself: its source code for each renderer dialect, and its `layout` (which uniforms and textures it expects). `getRenderManifest()` is called every frame and returns the *current values* for those uniforms/textures — the renderer only ever reads this manifest, it never inspects your material's fields directly.

A minimal real example, trimmed from `PhongMaterial.ts`:

```typescript
public override getShaderDefinition(): ShaderDefinition {
  return {
    id: this.type, // a unique string ID, e.g. MaterialType.PHONG or your own string
    sources: {
      glsl300: { vs: "[BASE_VERTEX_HEADER][BASE_VERTEX_MAIN]", fs: fragGLSL },
      glsl100: { vs: "[BASE_VS]", fs: fragGLSL100 },
      wgsl: `[WGSL_STRUCTS]\n[WGSL_PBR_MATH]\n[WGSL_VS]\n${fragWGSL}`,
    },
    layout: {
      ...StandardWebGPULayout,
      textures: {
        u_diffuseMap: { type: ShaderPropertyType.TEXTURE },
        u_normalMap: { type: ShaderPropertyType.TEXTURE },
        u_specularMap: { type: ShaderPropertyType.TEXTURE },
      },
    },
  };
}

public override getRenderManifest(): RenderManifest {
  if (undefined === this._renderManifest) this._renderManifest = this._createBaseManifest();
  this._syncBaseManifestState();

  const props = this._renderManifest.properties as Record<string, unknown>;
  const texs = this._renderManifest.textures as Record<string, unknown>;
  props["u_color"] = this.color.toFloat32Array();
  props["u_shininess"] = this.shininess;
  texs["u_diffuseMap"] = this.diffuseMap;
  return this._renderManifest;
}
```

`AbstractMaterial._createBaseManifest()`/`_syncBaseManifestState()` pre-fill the properties every material shares (color, culling, blending, fog params, ...) — call them first and only overwrite what your material actually adds.

The `[BASE_VERTEX_HEADER]`, `[WGSL_PBR_MATH]`, etc. tokens are shared shader chunks registered in `CoreShaderChunks.ts` and expanded by `ShaderRegistry.instance.assemble()`. Reuse them instead of re-deriving lighting/fog/PBR math by hand.

## The three shader dialects

A material can supply up to three independent shader sources: `wgsl` (WebGPU), `glsl300` (WebGL2), `glsl100` (WebGL1). Each renderer only ever compiles its own dialect — there is no auto-transpiler between them. A material only needs to support the renderers it cares about; if `glsl100` is omitted, that material simply throws when the app runs under `WebGL1Renderer` (this is deliberate for e.g. Shadertoy imports that are WGSL-only, see `CustomShaderMaterial`).

Because the three sources are maintained by hand and independently, they *will* drift — a uniform present in the WGSL version but missing (or misspelled) in the GLSL300 version is a common source of bugs, and it won't show up as a compile error, just as a texture/uniform silently not being set. After changing or adding a material's shaders, run:

```bash
npm run build:showcases && npm run preview
node .agents/scratches/sweep-renderer.mjs WEB_GL1
node .agents/scratches/sweep-renderer.mjs WEB_GL2
```

against a showcase that uses the material, for both renderer dialects. It loads every showcase headless and reports real GL compile/link/`GL_INVALID_OPERATION` errors — the project's own `npm run test:showcases` cannot initialize WebGL2 in this sandbox and silently falls back to WebGL1, so it will not catch a WebGL2-only shader bug.

## Uniform and texture binding is automatic

The WebGL1/WebGL2 renderers discover a compiled shader's uniforms and sampler texture units by asking the linked GPU program directly (`gl.getActiveUniform`), instead of consulting a hand-maintained list of expected names. This means: **once a uniform or texture is declared in your shader source and listed in `layout.uniforms`/`layout.textures`, it "just works"** — nothing in `WebGL1Renderer.ts`/`WebGL2Renderer.ts` needs to be touched to support it, and there's no internal name list to forget updating.

The one thing that still has to match by convention: the property/texture keys you write into `getRenderManifest()` (e.g. `texs["u_diffuseMap"]`) must be spelled exactly like the corresponding `uniform sampler2D u_diffuseMap;` in the shader source. A mismatch isn't a compile error — the uniform is simply never written, so the sampler keeps whatever the GPU driver defaults it to.

If a name in `layout.uniforms`/`layout.textures` has no matching active uniform in the compiled shader (typo, or the shader compiler optimized it away because it's genuinely unused), `WebGL1Renderer` logs a console warning naming the mismatch — a fast way to catch a typo without having to bisect the render output.

Cube vs. 2D textures are also detected automatically from the shader's declared sampler type (`samplerCube` vs. `sampler2D`), not from the uniform's name — so a new cube-sampler uniform doesn't need a name-based special case either.

Shadow-map and IBL (irradiance/prefilter/BRDF) samplers are the one exception: they're scene-global rather than per-material, and are bound by dedicated code paths in `WebGL2Renderer` using fixed texture units, independent of whatever a new material declares. You don't need to do anything for this — it only matters if you're modifying the shadow/IBL system itself.

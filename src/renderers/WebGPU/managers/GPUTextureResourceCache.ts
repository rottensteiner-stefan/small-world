import { CubeTexture, Object3D, Texture, TextureArray } from "../../../core/index.js";
import { RenderTarget, RenderTargetCube } from "../../../core/textures/index.js";
import { QualityConfig } from "../../../interfaces/index.js";
import { TextureFilter, TextureWrap } from "../../../enums/index.js";
import { GPUFallbackResources } from "./GPUFallbackResources.js";
import mipDownsampleWGSL from "../../../core/materials/shaders/MipDownsample.frag.wgsl?raw";
import fullscreenVertWGSL from "../../../core/materials/shaders/PostProcess.vert.wgsl?raw";

/**
 * Uploaded-texture GPU state: per-`Texture`/`CubeTexture` view caches (with refcounting so a
 * texture shared by multiple objects is only destroyed once nothing references it anymore),
 * the draw-time sampler cache, and runtime mip-chain generation (WebGPU has no
 * `generateMipmap()` equivalent to WebGL2's).
 *
 * Extracted from `WebGPURenderer` -- see .agents/collaborate/god-objects-refactoring.md Phase 4.
 * No behavior change. `RenderTarget`/`RenderTargetCube` GPU textures are NOT owned here (their
 * lifecycle belongs to `WebGPURenderer`'s own per-frame render-target logic) -- but a view of
 * each is registered here too via `registerRenderTargetTexture()`/`registerRenderTargetCubeTexture()`
 * so a render target sampled as an ordinary material texture (portals, mirrors, reflection
 * probes) resolves through the same `getTextureView()`/`getCubeTextureView()` lookup as any
 * other texture.
 */
export class GPUTextureResourceCache {
  private readonly _device: GPUDevice;
  private readonly _fallback: GPUFallbackResources;

  private _textureViewCache = new Map<
    Texture,
    { texture: GPUTexture; view: GPUTextureView; mipLevelCount: number }
  >();
  private _cubeTextureViewCache = new Map<
    CubeTexture,
    { texture: GPUTexture; view: GPUTextureView }
  >();
  private _texRefCounts: Map<Texture, number> = new Map();
  private _texCubeRefCounts: Map<CubeTexture, number> = new Map();
  private _lastKnownTextures: WeakMap<Object3D, Record<string, Texture | CubeTexture | undefined>> =
    new WeakMap();
  private _samplerCache: Map<string, GPUSampler> = new Map();

  /** GPU-side mip-chain generator for runtime 2D textures -- one bilinear blit per level, see
   * `_generateMipmaps()`. */
  private readonly _mipGenPipeline: GPURenderPipeline;
  private readonly _mipGenBGL: GPUBindGroupLayout;
  private readonly _mipGenSampler: GPUSampler;

  constructor(device: GPUDevice, fallback: GPUFallbackResources) {
    this._device = device;
    this._fallback = fallback;

    this._mipGenBGL = device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.FRAGMENT, sampler: {} },
        { binding: 1, visibility: GPUShaderStage.FRAGMENT, texture: {} },
      ],
    });
    this._mipGenPipeline = device.createRenderPipeline({
      layout: device.createPipelineLayout({ bindGroupLayouts: [this._mipGenBGL] }),
      vertex: {
        module: device.createShaderModule({ code: fullscreenVertWGSL }),
        entryPoint: "vs_main",
      },
      fragment: {
        module: device.createShaderModule({ code: mipDownsampleWGSL }),
        entryPoint: "fs_main",
        targets: [{ format: "rgba8unorm" }],
      },
      primitive: { topology: "triangle-list" },
    });
    // Always clamp-to-edge, independent of the texture's own wrap mode -- prevents edge
    // bleeding while downsampling. Separate from `getSampler()`'s draw-time sampler cache.
    this._mipGenSampler = device.createSampler({
      magFilter: TextureFilter.LINEAR,
      minFilter: TextureFilter.LINEAR,
      addressModeU: TextureWrap.CLAMP_TO_EDGE,
      addressModeV: TextureWrap.CLAMP_TO_EDGE,
    });
  }

  public getSampler(tex: Texture | undefined): GPUSampler {
    const mag =
      tex?.magFilter === TextureFilter.NEAREST ? TextureFilter.NEAREST : TextureFilter.LINEAR;
    const min =
      tex?.minFilter === TextureFilter.NEAREST ? TextureFilter.NEAREST : TextureFilter.LINEAR;
    const mapWrap = (w: TextureWrap | undefined): GPUAddressMode => {
      if (w === TextureWrap.REPEAT) return TextureWrap.REPEAT;
      if (w === TextureWrap.MIRRORED_REPEAT) return TextureWrap.MIRRORED_REPEAT;
      return TextureWrap.CLAMP_TO_EDGE;
    };
    const u = mapWrap(tex?.addressModeU);
    const v = mapWrap(tex?.addressModeV);
    const key = mag + "_" + min + "_" + u + "_" + v;
    let s = this._samplerCache.get(key);
    if (!s) {
      s = this._device.createSampler({
        magFilter: mag,
        minFilter: min,
        addressModeU: u,
        addressModeV: v,
        mipmapFilter: TextureFilter.LINEAR,
      });
      this._samplerCache.set(key, s);
    }
    return s;
  }

  public getTextureView(tex: Texture | undefined, quality: QualityConfig | undefined): GPUTextureView {
    if (quality?.disableTextures) return this._fallback.whiteTextureView;
    if (!tex || !tex.isLoaded) return this._fallback.whiteTextureView;
    // A `RenderTarget` (e.g. `PlanarReflectionNode.renderTarget`, or a `bakeImposter()` output)
    // has no `.image` -- its GPU texture already exists from being rendered into (populated via
    // `registerRenderTargetTexture()`), so it's looked up instead of uploaded. Mirrors
    // `getCubeTextureView()`'s identical `RenderTargetCube` branch just below.
    if (tex instanceof RenderTarget) {
      const rtEntry = this._textureViewCache.get(tex);
      return rtEntry?.view || this._fallback.whiteTextureView;
    }
    if (!tex.image) return this._fallback.whiteTextureView;
    let entry = this._textureViewCache.get(tex);
    if (!entry) {
      let t: GPUTexture;
      let v: GPUTextureView;
      if ("isTextureArray" in tex && (tex as TextureArray).isTextureArray) {
        const texArray = tex as TextureArray;
        const width = texArray.image!.width;
        const height = texArray.image!.height;
        const depth = texArray.images.length;

        t = this._device.createTexture({
          size: [width, height, depth],
          format: "rgba8unorm",
          usage:
            GPUTextureUsage.TEXTURE_BINDING |
            GPUTextureUsage.COPY_DST |
            GPUTextureUsage.RENDER_ATTACHMENT,
        });

        for (let i = 0; i < depth; i++) {
          this._device.queue.copyExternalImageToTexture(
            {
              source: texArray.images[i] as
                ImageBitmap | HTMLImageElement | HTMLCanvasElement | OffscreenCanvas,
            },
            { texture: t, origin: [0, 0, i] },
            [width, height],
          );
        }
        v = t.createView({ dimension: "2d-array" });
        entry = { texture: t, view: v, mipLevelCount: 1 };
      } else {
        const mipLevelCount =
          quality?.mipmapping && tex.generateMipmaps
            ? this.computeMipLevelCount(tex.image.width, tex.image.height)
            : 1;
        t = this._device.createTexture({
          size: [tex.image.width, tex.image.height],
          format: "rgba8unorm",
          mipLevelCount,
          usage:
            GPUTextureUsage.TEXTURE_BINDING |
            GPUTextureUsage.COPY_DST |
            GPUTextureUsage.RENDER_ATTACHMENT,
        });
        this._device.queue.copyExternalImageToTexture({ source: tex.image }, { texture: t }, [
          tex.image.width,
          tex.image.height,
        ]);
        if (mipLevelCount > 1) this._generateMipmaps(t, mipLevelCount);
        v = t.createView();
        entry = { texture: t, view: v, mipLevelCount };
      }
      this._textureViewCache.set(tex, entry);
    } else if (
      tex.needsUpdate &&
      !("isTextureArray" in tex && (tex as TextureArray).isTextureArray)
    ) {
      this._device.queue.copyExternalImageToTexture(
        { source: tex.image },
        { texture: entry.texture },
        [tex.image.width, tex.image.height],
      );
      if (entry.mipLevelCount > 1) this._generateMipmaps(entry.texture, entry.mipLevelCount);
      tex.needsUpdate = false;
    }
    return entry.view;
  }

  public getNormalTextureView(tex: Texture | undefined): GPUTextureView {
    if (!tex || !tex.isLoaded || !tex.image) return this._fallback.flatNormalTextureView;
    return this.getTextureView(tex, undefined);
  }

  public getCubeTextureView(
    tex: CubeTexture | undefined,
    quality: QualityConfig | undefined,
  ): GPUTextureView {
    if (quality?.disableTextures) return this._fallback.defaultCubeTextureView;
    if (!tex || !tex.isLoaded) return this._fallback.defaultCubeTextureView;
    if (tex instanceof RenderTargetCube) {
      const entry = this._cubeTextureViewCache.get(tex);
      return entry?.view || this._fallback.defaultCubeTextureView;
    }
    if (tex.images.length !== 6 && tex.mipmaps.length === 0) return this._fallback.defaultCubeTextureView;
    let entry = this._cubeTextureViewCache.get(tex);
    if (!entry) {
      const img = tex.mipmaps.length > 0 ? tex.mipmaps[0]![0]! : tex.images[0]!;
      const mipLevelCount = tex.mipmaps.length > 0 ? tex.mipmaps.length : 1;
      const t = this._device.createTexture({
        size: [img.width, img.height, 6],
        format: "rgba8unorm",
        mipLevelCount,
        usage:
          GPUTextureUsage.TEXTURE_BINDING |
          GPUTextureUsage.COPY_DST |
          GPUTextureUsage.RENDER_ATTACHMENT,
      });

      const baseImages = tex.mipmaps.length > 0 ? tex.mipmaps[0]! : tex.images;
      for (let i = 0; i < 6; i++) {
        this._device.queue.copyExternalImageToTexture(
          { source: baseImages[i]! },
          { texture: t, mipLevel: 0, origin: [0, 0, i] },
          [img.width, img.height],
        );
      }

      for (let m = 1; m < mipLevelCount; m++) {
        const mipImages = tex.mipmaps[m]!;
        const mipSize = Math.max(1, Math.floor(img.width / Math.pow(2, m)));
        for (let i = 0; i < 6; i++) {
          this._device.queue.copyExternalImageToTexture(
            { source: mipImages[i]! },
            { texture: t, mipLevel: m, origin: [0, 0, i] },
            [mipSize, mipSize],
          );
        }
      }
      entry = { texture: t, view: t.createView({ dimension: "cube" }) };
      this._cubeTextureViewCache.set(tex, entry);
    }
    return entry.view;
  }

  /** Called from `WebGPURenderer.render()`'s offscreen-render-target branch once a
   * `RenderTarget`'s GPU texture (re)exists, so `getTextureView()` can find it when the render
   * target is later sampled as an ordinary material texture. */
  public registerRenderTargetTexture(rt: RenderTarget, texture: GPUTexture, view: GPUTextureView): void {
    this._textureViewCache.set(rt, { texture, view, mipLevelCount: 1 });
  }

  /** Cube counterpart of `registerRenderTargetTexture()`. */
  public registerRenderTargetCubeTexture(
    rt: RenderTargetCube,
    texture: GPUTexture,
    view: GPUTextureView,
  ): void {
    this._cubeTextureViewCache.set(rt, { texture, view });
  }

  /**
   * Tracks that `obj` currently depends on the textures in `textures` (typically
   * `material.getRenderManifest().textures`). Called once per object per frame from
   * the render loop. `textures` is diffed key-by-key against `obj`'s last-known
   * snapshot rather than by container reference, since a material's manifest object
   * is created once and mutated in place on every `getRenderManifest()` call.
   */
  public acquireTextures(
    obj: Object3D,
    textures: Record<string, Texture | CubeTexture | undefined>,
  ): void {
    const lastTextures = this._lastKnownTextures.get(obj);
    const snapshot: Record<string, Texture | CubeTexture | undefined> = {};

    for (const key of Object.keys(textures)) {
      const current = textures[key];
      const last = lastTextures?.[key];
      if (current !== last) {
        if (last) this._releaseTexture(last);
        if (current) this._acquireTexture(current);
      }
      snapshot[key] = current;
    }

    this._lastKnownTextures.set(obj, snapshot);
  }

  public releaseObjectTextures(obj: Object3D): void {
    const textures = this._lastKnownTextures.get(obj);
    if (!textures) return;
    this._lastKnownTextures.delete(obj);
    for (const tex of Object.values(textures)) {
      if (tex) this._releaseTexture(tex);
    }
  }

  private _acquireTexture(tex: Texture | CubeTexture): void {
    if (tex instanceof CubeTexture) {
      this._texCubeRefCounts.set(tex, (this._texCubeRefCounts.get(tex) ?? 0) + 1);
    } else {
      this._texRefCounts.set(tex, (this._texRefCounts.get(tex) ?? 0) + 1);
    }
  }

  private _releaseTexture(tex: Texture | CubeTexture): void {
    // Render targets are backed by the same Texture/CubeTexture base classes (so they
    // can be assigned directly to a material, e.g. for portals/mirrors/reflection
    // probes) but are re-rendered into and reused across frames independently of any
    // one object's material reference -- their lifecycle belongs to whoever owns the
    // render target, not to this per-object refcount. Only untrack our reference to
    // it, never destroy the underlying GPUTexture here.
    if (tex instanceof RenderTarget || tex instanceof RenderTargetCube) return;

    if (tex instanceof CubeTexture) {
      const count = (this._texCubeRefCounts.get(tex) ?? 1) - 1;
      if (count <= 0) {
        this._cubeTextureViewCache.get(tex)?.texture.destroy();
        this._cubeTextureViewCache.delete(tex);
        this._texCubeRefCounts.delete(tex);
      } else {
        this._texCubeRefCounts.set(tex, count);
      }
    } else {
      const count = (this._texRefCounts.get(tex) ?? 1) - 1;
      if (count <= 0) {
        this._textureViewCache.get(tex)?.texture.destroy();
        this._textureViewCache.delete(tex);
        this._texRefCounts.delete(tex);
      } else {
        this._texRefCounts.set(tex, count);
      }
    }
  }

  /** `1 + floor(log2(max(w, h)))` -- the standard (and WebGPU-max-valid) full mip chain length
   * down to a 1x1 level. Texture minification wants the complete chain (unlike e.g.
   * `BloomPassGPU`'s capped chain, a performance choice for a per-frame blur). Also reused by
   * `WebGPURenderer.setSize()` to size the (unrelated) HZB occlusion pyramid -- same formula,
   * one owner. */
  public computeMipLevelCount(width: number, height: number): number {
    return 1 + Math.floor(Math.log2(Math.max(width, height)));
  }

  /** Renders `texture`'s mip chain (levels `1..mipLevelCount-1`) from the already-uploaded
   * level 0, one bilinear fullscreen blit per level -- WebGPU has no `generateMipmap()`
   * equivalent to WebGL2's `gl.generateMipmap()` (same technique as Toji's `webgpu-utils`
   * `generateMips`). Runs on its own throwaway `GPUCommandEncoder` with an immediate
   * `queue.submit()`, decoupled from the frame's main encoder: callers (`getTextureView()`) run
   * mid-frame, while the main render pass may already be open, and WebGPU only allows one open
   * render pass per encoder at a time. `queue` operations are ordered, so this submit is
   * guaranteed visible to the main pass's later sampling of this texture. */
  private _generateMipmaps(texture: GPUTexture, mipLevelCount: number): void {
    const ce = this._device.createCommandEncoder();
    for (let level = 1; level < mipLevelCount; level++) {
      const srcView = texture.createView({ baseMipLevel: level - 1, mipLevelCount: 1 });
      const dstView = texture.createView({ baseMipLevel: level, mipLevelCount: 1 });
      const bg = this._device.createBindGroup({
        layout: this._mipGenBGL,
        entries: [
          { binding: 0, resource: this._mipGenSampler },
          { binding: 1, resource: srcView },
        ],
      });
      const rp = ce.beginRenderPass({
        colorAttachments: [
          {
            view: dstView,
            loadOp: "clear",
            storeOp: "store",
            clearValue: { r: 0, g: 0, b: 0, a: 0 },
          },
        ],
      });
      rp.setPipeline(this._mipGenPipeline);
      rp.setBindGroup(0, bg);
      rp.draw(3);
      rp.end();
    }
    this._device.queue.submit([ce.finish()]);
  }

  public dispose(): void {
    for (const entry of this._textureViewCache.values()) entry.texture.destroy();
    this._textureViewCache.clear();
    this._samplerCache.clear();
    for (const entry of this._cubeTextureViewCache.values()) entry.texture.destroy();
    this._cubeTextureViewCache.clear();
  }
}

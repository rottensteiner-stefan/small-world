import { WebGL2UniformBuffer } from "./WebGL2UniformBuffer.js";
import { WebGL2DepthFrameBuffer } from "./WebGL2DepthFrameBuffer.js";
import { WebGL2FrameBuffer } from "./WebGL2FrameBuffer.js";
import { WebGL2CubeFrameBuffer } from "./WebGL2CubeFrameBuffer.js";
import { AbstractWebGLRenderer } from "../AbstractWebGLRenderer.js";
import { WebGLShadowPass } from "../passes/WebGLShadowPass.js";
import { WebGLMainPass } from "../passes/WebGLMainPass.js";
import { WebGLPostProcessPass } from "../passes/WebGLPostProcessPass.js";
import {
  PostProcessPassGL,
  BloomPassGL,
  AOPassGL,
  HistoryBlendPassGL,
} from "../post/passes/index.js";
import { AbstractLight } from "../../core/lights/index.js";
import { CubeTexture, Texture, RenderTarget, RenderTargetCube } from "../../core/textures/index.js";
import { ShaderRegistry, RenderManifest } from "../../core/renderers/shaders/index.js";
import { Color } from "../../core/colors/index.js";
import {
  DeviceCaps,
  DeviceLimit,
  InstancedMesh,
  Object3D,
  Scene,
  TextureArray,
} from "../../core/index.js";
import { DepthMaterial } from "../../core/materials/index.js";
import {
  EngineOptions,
  GeometryDataInterface,
  LightDataInterface,
} from "../../interfaces/index.js";
import {
  BlendingMode,
  CullMode,
  MaterialType,
  RendererType,
  TextureFilter,
  TextureWrap,
  Topology,
  PostProcessingEffectType,
} from "../../enums/index.js";
import { Mesh } from "../Mesh.js";
import { MathPool, Vector3D } from "../../math/index.js";

interface ProgramCache {
  prog: WebGLProgram;
  uniforms: Map<string, WebGLUniformLocation | undefined>;
  attributes: Map<string, number>;
  /** Texture unit assigned to each active sampler uniform in THIS program, discovered via introspection. */
  samplerUnits: Map<string, number>;
  /** GL sampler type (SAMPLER_2D/SAMPLER_CUBE/...) of each active sampler uniform in THIS program. */
  samplerTypes: Map<string, number>;
  /** Number of live Object3D instances currently referencing this compiled program. */
  refCount: number;
}

/**
 * WebGL 2.0 implementation of the renderer.
 */
export class WebGL2Renderer extends AbstractWebGLRenderer {
  /** @inheritdoc */
  public override readonly type: RendererType = RendererType.WEB_GL2;
  declare protected gl: WebGL2RenderingContext;

  private _programs: Map<string, ProgramCache> = new Map();

  private _cache: Map<GeometryDataInterface, Mesh> = new Map();
  private _lastKnownGeometry: WeakMap<Object3D, GeometryDataInterface> = new WeakMap();
  private _lastKnownProgramKey: WeakMap<Object3D, string> = new WeakMap();
  private _texCache: Map<Texture, WebGLTexture> = new Map();
  private _texCubeCache: Map<CubeTexture, WebGLTexture> = new Map();
  private _texRefCounts: Map<Texture, number> = new Map();
  private _texCubeRefCounts: Map<CubeTexture, number> = new Map();
  private _lastKnownTextures: WeakMap<Object3D, Record<string, Texture | CubeTexture | undefined>> =
    new WeakMap();
  private _instanceBuffers: WeakMap<InstancedMesh, WebGLBuffer> = new WeakMap();
  private _instanceDataBuffers: WeakMap<InstancedMesh, WebGLBuffer> = new WeakMap();
  private _scratchTransparentMap: Map<string, Object3D[]> = new Map();

  private _scratchFloat4: Float32Array = new Float32Array(4);

  /**
   * Texture units 8-13 are permanently reserved for the shadow system (4x spot shadow atlas +
   * 1x directional/CSM atlas + 1x dummy fallback), which binds them via hardcoded `activeTexture`
   * calls in `_bindDummyShadowMaps`/`_renderSubgroup` rather than through `ProgramCache.samplerUnits`.
   * The dynamic sampler-unit assignment in `_getProgram` skips this range for every other sampler so
   * an unrelated material texture can never land on the same unit as an active shadow sampler --
   * two ACTIVE samplers of different types sharing a unit is a GL_INVALID_OPERATION at draw time
   * regardless of what's actually bound there.
   */
  private static readonly _RESERVED_SHADOW_UNIT_START = 8;
  private static readonly _RESERVED_SHADOW_UNIT_END = 14;

  /** Fixed unit for reading the directional shadow map's raw (non-comparison) depth, used by
   * PCSS's blocker-search step. Shares texture unit 14 -- reserved above like every other
   * shadow unit -- with a dedicated WebGLSampler (`_rawDepthSampler`) that overrides
   * TEXTURE_COMPARE_MODE back to NONE, since that mode is otherwise baked onto the depth
   * texture object itself (see WebGL2DepthFrameBuffer). */
  private static readonly _RAW_DEPTH_UNIT = 14;
  private _rawDepthSampler!: WebGLSampler;

  public _opaqueTexture?: WebGLTexture;
  public _opaqueTextureWrapper?: Texture;
  private _opaqueDepthTexture?: WebGLTexture;
  private _opaqueDepthFbo?: WebGLFramebuffer;
  private _opaqueDepthWidth: number = 0;
  private _opaqueDepthHeight: number = 0;
  protected _hdrFbo: WebGL2FrameBuffer | undefined = undefined;
  protected _postPassGL: PostProcessPassGL | undefined = undefined;
  protected _bloomPassGL: BloomPassGL | undefined = undefined;
  protected _hbaoPassGL: AOPassGL | undefined = undefined;
  protected _taaPassGL: HistoryBlendPassGL | undefined = undefined;
  protected _motionTrailPassGL: HistoryBlendPassGL | undefined = undefined;

  protected _activeRenderTarget: RenderTarget | RenderTargetCube | null = null;
  protected _activeCubeFace: number = 0;
  private _renderTargetFbos: Map<RenderTarget, WebGL2FrameBuffer> = new Map();
  private _renderTargetCubeFbos: Map<RenderTargetCube, WebGL2CubeFrameBuffer> = new Map();

  private _scratchModelMatrix: Float32Array = new Float32Array(16);

  private _globalUBO!: WebGL2UniformBuffer;

  private _stateCullFaceEnabled: boolean | null = null;
  private _stateCullFaceMode: number = -1;
  private _stateBlendEnabled: boolean | null = null;
  private _stateBlendSrc: number = -1;
  private _stateBlendDst: number = -1;
  private _stateDepthMask: boolean | null = null;
  private _stateDepthTest: boolean | null = null;

  private _shadowMaps: Map<AbstractLight, WebGL2DepthFrameBuffer> = new Map();
  private _dummyShadowMap!: WebGL2DepthFrameBuffer;

  /**
   * Dedicated black cube fallback for `u_irradianceMap`/`u_prefilterMap` when a scene has no real
   * IBL data. `Standard.frag.glsl`'s PBR chunk detects "no IBL bound" via `length(irradiance) <
   * 0.001` and only then falls back to `u_ambientColor` + a Fresnel-weighted `u_envMap` sample --
   * reusing the generic `defaultCubeTexture` (a visibly-fake placeholder purple, RGB 50/50/100, so
   * missing skyboxes/envMaps are easy to spot) here would make that length check never trip, so the
   * shader would treat the placeholder color as real diffuse+specular lighting data instead.
   */
  private _blackCubeTexture!: WebGLTexture;
  /**
   * Dedicated `u_brdfLUT` fallback: (scale=1, bias=0) in the .rg channels the shader reads, so
   * `specularAmbient` reduces to `prefilteredColor * kS_ambient` with no unintended `+1` bias term.
   * The generic `defaultTexture` (opaque white, RGBA 255/255/255/255) would supply (scale=1,
   * bias=1) instead. Matches `WebGPURenderer._defaultBrdfTexView`'s convention exactly.
   */
  private _defaultBrdfTexture!: WebGLTexture;

  /** Cached once at init instead of re-querying `DeviceCaps` on every texture bind. */
  private _maxTextureUnits: number = 0;
  /** `${uniformName}:${unit}` keys already warned about in `_isTextureUnitAvailable`. */
  private _warnedTextureUnits: Set<string> = new Set();

  /** @inheritdoc */
  public async initialize(
    canvas: HTMLCanvasElement,
    attributes?: Record<string, unknown>,
    config?: EngineOptions,
  ): Promise<void> {
    const gl = canvas.getContext("webgl2", attributes);
    if (!gl) throw new Error("[WebGL2Renderer] WebGL2 context could not be initialized.");
    this.gl = gl as WebGL2RenderingContext;

    if (config?.quality) {
      this._quality = { ...this._quality, ...config.quality };
    }
    if (config?.postProcessing) {
      this.postProcessing.loadConfig(config.postProcessing);
    }

    this._maxTextureUnits = DeviceCaps.getLimit(DeviceLimit.MAX_TEXTURE_IMAGE_UNITS);

    this._dummyShadowMap = new WebGL2DepthFrameBuffer(this.gl, 1, 1);
    this._dummyShadowMap.bind();
    this.gl.clear(this.gl.DEPTH_BUFFER_BIT);
    this._dummyShadowMap.unbind();

    // Sampler object overriding TEXTURE_COMPARE_MODE to NONE, bound once to a fixed unit so any
    // depth texture bound there afterwards reads as a plain float instead of a 0/1 comparison --
    // sampler objects take precedence over a texture's own parameters for the unit they're bound to.
    this._rawDepthSampler = this.gl.createSampler()!;
    this.gl.samplerParameteri(this._rawDepthSampler, this.gl.TEXTURE_COMPARE_MODE, this.gl.NONE);
    this.gl.samplerParameteri(this._rawDepthSampler, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
    this.gl.samplerParameteri(this._rawDepthSampler, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
    this.gl.samplerParameteri(this._rawDepthSampler, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
    this.gl.samplerParameteri(this._rawDepthSampler, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
    this.gl.bindSampler(WebGL2Renderer._RAW_DEPTH_UNIT, this._rawDepthSampler);

    this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, false);
    this.initDefaultTextures();
    this._initIblFallbackTextures();
    this.gl.enable(this.gl.DEPTH_TEST);

    // Pre-register internal materials
    new DepthMaterial();

    this._globalUBO = new WebGL2UniformBuffer(this.gl, 2144, 0);

    this.addPass(new WebGLShadowPass());
    this.addPass(new WebGLMainPass());
    this.addPass(new WebGLPostProcessPass());
  }

  /** Builds the black cube / (scale=1, bias=0) fallbacks used when a scene has no real IBL data. */
  private _initIblFallbackTextures(): void {
    this._blackCubeTexture = this.gl.createTexture()!;
    this.gl.bindTexture(this.gl.TEXTURE_CUBE_MAP, this._blackCubeTexture);
    for (let i: number = 0; 6 > i; i++) {
      this.gl.texImage2D(
        this.gl.TEXTURE_CUBE_MAP_POSITIVE_X + i,
        0,
        this.gl.RGBA,
        1,
        1,
        0,
        this.gl.RGBA,
        this.gl.UNSIGNED_BYTE,
        new Uint8Array([0, 0, 0, 255]),
      );
    }

    this._defaultBrdfTexture = this.gl.createTexture()!;
    this.gl.bindTexture(this.gl.TEXTURE_2D, this._defaultBrdfTexture);
    this.gl.texImage2D(
      this.gl.TEXTURE_2D,
      0,
      this.gl.RGBA,
      1,
      1,
      0,
      this.gl.RGBA,
      this.gl.UNSIGNED_BYTE,
      new Uint8Array([255, 0, 0, 255]),
    );
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
  }

  public resetStateCache(): void {
    this._stateCullFaceEnabled = null;
    this._stateCullFaceMode = -1;
    this._stateBlendEnabled = null;
    this._stateBlendSrc = -1;
    this._stateBlendDst = -1;
    this._stateDepthMask = null;
    this._stateDepthTest = null;
  }

  /**
   * Whether `unit` is within the device's texture-unit budget. Centralizes the "not enough
   * units" check + warning so every optional-texture bind site (per-object samplers, global IBL
   * maps) degrades the same way instead of duplicating the comparison ad hoc -- easy to forget
   * at a new call site otherwise, since exceeding the budget doesn't throw, it silently defaults
   * the sampler to unit 0 and can collide with an unrelated, differently-typed sampler there.
   */
  private _isTextureUnitAvailable(unit: number, uniformName: string): boolean {
    if (unit < this._maxTextureUnits) return true;
    // Warn once per (uniform, unit) instead of every draw call -- this triggers every frame for
    // every affected object once a shader's live sampler count exceeds the device budget, and an
    // unthrottled console.warn at that frequency floods the console and costs real time.
    const warnKey = `${uniformName}:${unit}`;
    if (!this._warnedTextureUnits.has(warnKey)) {
      this._warnedTextureUnits.add(warnKey);
      console.warn(
        `[WebGL2Renderer] Exceeded MAX_TEXTURE_IMAGE_UNITS (${this._maxTextureUnits}). Cannot bind material texture ${uniformName} to unit ${unit}.`,
      );
    }
    return false;
  }

  private _programCacheKey(shaderId: string, isInstanced: boolean, flags: string[]): string {
    const flagKey = flags.length > 0 ? "_" + flags.join("_") : "";
    return isInstanced ? `${shaderId}_instanced${flagKey}` : `${shaderId}${flagKey}`;
  }

  private _getProgram(
    shaderId: string,
    isInstanced: boolean = false,
    flags: string[] = [],
  ): ProgramCache {
    const key = this._programCacheKey(shaderId, isInstanced, flags);
    let cache = this._programs.get(key);
    if (!cache) {
      const def = ShaderRegistry.instance.get(shaderId);
      if (!def || !def.sources.glsl300) {
        throw new Error(
          `[WebGL2Renderer] Shader definition for ${shaderId} not found or missing GLSL 300 source.`,
        );
      }

      let vs = ShaderRegistry.instance.assemble(def.sources.glsl300.vs, "glsl300");
      let fs = ShaderRegistry.instance.assemble(def.sources.glsl300.fs, "glsl300");

      let defines = "";
      if (isInstanced) defines += "#define USE_INSTANCING 1\n";
      for (const flag of flags) {
        defines += `#define ${flag} 1\n`;
      }

      if (defines) {
        vs = vs.replace("#version 300 es", `#version 300 es\n${defines}`);
        fs = fs.replace("#version 300 es", `#version 300 es\n${defines}`);
      }

      vs = vs.trimStart();
      fs = fs.trimStart();
      const prog = this.createShaderProgram(vs, fs);

      const uniforms = new Map<string, WebGLUniformLocation | undefined>();
      const attributes = new Map<string, number>();
      const samplerUnits = new Map<string, number>();
      const samplerTypes = new Map<string, number>();

      this._globalUBO.bindToProgram(prog, "GlobalUniforms");

      const attribsToQuery = ["a_position", "a_normal", "a_uv", "a_tangent"];
      if (isInstanced) {
        attribsToQuery.push("a_instanceMatrix", "a_instanceData");
      }
      attribsToQuery.forEach((name) => {
        attributes.set(name, this.gl.getAttribLocation(prog, name));
      });

      // Ask the linked program for its actually-active uniforms instead of guessing names up
      // front: a hand-maintained list can silently omit one (that's how a whole class of this
      // project's rendering bugs happened), while introspection can't drift out of sync with the
      // shader source. Every sampler uniform also gets a texture unit assigned here, dynamically
      // per-program, except the shadow-map samplers (bound to fixed units 8-13 by the dedicated,
      // unrelated shadow code below) and skybox's own single-texture path.
      const samplerTypeSet = new Set<number>([
        this.gl.SAMPLER_2D,
        this.gl.SAMPLER_CUBE,
        this.gl.SAMPLER_2D_SHADOW,
        this.gl.SAMPLER_2D_ARRAY,
      ]);
      const activeCount = this.gl.getProgramParameter(prog, this.gl.ACTIVE_UNIFORMS) as number;
      let nextSamplerUnit = 0;
      for (let i = 0; i < activeCount; i++) {
        const info = this.gl.getActiveUniform(prog, i);
        if (!info) continue;
        const isArray = info.size > 1 && info.name.endsWith("[0]");
        const names = isArray
          ? Array.from({ length: info.size }, (_, j) => `${info.name.slice(0, -3)}[${j}]`)
          : [info.name];

        const isShadowSampler =
          "u_dirShadowMap" === info.name ||
          "u_dirShadowMapRaw" === info.name ||
          info.name.startsWith("u_spotShadowMap[");
        const isSampler = samplerTypeSet.has(info.type) && !isShadowSampler;

        for (const name of names) {
          uniforms.set(name, this.gl.getUniformLocation(prog, name) ?? undefined);
          if (isSampler) {
            if (
              nextSamplerUnit >= WebGL2Renderer._RESERVED_SHADOW_UNIT_START &&
              nextSamplerUnit <= WebGL2Renderer._RESERVED_SHADOW_UNIT_END
            ) {
              nextSamplerUnit = WebGL2Renderer._RESERVED_SHADOW_UNIT_END + 1;
            }
            samplerUnits.set(name, nextSamplerUnit);
            samplerTypes.set(name, info.type);
            nextSamplerUnit++;
          }
        }
      }

      cache = { prog, uniforms, attributes, samplerUnits, samplerTypes, refCount: 0 };
      this._programs.set(key, cache);
    }
    return cache;
  }

  /**
   * Tracks that `obj` currently depends on the compiled program identified by `key`
   * (same key format `_getProgram` computes internally). Called once per object per
   * frame from the render loop, independent from `_getProgram`'s own batch-level
   * lookup-or-create, since one program is typically shared by many objects at once
   * (e.g. every shadow-caster shares the single DEPTH program).
   */
  private _acquireProgram(obj: Object3D, key: string): void {
    const lastKey = this._lastKnownProgramKey.get(obj);
    if (lastKey === key) return;
    if (lastKey) this._releaseObjectProgram(obj);

    const cache = this._programs.get(key);
    if (cache) cache.refCount++;
    this._lastKnownProgramKey.set(obj, key);
  }

  /** Releases the compiled program this object was referencing, if its refCount drops to zero. */
  private _releaseObjectProgram(obj: Object3D): void {
    const key = this._lastKnownProgramKey.get(obj);
    if (!key) return;
    this._lastKnownProgramKey.delete(obj);

    const cache = this._programs.get(key);
    if (!cache) return;
    cache.refCount--;
    if (cache.refCount <= 0) {
      this.gl.deleteProgram(cache.prog);
      this._programs.delete(key);
    }
  }

  private _getWebGLTexture(tex: Texture): WebGLTexture {
    if (this._quality?.disableTextures) return this.defaultTexture;
    if (!tex.isLoaded || !tex.image) return this.defaultTexture;
    let glTex: WebGLTexture | undefined = this._texCache.get(tex);
    if (!glTex) {
      glTex = this.gl.createTexture()!;

      if ("isTextureArray" in tex && (tex as TextureArray).isTextureArray) {
        const texArray = tex as TextureArray;
        this.gl.bindTexture(this.gl.TEXTURE_2D_ARRAY, glTex);
        const width = texArray.image!.width;
        const height = texArray.image!.height;
        const depth = texArray.images.length;

        this.gl.texImage3D(
          this.gl.TEXTURE_2D_ARRAY,
          0,
          this.gl.RGBA,
          width,
          height,
          depth,
          0,
          this.gl.RGBA,
          this.gl.UNSIGNED_BYTE,
          null,
        );
        for (let i = 0; i < depth; i++) {
          this.gl.texSubImage3D(
            this.gl.TEXTURE_2D_ARRAY,
            0,
            0,
            0,
            i,
            width,
            height,
            1,
            this.gl.RGBA,
            this.gl.UNSIGNED_BYTE,
            texArray.images[i] as TexImageSource,
          );
        }

        const useMipmaps = this._quality.mipmapping && tex.generateMipmaps;
        if (useMipmaps) this.gl.generateMipmap(this.gl.TEXTURE_2D_ARRAY);

        this.gl.texParameteri(
          this.gl.TEXTURE_2D_ARRAY,
          this.gl.TEXTURE_MAG_FILTER,
          TextureFilter.NEAREST === tex.magFilter ? this.gl.NEAREST : this.gl.LINEAR,
        );

        let minFilter: number = this.gl.LINEAR;
        if (useMipmaps) {
          minFilter =
            TextureFilter.NEAREST === tex.minFilter
              ? this.gl.NEAREST_MIPMAP_LINEAR
              : this.gl.LINEAR_MIPMAP_LINEAR;
        } else {
          if (TextureFilter.NEAREST === tex.minFilter) minFilter = this.gl.NEAREST;
        }
        this.gl.texParameteri(this.gl.TEXTURE_2D_ARRAY, this.gl.TEXTURE_MIN_FILTER, minFilter);

        const wrapS =
          TextureWrap.REPEAT === tex.addressModeU
            ? this.gl.REPEAT
            : TextureWrap.MIRRORED_REPEAT === tex.addressModeU
              ? this.gl.MIRRORED_REPEAT
              : this.gl.CLAMP_TO_EDGE;
        const wrapT =
          TextureWrap.REPEAT === tex.addressModeV
            ? this.gl.REPEAT
            : TextureWrap.MIRRORED_REPEAT === tex.addressModeV
              ? this.gl.MIRRORED_REPEAT
              : this.gl.CLAMP_TO_EDGE;
        this.gl.texParameteri(this.gl.TEXTURE_2D_ARRAY, this.gl.TEXTURE_WRAP_S, wrapS);
        this.gl.texParameteri(this.gl.TEXTURE_2D_ARRAY, this.gl.TEXTURE_WRAP_T, wrapT);
      } else {
        this.gl.bindTexture(this.gl.TEXTURE_2D, glTex);
        this.gl.texImage2D(
          this.gl.TEXTURE_2D,
          0,
          this.gl.RGBA,
          this.gl.RGBA,
          this.gl.UNSIGNED_BYTE,
          tex.image,
        );

        const useMipmaps = this._quality.mipmapping && tex.generateMipmaps;
        if (useMipmaps) this.gl.generateMipmap(this.gl.TEXTURE_2D);

        this.gl.texParameteri(
          this.gl.TEXTURE_2D,
          this.gl.TEXTURE_MAG_FILTER,
          TextureFilter.NEAREST === tex.magFilter ? this.gl.NEAREST : this.gl.LINEAR,
        );

        let minFilter: number = this.gl.LINEAR;
        if (useMipmaps) {
          minFilter =
            TextureFilter.NEAREST === tex.minFilter
              ? this.gl.NEAREST_MIPMAP_LINEAR
              : this.gl.LINEAR_MIPMAP_LINEAR;
        } else {
          if (TextureFilter.NEAREST === tex.minFilter) minFilter = this.gl.NEAREST;
        }
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, minFilter);

        const wrapS =
          TextureWrap.REPEAT === tex.addressModeU
            ? this.gl.REPEAT
            : TextureWrap.MIRRORED_REPEAT === tex.addressModeU
              ? this.gl.MIRRORED_REPEAT
              : this.gl.CLAMP_TO_EDGE;
        const wrapT =
          TextureWrap.REPEAT === tex.addressModeV
            ? this.gl.REPEAT
            : TextureWrap.MIRRORED_REPEAT === tex.addressModeV
              ? this.gl.MIRRORED_REPEAT
              : this.gl.CLAMP_TO_EDGE;
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, wrapS);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, wrapT);
      }

      this._texCache.set(tex, glTex);
    } else if (
      tex.needsUpdate &&
      !("isTextureArray" in tex && (tex as TextureArray).isTextureArray)
    ) {
      this.gl.bindTexture(this.gl.TEXTURE_2D, glTex);
      this.gl.texImage2D(
        this.gl.TEXTURE_2D,
        0,
        this.gl.RGBA,
        this.gl.RGBA,
        this.gl.UNSIGNED_BYTE,
        tex.image,
      );
      if (this._quality.mipmapping && tex.generateMipmaps) {
        this.gl.generateMipmap(this.gl.TEXTURE_2D);
      }
      tex.needsUpdate = false;
    }
    return glTex;
  }

  private _getWebGLCubeTexture(tex: CubeTexture): WebGLTexture {
    if (this._quality?.disableTextures) return this.defaultCubeTexture;
    if (!tex.isLoaded) return this.defaultCubeTexture;
    if (tex instanceof RenderTargetCube) {
      const glTex = this._texCubeCache.get(tex);
      return glTex || this.defaultCubeTexture;
    }
    if (tex.images.length !== 6 && tex.mipmaps.length === 0) return this.defaultCubeTexture;
    let glTex: WebGLTexture | undefined = this._texCubeCache.get(tex);
    if (!glTex) {
      glTex = this.gl.createTexture()!;
      this.gl.bindTexture(this.gl.TEXTURE_CUBE_MAP, glTex);

      const baseImages = tex.mipmaps.length > 0 ? tex.mipmaps[0]! : tex.images;
      for (let i: number = 0; i < 6; i++) {
        this.gl.texImage2D(
          this.gl.TEXTURE_CUBE_MAP_POSITIVE_X + i,
          0,
          this.gl.RGBA,
          this.gl.RGBA,
          this.gl.UNSIGNED_BYTE,
          baseImages[i] as ImageBitmap,
        );
      }

      if (tex.mipmaps.length > 1) {
        for (let m = 1; m < tex.mipmaps.length; m++) {
          const mipImages = tex.mipmaps[m]!;
          for (let i = 0; i < 6; i++) {
            this.gl.texImage2D(
              this.gl.TEXTURE_CUBE_MAP_POSITIVE_X + i,
              m,
              this.gl.RGBA,
              this.gl.RGBA,
              this.gl.UNSIGNED_BYTE,
              mipImages[i] as ImageBitmap,
            );
          }
        }
        this.gl.texParameteri(
          this.gl.TEXTURE_CUBE_MAP,
          this.gl.TEXTURE_MIN_FILTER,
          this.gl.LINEAR_MIPMAP_LINEAR,
        );
      } else {
        this.gl.texParameteri(this.gl.TEXTURE_CUBE_MAP, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
      }
      this.gl.texParameteri(this.gl.TEXTURE_CUBE_MAP, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
      this.gl.texParameteri(
        this.gl.TEXTURE_CUBE_MAP,
        this.gl.TEXTURE_WRAP_S,
        this.gl.CLAMP_TO_EDGE,
      );
      this.gl.texParameteri(
        this.gl.TEXTURE_CUBE_MAP,
        this.gl.TEXTURE_WRAP_T,
        this.gl.CLAMP_TO_EDGE,
      );
      this._texCubeCache.set(tex, glTex);
    }
    return glTex;
  }

  /** @inheritdoc */
  public override setRenderTarget(
    target: RenderTarget | RenderTargetCube | null,
    activeCubeFace?: number,
  ): void {
    this._activeRenderTarget = target;
    this._activeCubeFace = activeCubeFace ?? 0;
  }

  public bindMainRenderTarget(): boolean {
    let isOffscreen = false;

    if (this._activeRenderTarget) {
      isOffscreen = true;
      if (this._activeRenderTarget instanceof RenderTargetCube) {
        let fbo = this._renderTargetCubeFbos.get(this._activeRenderTarget);
        if (!fbo || !this._activeRenderTarget.isLoaded) {
          if (fbo) fbo.destroy();
          fbo = new WebGL2CubeFrameBuffer(this.gl, {
            width: this._activeRenderTarget.width,
            height: this._activeRenderTarget.height,
            format: this.gl.RGBA,
            internalFormat: this.gl.RGBA8,
            type: this.gl.UNSIGNED_BYTE,
          });
          this._renderTargetCubeFbos.set(this._activeRenderTarget, fbo);
          this._texCubeCache.set(this._activeRenderTarget, fbo.texture);
          this._activeRenderTarget.isLoaded = true;
        }
        fbo.bindFace(this._activeCubeFace);
      } else {
        let fbo = this._renderTargetFbos.get(this._activeRenderTarget);
        if (!fbo || !this._activeRenderTarget.isLoaded) {
          if (fbo) fbo.destroy();
          fbo = new WebGL2FrameBuffer(this.gl, {
            width: this._activeRenderTarget.width,
            height: this._activeRenderTarget.height,
            format: this.gl.RGBA,
            internalFormat: this.gl.RGBA8,
            type: this.gl.UNSIGNED_BYTE,
          });

          this._renderTargetFbos.set(this._activeRenderTarget, fbo);
          this._texCache.set(this._activeRenderTarget, fbo.texture);
          this._activeRenderTarget.isLoaded = true;
        }
        fbo.bind();
        this.gl.viewport(0, 0, this._activeRenderTarget.width, this._activeRenderTarget.height);
      }
    } else if (this.postProcessing.enabled && this._hdrFbo) {
      this._hdrFbo.bind();
    } else {
      this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
      this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
    }

    return isOffscreen;
  }

  public bindPostProcessRenderTarget(): void {
    // FBO is already bound in bindMainRenderTarget if needed, handled implicitly for now
  }

  public copyToOpaqueTexture(): void {
    if (!this._opaqueTexture) {
      const tex = this.gl.createTexture();
      this.gl.bindTexture(this.gl.TEXTURE_2D, tex);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
      this._opaqueTexture = tex!;

      const dummyTex = { isLoaded: true } as unknown as Texture;
      this._opaqueTextureWrapper = dummyTex;
      this._texCache.set(dummyTex, tex!);
    } else {
      this.gl.bindTexture(this.gl.TEXTURE_2D, this._opaqueTexture);
    }

    this.gl.copyTexImage2D(
      this.gl.TEXTURE_2D,
      0,
      this.gl.RGBA,
      0,
      0,
      this.gl.canvas.width,
      this.gl.canvas.height,
      0,
    );
  }

  /**
   * Captures the opaque depth buffer into a sampleable `DEPTH24_STENCIL8` texture, for
   * underwater/refraction depth-fade effects (e.g. `OpenWaterMaterial`). Only possible while
   * an HDR FBO is active: `_hdrFbo`'s depth/stencil renderbuffer has a known, fixed format
   * (`DEPTH24_STENCIL8`), which `blitFramebuffer` requires to match the capture texture's
   * format exactly. Without post-processing (rendering straight to the default framebuffer),
   * the actual depth/stencil format is implementation-defined, so capture is skipped -- water
   * materials fall back to their non-depth (Fresnel-based) blending in that case.
   */
  public copyToOpaqueDepthTexture(): void {
    if (!this.postProcessing.enabled || !this._hdrFbo) {
      return;
    }

    const gl = this.gl;
    const w = gl.canvas.width;
    const h = gl.canvas.height;

    if (!this._opaqueDepthTexture) {
      this._opaqueDepthTexture = gl.createTexture()!;
      this._opaqueDepthFbo = gl.createFramebuffer()!;
    }

    if (this._opaqueDepthWidth !== w || this._opaqueDepthHeight !== h) {
      gl.bindTexture(gl.TEXTURE_2D, this._opaqueDepthTexture);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.DEPTH24_STENCIL8,
        w,
        h,
        0,
        gl.DEPTH_STENCIL,
        gl.UNSIGNED_INT_24_8,
        null,
      );
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

      gl.bindFramebuffer(gl.FRAMEBUFFER, this._opaqueDepthFbo!);
      gl.framebufferTexture2D(
        gl.FRAMEBUFFER,
        gl.DEPTH_STENCIL_ATTACHMENT,
        gl.TEXTURE_2D,
        this._opaqueDepthTexture,
        0,
      );

      this._opaqueDepthWidth = w;
      this._opaqueDepthHeight = h;
    }

    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, this._opaqueDepthFbo!);
    gl.blitFramebuffer(0, 0, w, h, 0, 0, w, h, gl.DEPTH_BUFFER_BIT, gl.NEAREST);
    this._hdrFbo.bind();
  }

  public flushPostProcess(): void {
    const isOffscreen = this._activeRenderTarget !== null;
    if (!isOffscreen && this.postProcessing.enabled && this._hdrFbo && this._postPassGL) {
      // TAA resolves first, if enabled: everything downstream (Bloom, HBAO, the final uber
      // pass) should react to the temporally-smoothed color, not the raw per-frame jittered one.
      let colorTex: WebGLTexture = this._hdrFbo.texture;
      if (this._taaPassGL) {
        const taaNode = this.postProcessing.get<import("../post/index.js").TaaElement>(
          PostProcessingEffectType.TAA,
        );
        if (taaNode && taaNode.enabled) {
          const resolved = this._taaPassGL.execute(
            colorTex,
            this.gl.canvas.width,
            this.gl.canvas.height,
            taaNode,
          );
          if (resolved) colorTex = resolved;
        }
      }

      // Motion Trail: a deliberate ghost/afterimage look, not anti-aliasing -- reuses the same
      // history-blend pass as TAA (its own separate instance/history buffer), chained after TAA
      // so both can be combined if ever wanted, though typically only one is enabled at a time.
      if (this._motionTrailPassGL) {
        const trailNode = this.postProcessing.get<import("../post/index.js").MotionTrailElement>(
          PostProcessingEffectType.MOTION_TRAIL,
        );
        if (trailNode && trailNode.enabled) {
          const resolved = this._motionTrailPassGL.execute(
            colorTex,
            this.gl.canvas.width,
            this.gl.canvas.height,
            trailNode,
          );
          if (resolved) colorTex = resolved;
        }
      }

      let bloomTex: WebGLTexture | null = null;
      if (this._bloomPassGL) {
        const bloomNode = this.postProcessing.get<import("../post/index.js").BloomElement>(
          PostProcessingEffectType.BLOOM,
        );
        if (bloomNode && bloomNode.enabled) {
          bloomTex = this._bloomPassGL.execute(
            colorTex,
            this.gl.canvas.width,
            this.gl.canvas.height,
            bloomNode,
          );
        }
      }

      let hbaoTex: WebGLTexture | null = null;
      if (this._hbaoPassGL && this._opaqueDepthTexture && this._frameProjMatrix) {
        const hbaoNode = this.postProcessing.get<import("../post/index.js").HbaoElement>(
          PostProcessingEffectType.HBAO,
        );
        if (hbaoNode && hbaoNode.enabled) {
          hbaoTex = this._hbaoPassGL.execute(
            this._opaqueDepthTexture,
            this.gl.canvas.width,
            this.gl.canvas.height,
            this._frameNear,
            this._frameFar,
            this._frameProjMatrix,
            hbaoNode,
          );
        }
      }

      this._postPassGL.execute(this.gl, colorTex, this.postProcessing, bloomTex, hbaoTex);
    }
  }

  /**
   * Renders shadow maps for all shadow-casting lights.
   */
  public renderShadowMaps(
    lights: import("../../interfaces/index.js").LightDataInterface,
    sortedGroups: import("../../core/Scene.js").RenderBatch[],
  ): void {
    const emptyLights: LightDataInterface = {
      aCol: new Color(0, 0, 0, 1),
      aIntensity: 0,
      dCol: new Color(0, 0, 0, 1),
      dDir: Vector3D.ZERO,
      dIntensity: 0,
      aLights: [],
      pLights: [],
      sLights: [],
    };

    // SpotLights
    for (const light of lights.sLights) {
      if (!light.castShadow || !light.shadowCamera) continue;

      let fbo = this._shadowMaps.get(light);
      if (!fbo) {
        fbo = new WebGL2DepthFrameBuffer(this.gl, light.shadowResolution, light.shadowResolution);
        this._shadowMaps.set(light, fbo);
      } else {
        fbo.resize(light.shadowResolution, light.shadowResolution);
      }

      fbo.bind();
      this.gl.clear(this.gl.DEPTH_BUFFER_BIT);

      // Update Global UBO with light's camera
      this.updateGlobalUBO(
        light.shadowCamera.viewProjectionMatrix,
        light.shadowCamera.position,
        emptyLights,
      );

      // Keep FRONT culling enabled for the shadow pass to prevent shadow acne!
      this.gl.enable(this.gl.CULL_FACE);
      this.gl.cullFace(this.gl.FRONT);
      this.gl.enable(this.gl.DEPTH_TEST);
      this.gl.depthMask(true);
      this.gl.disable(this.gl.BLEND);

      const cache = this._getProgram(MaterialType.DEPTH);
      this.gl.useProgram(cache.prog);

      this._renderShadowScene(cache, sortedGroups);

      this.gl.cullFace(this.gl.BACK);
      fbo.unbind();
    }

    // DirectionalLight (CSM Atlas)
    if (lights.dLight && lights.dLight.castShadow && lights.dLight.numCascades > 0) {
      const light = lights.dLight;
      const res = light.shadowResolution;

      // Arrange cascades in a square grid (e.g. 2x2 for 4 cascades)
      const cols = Math.ceil(Math.sqrt(light.numCascades));
      const rows = Math.ceil(light.numCascades / cols);
      const atlasWidth = cols * res;
      const atlasHeight = rows * res;

      let fbo = this._shadowMaps.get(light);
      if (!fbo) {
        fbo = new WebGL2DepthFrameBuffer(this.gl, atlasWidth, atlasHeight);
        this._shadowMaps.set(light, fbo);
      } else {
        fbo.resize(atlasWidth, atlasHeight);
      }

      fbo.bind(); // This sets viewport to full atlas, we'll overwrite it per cascade
      this.gl.clear(this.gl.DEPTH_BUFFER_BIT);

      this.gl.enable(this.gl.CULL_FACE);
      this.gl.cullFace(this.gl.FRONT);
      this.gl.enable(this.gl.DEPTH_TEST);
      this.gl.depthMask(true);
      this.gl.disable(this.gl.BLEND);

      const cache = this._getProgram(MaterialType.DEPTH);
      this.gl.useProgram(cache.prog);
      this._bindDummyShadowMaps(cache);

      for (let i = 0; i < light.numCascades; i++) {
        const cascadeCam = light.cascadeCameras[i];
        if (!cascadeCam) continue;

        // Set viewport to the quadrant for this cascade
        const col = i % cols;
        const row = Math.floor(i / cols);
        this.gl.viewport(col * res, row * res, res, res);

        this.updateGlobalUBO(cascadeCam.viewProjectionMatrix, cascadeCam.position, emptyLights);

        this._renderShadowScene(cache, sortedGroups);
      }

      this.gl.cullFace(this.gl.BACK);
      fbo.unbind();
    }
  }

  /**
   * Helper to render the actual geometry for a shadow pass.
   */
  private _renderShadowScene(
    cache: ProgramCache,
    sortedGroups: import("../../core/Scene.js").RenderBatch[],
  ): void {
    for (let i = 0; i < sortedGroups.length; i++) {
      const batch = sortedGroups[i];
      if (batch!.shaderId === MaterialType.SKYBOX || batch!.objects.length === 0) continue;

      const drawMode = batch!.topology === Topology.LINE_LIST ? this.gl.LINES : this.gl.TRIANGLES;
      const objects = batch!.objects;
      const firstObj = objects[0]!;
      if (!firstObj.material) continue;

      const manifest = firstObj.material.getRenderManifest();
      const uExtraLoc = cache.uniforms.get("u_extraParams");
      const extraParams = manifest.properties["u_extraParams"] as Float32Array | number[];

      let hasAlpha = false;
      if (extraParams && extraParams[1]! > 0.0 && manifest.textures["u_diffuseMap"]) {
        hasAlpha = true;
        this.gl.activeTexture(this.gl.TEXTURE0);
        const tex = manifest.textures["u_diffuseMap"] as Texture;
        this.gl.bindTexture(this.gl.TEXTURE_2D, this._getWebGLTexture(tex));
        const uDiffuseLoc = cache.uniforms.get("u_diffuseMap");
        if (uDiffuseLoc) this.gl.uniform1i(uDiffuseLoc, 0);

        if (uExtraLoc) {
          this.gl.uniform4fv(uExtraLoc, extraParams as Float32Array);
        }
      }

      if (!hasAlpha && uExtraLoc) {
        this.gl.uniform4fv(uExtraLoc, new Float32Array([0, 0, 0, 0]));
      }

      for (const o of objects) {
        if (!o.castShadow || !o.geometry) continue;

        this._acquireProgram(o, this._programCacheKey(MaterialType.DEPTH, false, []));
        this._acquireTextures(o, manifest.textures);

        this._scratchModelMatrix.set(o.worldMatrix.data);
        const uModel = cache.uniforms.get("u_model");
        if (uModel) this.gl.uniformMatrix4fv(uModel, false, this._scratchModelMatrix);

        const mesh = this._getOrCreateMesh(o, o.geometry);

        mesh.bind(
          cache.attributes.get("a_position")!,
          cache.attributes.get("a_normal")!,
          cache.attributes.get("a_uv")!,
          cache.attributes.get("a_tangent")!,
        );
        mesh.draw(drawMode, batch!.wireframeMode);
      }
    }
  }

  /**
   * Binds dummy depth textures to shadow samplers to satisfy WebGL2 sampler2DShadow validation rules.
   */
  private _bindDummyShadowMaps(cache: ProgramCache): void {
    const dummyUnit = 13;
    const maxUnits = DeviceCaps.getLimit(DeviceLimit.MAX_TEXTURE_IMAGE_UNITS);
    if (dummyUnit >= maxUnits) {
      console.warn(`[WebGL2Renderer] dummyUnit ${dummyUnit} >= maxUnits ${maxUnits}`);
      return;
    }

    this.gl.activeTexture(this.gl.TEXTURE0 + dummyUnit);
    this.gl.bindTexture(this.gl.TEXTURE_2D, this._dummyShadowMap.texture);

    let dirMapLoc = cache.uniforms.get("u_dirShadowMap");
    if (!dirMapLoc)
      dirMapLoc = this.gl.getUniformLocation(cache.prog, "u_dirShadowMap") ?? undefined;
    if (dirMapLoc) this.gl.uniform1i(dirMapLoc, dummyUnit);

    let dirMapRawLoc = cache.uniforms.get("u_dirShadowMapRaw");
    if (!dirMapRawLoc)
      dirMapRawLoc = this.gl.getUniformLocation(cache.prog, "u_dirShadowMapRaw") ?? undefined;
    if (dirMapRawLoc) {
      this.gl.activeTexture(this.gl.TEXTURE0 + WebGL2Renderer._RAW_DEPTH_UNIT);
      this.gl.bindTexture(this.gl.TEXTURE_2D, this._dummyShadowMap.texture);
      this.gl.uniform1i(dirMapRawLoc, WebGL2Renderer._RAW_DEPTH_UNIT);
    }

    for (let i = 0; i < 4; i++) {
      let loc = cache.uniforms.get(`u_spotShadowMap[${i}]`);
      if (!loc) loc = this.gl.getUniformLocation(cache.prog, `u_spotShadowMap[${i}]`) ?? undefined;
      if (loc) this.gl.uniform1i(loc, dummyUnit);
    }
  }

  public renderBatch(
    batch: import("../../core/Scene.js").RenderBatch,
    vMat: Float32Array | undefined,
    _vp: Float32Array,
    _camPos: Vector3D,
    lights: import("../../interfaces/index.js").LightDataInterface,
    scene: Scene,
  ): void {
    const objects = batch!.objects;
    if (objects.length === 0) return;

    const instancedObjects: Object3D[] = [];
    const standardObjects: Object3D[] = [];

    for (let i = 0; i < objects.length; i++) {
      const o = objects[i];
      if (o instanceof InstancedMesh) {
        instancedObjects.push(o!);
      } else {
        standardObjects.push(o!);
      }
    }

    const firstObj = objects[0]!;
    const mat = firstObj.material!;
    const manifest = mat.getRenderManifest();

    const topo = batch!.topology;

    if (standardObjects.length > 0) {
      this._renderSubgroup(
        batch!.shaderId,
        standardObjects,
        false,
        manifest,
        vMat,
        topo,
        lights,
        scene,
        batch!.wireframeMode,
      );
    }

    if (instancedObjects.length > 0) {
      this._renderSubgroup(
        batch!.shaderId,
        instancedObjects,
        true,
        manifest,
        vMat,
        topo,
        lights,
        scene,
        batch!.wireframeMode,
      );
    }
  }

  private _renderSubgroup(
    shaderId: string,
    objects: Object3D[],
    isInstanced: boolean,
    manifest: RenderManifest,
    vMat?: Float32Array,
    topology: Topology = Topology.DEFAULT,
    lights?: LightDataInterface,
    scene?: Scene,
    wireframeMode?: "structural" | "triangles",
  ): void {
    // --- 3. Build & Bind Shader ---
    const isInst =
      "instanceCount" in objects[0]! && (objects[0] as InstancedMesh).instanceCount > 0;
    const shaderFlags = manifest.flags || [];

    // Check if texture array is used
    if (manifest.textures) {
      for (const tex of Object.values(manifest.textures)) {
        if (tex && "isTextureArray" in tex && (tex as TextureArray).isTextureArray) {
          if (!shaderFlags.includes("USE_TEXTURE_ARRAY")) {
            shaderFlags.push("USE_TEXTURE_ARRAY");
          }
          break;
        }
      }
    }

    const cache = this._getProgram(manifest.shaderId, isInst, shaderFlags);
    const programKey = this._programCacheKey(manifest.shaderId, isInst, shaderFlags);
    this.gl.useProgram(cache.prog);

    this._bindDummyShadowMaps(cache);

    // Bind Shadow Maps
    if (lights && lights.sLights.length > 0) {
      for (let i = 0; i < 4; i++) {
        if (i >= lights.sLights.length) break;
        const light = lights.sLights[i]!;
        const mapLoc = cache.uniforms.get(`u_spotShadowMap[${i}]`);
        const matLoc = cache.uniforms.get(`u_spotShadowMatrix[${i}]`);
        const infoLoc = cache.uniforms.get(`u_spotShadowInfo[${i}]`);

        if (light.castShadow && light.shadowCamera) {
          const fbo = this._shadowMaps.get(light);
          if (fbo && fbo.texture) {
            const texUnit = 8 + i; // TEXTURE8 to TEXTURE11
            const maxUnits = DeviceCaps.getLimit(DeviceLimit.MAX_TEXTURE_IMAGE_UNITS);
            if (texUnit >= maxUnits) {
              console.warn(
                `[WebGL2Renderer] Exceeded MAX_TEXTURE_IMAGE_UNITS (${maxUnits}). Cannot bind spot shadow map to texture unit ${texUnit}.`,
              );
            } else {
              this.gl.activeTexture(this.gl.TEXTURE0 + texUnit);
              this.gl.bindTexture(this.gl.TEXTURE_2D, fbo.texture);
              if (mapLoc) this.gl.uniform1i(mapLoc, texUnit);
              if (matLoc)
                this.gl.uniformMatrix4fv(matLoc, false, light.shadowCamera.viewProjectionMatrix);
              if (infoLoc) {
                this._scratchFloat4[0] = light.shadowBias;
                this._scratchFloat4[1] = light.shadowNormalBias;
                this._scratchFloat4[2] = 1.0;
                this._scratchFloat4[3] = 0.0;
                this.gl.uniform4fv(infoLoc, this._scratchFloat4);
              }
            }
          }
        } else {
          if (mapLoc) this.gl.uniform1i(mapLoc, 13);
          if (infoLoc) {
            this._scratchFloat4[0] = 0.0;
            this._scratchFloat4[1] = 0.0;
            this._scratchFloat4[2] = 0.0;
            this._scratchFloat4[3] = 0.0;
            this.gl.uniform4fv(infoLoc, this._scratchFloat4);
          }
        }
      }
    }

    // DirectionalLight Shadows
    if (lights && lights.dLight && lights.dLight.castShadow && lights.dLight.numCascades > 0) {
      const light = lights.dLight;
      const mapLoc = cache.uniforms.get("u_dirShadowMap");
      const mapRawLoc = cache.uniforms.get("u_dirShadowMapRaw");
      const splitsLoc = cache.uniforms.get("u_cascadeSplits");
      const infoLoc = cache.uniforms.get("u_dirShadowInfo");

      const fbo = this._shadowMaps.get(light);
      if (fbo && fbo.texture) {
        const texUnit = 12; // TEXTURE12
        const maxUnits = DeviceCaps.getLimit(DeviceLimit.MAX_TEXTURE_IMAGE_UNITS);
        if (texUnit >= maxUnits) {
          console.warn(
            `[WebGL2Renderer] Exceeded MAX_TEXTURE_IMAGE_UNITS (${maxUnits}). Cannot bind directional shadow map to texture unit ${texUnit}.`,
          );
        } else {
          this.gl.activeTexture(this.gl.TEXTURE0 + texUnit);
          this.gl.bindTexture(this.gl.TEXTURE_2D, fbo.texture);
          if (mapLoc) this.gl.uniform1i(mapLoc, texUnit);

          // Same depth texture, second unit, non-comparison sampler -- see PCSS blocker search.
          this.gl.activeTexture(this.gl.TEXTURE0 + WebGL2Renderer._RAW_DEPTH_UNIT);
          this.gl.bindTexture(this.gl.TEXTURE_2D, fbo.texture);
          if (mapRawLoc) this.gl.uniform1i(mapRawLoc, WebGL2Renderer._RAW_DEPTH_UNIT);

          for (let i = 0; i < light.numCascades; i++) {
            const matLoc = cache.uniforms.get(`u_cascadeMatrices[${i}]`);
            if (matLoc && light.cascadeCameras[i]) {
              this.gl.uniformMatrix4fv(
                matLoc,
                false,
                light.cascadeCameras[i]!.viewProjectionMatrix,
              );
            }
          }

          if (splitsLoc) {
            this._scratchFloat4[0] = light.cascadeSplits[0] ?? 0;
            this._scratchFloat4[1] = light.cascadeSplits[1] ?? 0;
            this._scratchFloat4[2] = light.cascadeSplits[2] ?? 0;
            this._scratchFloat4[3] = light.cascadeSplits[3] ?? 0;
            this.gl.uniform4fv(splitsLoc, this._scratchFloat4);
          }

          if (infoLoc) {
            this._scratchFloat4[0] = light.shadowBias;
            this._scratchFloat4[1] = light.shadowNormalBias;
            this._scratchFloat4[2] = 1.0;
            this._scratchFloat4[3] = light.numCascades;
            this.gl.uniform4fv(infoLoc, this._scratchFloat4);
          }
        }
      }
    } else {
      const mapLoc = cache.uniforms.get("u_dirShadowMap");
      if (mapLoc) this.gl.uniform1i(mapLoc, 13);
      const mapRawLoc = cache.uniforms.get("u_dirShadowMapRaw");
      if (mapRawLoc) this.gl.uniform1i(mapRawLoc, WebGL2Renderer._RAW_DEPTH_UNIT);
      const infoLoc = cache.uniforms.get("u_dirShadowInfo");
      if (infoLoc) {
        this._scratchFloat4[0] = 0.0;
        this._scratchFloat4[1] = 0.0;
        this._scratchFloat4[2] = 0.0;
        this._scratchFloat4[3] = 0.0;
        this.gl.uniform4fv(infoLoc, this._scratchFloat4);
      }
    }

    const u = cache.uniforms;

    // --- Fog Uniforms ---
    const fog = scene?.fog;
    if (fog) {
      const modeLoc = u.get("u_fogMode");
      if (modeLoc) this.gl.uniform1i(modeLoc, fog.mode);
      const colLoc = u.get("u_fogColor");
      if (colLoc) this.gl.uniform3f(colLoc, fog.color.r, fog.color.g, fog.color.b);
      const densLoc = u.get("u_fogDensity");
      if (densLoc) this.gl.uniform1f(densLoc, fog.density);
      const nearLoc = u.get("u_fogNear");
      if (nearLoc) this.gl.uniform1f(nearLoc, fog.near);
      const farLoc = u.get("u_fogFar");
      if (farLoc) this.gl.uniform1f(farLoc, fog.far);
      const heightLoc = u.get("u_fogHeight");
      if (heightLoc) this.gl.uniform1f(heightLoc, fog.height);
      const hFalloffLoc = u.get("u_fogHeightFalloff");
      if (hFalloffLoc) this.gl.uniform1f(hFalloffLoc, fog.heightFalloff);
    } else {
      const modeLoc = u.get("u_fogMode");
      if (modeLoc) this.gl.uniform1i(modeLoc, 0); // NONE
    }

    // --- Global IBL Uniforms ---
    if (scene) {
      const intLoc = u.get("u_envIntensity");
      if (intLoc) this.gl.uniform1f(intLoc, scene.environmentIntensity);

      // Irradiance Map -- always claim the unit with at least a dummy cube texture when the
      // uniform is active, even without real IBL data: leaving an active sampler unassigned
      // defaults it to unit 0, colliding with whatever 2D sampler (e.g. u_diffuseMap)
      // legitimately owns that unit ("two textures of different types use the same sampler
      // location" GL_INVALID_OPERATION).
      const irrUnit = cache.samplerUnits.get("u_irradianceMap");
      const irrLoc = u.get("u_irradianceMap");
      if (
        irrLoc &&
        undefined !== irrUnit &&
        this._isTextureUnitAvailable(irrUnit, "u_irradianceMap")
      ) {
        this.gl.activeTexture(this.gl.TEXTURE0 + irrUnit);
        this.gl.bindTexture(this.gl.TEXTURE_2D, null);
        this.gl.bindTexture(
          this.gl.TEXTURE_CUBE_MAP,
          scene.irradianceMap
            ? this._getWebGLCubeTexture(scene.irradianceMap)
            : this._blackCubeTexture,
        );
        this.gl.uniform1i(irrLoc, irrUnit);
      }

      // Prefilter Map
      const prefUnit = cache.samplerUnits.get("u_prefilterMap");
      const prefLoc = u.get("u_prefilterMap");
      if (
        prefLoc &&
        undefined !== prefUnit &&
        this._isTextureUnitAvailable(prefUnit, "u_prefilterMap")
      ) {
        this.gl.activeTexture(this.gl.TEXTURE0 + prefUnit);
        this.gl.bindTexture(this.gl.TEXTURE_2D, null);
        this.gl.bindTexture(
          this.gl.TEXTURE_CUBE_MAP,
          scene.prefilterMap
            ? this._getWebGLCubeTexture(scene.prefilterMap)
            : this._blackCubeTexture,
        );
        this.gl.uniform1i(prefLoc, prefUnit);
      }

      // BRDF LUT
      const brdfUnit = cache.samplerUnits.get("u_brdfLUT");
      const brdfLoc = u.get("u_brdfLUT");
      if (
        brdfLoc &&
        undefined !== brdfUnit &&
        this._isTextureUnitAvailable(brdfUnit, "u_brdfLUT")
      ) {
        this.gl.activeTexture(this.gl.TEXTURE0 + brdfUnit);
        this.gl.bindTexture(this.gl.TEXTURE_CUBE_MAP, null);
        this.gl.bindTexture(
          this.gl.TEXTURE_2D,
          scene.brdfLUT ? this._getWebGLTexture(scene.brdfLUT) : this._defaultBrdfTexture,
        );
        this.gl.uniform1i(brdfLoc, brdfUnit);
      }
    }

    // --- 1. Bind Material States ---
    const state = manifest.state;
    const enableCull = !(state && CullMode.NONE === state.culling);
    if (this._stateCullFaceEnabled !== enableCull) {
      if (enableCull) this.gl.enable(this.gl.CULL_FACE);
      else this.gl.disable(this.gl.CULL_FACE);
      this._stateCullFaceEnabled = enableCull;
    }

    if (enableCull) {
      const cullMode = state && CullMode.FRONT === state.culling ? this.gl.FRONT : this.gl.BACK;
      if (this._stateCullFaceMode !== cullMode) {
        this.gl.cullFace(cullMode);
        this._stateCullFaceMode = cullMode;
      }
    }

    const enableBlend = !!state?.transparent;
    if (this._stateBlendEnabled !== enableBlend) {
      if (enableBlend) this.gl.enable(this.gl.BLEND);
      else this.gl.disable(this.gl.BLEND);
      this._stateBlendEnabled = enableBlend;
    }

    let depthMask = !enableBlend;
    if (state?.depthWrite === false) depthMask = false;

    if (this._stateDepthMask !== depthMask) {
      this.gl.depthMask(depthMask);
      this._stateDepthMask = depthMask;
    }

    if (enableBlend) {
      let src: number = this.gl.SRC_ALPHA;
      let dst: number = this.gl.ONE_MINUS_SRC_ALPHA;
      if (state.blending === BlendingMode.ADDITIVE) {
        src = this.gl.ONE;
        dst = this.gl.ONE;
      } else if (state.blending === BlendingMode.PREMULTIPLIED_ALPHA) {
        src = this.gl.ONE;
      }
      if (this._stateBlendSrc !== src || this._stateBlendDst !== dst) {
        this.gl.blendFunc(src, dst);
        this._stateBlendSrc = src;
        this._stateBlendDst = dst;
      }
    }

    const enableDepthTest = state?.depthTest !== false;
    if (this._stateDepthTest !== enableDepthTest) {
      if (enableDepthTest) this.gl.enable(this.gl.DEPTH_TEST);
      else this.gl.disable(this.gl.DEPTH_TEST);
      this._stateDepthTest = enableDepthTest;
    }

    // --- 2. Bind Generic Material Properties (Uniforms) ---
    for (const name in manifest.properties) {
      const value = manifest.properties[name];
      const loc = u.get(name);
      if (!loc) continue;

      if (typeof value === "number") {
        this.gl.uniform1f(loc, value);
      } else if (ArrayBuffer.isView(value)) {
        const v = value as Float32Array;
        if (v.length === 4) this.gl.uniform4fv(loc, v);
        else if (v.length === 3) this.gl.uniform3fv(loc, v);
        else if (v.length === 2) this.gl.uniform2fv(loc, v);
        else if (v.length === 16) this.gl.uniformMatrix4fv(loc, false, v);
      } else if (Array.isArray(value)) {
        if (value.length === 4) this.gl.uniform4fv(loc, value as number[]);
        else if (value.length === 3) this.gl.uniform3fv(loc, value as number[]);
        else if (value.length === 2) this.gl.uniform2fv(loc, value as number[]);
      }
    }

    // --- 3. Bind Textures ---
    const texs = manifest.textures;
    if (shaderId === MaterialType.SKYBOX) {
      this.gl.activeTexture(this.gl.TEXTURE0);
      this.gl.bindTexture(this.gl.TEXTURE_2D, null);
      const skyTex = texs["u_skybox"] as CubeTexture;
      this.gl.bindTexture(
        this.gl.TEXTURE_CUBE_MAP,
        skyTex ? this._getWebGLCubeTexture(skyTex) : this.defaultCubeTexture,
      );
      const uSkybox = u.get("u_skybox");
      if (uSkybox) this.gl.uniform1i(uSkybox, 0);
    } else {
      for (const [uniformName, unit] of cache.samplerUnits) {
        // IBL maps are scene-global, not per-object -- already bound once per draw call by the
        // dedicated "Global IBL Uniforms" block above. Letting this per-object loop also process
        // them would rebind them, clobbering the correct binding and re-triggering the same
        // sampler-type collision this loop is meant to avoid.
        if (
          "u_irradianceMap" === uniformName ||
          "u_prefilterMap" === uniformName ||
          "u_brdfLUT" === uniformName
        ) {
          continue;
        }
        const loc = u.get(uniformName);
        if (!loc || !this._isTextureUnitAvailable(unit, uniformName)) continue;

        this.gl.activeTexture(this.gl.TEXTURE0 + unit);
        // Cube-vs-2D is a property of the sampler's declared GLSL type, not its name -- any
        // samplerCube uniform (u_envMap today, potentially others in future materials) needs the
        // cube-texture fallback path, not just one hardcoded name.
        if (this.gl.SAMPLER_CUBE === cache.samplerTypes.get(uniformName)) {
          this.gl.bindTexture(this.gl.TEXTURE_2D, null);
          const ct = texs[uniformName] as CubeTexture;
          this.gl.bindTexture(
            this.gl.TEXTURE_CUBE_MAP,
            ct ? this._getWebGLCubeTexture(ct) : this.defaultCubeTexture,
          );
        } else {
          this.gl.bindTexture(this.gl.TEXTURE_CUBE_MAP, null);
          const t = texs[uniformName] as Texture;
          if (uniformName === "u_normalMap" && !t) {
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.defaultNormalMap);
          } else if (uniformName === "u_specularMap" && !t) {
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.defaultSpecularMap);
          } else if (uniformName === "u_opaqueMap" && !t) {
            this.gl.bindTexture(this.gl.TEXTURE_2D, this._opaqueTexture ?? this.defaultTexture);
          } else if (uniformName === "u_opaqueDepthMap" && !t) {
            this.gl.bindTexture(
              this.gl.TEXTURE_2D,
              this._opaqueDepthTexture ?? this.defaultTexture,
            );
          } else {
            const glTex = t ? this._getWebGLTexture(t) : this.defaultTexture;
            if (t && "isTextureArray" in t && (t as TextureArray).isTextureArray) {
              this.gl.bindTexture(this.gl.TEXTURE_2D_ARRAY, glTex);
            } else {
              this.gl.bindTexture(this.gl.TEXTURE_2D, glTex);
            }
          }
        }
        this.gl.uniform1i(loc, unit);
      }
    }

    // --- 4. Render each object ---
    for (const o of objects) {
      if (!o.geometry) continue;

      this._acquireProgram(o, programKey);
      this._acquireTextures(o, manifest.textures);

      if (isInstanced) {
        const instMesh = o as InstancedMesh;

        this._scratchModelMatrix.set(instMesh.worldMatrix.data);
        const uModel = u.get("u_model");
        if (uModel) this.gl.uniformMatrix4fv(uModel, false, this._scratchModelMatrix);

        let matrixBuf = this._instanceBuffers.get(instMesh);
        if (!matrixBuf) {
          matrixBuf = this.gl.createBuffer()!;
          this._instanceBuffers.set(instMesh, matrixBuf);
        }
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, matrixBuf);
        if (instMesh.instanceMatrixNeedsUpdate) {
          this.gl.bufferData(this.gl.ARRAY_BUFFER, instMesh.instanceMatrices, this.gl.DYNAMIC_DRAW);
          instMesh.instanceMatrixNeedsUpdate = false;
        }

        const mesh = this._getOrCreateMesh(instMesh, instMesh.geometry!);

        mesh.bind(
          cache.attributes.get("a_position")!,
          cache.attributes.get("a_normal")!,
          cache.attributes.get("a_uv")!,
          cache.attributes.get("a_tangent")!,
        );

        const loc = cache.attributes.get("a_instanceMatrix");
        if (loc !== undefined && loc >= 0) {
          this.gl.bindBuffer(this.gl.ARRAY_BUFFER, matrixBuf);
          for (let i = 0; i < 4; i++) {
            const attribLoc = loc + i;
            this.gl.enableVertexAttribArray(attribLoc);
            this.gl.vertexAttribPointer(attribLoc, 4, this.gl.FLOAT, false, 64, i * 16);
            this.gl.vertexAttribDivisor(attribLoc, 1);
          }
        }

        const dataLoc = cache.attributes.get("a_instanceData");
        if (dataLoc !== undefined && dataLoc >= 0 && instMesh.instanceData) {
          let dataBuf = this._instanceDataBuffers.get(instMesh);
          if (!dataBuf) {
            dataBuf = this.gl.createBuffer()!;
            this._instanceDataBuffers.set(instMesh, dataBuf);
          }
          this.gl.bindBuffer(this.gl.ARRAY_BUFFER, dataBuf);
          if (instMesh.instanceDataNeedsUpdate) {
            this.gl.bufferData(this.gl.ARRAY_BUFFER, instMesh.instanceData, this.gl.DYNAMIC_DRAW);
            instMesh.instanceDataNeedsUpdate = false;
          }
          this.gl.enableVertexAttribArray(dataLoc);
          this.gl.vertexAttribPointer(
            dataLoc,
            instMesh.instanceDataSize,
            this.gl.FLOAT,
            false,
            0,
            0,
          );
          this.gl.vertexAttribDivisor(dataLoc, 1);
        }

        const drawMode = topology === Topology.LINE_LIST ? this.gl.LINES : this.gl.TRIANGLES;
        if (mesh.isIndexed) {
          this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, mesh.ebo ?? null);
          this.gl.drawElementsInstanced(
            drawMode,
            mesh.count,
            mesh.indexType,
            0,
            instMesh.instanceCount,
          );
        } else {
          this.gl.drawArraysInstanced(drawMode, 0, mesh.count, instMesh.instanceCount);
        }

        if (loc !== undefined && loc >= 0) {
          for (let i = 0; i < 4; i++) {
            this.gl.vertexAttribDivisor(loc + i, 0);
            this.gl.disableVertexAttribArray(loc + i);
          }
        }
        if (dataLoc !== undefined && dataLoc >= 0) {
          this.gl.vertexAttribDivisor(dataLoc, 0);
          this.gl.disableVertexAttribArray(dataLoc);
        }
      } else {
        // Model Matrix & Billboarding
        this._scratchModelMatrix.set(o.worldMatrix.data);
        if (state?.isSprite && vMat) {
          const sx = Math.sqrt(
            this._scratchModelMatrix[0]! ** 2 +
              this._scratchModelMatrix[1]! ** 2 +
              this._scratchModelMatrix[2]! ** 2,
          );
          const sy = Math.sqrt(
            this._scratchModelMatrix[4]! ** 2 +
              this._scratchModelMatrix[5]! ** 2 +
              this._scratchModelMatrix[6]! ** 2,
          );
          const sz = Math.sqrt(
            this._scratchModelMatrix[8]! ** 2 +
              this._scratchModelMatrix[9]! ** 2 +
              this._scratchModelMatrix[10]! ** 2,
          );
          this._scratchModelMatrix[0] = vMat[0]! * sx;
          this._scratchModelMatrix[1] = vMat[4]! * sx;
          this._scratchModelMatrix[2] = vMat[8]! * sx;
          this._scratchModelMatrix[4] = vMat[1]! * sy;
          this._scratchModelMatrix[5] = vMat[5]! * sy;
          this._scratchModelMatrix[6] = vMat[9]! * sy;
          this._scratchModelMatrix[8] = vMat[2]! * sz;
          this._scratchModelMatrix[9] = vMat[6]! * sz;
          this._scratchModelMatrix[10] = vMat[10]! * sz;
        }
        const uModel = u.get("u_model");
        if (uModel) this.gl.uniformMatrix4fv(uModel, false, this._scratchModelMatrix);

        // Bind and Draw Geometry
        const mesh = this._getOrCreateMesh(o, o.geometry);

        mesh.bind(
          cache.attributes.get("a_position")!,
          cache.attributes.get("a_normal")!,
          cache.attributes.get("a_uv")!,
          cache.attributes.get("a_tangent")!,
        );

        const drawMode = topology === Topology.LINE_LIST ? this.gl.LINES : this.gl.TRIANGLES;
        mesh.draw(drawMode, wireframeMode);
      }
    }
  }

  public updateGlobalUBO(
    vp: Float32Array,
    camPos: Vector3D,
    lights: LightDataInterface,
    near: number = 0.1,
    far: number = 1000,
  ): void {
    const ubo = this._globalUBO;
    ubo.setMatrix(0, vp);
    ubo.setVector3(64, camPos);

    // Scale colors by intensity
    const aScaled = new Vector3D(
      lights.aCol.r * lights.aIntensity,
      lights.aCol.g * lights.aIntensity,
      lights.aCol.b * lights.aIntensity,
    );
    const dScaled = new Vector3D(
      lights.dCol.r * lights.dIntensity,
      lights.dCol.g * lights.dIntensity,
      lights.dCol.b * lights.dIntensity,
    );

    ubo.setVector3(80, aScaled);
    ubo.setVector3(96, dScaled);
    ubo.setVector3(112, lights.dDir);
    ubo.setInt(128, lights.pLights.length);
    ubo.setInt(132, lights.sLights.length);
    ubo.setInt(136, lights.aLights.length);
    ubo.setFloat(140, this._quality.gamma ?? 2.2);
    ubo.setFloat(144, this._quality.exposure ?? 1.0);

    for (let i = 0; i < 16; i++) {
      const offset = 160 + i * 32;
      if (i < lights.pLights.length) {
        const pl = lights.pLights[i]!;
        ubo.setVector3(
          offset,
          new Vector3D(
            pl.worldMatrix.data[12]!,
            pl.worldMatrix.data[13]!,
            pl.worldMatrix.data[14]!,
          ),
        );
        ubo.setVector3(
          offset + 16,
          new Vector3D(
            pl.color.r * pl.intensity,
            pl.color.g * pl.intensity,
            pl.color.b * pl.intensity,
          ),
        );
        ubo.setFloat(offset + 12, pl.distance);
        ubo.setFloat(offset + 28, pl.decay);
      }
    }

    for (let i = 0; i < 16; i++) {
      const offset = 672 + i * 64;
      if (i < lights.sLights.length) {
        const sl = lights.sLights[i]!;
        const dir = MathPool.acquireVector().copyFrom(sl.direction).normalize();
        ubo.setVector3(
          offset,
          new Vector3D(
            sl.worldMatrix.data[12]!,
            sl.worldMatrix.data[13]!,
            sl.worldMatrix.data[14]!,
          ),
        );
        ubo.setVector3(offset + 16, dir);
        ubo.setVector3(
          offset + 32,
          new Vector3D(
            sl.color.r * sl.intensity,
            sl.color.g * sl.intensity,
            sl.color.b * sl.intensity,
          ),
        );
        ubo.setFloat(offset + 48, Math.cos(sl.angle));
        ubo.setFloat(offset + 52, Math.cos(sl.angle * (1.0 - sl.penumbra)));
        ubo.setFloat(offset + 56, sl.distance);
        ubo.setFloat(offset + 60, sl.decay);
        MathPool.releaseVector(dir);
      }
    }

    for (let i = 0; i < 4; i++) {
      const offset = 1696 + i * 112;
      if (i < lights.aLights.length) {
        const al = lights.aLights[i]!;
        const mat = al.worldMatrix.data;
        ubo.setVector3(offset, new Vector3D(mat[12]!, mat[13]!, mat[14]!));
        ubo.setVector3(
          offset + 16,
          new Vector3D(
            al.color.r * al.intensity,
            al.color.g * al.intensity,
            al.color.b * al.intensity,
          ),
        );
        ubo.setVector3(offset + 32, new Vector3D(mat[0]!, mat[1]!, mat[2]!));
        ubo.setVector3(offset + 48, new Vector3D(mat[4]!, mat[5]!, mat[6]!));
        ubo.setVector3(offset + 64, new Vector3D(mat[8]!, mat[9]!, mat[10]!));
        ubo.setFloat(offset + 80, al.width / 2.0);
        ubo.setFloat(offset + 84, al.height / 2.0);
      }
    }

    ubo.setVec2(152, near, far);
    ubo.update();
  }

  /** @inheritdoc */
  public override setSize(width: number, height: number): void {
    super.setSize(width, height);

    if (this.postProcessing.enabled) {
      this.gl.getExtension("EXT_color_buffer_float");
      if (!this._hdrFbo) {
        this._hdrFbo = new WebGL2FrameBuffer(this.gl, {
          width: this.gl.canvas.width,
          height: this.gl.canvas.height,
          internalFormat: this.gl.RGBA16F,
          format: this.gl.RGBA,
          type: this.gl.HALF_FLOAT,
        });
        this._postPassGL ??= new PostProcessPassGL(this.gl, true);
        this._bloomPassGL ??= new BloomPassGL(this.gl, true);
        this._hbaoPassGL ??= new AOPassGL(this.gl);
        this._taaPassGL ??= new HistoryBlendPassGL(this.gl);
        this._motionTrailPassGL ??= new HistoryBlendPassGL(this.gl);
      } else {
        this._hdrFbo.resize(this.gl.canvas.width, this.gl.canvas.height);
      }
    } else if (this._hdrFbo) {
      this._postPassGL?.destroy?.(this.gl);
      this._bloomPassGL?.destroy();
      this._hbaoPassGL?.destroy();
      this._taaPassGL?.destroy();
      this._motionTrailPassGL?.destroy();
      this._hdrFbo.destroy();
      this._hdrFbo = undefined;
      this._postPassGL = undefined;
      this._bloomPassGL = undefined;
      this._hbaoPassGL = undefined;
      this._taaPassGL = undefined;
      this._motionTrailPassGL = undefined;
    }
  }

  /**
   * Looks up (or lazily creates) the GPU mesh for an object's geometry, and tracks
   * per-object geometry references so `releaseObjectResources` can correctly free
   * buffers once nothing references them anymore -- even when geometry is shared
   * across many objects (see showcases/19) or swapped on a live object at runtime.
   */
  private _getOrCreateMesh(obj: Object3D, geo: GeometryDataInterface): Mesh {
    let mesh = this._cache.get(geo);
    if (!mesh) {
      mesh = new Mesh(this.gl, geo);
      this._cache.set(geo, mesh);
    } else if (geo.needsUpdate) {
      mesh.update(geo);
      geo.needsUpdate = false;
    }

    const lastGeo = this._lastKnownGeometry.get(obj);
    if (lastGeo !== geo) {
      if (lastGeo) this._releaseGeometryFor(obj);
      mesh.refCount++;
      this._lastKnownGeometry.set(obj, geo);
    }

    return mesh;
  }

  private _releaseGeometryFor(obj: Object3D): void {
    const geo = this._lastKnownGeometry.get(obj);
    if (!geo) return;
    this._lastKnownGeometry.delete(obj);

    const mesh = this._cache.get(geo);
    if (!mesh) return;
    mesh.refCount--;
    if (mesh.refCount <= 0) {
      mesh.dispose();
      this._cache.delete(geo);
    }
  }

  /**
   * Tracks that `obj` currently depends on the textures in `textures` (typically
   * `material.getRenderManifest().textures`). Called once per object per frame from
   * the render loop. `textures` is diffed key-by-key against `obj`'s last-known
   * snapshot rather than by container reference, since a material's manifest object
   * is created once and mutated in place on every `getRenderManifest()` call.
   */
  private _acquireTextures(
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
    // it, never delete the underlying WebGLTexture here.
    if (tex instanceof RenderTarget || tex instanceof RenderTargetCube) return;

    if (tex instanceof CubeTexture) {
      const count = (this._texCubeRefCounts.get(tex) ?? 1) - 1;
      if (count <= 0) {
        const glTex = this._texCubeCache.get(tex);
        if (glTex) this.gl.deleteTexture(glTex);
        this._texCubeCache.delete(tex);
        this._texCubeRefCounts.delete(tex);
      } else {
        this._texCubeRefCounts.set(tex, count);
      }
    } else {
      const count = (this._texRefCounts.get(tex) ?? 1) - 1;
      if (count <= 0) {
        const glTex = this._texCache.get(tex);
        if (glTex) this.gl.deleteTexture(glTex);
        this._texCache.delete(tex);
        this._texRefCounts.delete(tex);
      } else {
        this._texRefCounts.set(tex, count);
      }
    }
  }

  private _releaseObjectTextures(obj: Object3D): void {
    const textures = this._lastKnownTextures.get(obj);
    if (!textures) return;
    this._lastKnownTextures.delete(obj);
    for (const tex of Object.values(textures)) {
      if (tex) this._releaseTexture(tex);
    }
  }

  /** @inheritdoc */
  protected override releaseObjectResources(obj: Object3D): void {
    this._releaseGeometryFor(obj);
    this._releaseObjectProgram(obj);
    this._releaseObjectTextures(obj);
  }

  /** @inheritdoc */
  public override destroy(): void {
    const gl = this.gl;
    if (gl) {
      for (const cache of this._programs.values()) gl.deleteProgram(cache.prog);
      for (const tex of this._texCache.values()) gl.deleteTexture(tex);
      for (const tex of this._texCubeCache.values()) gl.deleteTexture(tex);
      for (const mesh of this._cache.values()) mesh.dispose();
      for (const fbo of this._renderTargetFbos.values()) fbo.destroy();
      for (const fbo of this._renderTargetCubeFbos.values()) fbo.destroy();
      for (const shadowFbo of this._shadowMaps.values()) shadowFbo.destroy();
      this._dummyShadowMap?.destroy();
      if (this._rawDepthSampler) gl.deleteSampler(this._rawDepthSampler);
      this._hdrFbo?.destroy();
      this._postPassGL?.destroy(gl);
      this._bloomPassGL?.destroy();
      this._hbaoPassGL?.destroy();
      this._taaPassGL?.destroy();
      this._motionTrailPassGL?.destroy();
      this._globalUBO?.destroy();
    }

    this._programs.clear();
    this._cache.clear();
    this._texCache.clear();
    this._texCubeCache.clear();
    this._renderTargetFbos.clear();
    this._renderTargetCubeFbos.clear();
    this._shadowMaps.clear();
    this._scratchTransparentMap.clear();
    this._hdrFbo = undefined;
    this._postPassGL = undefined;
    this._bloomPassGL = undefined;

    super.destroy();
  }
}

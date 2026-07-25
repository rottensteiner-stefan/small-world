import { AbstractWebGLRenderer } from "../AbstractWebGLRenderer.js";
import { WebGLMainPass } from "../passes/WebGLMainPass.js";
import { WebGLPostProcessPass } from "../passes/WebGLPostProcessPass.js";
import { PostProcessPassGL } from "../post/passes/index.js";
import { CubeTexture, Texture, RenderTarget } from "../../core/textures/index.js";
import { ShaderRegistry } from "../../core/renderers/shaders/index.js";
import { DeviceCaps, DeviceLimit, Object3D, Scene } from "../../core/index.js";
import {
  EngineOptions,
  GeometryDataInterface,
  LightDataInterface,
} from "../../interfaces/index.js";
import {
  MaterialType,
  RendererType,
  TextureFilter,
  CullMode,
  BlendingMode,
} from "../../enums/index.js";
import { Mesh } from "../Mesh.js";
import { Vector3D } from "../../math/index.js";

interface ProgramCache {
  prog: WebGLProgram;
  uniforms: Map<string, WebGLUniformLocation | undefined>;
  attributes: Map<string, number>;
  pointLightLocs: {
    pos: WebGLUniformLocation | undefined;
    col: WebGLUniformLocation | undefined;
    distance: WebGLUniformLocation | undefined;
    decay: WebGLUniformLocation | undefined;
  }[];
  spotLightLocs: {
    pos: WebGLUniformLocation | undefined;
    dir: WebGLUniformLocation | undefined;
    col: WebGLUniformLocation | undefined;
    params: WebGLUniformLocation | undefined;
  }[];
  areaLightLocs: {
    pos: WebGLUniformLocation | undefined;
    col: WebGLUniformLocation | undefined;
    normal: WebGLUniformLocation | undefined;
    right: WebGLUniformLocation | undefined;
    up: WebGLUniformLocation | undefined;
    size: WebGLUniformLocation | undefined;
  }[];
}

/**
 * WebGL 1.0 implementation of the renderer.
 */
export class WebGL1Renderer extends AbstractWebGLRenderer {
  /** @inheritdoc */
  public override readonly type: RendererType = RendererType.WEB_GL1;
  declare protected gl: WebGLRenderingContext;

  private _stateCullFaceEnabled: boolean | null = null;
  private _stateCullFaceMode: number = -1;
  private _stateBlendEnabled: boolean | null = null;
  private _stateBlendSrc: number = -1;
  private _stateBlendDst: number = -1;
  private _stateDepthMask: boolean | null = null;
  private _stateDepthTest: boolean | null = null;

  /** Satisfies Renderer interface */
  public override get webglContext(): WebGLRenderingContext {
    return this.gl;
  }

  private _programs: Map<string, ProgramCache> = new Map();

  private _cache: Map<GeometryDataInterface, Mesh> = new Map();
  private _texCache: Map<Texture, WebGLTexture> = new Map();
  private _texCubeCache: Map<CubeTexture, WebGLTexture> = new Map();
  private _scratchTransparentMap: Map<string, Object3D[]> = new Map();

  private readonly _samplerUnits: Record<string, number> = {
    u_diffuseMap: 0,
    u_normalMap: 1,
    u_specularMap: 2,
    u_metallicMap: 3,
    u_roughnessMap: 4,
    u_emissiveMap: 5,
    u_alphaMap: 6,
    u_opaqueMap: 7,
    u_envMap: 7,
    u_reflectionMap: 8,
  };

  public _opaqueTexture?: WebGLTexture;
  public _opaqueTextureWrapper?: Texture;

  protected _hdrFbo: WebGLFramebuffer | undefined = undefined;
  protected _hdrTexture: WebGLTexture | undefined = undefined;
  protected _hdrRenderBuffer: WebGLRenderbuffer | undefined = undefined;
  protected _postPassGL: PostProcessPassGL | undefined = undefined;

  protected _activeRenderTarget: RenderTarget | null = null;
  private _renderTargetFbos: Map<RenderTarget, WebGLFramebuffer> = new Map();

  private _scratchModelMatrix: Float32Array = new Float32Array(16);

  /** @inheritdoc */
  public async initialize(
    canvas: HTMLCanvasElement,
    attributes?: Record<string, unknown>,
    config?: EngineOptions,
  ): Promise<void> {
    const gl =
      canvas.getContext("webgl", attributes) || canvas.getContext("experimental-webgl", attributes);
    if (!gl) throw new Error("[WebGL1Renderer] WebGL1 context could not be initialized.");
    this.gl = gl as WebGLRenderingContext;

    if (config?.quality) {
      this._quality = { ...this._quality, ...config.quality };
    }
    if (config?.postProcessing) {
      this.postProcessing.loadConfig(config.postProcessing);
    }

    this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, false);
    this.initDefaultTextures();
    this.gl.enable(this.gl.DEPTH_TEST);

    this.addPass(new WebGLMainPass());
    this.addPass(new WebGLPostProcessPass());
  }

  private _getProgram(shaderId: string): ProgramCache {
    let cache = this._programs.get(shaderId);
    if (!cache) {
      const def = ShaderRegistry.instance.get(shaderId);
      if (!def || !def.sources.glsl100) {
        throw new Error(
          `[WebGL1Renderer] Shader definition for ${shaderId} not found or missing GLSL 100 source.`,
        );
      }

      const vs = ShaderRegistry.instance.assemble(def.sources.glsl100.vs, "glsl100");
      const fs = ShaderRegistry.instance.assemble(def.sources.glsl100.fs, "glsl100");
      const prog = this.createShaderProgram(vs, fs);

      const uniforms = new Map<string, WebGLUniformLocation | undefined>();
      const attributes = new Map<string, number>();

      ["a_position", "a_normal", "a_uv", "a_tangent"].forEach((name) => {
        attributes.set(name, this.gl.getAttribLocation(prog, name));
      });

      Object.keys(def.layout.uniforms).forEach((name) => {
        const loc = this.gl.getUniformLocation(prog, name);
        if (
          null === loc &&
          name !== "u_thresholds" &&
          name !== "u_liquidParams" &&
          shaderId !== MaterialType.DEPTH
        ) {
          console.warn(
            `[WebGL1Renderer] Uniform '${name}' defined in material layout but not found in shader '${shaderId}'. It might be unused or optimized away.`,
          );
        }
        uniforms.set(name, loc ?? undefined);
      });

      [
        "u_vp",
        "u_model",
        "u_viewPos",
        "u_ambientColor",
        "u_dirLightColor",
        "u_dirLightDir",
        "u_numPointLights",
        "u_numSpotLights",
        "u_numAreaLights",
        "u_color",
        "u_specColor",
        "u_shininess",
        "u_thresholds",
        "u_time",
        "u_flowSpeed",
        "u_noiseScale",
        "u_diffuseMap",
        "u_normalMap",
        "u_specularMap",
        "u_skybox",
        "u_sandMap",
        "u_grassMap",
        "u_rockMap",
        "u_snowMap",
        "u_texOffset",
        "u_texRepeat",
        "u_opaqueMap",
        "u_fogMode",
        "u_fogColor",
        "u_fogDensity",
        "u_fogNear",
        "u_fogFar",
        "u_fogHeight",
        "u_fogHeightFalloff",
      ].forEach((name) => {
        if (!uniforms.has(name)) {
          uniforms.set(name, this.gl.getUniformLocation(prog, name) ?? undefined);
        }
      });

      const pointLightLocs = [];
      const spotLightLocs = [];
      const areaLightLocs = [];
      for (let i = 0; i < 4; i++) {
        pointLightLocs.push({
          pos: this.gl.getUniformLocation(prog, `u_pointLightPos[${i}]`) ?? undefined,
          col: this.gl.getUniformLocation(prog, `u_pointLightColor[${i}]`) ?? undefined,
          distance: this.gl.getUniformLocation(prog, `u_pointLightDistance[${i}]`) ?? undefined,
          decay: this.gl.getUniformLocation(prog, `u_pointLightDecay[${i}]`) ?? undefined,
        });
        spotLightLocs.push({
          pos: this.gl.getUniformLocation(prog, `u_spotLightPos[${i}]`) ?? undefined,
          dir: this.gl.getUniformLocation(prog, `u_spotLightDir[${i}]`) ?? undefined,
          col: this.gl.getUniformLocation(prog, `u_spotLightColor[${i}]`) ?? undefined,
          params: this.gl.getUniformLocation(prog, `u_spotLightParams[${i}]`) ?? undefined,
        });
        areaLightLocs.push({
          pos: this.gl.getUniformLocation(prog, `u_areaLightPos[${i}]`) ?? undefined,
          col: this.gl.getUniformLocation(prog, `u_areaLightColor[${i}]`) ?? undefined,
          right: this.gl.getUniformLocation(prog, `u_areaLightRight[${i}]`) ?? undefined,
          up: this.gl.getUniformLocation(prog, `u_areaLightUp[${i}]`) ?? undefined,
          normal: this.gl.getUniformLocation(prog, `u_areaLightNormal[${i}]`) ?? undefined,
          size: this.gl.getUniformLocation(prog, `u_areaLightSize[${i}]`) ?? undefined,
        });
      }

      cache = { prog, uniforms, attributes, pointLightLocs, spotLightLocs, areaLightLocs };
      this._programs.set(shaderId, cache);
    }
    return cache;
  }

  private _getWebGLTexture(tex: Texture): WebGLTexture {
    if (this._quality?.disableTextures) return this.defaultTexture;
    if (!tex.isLoaded || !tex.image) return this.defaultTexture;
    let glTex: WebGLTexture | undefined = this._texCache.get(tex);
    if (!glTex) {
      glTex = this.gl.createTexture()!;
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
      this.gl.texParameteri(
        this.gl.TEXTURE_2D,
        this.gl.TEXTURE_MIN_FILTER,
        useMipmaps ? this.gl.LINEAR_MIPMAP_LINEAR : this.gl.LINEAR,
      );
      this._texCache.set(tex, glTex);
    }
    return glTex;
  }

  private _getWebGLCubeTexture(tex: CubeTexture): WebGLTexture {
    if (this._quality?.disableTextures) return this.defaultCubeTexture;
    if (!tex.isLoaded || tex.images.length !== 6) return this.defaultCubeTexture;
    let glTex: WebGLTexture | undefined = this._texCubeCache.get(tex);
    if (!glTex) {
      glTex = this.gl.createTexture()!;
      this.gl.bindTexture(this.gl.TEXTURE_CUBE_MAP, glTex);
      for (let i: number = 0; i < 6; i++) {
        this.gl.texImage2D(
          this.gl.TEXTURE_CUBE_MAP_POSITIVE_X + i,
          0,
          this.gl.RGBA,
          this.gl.RGBA,
          this.gl.UNSIGNED_BYTE,
          tex.images[i] as ImageBitmap,
        );
      }
      this.gl.texParameteri(this.gl.TEXTURE_CUBE_MAP, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
      this.gl.texParameteri(this.gl.TEXTURE_CUBE_MAP, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
      this._texCubeCache.set(tex, glTex);
    }
    return glTex;
  }

  /** @inheritdoc */
  public override setRenderTarget(target: RenderTarget | null): void {
    this._activeRenderTarget = target;
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

  public bindMainRenderTarget(): boolean {
    let isOffscreen = false;

    if (this._activeRenderTarget) {
      isOffscreen = true;
      let fbo = this._renderTargetFbos.get(this._activeRenderTarget);
      if (!fbo || !this._activeRenderTarget.isLoaded) {
        if (fbo) this.gl.deleteFramebuffer(fbo);
        fbo = this.gl.createFramebuffer()!;
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, fbo);

        const tex = this.gl.createTexture()!;
        this.gl.bindTexture(this.gl.TEXTURE_2D, tex);
        this.gl.texImage2D(
          this.gl.TEXTURE_2D,
          0,
          this.gl.RGBA,
          this._activeRenderTarget.width,
          this._activeRenderTarget.height,
          0,
          this.gl.RGBA,
          this.gl.UNSIGNED_BYTE,
          null,
        );
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);

        this.gl.framebufferTexture2D(
          this.gl.FRAMEBUFFER,
          this.gl.COLOR_ATTACHMENT0,
          this.gl.TEXTURE_2D,
          tex,
          0,
        );

        if (this._activeRenderTarget.depth) {
          const depthRb = this.gl.createRenderbuffer()!;
          this.gl.bindRenderbuffer(this.gl.RENDERBUFFER, depthRb);
          this.gl.renderbufferStorage(
            this.gl.RENDERBUFFER,
            this.gl.DEPTH_COMPONENT16,
            this._activeRenderTarget.width,
            this._activeRenderTarget.height,
          );
          this.gl.framebufferRenderbuffer(
            this.gl.FRAMEBUFFER,
            this.gl.DEPTH_ATTACHMENT,
            this.gl.RENDERBUFFER,
            depthRb,
          );
        }

        this._renderTargetFbos.set(this._activeRenderTarget, fbo);
        this._texCache.set(this._activeRenderTarget, tex);
        this._activeRenderTarget.isLoaded = true;
      } else {
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, fbo);
      }
      this.gl.viewport(0, 0, this._activeRenderTarget.width, this._activeRenderTarget.height);
    } else if (this.postProcessing.enabled && this._hdrFbo) {
      this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this._hdrFbo);
      this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
    } else {
      this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
      this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
    }

    return isOffscreen;
  }

  public bindPostProcessRenderTarget(): void {
    // Unused in WebGL1 directly as FBO is bound in bindMainRenderTarget
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

  public flushPostProcess(): void {
    const isOffscreen = this._activeRenderTarget !== null;
    if (!isOffscreen && this.postProcessing.enabled && this._hdrTexture && this._postPassGL) {
      this._postPassGL.execute(this.gl, this._hdrTexture, this.postProcessing);
    }
  }

  public renderBatch(
    batch: import("../../core/Scene.js").RenderBatch,
    vMat: Float32Array | undefined,
    vp: Float32Array,
    camPos: Vector3D,
    lights: LightDataInterface,
    scene: Scene,
  ): void {
    const shaderId = batch.shaderId;
    const materialGroups = new Map([[batch.topology as string, batch.objects]]);
    const topology = batch.topology as string;
    const fog = scene.fog;
    const cache = this._getProgram(shaderId);
    this.gl.useProgram(cache.prog);

    const u = cache.uniforms;

    // --- Bind Global Uniforms (Once per shader) ---
    const uVp = u.get("u_vp");
    if (uVp) this.gl.uniformMatrix4fv(uVp, false, vp);
    const uViewPos = u.get("u_viewPos");
    if (uViewPos) this.gl.uniform3f(uViewPos, camPos.x, camPos.y, camPos.z);

    const uAmbientColor = u.get("u_ambientColor");
    if (uAmbientColor)
      this.gl.uniform3f(
        uAmbientColor,
        lights.aCol.r * lights.aIntensity,
        lights.aCol.g * lights.aIntensity,
        lights.aCol.b * lights.aIntensity,
      );

    const uDirLightColor = u.get("u_dirLightColor");
    if (uDirLightColor)
      this.gl.uniform3f(
        uDirLightColor,
        lights.dCol.r * lights.dIntensity,
        lights.dCol.g * lights.dIntensity,
        lights.dCol.b * lights.dIntensity,
      );

    const uDirLightDir = u.get("u_dirLightDir");
    if (uDirLightDir) this.gl.uniform3f(uDirLightDir, lights.dDir.x, lights.dDir.y, lights.dDir.z);

    // --- Bind Lights ---
    const uNumPointLights = u.get("u_numPointLights");
    if (uNumPointLights) this.gl.uniform1i(uNumPointLights, lights.pLights.length);
    for (let i = 0; i < lights.pLights.length; i++) {
      const pl = lights.pLights[i]!;
      const loc = cache.pointLightLocs[i];
      if (loc?.pos)
        this.gl.uniform3f(
          loc.pos,
          pl.worldMatrix.data[12]!,
          pl.worldMatrix.data[13]!,
          pl.worldMatrix.data[14]!,
        );
      if (loc?.col)
        this.gl.uniform3f(
          loc.col,
          pl.color.r * pl.intensity,
          pl.color.g * pl.intensity,
          pl.color.b * pl.intensity,
        );
      if (loc?.distance) this.gl.uniform1f(loc.distance, pl.distance);
      if (loc?.decay) this.gl.uniform1f(loc.decay, pl.decay);
    }

    for (const [_, objects] of materialGroups.entries()) {
      const firstObj = objects[0]!;
      const mat = firstObj.material!;
      const manifest = mat.getRenderManifest();
      const texs = manifest.textures;

      // --- Fog Uniforms ---
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
        }
      }

      // --- 3. Bind Textures ---
      if (shaderId === MaterialType.SKYBOX) {
        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, null); // Unbind 2D to prevent conflict
        const skyTex = texs["u_skybox"] as CubeTexture;
        this.gl.bindTexture(
          this.gl.TEXTURE_CUBE_MAP,
          skyTex ? this._getWebGLCubeTexture(skyTex) : this.defaultCubeTexture,
        );
        const uSkybox = u.get("u_skybox");
        if (uSkybox) this.gl.uniform1i(uSkybox, 0);
      } else {
        for (const uniformName in this._samplerUnits) {
          const unit = this._samplerUnits[uniformName]!;
          const loc = u.get(uniformName);
          if (loc) {
            const maxUnits = DeviceCaps.getLimit(DeviceLimit.MAX_TEXTURE_IMAGE_UNITS);
            if (unit >= maxUnits) {
              console.warn(
                `[WebGL1Renderer] Exceeded MAX_TEXTURE_IMAGE_UNITS (${maxUnits}). Cannot bind material texture ${uniformName} to unit ${unit}.`,
              );
            } else {
              this.gl.activeTexture(this.gl.TEXTURE0 + unit);
              if (uniformName === "u_envMap") {
                this.gl.bindTexture(this.gl.TEXTURE_2D, null);
                const ct = texs[uniformName] as CubeTexture;
                this.gl.bindTexture(
                  this.gl.TEXTURE_CUBE_MAP,
                  ct ? this._getWebGLCubeTexture(ct) : this.defaultCubeTexture,
                );
              } else {
                this.gl.bindTexture(this.gl.TEXTURE_CUBE_MAP, null);
                const t = texs[uniformName] as Texture;
                this.gl.bindTexture(
                  this.gl.TEXTURE_2D,
                  t
                    ? this._getWebGLTexture(t)
                    : uniformName === "u_normalMap"
                      ? this.defaultNormalMap
                      : this.defaultTexture,
                );
              }
              this.gl.uniform1i(loc, unit);
            }
          }
        }
      }

      // --- Render each object ---
      for (const o of objects) {
        if (!o.geometry) continue;

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

        let mesh = this._cache.get(o.geometry);
        if (!mesh) {
          mesh = new Mesh(this.gl, o.geometry);
          this._cache.set(o.geometry, mesh);
        }
        mesh.bind(
          cache.attributes.get("a_position")!,
          cache.attributes.get("a_normal")!,
          cache.attributes.get("a_uv")!,
          cache.attributes.get("a_tangent")!,
        );
        mesh.draw(
          topology === "line-list" ? this.gl.LINES : this.gl.TRIANGLES,
          batch.wireframeMode,
        );
      }
    }
  }

  /** @inheritdoc */
  public override setSize(width: number, height: number): void {
    super.setSize(width, height);

    if (this.postProcessing.enabled) {
      if (!this._hdrFbo) {
        this._hdrFbo = this.gl.createFramebuffer()!;
        this._hdrTexture = this.gl.createTexture()!;
        this._hdrRenderBuffer = this.gl.createRenderbuffer()!;
      }

      const w = this.gl.canvas.width;
      const h = this.gl.canvas.height;

      // In WebGL1, floating point textures require extensions.
      // OES_texture_half_float allows HALF_FLOAT_OES.
      // OES_texture_float allows FLOAT.
      // WebGL1 framebuffers may not support rendering to float textures without WEBGL_color_buffer_float / EXT_color_buffer_half_float
      const extHalf = this.gl.getExtension("OES_texture_half_float");
      const extColorHalf = this.gl.getExtension("EXT_color_buffer_half_float");
      const useHalfFloat = extHalf && extColorHalf;
      const type = useHalfFloat ? extHalf.HALF_FLOAT_OES : this.gl.UNSIGNED_BYTE;

      this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this._hdrFbo);

      this.gl.bindTexture(this.gl.TEXTURE_2D, this._hdrTexture ?? null);
      this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, w, h, 0, this.gl.RGBA, type, null);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
      this.gl.framebufferTexture2D(
        this.gl.FRAMEBUFFER,
        this.gl.COLOR_ATTACHMENT0,
        this.gl.TEXTURE_2D,
        this._hdrTexture ?? null,
        0,
      );

      this.gl.bindRenderbuffer(this.gl.RENDERBUFFER, this._hdrRenderBuffer ?? null);
      this.gl.renderbufferStorage(this.gl.RENDERBUFFER, this.gl.DEPTH_STENCIL, w, h);
      this.gl.framebufferRenderbuffer(
        this.gl.FRAMEBUFFER,
        this.gl.DEPTH_STENCIL_ATTACHMENT,
        this.gl.RENDERBUFFER,
        this._hdrRenderBuffer ?? null,
      );

      this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
      this._postPassGL ??= new PostProcessPassGL(this.gl, false);
    } else if (this._hdrFbo) {
      this._postPassGL?.destroy(this.gl);
      this.gl.deleteFramebuffer(this._hdrFbo);
      this.gl.deleteTexture(this._hdrTexture!);
      this.gl.deleteRenderbuffer(this._hdrRenderBuffer!);
      this._hdrFbo = undefined;
      this._hdrTexture = undefined;
      this._hdrRenderBuffer = undefined;
      this._postPassGL = undefined;
    }
  }

  /** @inheritdoc */
  public override destroy(): void {
    const gl = this.gl;
    if (gl) {
      for (const cache of this._programs.values()) gl.deleteProgram(cache.prog);
      for (const tex of this._texCache.values()) gl.deleteTexture(tex);
      for (const tex of this._texCubeCache.values()) gl.deleteTexture(tex);
      for (const fbo of this._renderTargetFbos.values()) gl.deleteFramebuffer(fbo);
      for (const mesh of this._cache.values()) {
        if (mesh.vbo) gl.deleteBuffer(mesh.vbo);
        if (mesh.ebo) gl.deleteBuffer(mesh.ebo);
        if (mesh.webo) gl.deleteBuffer(mesh.webo);
        if (mesh.nbo) gl.deleteBuffer(mesh.nbo);
        if (mesh.tanbo) gl.deleteBuffer(mesh.tanbo);
        if (mesh.tbo) gl.deleteBuffer(mesh.tbo);
      }
      if (this._hdrFbo) gl.deleteFramebuffer(this._hdrFbo);
      if (this._hdrTexture) gl.deleteTexture(this._hdrTexture);
      if (this._hdrRenderBuffer) gl.deleteRenderbuffer(this._hdrRenderBuffer);
      this._postPassGL?.destroy(gl);
    }

    this._programs.clear();
    this._cache.clear();
    this._texCache.clear();
    this._texCubeCache.clear();
    this._renderTargetFbos.clear();
    this._scratchTransparentMap.clear();
    this._hdrFbo = undefined;
    this._hdrTexture = undefined;
    this._hdrRenderBuffer = undefined;
    this._postPassGL = undefined;

    super.destroy();
  }
}

/// src/renderers/WebGL1Renderer.ts

import { AbstractWebGLRenderer } from "./AbstractWebGLRenderer.js";
import {
  Color,
  CubeTexture,
  PhongMaterial,
  ShaderRegistry,
  Texture,
} from "../core/index.js";
import { EngineConfig, GeometryDataInterface, LightDataInterface } from "../interfaces/index.js";
import {
  MaterialType,
  RendererType,
  TextureFilter,
} from "../enums/index.js";
import { Mesh } from "./Mesh.js";
import { Object3D } from "../core/Object3D.js";
import { Scene } from "../core/Scene.js";
import { Vector3D } from "../math/index.js";

interface ProgramCache {
  prog: WebGLProgram;
  uniforms: Map<string, WebGLUniformLocation | undefined>;
  attributes: Map<string, number>;
  pointLightLocs: { pos: WebGLUniformLocation | undefined; col: WebGLUniformLocation | undefined }[];
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

  private _programs: Map<string, ProgramCache> = new Map();

  private _cache: Map<GeometryDataInterface, Mesh> = new Map();
  private _texCache: Map<Texture, WebGLTexture> = new Map();
  private _texCubeCache: Map<CubeTexture, WebGLTexture> = new Map();

  private _scratchModelMatrix: Float32Array = new Float32Array(16);

  /** @inheritdoc */
  public async initialize(
    canvas: HTMLCanvasElement,
    attributes?: Record<string, unknown>,
    config?: EngineConfig,
  ): Promise<void> {
    const gl = canvas.getContext("webgl", attributes) || canvas.getContext("experimental-webgl", attributes);
    if (!gl) throw new Error("[WebGL1Renderer] WebGL1 context could not be initialized.");
    this.gl = gl as WebGLRenderingContext;

    if (config?.quality) {
      this._quality = { ...this._quality, ...config.quality };
    }

    this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, false);
    this.initDefaultTextures();
    this.gl.enable(this.gl.DEPTH_TEST);
  }

  private _getProgram(shaderId: string): ProgramCache {
    let cache = this._programs.get(shaderId);
    if (!cache) {
      const def = ShaderRegistry.instance.get(shaderId);
      if (!def || !def.sources.glsl100) {
        throw new Error(`[WebGL1Renderer] Shader definition for ${shaderId} not found or missing GLSL 100 source.`);
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
        uniforms.set(name, this.gl.getUniformLocation(prog, name) ?? undefined);
      });

      [
        "u_vp", "u_model", "u_viewPos", "u_ambientColor", "u_dirLightColor", "u_dirLightDir",
        "u_numPointLights", "u_numSpotLights", "u_numAreaLights",
        "u_color", "u_specColor", "u_shininess", "u_thresholds",
        "u_diffuseMap", "u_normalMap", "u_specularMap", "u_skybox",
        "u_sandMap", "u_grassMap", "u_rockMap", "u_snowMap",
        "u_texOffset", "u_texRepeat"
      ].forEach((name) => {
        uniforms.set(name, this.gl.getUniformLocation(prog, name) ?? undefined);
      });

      const pointLightLocs = [];
      const spotLightLocs = [];
      const areaLightLocs = [];
      for (let i = 0; i < 4; i++) {
        pointLightLocs.push({
          pos: this.gl.getUniformLocation(prog, `u_pointLightPos[${i}]`) ?? undefined,
          col: this.gl.getUniformLocation(prog, `u_pointLightColor[${i}]`) ?? undefined,
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
    if (!tex.isLoaded || !tex.image) return this.defaultTexture;
    let glTex: WebGLTexture | undefined = this._texCache.get(tex);
    if (!glTex) {
      glTex = this.gl.createTexture()!;
      this.gl.bindTexture(this.gl.TEXTURE_2D, glTex);
      this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, tex.image);
      const useMipmaps = this._quality.mipmapping && tex.generateMipmaps;
      if (useMipmaps) this.gl.generateMipmap(this.gl.TEXTURE_2D);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, TextureFilter.NEAREST === tex.magFilter ? this.gl.NEAREST : this.gl.LINEAR);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, useMipmaps ? this.gl.LINEAR_MIPMAP_LINEAR : this.gl.LINEAR);
      this._texCache.set(tex, glTex);
    }
    return glTex;
  }

  private _getWebGLCubeTexture(tex: CubeTexture): WebGLTexture {
    if (!tex.isLoaded || tex.images.length !== 6) return this.defaultCubeTexture;
    let glTex: WebGLTexture | undefined = this._texCubeCache.get(tex);
    if (!glTex) {
      glTex = this.gl.createTexture()!;
      this.gl.bindTexture(this.gl.TEXTURE_CUBE_MAP, glTex);
      for (let i: number = 0; i < 6; i++) {
        this.gl.texImage2D(this.gl.TEXTURE_CUBE_MAP_POSITIVE_X + i, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, tex.images[i] as ImageBitmap);
      }
      this.gl.texParameteri(this.gl.TEXTURE_CUBE_MAP, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
      this.gl.texParameteri(this.gl.TEXTURE_CUBE_MAP, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
      this._texCubeCache.set(tex, glTex);
    }
    return glTex;
  }

  /** @inheritdoc */
  public render(scene: Scene, vp: Float32Array, camPos: Vector3D = new Vector3D()): void {
    const extractedLights = this.extractLights(scene);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
    this.gl.enable(this.gl.BLEND);
    this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);

    const sortedGroups = scene.getVisibleObjectsSorted();

    // --- PASS 1: Skybox ---
    const skyboxGroup = sortedGroups.get(MaterialType.SKYBOX);
    if (skyboxGroup) {
      this.gl.depthMask(false);
      this._renderGroup(MaterialType.SKYBOX, skyboxGroup, vp, Vector3D.ZERO, { 
        aCol: Color.BLACK, aIntensity: 0, 
        dCol: Color.BLACK, dIntensity: 0, dDir: Vector3D.ZERO, 
        pLights: [], sLights: [], aLights: [] 
      });
      this.gl.depthMask(true);
      sortedGroups.delete(MaterialType.SKYBOX);
    }

    // --- PASS 2: Objects ---
    for (const [shaderId, materialGroups] of sortedGroups.entries()) {
      this._renderGroup(shaderId, materialGroups, vp, camPos, extractedLights);
    }
  }

  private _renderGroup(shaderId: string, materialGroups: Map<string, Object3D[]>, vp: Float32Array, camPos: Vector3D, lights: LightDataInterface): void {
    const cache = this._getProgram(shaderId);
    this.gl.useProgram(cache.prog);

    const u = cache.uniforms;

    // --- Bind Global Uniforms (Once per shader) ---
    const uVp = u.get("u_vp"); if (uVp) this.gl.uniformMatrix4fv(uVp, false, vp);
    const uViewPos = u.get("u_viewPos"); if (uViewPos) this.gl.uniform3f(uViewPos, camPos.x, camPos.y, camPos.z);
    
    const uAmbientColor = u.get("u_ambientColor"); 
    if (uAmbientColor) this.gl.uniform3f(uAmbientColor, lights.aCol.r * lights.aIntensity, lights.aCol.g * lights.aIntensity, lights.aCol.b * lights.aIntensity);
    
    const uDirLightColor = u.get("u_dirLightColor"); 
    if (uDirLightColor) this.gl.uniform3f(uDirLightColor, lights.dCol.r * lights.dIntensity, lights.dCol.g * lights.dIntensity, lights.dCol.b * lights.dIntensity);
    
    const uDirLightDir = u.get("u_dirLightDir"); if (uDirLightDir) this.gl.uniform3f(uDirLightDir, lights.dDir.x, lights.dDir.y, lights.dDir.z);

    // --- Bind Lights ---
    const uNumPointLights = u.get("u_numPointLights"); if (uNumPointLights) this.gl.uniform1i(uNumPointLights, lights.pLights.length);
    for (let i = 0; i < lights.pLights.length; i++) {
        const pl = lights.pLights[i]!; const loc = cache.pointLightLocs[i];
        if (loc?.pos) this.gl.uniform3f(loc.pos, pl.worldMatrix.data[12]!, pl.worldMatrix.data[13]!, pl.worldMatrix.data[14]!);
        if (loc?.col) this.gl.uniform3f(loc.col, pl.color.r * pl.intensity, pl.color.g * pl.intensity, pl.color.b * pl.intensity);
    }

    for (const [_, objects] of materialGroups.entries()) {
      const firstObj = objects[0]!;
      const mat = firstObj.material!;
      const manifest = mat.getRenderManifest();
      const texs = manifest.textures;

      // --- Bind Material Properties ---
      const uColor = u.get("u_color"); if (uColor) this.gl.uniform4fv(uColor, mat.color.toFloat32Array());
      const uSpecColor = u.get("u_specColor"); if (uSpecColor) this.gl.uniform4fv(uSpecColor, mat instanceof PhongMaterial ? mat.specularColor.toFloat32Array() : new Float32Array([1,1,1,1]));
      const uShininess = u.get("u_shininess"); if (uShininess) this.gl.uniform1f(uShininess, mat instanceof PhongMaterial ? mat.shininess : -1.0);

      // --- Bind Textures ---
      if (shaderId === MaterialType.SKYBOX) {
        this.gl.activeTexture(this.gl.TEXTURE0);
        const skyTex = texs["u_skybox"] as CubeTexture;
        this.gl.bindTexture(this.gl.TEXTURE_CUBE_MAP, skyTex ? this._getWebGLCubeTexture(skyTex) : this.defaultCubeTexture);
        const uSkybox = u.get("u_skybox"); if (uSkybox) this.gl.uniform1i(uSkybox, 0);
      } else {
        const samplerUnits: Record<string, number> = { "u_diffuseMap": 0, "u_normalMap": 1, "u_specularMap": 2 };
        for(const [uniformName, unit] of Object.entries(samplerUnits)) {
            const loc = u.get(uniformName);
            if(loc) {
                this.gl.activeTexture(this.gl.TEXTURE0 + unit);
                const t = texs[uniformName] as Texture;
                this.gl.bindTexture(this.gl.TEXTURE_2D, t ? this._getWebGLTexture(t) : (uniformName === "u_normalMap" ? this.defaultNormalMap : this.defaultTexture));
                this.gl.uniform1i(loc, unit);
            }
        }
      }

      // --- Render each object ---
      for (const o of objects) {
        if (!o.geometry) continue;

        this._scratchModelMatrix.set(o.worldMatrix.data);
        const uModel = u.get("u_model"); if (uModel) this.gl.uniformMatrix4fv(uModel, false, this._scratchModelMatrix);

        let mesh = this._cache.get(o.geometry);
        if (!mesh) { mesh = new Mesh(this.gl, o.geometry); this._cache.set(o.geometry, mesh); }
        mesh.bind(cache.attributes.get("a_position")!, cache.attributes.get("a_normal")!, cache.attributes.get("a_uv")!, cache.attributes.get("a_tangent")!);
        mesh.draw(MaterialType.WIREFRAME === shaderId ? this.gl.LINES : this.gl.TRIANGLES);
      }
    }
  }
}

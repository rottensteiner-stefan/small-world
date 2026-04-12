/// src/renderers/WebGL1Renderer.ts

import { AbstractWebGLRenderer } from "./AbstractWebGLRenderer.js";
import {
  AreaLight,
  Color,
  CubeTexture,
  PointLight,
  SpotLight,
  Texture,
  ShaderRegistry,
} from "../core/index.js";
import { GeometryDataInterface } from "../interfaces/index.js";
import { CullMode, MaterialType, RendererType } from "../enums/index.js";
import { Mesh } from "./Mesh.js";
import { Object3D } from "../core/Object3D.js";
import { Scene } from "../core/Scene.js";
import { Vector3D } from "../math/Vector3D.js";

interface ProgramCache {
  prog: WebGLProgram;
  uniforms: Map<string, WebGLUniformLocation | null>;
  attributes: Map<string, number>;
  // Specialized light locations for current Uber-Shader structure
  pointLightLocs: { pos: WebGLUniformLocation | null; col: WebGLUniformLocation | null }[];
  spotLightLocs: { pos: WebGLUniformLocation | null; dir: WebGLUniformLocation | null; col: WebGLUniformLocation | null; params: WebGLUniformLocation | null }[];
  areaLightLocs: { pos: WebGLUniformLocation | null; col: WebGLUniformLocation | null; normal: WebGLUniformLocation | null; right: WebGLUniformLocation | null; up: WebGLUniformLocation | null; size: WebGLUniformLocation | null }[];
}

/**
 * WebGL 1.0 implementation of the renderer.
 */
export class WebGL1Renderer extends AbstractWebGLRenderer {
  /** @inheritdoc */
  public readonly type: RendererType = RendererType.WEB_GL1;
  declare protected gl: WebGLRenderingContext;

  private _programs: Map<string, ProgramCache> = new Map();

  private _cache: Map<GeometryDataInterface, Mesh> = new Map<GeometryDataInterface, Mesh>();
  private _texCache: Map<Texture, WebGLTexture> = new Map<Texture, WebGLTexture>();
  private _texCubeCache: Map<CubeTexture, WebGLTexture> = new Map<CubeTexture, WebGLTexture>();

  /** @inheritdoc */
  public async initialize(
    canvas: HTMLCanvasElement,
    attributes?: Record<string, unknown>,
  ): Promise<void> {
    const gl =
      canvas.getContext("webgl", attributes) || canvas.getContext("experimental-webgl", attributes);

    if (!gl) throw new Error("[WebGL1Renderer] WebGL 1 context could not be initialized.");
    this.gl = gl as WebGLRenderingContext;

    this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, true);
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

      const uniforms = new Map<string, WebGLUniformLocation | null>();
      const attributes = new Map<string, number>();

      ["a_position", "a_normal", "a_uv"].forEach(name => {
        attributes.set(name, this.gl.getAttribLocation(prog, name));
      });

      Object.keys(def.layout.uniforms).forEach(name => {
        uniforms.set(name, this.gl.getUniformLocation(prog, name));
      });

      ["u_vp", "u_model", "u_viewPos", "u_ambientColor", "u_dirLightColor", "u_dirLightDir", "u_numPointLights", "u_numSpotLights", "u_numAreaLights"].forEach(name => {
        uniforms.set(name, this.gl.getUniformLocation(prog, name));
      });

      ["u_diffuseMap", "u_skybox", "u_sandMap", "u_grassMap", "u_rockMap", "u_snowMap", "u_texOffset", "u_texRepeat"].forEach(name => {
        uniforms.set(name, this.gl.getUniformLocation(prog, name));
      });

      const pointLightLocs = [];
      const spotLightLocs = [];
      const areaLightLocs = [];

      for (let i = 0; i < 4; i++) {
        pointLightLocs.push({
          pos: this.gl.getUniformLocation(prog, `u_pointLightPos[${i}]`),
          col: this.gl.getUniformLocation(prog, `u_pointLightColor[${i}]`),
        });
        spotLightLocs.push({
          pos: this.gl.getUniformLocation(prog, `u_spotLightPos[${i}]`),
          dir: this.gl.getUniformLocation(prog, `u_spotLightDir[${i}]`),
          col: this.gl.getUniformLocation(prog, `u_spotLightColor[${i}]`),
          params: this.gl.getUniformLocation(prog, `u_spotLightParams[${i}]`),
        });
        areaLightLocs.push({
          pos: this.gl.getUniformLocation(prog, `u_areaLightPos[${i}]`),
          col: this.gl.getUniformLocation(prog, `u_areaLightColor[${i}]`),
          right: this.gl.getUniformLocation(prog, `u_areaLightRight[${i}]`),
          up: this.gl.getUniformLocation(prog, `u_areaLightUp[${i}]`),
          normal: this.gl.getUniformLocation(prog, `u_areaLightNormal[${i}]`),
          size: this.gl.getUniformLocation(prog, `u_areaLightSize[${i}]`),
        });
      }

      cache = { prog, uniforms, attributes, pointLightLocs, spotLightLocs, areaLightLocs };
      this._programs.set(shaderId, cache);
    }
    return cache;
  }

  private _getWebGLTexture(tex: Texture): WebGLTexture {
    if (!tex.isLoaded || !tex.image) {
      return this.defaultTexture;
    }
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
      this.gl.texParameteri(
        this.gl.TEXTURE_2D,
        this.gl.TEXTURE_MAG_FILTER,
        tex.magFilter === "nearest" ? this.gl.NEAREST : this.gl.LINEAR,
      );
      this.gl.texParameteri(
        this.gl.TEXTURE_2D,
        this.gl.TEXTURE_MIN_FILTER,
        tex.minFilter === "nearest" ? this.gl.NEAREST : this.gl.LINEAR,
      );
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.REPEAT);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.REPEAT);
      this._texCache.set(tex, glTex);
    }
    return glTex;
  }

  private _getWebGLCubeTexture(tex: CubeTexture): WebGLTexture {
    if (!tex.isLoaded || tex.images.length !== 6) {
      return this.defaultCubeTexture;
    }
    let glTex: WebGLTexture | undefined = this._texCubeCache.get(tex);
    if (!glTex) {
      glTex = this.gl.createTexture()!;
      this.gl.bindTexture(this.gl.TEXTURE_CUBE_MAP, glTex);
      for (let i = 0; i < 6; i++) {
        this.gl.texImage2D(
          this.gl.TEXTURE_CUBE_MAP_POSITIVE_X + i,
          0,
          this.gl.RGBA,
          this.gl.RGBA,
          this.gl.UNSIGNED_BYTE,
          tex.images[i] as HTMLImageElement,
        );
      }
      this.gl.texParameteri(this.gl.TEXTURE_CUBE_MAP, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
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
  public render(scene: Scene, vp: Float32Array, camPos: Vector3D = new Vector3D()): void {
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

    this.gl.enable(this.gl.BLEND);
    this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);

    // --- PASS 1: Skybox / Background ---
    this.gl.depthMask(false);
    for (const obj of scene.objects) {
      if (!obj.isVisible || !obj.material) continue;
      const manifest = obj.material.getRenderManifest();
      if (manifest.shaderId === MaterialType.SKYBOX || (manifest.shaderId === MaterialType.BASIC && !obj.frustumCulled)) {
        this._drawObject(obj, vp, Vector3D.ZERO, { aCol: Color.BLACK, dCol: Color.BLACK, dDir: Vector3D.ZERO, pLights: [], sLights: [], aLights: [] });
      }
    }
    this.gl.depthMask(true);

    // --- PASS 2: Objects ---
    const extractedLights = this.extractLights(scene);
    for (const obj of scene.objects) {
      if (!obj.isVisible || !obj.material) continue;
      const manifest = obj.material.getRenderManifest();
      if (manifest.shaderId === MaterialType.SKYBOX || (manifest.shaderId === MaterialType.BASIC && !obj.frustumCulled)) continue;
      this._drawObject(obj, vp, camPos, extractedLights);
    }
  }

  private _drawObject(o: Object3D, vp: Float32Array, camPos: Vector3D, lights: any): void {
    if (!o.isVisible) return;

    if (o.geometry && o.material) {
      const mat = o.material;
      const manifest = mat.getRenderManifest();
      const cache = this._getProgram(manifest.shaderId);
      this.gl.useProgram(cache.prog);

      // 1. Upload global uniforms
      const u = cache.uniforms;
      if (u.get("u_vp")) this.gl.uniformMatrix4fv(u.get("u_vp")!, false, vp);
      if (u.get("u_viewPos")) this.gl.uniform3f(u.get("u_viewPos")!, camPos.x, camPos.y, camPos.z);
      if (u.get("u_ambientColor")) this.gl.uniform3f(u.get("u_ambientColor")!, lights.aCol.r, lights.aCol.g, lights.aCol.b);
      if (u.get("u_dirLightColor")) this.gl.uniform3f(u.get("u_dirLightColor")!, lights.dCol.r, lights.dCol.g, lights.dCol.b);
      if (u.get("u_dirLightDir")) this.gl.uniform3f(u.get("u_dirLightDir")!, lights.dDir.x, lights.dDir.y, lights.dDir.z);

      // 2. Upload Lights
      if (u.get("u_numPointLights")) this.gl.uniform1i(u.get("u_numPointLights")!, lights.pLights.length);
      lights.pLights.forEach((pl: PointLight, i: number) => {
        const loc = cache.pointLightLocs[i];
        if (loc?.pos) this.gl.uniform3f(loc.pos, pl.worldMatrix.data[12]!, pl.worldMatrix.data[13]!, pl.worldMatrix.data[14]!);
        if (loc?.col) this.gl.uniform3f(loc.col, pl.color.r * pl.intensity, pl.color.g * pl.intensity, pl.color.b * pl.intensity);
      });

      if (u.get("u_numSpotLights")) this.gl.uniform1i(u.get("u_numSpotLights")!, lights.sLights.length);
      lights.sLights.forEach((sl: SpotLight, i: number) => {
        const loc = cache.spotLightLocs[i];
        if (loc?.pos) this.gl.uniform3f(loc.pos, sl.worldMatrix.data[12]!, sl.worldMatrix.data[13]!, sl.worldMatrix.data[14]!);
        if (loc?.dir) {
          const d = sl.direction.clone().normalize();
          this.gl.uniform3f(loc.dir, d.x, d.y, d.z);
        }
        if (loc?.col) this.gl.uniform3f(loc.col, sl.color.r * sl.intensity, sl.color.g * sl.intensity, sl.color.b * sl.intensity);
        if (loc?.params) this.gl.uniform4f(loc.params, Math.cos(sl.angle), Math.cos(sl.angle * (1.0 - sl.penumbra)), sl.distance, sl.decay);
      });

      if (u.get("u_numAreaLights")) this.gl.uniform1i(u.get("u_numAreaLights")!, lights.aLights.length);
      lights.aLights.forEach((al: AreaLight, i: number) => {
        const loc = cache.areaLightLocs[i];
        if (!loc) return;
        const matData = al.worldMatrix.data;
        if (loc.pos) this.gl.uniform3f(loc.pos, matData[12]!, matData[13]!, matData[14]!);
        if (loc.col) this.gl.uniform3f(loc.col, al.color.r * al.intensity, al.color.g * al.intensity, al.color.b * al.intensity);
        if (loc.right) this.gl.uniform3f(loc.right, matData[0]!, matData[1]!, matData[2]!);
        if (loc.up) this.gl.uniform3f(loc.up, matData[4]!, matData[5]!, matData[6]!);
        if (loc.normal) this.gl.uniform3f(loc.normal, matData[8]!, matData[9]!, matData[10]!);
        if (loc.size) this.gl.uniform2f(loc.size, al.width / 2.0, al.height / 2.0);
      });

      // 3. Bind Geometry
      let m = this._cache.get(o.geometry);
      if (!m) {
        m = new Mesh(this.gl, o.geometry);
        this._cache.set(o.geometry, m);
      }
      m.bind(cache.attributes.get("a_position")!, cache.attributes.get("a_normal")!, cache.attributes.get("a_uv")!);

      // 4. Model Matrix (including Billboarding)
      const modelMatrix = new Float32Array(o.worldMatrix.data);
      if (manifest.shaderId === MaterialType.SPRITE) {
        const sx = Math.sqrt(modelMatrix[0]!**2 + modelMatrix[1]!**2 + modelMatrix[2]!**2);
        const sy = Math.sqrt(modelMatrix[4]!**2 + modelMatrix[5]!**2 + modelMatrix[6]!**2);
        const sz = Math.sqrt(modelMatrix[8]!**2 + modelMatrix[9]!**2 + modelMatrix[10]!**2);
        modelMatrix[0] = vp[0]! * sx; modelMatrix[1] = vp[4]! * sx; modelMatrix[2] = vp[8]! * sx;
        modelMatrix[4] = vp[1]! * sy; modelMatrix[5] = vp[5]! * sy; modelMatrix[6] = vp[9]! * sy;
        modelMatrix[8] = vp[2]! * sz; modelMatrix[9] = vp[6]! * sz; modelMatrix[10] = vp[10]! * sz;
      }
      if (u.get("u_model")) this.gl.uniformMatrix4fv(u.get("u_model")!, false, modelMatrix);

      // 5. Material Properties
      const props = manifest.properties;
      if (u.get("u_color")) this.gl.uniform4fv(u.get("u_color")!, mat.color.toArray());
      if (u.get("u_specColor") && props["u_specColor"]) this.gl.uniform4fv(u.get("u_specColor")!, props["u_specColor"].toArray());
      if (u.get("u_shininess")) this.gl.uniform1f(u.get("u_shininess")!, props["u_shininess"] !== undefined ? props["u_shininess"] : -1.0);
      if (u.get("u_thresholds") && props["u_thresholds"]) this.gl.uniform4fv(u.get("u_thresholds")!, props["u_thresholds"]);
      if (u.get("u_texRepeat") && props["u_texRepeat"]) this.gl.uniform2fv(u.get("u_texRepeat")!, props["u_texRepeat"]);

      // 6. Textures
      const texs = manifest.textures;
      if (manifest.shaderId === MaterialType.SKYBOX) {
        this.gl.activeTexture(this.gl.TEXTURE0);
        const skyTex = texs["u_skybox"] as CubeTexture;
        this.gl.bindTexture(this.gl.TEXTURE_CUBE_MAP, skyTex ? this._getWebGLCubeTexture(skyTex) : this.defaultCubeTexture);
        if (u.get("u_skybox")) this.gl.uniform1i(u.get("u_skybox")!, 0);
      } else {
        this.gl.activeTexture(this.gl.TEXTURE0);
        const diff = texs["u_diffuseMap"] as Texture;
        this.gl.bindTexture(this.gl.TEXTURE_2D, diff ? this._getWebGLTexture(diff) : this.defaultTexture);
        if (u.get("u_diffuseMap")) this.gl.uniform1i(u.get("u_diffuseMap")!, 0);
        if (diff) {
          if (u.get("u_texOffset")) this.gl.uniform2f(u.get("u_texOffset")!, diff.offset.x, diff.offset.y);
          if (u.get("u_texRepeat") && !props["u_texRepeat"]) this.gl.uniform2f(u.get("u_texRepeat")!, diff.repeat.x, diff.repeat.y);
        }
        // Terrain fallbacks
        ["u_sandMap", "u_grassMap", "u_rockMap", "u_snowMap"].forEach((name, i) => {
          if (u.get(name)) {
            this.gl.activeTexture(this.gl.TEXTURE1 + i);
            const t = texs[name] as Texture;
            this.gl.bindTexture(this.gl.TEXTURE_2D, t ? this._getWebGLTexture(t) : this.defaultTexture);
            this.gl.uniform1i(u.get(name)!, 1 + i);
          }
        });
      }

      // 7. GPU State
      const state = manifest.state;
      if (state) {
        if (state.culling === CullMode.NONE) this.gl.disable(this.gl.CULL_FACE);
        else {
          this.gl.enable(this.gl.CULL_FACE);
          this.gl.cullFace(state.culling === CullMode.FRONT ? this.gl.FRONT : this.gl.BACK);
        }
      } else {
        this.gl.enable(this.gl.CULL_FACE);
        this.gl.cullFace(this.gl.BACK);
      }

      const drawMode = manifest.shaderId === MaterialType.WIREFRAME ? this.gl.LINES : this.gl.TRIANGLES;
      m.draw(drawMode);
    }

    if (o.children) o.children.forEach(child => this._drawObject(child, vp, camPos, lights));
  }
}

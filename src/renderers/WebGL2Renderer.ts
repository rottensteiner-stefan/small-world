/// src/renderers/WebGL2Renderer.ts

import { AbstractWebGLRenderer } from "./AbstractWebGLRenderer.js";
import {
  CubeTexture,
  PhongMaterial,
  ShaderRegistry,
  TerrainMaterial,
  Texture,
} from "../core/index.js";
import { EngineConfig, GeometryDataInterface, LightDataInterface } from "../interfaces/index.js";
import {
  CullMode,
  MaterialType,
  RendererType,
  TextureFilter,
  TextureWrap,
} from "../enums/index.js";
import { Mesh } from "./Mesh.js";
import { Object3D } from "../core/Object3D.js";
import { Scene } from "../core/Scene.js";
import { MathPool, Vector3D } from "../math/index.js";
import { WebGL2UniformBuffer } from "./WebGL2UniformBuffer.js";

interface ProgramCache {
  prog: WebGLProgram;
  uniforms: Map<string, WebGLUniformLocation | undefined>;
  attributes: Map<string, number>;
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
  private _texCache: Map<Texture, WebGLTexture> = new Map();
  private _texCubeCache: Map<CubeTexture, WebGLTexture> = new Map();

  private _scratchModelMatrix: Float32Array = new Float32Array(16);

  private _globalUBO!: WebGL2UniformBuffer;

  /** @inheritdoc */
  public async initialize(
    canvas: HTMLCanvasElement,
    attributes?: Record<string, unknown>,
    config?: EngineConfig,
  ): Promise<void> {
    const gl = canvas.getContext("webgl2", attributes);
    if (!gl) throw new Error("[WebGL2Renderer] WebGL2 context could not be initialized.");
    this.gl = gl as WebGL2RenderingContext;

    if (config?.quality) {
      this._quality = { ...this._quality, ...config.quality };
    }

    this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, false);
    this.initDefaultTextures();
    this.gl.enable(this.gl.DEPTH_TEST);

    this._globalUBO = new WebGL2UniformBuffer(this.gl, 1280, 0);
  }

  private _getProgram(shaderId: string): ProgramCache {
    let cache = this._programs.get(shaderId);
    if (!cache) {
      const def = ShaderRegistry.instance.get(shaderId);
      if (!def || !def.sources.glsl300) {
        throw new Error(
          `[WebGL2Renderer] Shader definition for ${shaderId} not found or missing GLSL 300 source.`,
        );
      }

      const vs = ShaderRegistry.instance.assemble(def.sources.glsl300.vs, "glsl300");
      const fs = ShaderRegistry.instance.assemble(def.sources.glsl300.fs, "glsl300");
      const prog = this.createShaderProgram(vs, fs);

      const uniforms = new Map<string, WebGLUniformLocation | undefined>();
      const attributes = new Map<string, number>();

      this._globalUBO.bindToProgram(prog, "GlobalUniforms");

      ["a_position", "a_normal", "a_uv", "a_tangent"].forEach((name) => {
        attributes.set(name, this.gl.getAttribLocation(prog, name));
      });

      Object.keys(def.layout.uniforms).forEach((name) => {
        uniforms.set(name, this.gl.getUniformLocation(prog, name) ?? undefined);
      });

      ["u_model", "u_color", "u_specColor", "u_shininess", "u_thresholds"].forEach((name) => {
        uniforms.set(name, this.gl.getUniformLocation(prog, name) ?? undefined);
      });

      [
        "u_diffuseMap", "u_normalMap", "u_specularMap", "u_skybox",
        "u_sandMap", "u_grassMap", "u_rockMap", "u_snowMap",
        "u_texOffset", "u_texRepeat"
      ].forEach((name) => {
        uniforms.set(name, this.gl.getUniformLocation(prog, name) ?? undefined);
      });

      cache = { prog, uniforms, attributes };
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
      this.gl.texImage2D(
        this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, tex.image,
      );

      const useMipmaps = this._quality.mipmapping && tex.generateMipmaps;
      if (useMipmaps) this.gl.generateMipmap(this.gl.TEXTURE_2D);

      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, TextureFilter.NEAREST === tex.magFilter ? this.gl.NEAREST : this.gl.LINEAR);
      
      let minFilter: number = this.gl.LINEAR;
      if (useMipmaps) {
        minFilter = TextureFilter.NEAREST === tex.minFilter ? this.gl.NEAREST_MIPMAP_LINEAR : this.gl.LINEAR_MIPMAP_LINEAR;
      } else {
        if (TextureFilter.NEAREST === tex.minFilter) minFilter = this.gl.NEAREST;
      }
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, minFilter);

      const wrapS = TextureWrap.REPEAT === tex.addressModeU ? this.gl.REPEAT : TextureWrap.MIRRORED_REPEAT === tex.addressModeU ? this.gl.MIRRORED_REPEAT : this.gl.CLAMP_TO_EDGE;
      const wrapT = TextureWrap.REPEAT === tex.addressModeV ? this.gl.REPEAT : TextureWrap.MIRRORED_REPEAT === tex.addressModeV ? this.gl.MIRRORED_REPEAT : this.gl.CLAMP_TO_EDGE;
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, wrapS);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, wrapT);

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
      this.gl.texParameteri(this.gl.TEXTURE_CUBE_MAP, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
      this.gl.texParameteri(this.gl.TEXTURE_CUBE_MAP, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
      this._texCubeCache.set(tex, glTex);
    }
    return glTex;
  }

  /** @inheritdoc */
  public render(scene: Scene, vp: Float32Array, camPos: Vector3D = Vector3D.ZERO): void {
    const extractedLights = this.extractLights(scene);
    this._updateGlobalUBO(vp, camPos, extractedLights);

    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
    this.gl.enable(this.gl.BLEND);
    this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);

    const sortedGroups = scene.getVisibleObjectsSorted();

    // --- PASS 1: Skybox / Background ---
    const skyboxGroup = sortedGroups.get(MaterialType.SKYBOX);
    if (skyboxGroup) {
      this.gl.depthMask(false);
      this._renderGroup(MaterialType.SKYBOX, skyboxGroup, vp);
      this.gl.depthMask(true);
      sortedGroups.delete(MaterialType.SKYBOX);
    }

    // --- PASS 2: All other Objects ---
    for (const [shaderId, materialGroups] of sortedGroups.entries()) {
      this._renderGroup(shaderId, materialGroups, vp);
    }
  }

  /**
   * Renders a group of objects sharing the same shader.
   */
  private _renderGroup(shaderId: string, materialGroups: Map<string, Object3D[]>, vp: Float32Array): void {
    const cache = this._getProgram(shaderId);
    this.gl.useProgram(cache.prog);

    for (const materialGroup of materialGroups.values()) {
      const objects = materialGroup;
      const firstObj = objects[0]!;
      const mat = firstObj.material!;
      const manifest = mat.getRenderManifest();
      const u = cache.uniforms;

      // --- Bind Material States (Once per material group) ---
      const state = manifest.state;
      if (state && CullMode.NONE === state.culling) this.gl.disable(this.gl.CULL_FACE);
      else {
        this.gl.enable(this.gl.CULL_FACE);
        this.gl.cullFace(state && CullMode.FRONT === state.culling ? this.gl.FRONT : this.gl.BACK);
      }

      // --- Bind Material Properties ---
      const texs = manifest.textures;

      const uColor = u.get("u_color");
      if (uColor) this.gl.uniform4fv(uColor, mat.color.toFloat32Array());
      
      const uSpecColor = u.get("u_specColor");
      if (uSpecColor) {
        if (mat instanceof PhongMaterial) this.gl.uniform4fv(uSpecColor, mat.specularColor.toFloat32Array());
        else this.gl.uniform4f(uSpecColor, 1, 1, 1, 1);
      }
      
      const uShininess = u.get("u_shininess");
      if (uShininess) this.gl.uniform1f(uShininess, mat instanceof PhongMaterial ? mat.shininess : -1.0);

      const uThresholds = u.get("u_thresholds");
      if (uThresholds && mat instanceof TerrainMaterial) this.gl.uniform4fv(uThresholds, new Float32Array(mat.thresholds));

      // --- Bind Textures ---
      if (shaderId === MaterialType.SKYBOX) {
        this.gl.activeTexture(this.gl.TEXTURE0);
        const skyTex = texs["u_skybox"] as CubeTexture;
        this.gl.bindTexture(this.gl.TEXTURE_CUBE_MAP, skyTex ? this._getWebGLCubeTexture(skyTex) : this.defaultCubeTexture);
        const uSkybox = u.get("u_skybox");
        if (uSkybox) this.gl.uniform1i(uSkybox, 0);
      } else {
        const samplerUnits: Record<string, number> = {
          "u_diffuseMap": 0, "u_normalMap": 1, "u_specularMap": 2,
          "u_sandMap": 3, "u_grassMap": 4, "u_rockMap": 5, "u_snowMap": 6
        };
        for(const [uniformName, unit] of Object.entries(samplerUnits)) {
          const loc = u.get(uniformName);
          if(loc) {
            this.gl.activeTexture(this.gl.TEXTURE0 + unit);
            const t = texs[uniformName] as Texture;
            if(uniformName === "u_normalMap" && !t) this.gl.bindTexture(this.gl.TEXTURE_2D, this.defaultNormalMap);
            else if (uniformName === "u_specularMap" && !t) this.gl.bindTexture(this.gl.TEXTURE_2D, this.defaultSpecularMap);
            else this.gl.bindTexture(this.gl.TEXTURE_2D, t ? this._getWebGLTexture(t) : this.defaultTexture);
            this.gl.uniform1i(loc, unit);
          }
        }
      }

      // --- Render each object in the material group ---
      for (const o of objects) {
        if (!o.geometry) continue;

        // 1. Model Matrix
        this._scratchModelMatrix.set(o.worldMatrix.data);
        if (shaderId === MaterialType.SPRITE) {
          const sx = Math.sqrt(this._scratchModelMatrix[0]! ** 2 + this._scratchModelMatrix[1]! ** 2 + this._scratchModelMatrix[2]! ** 2);
          const sy = Math.sqrt(this._scratchModelMatrix[4]! ** 2 + this._scratchModelMatrix[5]! ** 2 + this._scratchModelMatrix[6]! ** 2);
          const sz = Math.sqrt(this._scratchModelMatrix[8]! ** 2 + this._scratchModelMatrix[9]! ** 2 + this._scratchModelMatrix[10]! ** 2);
          this._scratchModelMatrix[0] = vp[0]! * sx; this._scratchModelMatrix[1] = vp[4]! * sx; this._scratchModelMatrix[2] = vp[8]! * sx;
          this._scratchModelMatrix[4] = vp[1]! * sy; this._scratchModelMatrix[5] = vp[5]! * sy; this._scratchModelMatrix[6] = vp[9]! * sy;
          this._scratchModelMatrix[8] = vp[2]! * sz; this._scratchModelMatrix[9] = vp[6]! * sz; this._scratchModelMatrix[10] = vp[10]! * sz;
        }
        const uModel = u.get("u_model");
        if (uModel) this.gl.uniformMatrix4fv(uModel, false, this._scratchModelMatrix);

        // 2. Texture Offset/Repeat (if not using defaults)
        const uTexOffset = u.get("u_texOffset");
        const uTexRepeat = u.get("u_texRepeat");
        if (uTexOffset || uTexRepeat) {
          const diff = texs["u_diffuseMap"] as Texture;
          if (uTexOffset) this.gl.uniform2f(uTexOffset, diff ? diff.offset.x : 0, diff ? diff.offset.y : 0);
          if (uTexRepeat) this.gl.uniform2f(uTexRepeat, diff ? diff.repeat.x : 1, diff ? diff.repeat.y : 1);
        }

        // 3. Bind and Draw Geometry
        let mesh = this._cache.get(o.geometry);
        if (!mesh) {
          mesh = new Mesh(this.gl, o.geometry);
          this._cache.set(o.geometry, mesh);
        } else if (o.geometry.needsUpdate) {
          mesh.update(o.geometry);
          o.geometry.needsUpdate = false;
        }

        mesh.bind(
          cache.attributes.get("a_position")!,
          cache.attributes.get("a_normal")!,
          cache.attributes.get("a_uv")!,
          cache.attributes.get("a_tangent")!,
        );

        const drawMode = MaterialType.WIREFRAME === shaderId ? this.gl.LINES : this.gl.TRIANGLES;
        mesh.draw(drawMode);
      }
    }
  }

  private _updateGlobalUBO(vp: Float32Array, camPos: Vector3D, lights: LightDataInterface): void {
    const ubo = this._globalUBO;
    ubo.setMatrix(0, vp);
    ubo.setVector3(64, camPos);
    
    // Scale colors by intensity
    const aScaled = new Vector3D(lights.aCol.r * lights.aIntensity, lights.aCol.g * lights.aIntensity, lights.aCol.b * lights.aIntensity);
    const dScaled = new Vector3D(lights.dCol.r * lights.dIntensity, lights.dCol.g * lights.dIntensity, lights.dCol.b * lights.dIntensity);
    
    ubo.setVector3(80, aScaled);
    ubo.setVector3(96, dScaled);
    ubo.setVector3(112, lights.dDir);
    ubo.setInt(128, lights.pLights.length);
    ubo.setInt(132, lights.sLights.length);
    ubo.setInt(136, lights.aLights.length);

    for (let i = 0; i < 4; i++) {
      const offset = 144 + i * 32;
      if (i < lights.pLights.length) {
        const pl = lights.pLights[i]!;
        ubo.setVector3(offset, new Vector3D(pl.worldMatrix.data[12]!, pl.worldMatrix.data[13]!, pl.worldMatrix.data[14]!));
        ubo.setVector3(offset + 16, new Vector3D(pl.color.r * pl.intensity, pl.color.g * pl.intensity, pl.color.b * pl.intensity));
      }
    }

    for (let i = 0; i < 4; i++) {
      const offset = 272 + i * 64;
      if (i < lights.sLights.length) {
        const sl = lights.sLights[i]!;
        const dir = MathPool.acquireVector().copyFrom(sl.direction).normalize();
        ubo.setVector3(offset, new Vector3D(sl.worldMatrix.data[12]!, sl.worldMatrix.data[13]!, sl.worldMatrix.data[14]!));
        ubo.setVector3(offset + 16, dir);
        ubo.setVector3(offset + 32, new Vector3D(sl.color.r * sl.intensity, sl.color.g * sl.intensity, sl.color.b * sl.intensity));
        ubo.setFloat(offset + 48, Math.cos(sl.angle));
        ubo.setFloat(offset + 52, Math.cos(sl.angle * (1.0 - sl.penumbra)));
        ubo.setFloat(offset + 56, sl.distance);
        ubo.setFloat(offset + 60, sl.decay);
        MathPool.releaseVector(dir);
      }
    }

    for (let i = 0; i < 4; i++) {
      const offset = 528 + i * 112;
      if (i < lights.aLights.length) {
        const al = lights.aLights[i]!;
        const mat = al.worldMatrix.data;
        ubo.setVector3(offset, new Vector3D(mat[12]!, mat[13]!, mat[14]!));
        ubo.setVector3(offset + 16, new Vector3D(al.color.r * al.intensity, al.color.g * al.intensity, al.color.b * al.intensity));
        ubo.setVector3(offset + 32, new Vector3D(mat[0]!, mat[1]!, mat[2]!));
        ubo.setVector3(offset + 48, new Vector3D(mat[4]!, mat[5]!, mat[6]!));
        ubo.setVector3(offset + 64, new Vector3D(mat[8]!, mat[9]!, mat[10]!));
        ubo.setFloat(offset + 80, al.width / 2.0);
        ubo.setFloat(offset + 84, al.height / 2.0);
      }
    }
    ubo.update();
  }
}

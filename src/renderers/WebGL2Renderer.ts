/// src/renderers/WebGL2Renderer.ts

import { AbstractWebGLRenderer } from "./AbstractWebGLRenderer.js";
import {
  Color,
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

interface ProgramCache {
  prog: WebGLProgram;
  uniforms: Map<string, WebGLUniformLocation | undefined>;
  attributes: Map<string, number>;
  // Specialized light locations for the current Uber-Shader structure
  pointLightLocs: {
    pos: WebGLUniformLocation | undefined;
    col: WebGLUniformLocation | undefined;
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

      // Register standard attributes
      ["a_position", "a_normal", "a_uv", "a_tangent"].forEach((name) => {
        attributes.set(name, this.gl.getAttribLocation(prog, name));
      });

      // Register layout uniforms
      Object.keys(def.layout.uniforms).forEach((name) => {
        uniforms.set(name, this.gl.getUniformLocation(prog, name) ?? undefined);
      });

      // Global Engine Uniforms
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
      ].forEach((name) => {
        uniforms.set(name, this.gl.getUniformLocation(prog, name) ?? undefined);
      });

      // Texture Samplers
      [
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
      this.gl.texImage2D(
        this.gl.TEXTURE_2D,
        0,
        this.gl.RGBA,
        this.gl.RGBA,
        this.gl.UNSIGNED_BYTE,
        tex.image,
      );

      // 1. Mipmapping
      const useMipmaps = this._quality.mipmapping && tex.generateMipmaps;
      if (useMipmaps) {
        this.gl.generateMipmap(this.gl.TEXTURE_2D);
      }

      // 2. Filters
      this.gl.texParameteri(
        this.gl.TEXTURE_2D,
        this.gl.TEXTURE_MAG_FILTER,
        TextureFilter.NEAREST === tex.magFilter ? this.gl.NEAREST : this.gl.LINEAR,
      );

      let minFilter: number = this.gl.LINEAR;
      if (useMipmaps) {
        minFilter = this.gl.LINEAR_MIPMAP_LINEAR;
        if (TextureFilter.NEAREST === tex.minFilter) {
          minFilter = this.gl.NEAREST_MIPMAP_LINEAR;
        }
      } else {
        if (TextureFilter.NEAREST === tex.minFilter) {
          minFilter = this.gl.NEAREST;
        }
      }
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, minFilter);

      // 3. Wrapping
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
  public render(scene: Scene, vp: Float32Array, camPos: Vector3D = Vector3D.ZERO): void {
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

    this.gl.enable(this.gl.BLEND);
    this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);

    // --- PASS 1: Skybox / Background ---
    this.gl.depthMask(false);
    for (let i: number = 0; i < scene.objects.length; i++) {
      const obj = scene.objects[i]!;
      if (!obj.isVisible) continue;
      const manifest = obj.material ? obj.material.getRenderManifest() : undefined;
      if (
        manifest &&
        (MaterialType.SKYBOX === manifest.shaderId ||
          (MaterialType.BASIC === manifest.shaderId && !obj.frustumCulled))
      ) {
        this._drawObject(obj, vp, Vector3D.ZERO, {
          aCol: Color.BLACK,
          dCol: Color.BLACK,
          dDir: Vector3D.ZERO,
          pLights: [],
          sLights: [],
          aLights: [],
        });
      }
    }
    this.gl.depthMask(true);

    // --- PASS 2: Objects ---
    const extractedLights = this.extractLights(scene);
    for (let i: number = 0; i < scene.objects.length; i++) {
      const obj = scene.objects[i]!;
      if (!obj.isVisible) continue;
      const manifest = obj.material ? obj.material.getRenderManifest() : undefined;
      if (
        manifest &&
        (MaterialType.SKYBOX === manifest.shaderId ||
          (MaterialType.BASIC === manifest.shaderId && !obj.frustumCulled))
      )
        continue;

      this._drawObject(obj, vp, camPos, extractedLights);
    }
  }

  /**
   * Internal generic object draw function.
   */
  private _drawObject(
    o: Object3D,
    vp: Float32Array,
    camPos: Vector3D,
    lights: LightDataInterface,
  ): void {
    if (!o.isVisible) return;

    if (o.geometry && o.material) {
      const mat = o.material;
      const manifest = mat.getRenderManifest();
      const cache = this._getProgram(manifest.shaderId);

      this.gl.useProgram(cache.prog);

      // 1. Upload global uniforms
      const u = cache.uniforms;
      const uVp = u.get("u_vp");
      if (uVp) this.gl.uniformMatrix4fv(uVp, false, vp);
      const uViewPos = u.get("u_viewPos");
      if (uViewPos) this.gl.uniform3f(uViewPos, camPos.x, camPos.y, camPos.z);
      const uAmbientColor = u.get("u_ambientColor");
      if (uAmbientColor)
        this.gl.uniform3f(uAmbientColor, lights.aCol.r, lights.aCol.g, lights.aCol.b);
      const uDirLightColor = u.get("u_dirLightColor");
      if (uDirLightColor)
        this.gl.uniform3f(uDirLightColor, lights.dCol.r, lights.dCol.g, lights.dCol.b);
      const uDirLightDir = u.get("u_dirLightDir");
      if (uDirLightDir)
        this.gl.uniform3f(uDirLightDir, lights.dDir.x, lights.dDir.y, lights.dDir.z);

      // 2. Upload Lights
      const uNumPointLights = u.get("u_numPointLights");
      if (uNumPointLights) this.gl.uniform1i(uNumPointLights, lights.pLights.length);
      for (let i: number = 0; i < lights.pLights.length; i++) {
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
      }

      const uNumSpotLights = u.get("u_numSpotLights");
      if (uNumSpotLights) this.gl.uniform1i(uNumSpotLights, lights.sLights.length);
      for (let i: number = 0; i < lights.sLights.length; i++) {
        const sl = lights.sLights[i]!;
        const loc = cache.spotLightLocs[i];
        if (loc?.pos)
          this.gl.uniform3f(
            loc.pos,
            sl.worldMatrix.data[12]!,
            sl.worldMatrix.data[13]!,
            sl.worldMatrix.data[14]!,
          );
        if (loc?.dir) {
          const d = MathPool.acquireVector().copyFrom(sl.direction).normalize();
          this.gl.uniform3f(loc.dir, d.x, d.y, d.z);
          MathPool.releaseVector(d);
        }
        if (loc?.col)
          this.gl.uniform3f(
            loc.col,
            sl.color.r * sl.intensity,
            sl.color.g * sl.intensity,
            sl.color.b * sl.intensity,
          );
        if (loc?.params)
          this.gl.uniform4f(
            loc.params,
            Math.cos(sl.angle),
            Math.cos(sl.angle * (1.0 - sl.penumbra)),
            sl.distance,
            sl.decay,
          );
      }

      const uNumAreaLights = u.get("u_numAreaLights");
      if (uNumAreaLights) this.gl.uniform1i(uNumAreaLights, lights.aLights.length);
      for (let i: number = 0; i < lights.aLights.length; i++) {
        const al = lights.aLights[i]!;
        const loc = cache.areaLightLocs[i];
        if (!loc) continue;
        const matData = al.worldMatrix.data;
        if (loc.pos) this.gl.uniform3f(loc.pos, matData[12]!, matData[13]!, matData[14]!);
        if (loc.col)
          this.gl.uniform3f(
            loc.col,
            al.color.r * al.intensity,
            al.color.g * al.intensity,
            al.color.b * al.intensity,
          );
        if (loc.right) this.gl.uniform3f(loc.right, matData[0]!, matData[1]!, matData[2]!);
        if (loc.up) this.gl.uniform3f(loc.up, matData[4]!, matData[5]!, matData[6]!);
        if (loc.normal) this.gl.uniform3f(loc.normal, matData[8]!, matData[9]!, matData[10]!);
        if (loc.size) this.gl.uniform2f(loc.size, al.width / 2.0, al.height / 2.0);
      }

      // 3. Bind Geometry
      let m = this._cache.get(o.geometry);
      if (!m) {
        m = new Mesh(this.gl, o.geometry);
        this._cache.set(o.geometry, m);
      } else if (o.geometry.needsUpdate) {
        m.update(o.geometry);
        o.geometry.needsUpdate = false;
      }
      m.bind(
        cache.attributes.get("a_position")!,
        cache.attributes.get("a_normal")!,
        cache.attributes.get("a_uv")!,
        cache.attributes.get("a_tangent")!,
      );

      // 4. Model Matrix (including Billboarding for Sprites)
      this._scratchModelMatrix.set(o.worldMatrix.data);
      if (manifest.shaderId === MaterialType.SPRITE) {
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
        this._scratchModelMatrix[0] = vp[0]! * sx;
        this._scratchModelMatrix[1] = vp[4]! * sx;
        this._scratchModelMatrix[2] = vp[8]! * sx;
        this._scratchModelMatrix[4] = vp[1]! * sy;
        this._scratchModelMatrix[5] = vp[5]! * sy;
        this._scratchModelMatrix[6] = vp[9]! * sy;
        this._scratchModelMatrix[8] = vp[2]! * sz;
        this._scratchModelMatrix[9] = vp[6]! * sz;
        this._scratchModelMatrix[10] = vp[10]! * sz;
      }
      const uModel = u.get("u_model");
      if (uModel) this.gl.uniformMatrix4fv(uModel, false, this._scratchModelMatrix);

      // 5. Material Properties from Manifest
      const props = manifest.properties;
      const texs = manifest.textures;

      const uColor = u.get("u_color");
      if (uColor) {
        const c = props["u_color"];
        if (c instanceof Float32Array || Array.isArray(c)) {
          this.gl.uniform4fv(uColor, c as Float32List);
        } else {
          this.gl.uniform4fv(uColor, mat.color.toFloat32Array());
        }
      }
      const uSpecColor = u.get("u_specColor");
      if (uSpecColor) {
        const sc = props["u_specColor"];
        if (sc instanceof Float32Array || Array.isArray(sc)) {
          this.gl.uniform4fv(uSpecColor, sc as Float32List);
        } else if (mat instanceof PhongMaterial) {
          this.gl.uniform4fv(uSpecColor, (mat as PhongMaterial).specularColor.toFloat32Array());
        } else {
          this.gl.uniform4f(uSpecColor, 1, 1, 1, 1);
        }
      }
      const uShininess = u.get("u_shininess");
      if (uShininess) {
        const s = props["u_shininess"];
        this.gl.uniform1f(
          uShininess,
          typeof s === "number" ? s : mat instanceof PhongMaterial ? mat.shininess : -1.0,
        );
      }
      const uThresholds = u.get("u_thresholds");
      if (uThresholds) {
        const t = props["u_thresholds"];
        if (t instanceof Float32Array || Array.isArray(t)) {
          this.gl.uniform4fv(uThresholds, t as Float32List);
        } else if (mat instanceof TerrainMaterial) {
          this.gl.uniform4fv(uThresholds, new Float32Array(mat.thresholds));
        }
      }
      const uTexOffset = u.get("u_texOffset");
      if (uTexOffset) {
        const off = props["u_texOffset"];
        if (off instanceof Float32Array || Array.isArray(off)) {
          this.gl.uniform2fv(uTexOffset, off as Float32List);
        } else {
          const diff = texs["u_diffuseMap"] as Texture;
          this.gl.uniform2f(uTexOffset, diff ? diff.offset.x : 0, diff ? diff.offset.y : 0);
        }
      }
      const uTexRepeat = u.get("u_texRepeat");
      if (uTexRepeat) {
        const rep = props["u_texRepeat"];
        if (rep instanceof Float32Array || Array.isArray(rep)) {
          this.gl.uniform2fv(uTexRepeat, rep as Float32List);
        } else {
          const diff = texs["u_diffuseMap"] as Texture;
          this.gl.uniform2f(uTexRepeat, diff ? diff.repeat.x : 1, diff ? diff.repeat.y : 1);
        }
      }

      // 6. Textures
      if (manifest.shaderId === MaterialType.SKYBOX) {
        this.gl.activeTexture(this.gl.TEXTURE0);
        const skyTex = texs["u_skybox"] as CubeTexture;
        this.gl.bindTexture(
          this.gl.TEXTURE_CUBE_MAP,
          skyTex ? this._getWebGLCubeTexture(skyTex) : this.defaultCubeTexture,
        );
        const uSkybox = u.get("u_skybox");
        if (uSkybox) this.gl.uniform1i(uSkybox, 0);
      } else {
        // Diffuse Map
        this.gl.activeTexture(this.gl.TEXTURE0);
        const diff = texs["u_diffuseMap"] as Texture;
        this.gl.bindTexture(
          this.gl.TEXTURE_2D,
          diff ? this._getWebGLTexture(diff) : this.defaultTexture,
        );
        const uDiffuseMap = u.get("u_diffuseMap");
        if (uDiffuseMap) this.gl.uniform1i(uDiffuseMap, 0);

        // Normal Map
        this.gl.activeTexture(this.gl.TEXTURE1);
        const normal = texs["u_normalMap"] as Texture;
        const uNormalMap = u.get("u_normalMap");
        if (normal) {
          this.gl.bindTexture(this.gl.TEXTURE_2D, this._getWebGLTexture(normal));
          if (uNormalMap) this.gl.uniform1i(uNormalMap, 1);
        } else {
          this.gl.bindTexture(this.gl.TEXTURE_2D, this.defaultNormalMap);
          if (uNormalMap) this.gl.uniform1i(uNormalMap, 1);
        }

        // Specular Map
        this.gl.activeTexture(this.gl.TEXTURE2);
        const specularMap = texs["u_specularMap"] as Texture;
        const uSpecularMap = u.get("u_specularMap");
        this.gl.bindTexture(
          this.gl.TEXTURE_2D,
          specularMap ? this._getWebGLTexture(specularMap) : this.defaultSpecularMap,
        );
        if (uSpecularMap) this.gl.uniform1i(uSpecularMap, 2);

        // Terrain Maps (if present)
        const uSandMap = u.get("u_sandMap");
        if (uSandMap) {
          this.gl.activeTexture(this.gl.TEXTURE3);
          const t = texs["u_sandMap"] as Texture;
          this.gl.bindTexture(
            this.gl.TEXTURE_2D,
            t ? this._getWebGLTexture(t) : this.defaultTexture,
          );
          this.gl.uniform1i(uSandMap, 3);
        }
        const uGrassMap = u.get("u_grassMap");
        if (uGrassMap) {
          this.gl.activeTexture(this.gl.TEXTURE4);
          const t = texs["u_grassMap"] as Texture;
          this.gl.bindTexture(
            this.gl.TEXTURE_2D,
            t ? this._getWebGLTexture(t) : this.defaultTexture,
          );
          this.gl.uniform1i(uGrassMap, 4);
        }
        const uRockMap = u.get("u_rockMap");
        if (uRockMap) {
          this.gl.activeTexture(this.gl.TEXTURE5);
          const t = texs["u_rockMap"] as Texture;
          this.gl.bindTexture(
            this.gl.TEXTURE_2D,
            t ? this._getWebGLTexture(t) : this.defaultTexture,
          );
          this.gl.uniform1i(uRockMap, 5);
        }
        const uSnowMap = u.get("u_snowMap");
        if (uSnowMap) {
          this.gl.activeTexture(this.gl.TEXTURE6);
          const t = texs["u_snowMap"] as Texture;
          this.gl.bindTexture(
            this.gl.TEXTURE_2D,
            t ? this._getWebGLTexture(t) : this.defaultTexture,
          );
          this.gl.uniform1i(uSnowMap, 6);
        }
      }

      // 7. GPU State from Manifest
      const state = manifest.state;
      if (state) {
        if (CullMode.NONE === state.culling) this.gl.disable(this.gl.CULL_FACE);
        else {
          this.gl.enable(this.gl.CULL_FACE);
          this.gl.cullFace(CullMode.FRONT === state.culling ? this.gl.FRONT : this.gl.BACK);
        }
      } else {
        this.gl.enable(this.gl.CULL_FACE);
        this.gl.cullFace(this.gl.BACK);
      }

      const drawMode =
        MaterialType.WIREFRAME === manifest.shaderId ? this.gl.LINES : this.gl.TRIANGLES;
      m.draw(drawMode);
    }

    if (o.children) {
      for (let i: number = 0; i < o.children.length; i++) {
        this._drawObject(o.children[i]!, vp, camPos, lights);
      }
    }
  }
}

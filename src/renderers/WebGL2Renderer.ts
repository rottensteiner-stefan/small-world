/// src/renderers/WebGL2Renderer.ts

import { AbstractWebGLRenderer } from "./AbstractWebGLRenderer.js";
import {
  AreaLight,
  Color,
  CubeTexture,
  PhongMaterial,
  PointLight,
  SkyboxMaterial,
  SpotLight,
  SpriteMaterial,
  TerrainMaterial,
  Texture,
} from "../core/index.js";
import { GeometryDataInterface } from "../interfaces/index.js";
import { MaterialType, RendererType } from "../enums/index.js";
import { Mesh } from "./Mesh.js";
import { Object3D } from "../core/Object3D.js";
import { Scene } from "../core/Scene.js";
import { Vector3D } from "../math/index.js";
import { WebGL2ShaderBuilder } from "./webgl2/WebGL2ShaderBuilder.js";

interface ShaderLocs {
  pos: number;
  norm: number;
  uv: number;
  vp: WebGLUniformLocation | null;
  model: WebGLUniformLocation | null;
  color: WebGLUniformLocation | null;
  specColor: WebGLUniformLocation | null;
  ambient: WebGLUniformLocation | null;
  dirColor: WebGLUniformLocation | null;
  dirDir: WebGLUniformLocation | null;
  shininess: WebGLUniformLocation | null;
  viewPos: WebGLUniformLocation | null;
  numPL: WebGLUniformLocation | null;
  numSL: WebGLUniformLocation | null;
  numAL: WebGLUniformLocation | null;
  diffuseMap: WebGLUniformLocation | null;
  texOffset: WebGLUniformLocation | null;
  texRepeat: WebGLUniformLocation | null;
  skybox: WebGLUniformLocation | null;
  // Terrain Uniforms
  sandMap: WebGLUniformLocation | null;
  grassMap: WebGLUniformLocation | null;
  rockMap: WebGLUniformLocation | null;
  snowMap: WebGLUniformLocation | null;
  thresholds: WebGLUniformLocation | null;
}

interface ProgramCache {
  prog: WebGLProgram;
  locs: ShaderLocs;
  pointLightLocs: {
    pos: WebGLUniformLocation | null;
    col: WebGLUniformLocation | null;
  }[];
  spotLightLocs: {
    col: WebGLUniformLocation | null;
    dir: WebGLUniformLocation | null;
    params: WebGLUniformLocation | null;
    pos: WebGLUniformLocation | null;
  }[];
  areaLightLocs: {
    col: WebGLUniformLocation | null;
    normal: WebGLUniformLocation | null;
    pos: WebGLUniformLocation | null;
    right: WebGLUniformLocation | null;
    size: WebGLUniformLocation | null;
    up: WebGLUniformLocation | null;
  }[];
}

/**
 * WebGL 2.0 implementation of the renderer.
 */
export class WebGL2Renderer extends AbstractWebGLRenderer {
  /** @inheritdoc */
  public override readonly type: RendererType = RendererType.WEB_GL2;
  declare protected gl: WebGL2RenderingContext;

  private _programs: Map<MaterialType, ProgramCache> = new Map();

  private _cache: Map<GeometryDataInterface, Mesh> = new Map<GeometryDataInterface, Mesh>();
  private _texCache: Map<Texture, WebGLTexture> = new Map<Texture, WebGLTexture>();
  private _texCubeCache: Map<CubeTexture, WebGLTexture> = new Map<CubeTexture, WebGLTexture>();

  // Scratch variables for rendering to avoid GC
  private _scratchModelMatrix: Float32Array = new Float32Array(16);
  private _scratchVec3: Vector3D = new Vector3D();

  /** @inheritdoc */
  public async initialize(
    canvas: HTMLCanvasElement,
    attributes?: Record<string, unknown>,
  ): Promise<void> {
    // Fallback-Mechanismus, falls Canvas bereits einen inkompatiblen Kontext hat
    const gl = canvas.getContext("webgl2", attributes);

    if (!gl) {
      // Wenn WebGL2 fehlschlägt, kann das an einem bereits existierenden WebGL1 Kontext liegen.
      // Der Switch in AbstractDemo ersetzt das Canvas, aber für Application.ts beim Start
      // oder in Edge-Cases müssen wir das klar kommunizieren.
      throw new Error("[WebGL2Renderer] WebGL2 context could not be initialized.");
    }

    this.gl = gl as WebGL2RenderingContext;

    if (!this.gl) {
      throw new Error("[WebGL2Renderer] GL context is null after assignment.");
    }

    // Lade die Shader als Dateien asynchron vom Server herunter!
    await WebGL2ShaderBuilder.preloadShaders();

    this.initDefaultTextures();
    this.gl.enable(this.gl.DEPTH_TEST);
  }

  private _getProgram(type: MaterialType): ProgramCache {
    let cache = this._programs.get(type);
    if (!cache) {
      const source = WebGL2ShaderBuilder.build(type);
      const prog = this.createShaderProgram(source.vs, source.fs);

      const locs: ShaderLocs = {
        pos: this.gl.getAttribLocation(prog, "a_position"),
        norm: this.gl.getAttribLocation(prog, "a_normal"),
        uv: this.gl.getAttribLocation(prog, "a_uv"),
        vp: this.gl.getUniformLocation(prog, "u_vp"),
        model: this.gl.getUniformLocation(prog, "u_model"),
        color: this.gl.getUniformLocation(prog, "u_color"),
        specColor: this.gl.getUniformLocation(prog, "u_specColor"),
        ambient: this.gl.getUniformLocation(prog, "u_ambientColor"),
        dirColor: this.gl.getUniformLocation(prog, "u_dirLightColor"),
        dirDir: this.gl.getUniformLocation(prog, "u_dirLightDir"),
        shininess: this.gl.getUniformLocation(prog, "u_shininess"),
        viewPos: this.gl.getUniformLocation(prog, "u_viewPos"),
        numPL: this.gl.getUniformLocation(prog, "u_numPointLights"),
        numSL: this.gl.getUniformLocation(prog, "u_numSpotLights"),
        numAL: this.gl.getUniformLocation(prog, "u_numAreaLights"),
        diffuseMap: this.gl.getUniformLocation(prog, "u_diffuseMap"),
        texOffset: this.gl.getUniformLocation(prog, "u_texOffset"),
        texRepeat: this.gl.getUniformLocation(prog, "u_texRepeat"),
        skybox: this.gl.getUniformLocation(prog, "u_skybox"),
        sandMap: this.gl.getUniformLocation(prog, "u_sandMap"),
        grassMap: this.gl.getUniformLocation(prog, "u_grassMap"),
        rockMap: this.gl.getUniformLocation(prog, "u_rockMap"),
        snowMap: this.gl.getUniformLocation(prog, "u_snowMap"),
        thresholds: this.gl.getUniformLocation(prog, "u_thresholds"),
      };

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

      cache = { prog, locs, pointLightLocs, spotLightLocs, areaLightLocs };
      this._programs.set(type, cache);
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
    for (const obj of scene.objects) {
      if (!obj.isVisible || !obj.material) continue;
      if (obj.geometry && obj.material.type === MaterialType.SKYBOX) {
        this._drawSkybox(obj, vp);
      } else if (obj.geometry && obj.material.type === MaterialType.BASIC && !obj.frustumCulled) {
        // Render Skydome/Background objects in Pass 1
        this._drawNormal(obj, vp, Vector3D.ZERO, { aCol: Color.BLACK, dCol: Color.BLACK, dDir: Vector3D.ZERO, pLights: [], sLights: [], aLights: [] });
      }
    }
    this.gl.depthMask(true);

    // --- PASS 2: Objects ---
    const extractedLights = this.extractLights(scene);

    for (const obj of scene.objects) {
      if (obj.geometry && obj.material && obj.material.type === MaterialType.BASIC && !obj.frustumCulled) continue;
      this._drawNormal(obj, vp, camPos, extractedLights);
    }
  }

  /**
   * Internal skybox draw function.
   * @private
   */
  private _drawSkybox(o: Object3D, vp: Float32Array): void {
    if (!o.isVisible || !o.material) return;

    if (o.geometry && o.material.type === MaterialType.SKYBOX) {
      const skyMat = o.material as SkyboxMaterial;
      const cache = this._getProgram(MaterialType.SKYBOX);

      this.gl.useProgram(cache.prog);

      if (cache.locs.vp) this.gl.uniformMatrix4fv(cache.locs.vp, false, vp);

      let m = this._cache.get(o.geometry);
      if (!m) {
        m = new Mesh(this.gl, o.geometry);
        this._cache.set(o.geometry, m);
      }

      m.bind(cache.locs.pos);

      if (cache.locs.model) this.gl.uniformMatrix4fv(cache.locs.model, false, o.worldMatrix.data);

      this.gl.activeTexture(this.gl.TEXTURE0);
      this.gl.bindTexture(
        this.gl.TEXTURE_CUBE_MAP,
        skyMat.cubeMap ? this._getWebGLCubeTexture(skyMat.cubeMap) : this.defaultCubeTexture,
      );

      if (cache.locs.skybox) this.gl.uniform1i(cache.locs.skybox, 0);
      this.gl.drawElements(this.gl.TRIANGLES, m.count, this.gl.UNSIGNED_SHORT, 0);
    }

    if (o.children) {
      for (const child of o.children) {
        this._drawSkybox(child, vp);
      }
    }
  }

  /**
   * Internal normal object draw function.
   * @private
   */
  private _drawNormal(o: Object3D, vp: Float32Array, camPos: Vector3D, lights: any): void {
    if (!o.isVisible) return;

    if (o.geometry && o.material && o.material.type !== MaterialType.SKYBOX) {
      const mat = o.material;
      const cache = this._getProgram(mat.type);

      this.gl.useProgram(cache.prog);

      // Upload global uniforms (VP, CamPos, Lights)
      // Note: In a fully optimized architecture, this would be an UBO or we'd only upload if the program changed.
      if (cache.locs.vp) this.gl.uniformMatrix4fv(cache.locs.vp, false, vp);
      if (cache.locs.viewPos) this.gl.uniform3f(cache.locs.viewPos, camPos.x, camPos.y, camPos.z);

      if (cache.locs.ambient)
        this.gl.uniform3f(cache.locs.ambient, lights.aCol.r, lights.aCol.g, lights.aCol.b);
      if (cache.locs.dirDir)
        this.gl.uniform3f(cache.locs.dirDir, lights.dDir.x, lights.dDir.y, lights.dDir.z);
      if (cache.locs.dirColor)
        this.gl.uniform3f(cache.locs.dirColor, lights.dCol.r, lights.dCol.g, lights.dCol.b);

      if (cache.locs.numPL) this.gl.uniform1i(cache.locs.numPL, lights.pLights.length);
      for (let i: number = 0; i < lights.pLights.length; i++) {
        const pl: PointLight = lights.pLights[i]!;
        if (!pl) continue;
        const loc = cache.pointLightLocs[i];
        if (!loc) continue;
        if (loc.pos)
          this.gl.uniform3f(
            loc.pos!,
            pl.worldMatrix.data[12]!,
            pl.worldMatrix.data[13]!,
            pl.worldMatrix.data[14]!,
          );
        if (loc.col)
          this.gl.uniform3f(
            loc.col!,
            pl.color.r * pl.intensity,
            pl.color.g * pl.intensity,
            pl.color.b * pl.intensity,
          );
      }

      if (cache.locs.numSL) this.gl.uniform1i(cache.locs.numSL, lights.sLights.length);
      for (let i: number = 0; i < lights.sLights.length; i++) {
        const sl: SpotLight = lights.sLights[i]!;
        if (!sl) continue;
        const loc = cache.spotLightLocs[i];
        if (!loc) continue;
        if (loc.pos)
          this.gl.uniform3f(
            loc.pos!,
            sl.worldMatrix.data[12]!,
            sl.worldMatrix.data[13]!,
            sl.worldMatrix.data[14]!,
          );
        this._scratchVec3.set(sl.direction.x, sl.direction.y, sl.direction.z).normalize();
        if (loc.dir)
          this.gl.uniform3f(
            loc.dir!,
            this._scratchVec3.x,
            this._scratchVec3.y,
            this._scratchVec3.z,
          );
        if (loc.col)
          this.gl.uniform3f(
            loc.col!,
            sl.color.r * sl.intensity,
            sl.color.g * sl.intensity,
            sl.color.b * sl.intensity,
          );
        if (loc.params)
          this.gl.uniform4f(
            loc.params!,
            Math.cos(sl.angle),
            Math.cos(sl.angle * (1.0 - sl.penumbra)),
            sl.distance,
            sl.decay,
          );
      }

      if (cache.locs.numAL) this.gl.uniform1i(cache.locs.numAL, lights.aLights.length);
      for (let i: number = 0; i < lights.aLights.length; i++) {
        const al = lights.aLights[i] as AreaLight;
        if (!al) continue;
        const loc = cache.areaLightLocs[i];
        if (!loc) continue;
        const matData: Float32Array = al.worldMatrix.data;
        if (loc.pos) this.gl.uniform3f(loc.pos!, matData[12]!, matData[13]!, matData[14]!);
        if (loc.col)
          this.gl.uniform3f(
            loc.col!,
            al.color.r * al.intensity,
            al.color.g * al.intensity,
            al.color.b * al.intensity,
          );
        if (loc.right) this.gl.uniform3f(loc.right!, matData[0]!, matData[1]!, matData[2]!);
        if (loc.up) this.gl.uniform3f(loc.up!, matData[4]!, matData[5]!, matData[6]!);
        if (loc.normal) this.gl.uniform3f(loc.normal!, matData[8]!, matData[9]!, matData[10]!);
        if (loc.size) this.gl.uniform2f(loc.size!, al.width / 2.0, al.height / 2.0);
      }

      let m = this._cache.get(o.geometry);
      if (!m) {
        m = new Mesh(this.gl, o.geometry);
        this._cache.set(o.geometry, m);
      }
      m.bind(cache.locs.pos, cache.locs.norm, cache.locs.uv);

      this._scratchModelMatrix.set(o.worldMatrix.data);

      if (mat.type === MaterialType.SPRITE) {
        const tx: number = this._scratchModelMatrix[12]!;
        const ty: number = this._scratchModelMatrix[13]!;
        const tz: number = this._scratchModelMatrix[14]!;

        const sx: number = Math.sqrt(
          this._scratchModelMatrix[0]! * this._scratchModelMatrix[0]! +
            this._scratchModelMatrix[1]! * this._scratchModelMatrix[1]! +
            this._scratchModelMatrix[2]! * this._scratchModelMatrix[2]!,
        );
        const sy: number = Math.sqrt(
          this._scratchModelMatrix[4]! * this._scratchModelMatrix[4]! +
            this._scratchModelMatrix[5]! * this._scratchModelMatrix[5]! +
            this._scratchModelMatrix[6]! * this._scratchModelMatrix[6]!,
        );
        const sz: number = Math.sqrt(
          this._scratchModelMatrix[8]! * this._scratchModelMatrix[8]! +
            this._scratchModelMatrix[9]! * this._scratchModelMatrix[9]! +
            this._scratchModelMatrix[10]! * this._scratchModelMatrix[10]!,
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
        this._scratchModelMatrix[12] = tx;
        this._scratchModelMatrix[13] = ty;
        this._scratchModelMatrix[14] = tz;
      }

      if (cache.locs.model)
        this.gl.uniformMatrix4fv(cache.locs.model, false, this._scratchModelMatrix);
      if (cache.locs.color) this.gl.uniform4fv(cache.locs.color, mat.color.toFloat32Array());

      let shininess: number = -1.0;
      let activeTex: WebGLTexture = this.defaultTexture;
      let tOffset0: number = 0,
        tOffset1: number = 0;
      let tRepeat0: number = 1,
        tRepeat1: number = 1;

      if (mat.type === MaterialType.BASIC) {
        const bMat = mat as any; // BasicMaterial
        if (bMat.diffuseMap) {
          activeTex = this._getWebGLTexture(bMat.diffuseMap);
          tOffset0 = bMat.diffuseMap.offset.x;
          tOffset1 = bMat.diffuseMap.offset.y;
          tRepeat0 = bMat.diffuseMap.repeat.x;
          tRepeat1 = bMat.diffuseMap.repeat.y;
        }
      } else if (mat.type === MaterialType.LAMBERT) {
        shininess = 0.0;
        const lMat = mat as any;
        if (lMat.diffuseMap) {
          activeTex = this._getWebGLTexture(lMat.diffuseMap);
          tOffset0 = lMat.diffuseMap.offset.x;
          tOffset1 = lMat.diffuseMap.offset.y;
          tRepeat0 = lMat.diffuseMap.repeat.x;
          tRepeat1 = lMat.diffuseMap.repeat.y;
        }
      } else if (mat.type === MaterialType.PHONG) {
        const pMat = mat as PhongMaterial;
        shininess = undefined !== pMat.shininess ? pMat.shininess : 32;
        if (cache.locs.specColor)
          this.gl.uniform4fv(
            cache.locs.specColor,
            pMat.specularColor ? pMat.specularColor.toFloat32Array() : Color.BLACK.toFloat32Array(),
          );
        if (pMat.diffuseMap) {
          activeTex = this._getWebGLTexture(pMat.diffuseMap);
          tOffset0 = pMat.diffuseMap.offset.x;
          tOffset1 = pMat.diffuseMap.offset.y;
          tRepeat0 = pMat.diffuseMap.repeat.x;
          tRepeat1 = pMat.diffuseMap.repeat.y;
        }
      } else if (mat.type === MaterialType.SPRITE) {
        const sMat = mat as SpriteMaterial;
        if (sMat.texture) {
          activeTex = this._getWebGLTexture(sMat.texture);
          tOffset0 = sMat.texture.offset.x;
          tOffset1 = sMat.texture.offset.y;
          tRepeat0 = sMat.texture.repeat.x;
          tRepeat1 = sMat.texture.repeat.y;
        } else {
          activeTex = this.defaultTexture;
          tOffset0 = 0;
          tOffset1 = 0;
          tRepeat0 = 1;
          tRepeat1 = 1;
        }
        shininess = -1.0;
      } else if (mat.type === MaterialType.TERRAIN) {
        const tMat = mat as TerrainMaterial;
        shininess = tMat.shininess;
        tRepeat0 = tMat.texRepeat[0]!;
        tRepeat1 = tMat.texRepeat[1]!;
        if (cache.locs.thresholds) this.gl.uniform4fv(cache.locs.thresholds, tMat.thresholds);

        this.gl.activeTexture(this.gl.TEXTURE1);
        this.gl.bindTexture(
          this.gl.TEXTURE_2D,
          tMat.sandMap ? this._getWebGLTexture(tMat.sandMap) : this.defaultTexture,
        );
        if (cache.locs.sandMap) this.gl.uniform1i(cache.locs.sandMap, 1);

        this.gl.activeTexture(this.gl.TEXTURE2);
        this.gl.bindTexture(
          this.gl.TEXTURE_2D,
          tMat.grassMap ? this._getWebGLTexture(tMat.grassMap) : this.defaultTexture,
        );
        if (cache.locs.grassMap) this.gl.uniform1i(cache.locs.grassMap, 2);

        this.gl.activeTexture(this.gl.TEXTURE3);
        this.gl.bindTexture(
          this.gl.TEXTURE_2D,
          tMat.rockMap ? this._getWebGLTexture(tMat.rockMap) : this.defaultTexture,
        );
        if (cache.locs.rockMap) this.gl.uniform1i(cache.locs.rockMap, 3);

        this.gl.activeTexture(this.gl.TEXTURE4);
        this.gl.bindTexture(
          this.gl.TEXTURE_2D,
          tMat.snowMap ? this._getWebGLTexture(tMat.snowMap) : this.defaultTexture,
        );
        if (cache.locs.snowMap) this.gl.uniform1i(cache.locs.snowMap, 4);
      }

      if (cache.locs.shininess) this.gl.uniform1f(cache.locs.shininess, shininess);

      this.gl.activeTexture(this.gl.TEXTURE0);
      this.gl.bindTexture(this.gl.TEXTURE_2D, activeTex);
      if (cache.locs.diffuseMap) this.gl.uniform1i(cache.locs.diffuseMap, 0);
      if (cache.locs.texOffset) this.gl.uniform2f(cache.locs.texOffset, tOffset0, tOffset1);
      if (cache.locs.texRepeat) this.gl.uniform2f(cache.locs.texRepeat, tRepeat0, tRepeat1);

      const drawMode: number =
        mat.type === MaterialType.WIREFRAME ? this.gl.LINES : this.gl.TRIANGLES;
      const indexType: number =
        mat.type === MaterialType.TERRAIN ? this.gl.UNSIGNED_INT : this.gl.UNSIGNED_SHORT;
      this.gl.drawElements(drawMode, m.count, indexType, 0);
    }

    if (o.children) {
      for (const child of o.children) {
        this._drawNormal(child, vp, camPos, lights);
      }
    }
  }
}

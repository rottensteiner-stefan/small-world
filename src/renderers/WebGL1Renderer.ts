/// src/renderers/WebGL1Renderer.ts

import { AbstractWebGLRenderer } from "./AbstractWebGLRenderer.js";
import {
  AbstractMaterial,
  AreaLight,
  CubeTexture,
  PhongMaterial,
  SkyboxMaterial,
  SpriteMaterial,
  Texture,
} from "../core/index.js";
import { GeometryDataInterface } from "../interfaces/index.js";
import { MaterialType, RendererType } from "../enums/index.js";
import { Mesh } from "./Mesh.js";
import { Object3D } from "../core/Object3D.js";
import { Scene } from "../core/Scene.js";
import { Vector3D } from "../math/Vector3D.js";
import { WebGL1ShaderBuilder } from "./webgl1/WebGL1ShaderBuilder.js";

interface ShaderLocs {
  ambient: WebGLUniformLocation | null;
  color: WebGLUniformLocation | null;
  diffuseMap: WebGLUniformLocation | null;
  dirColor: WebGLUniformLocation | null;
  dirDir: WebGLUniformLocation | null;
  model: WebGLUniformLocation | null;
  norm: number;
  numAL: WebGLUniformLocation | null;
  numPL: WebGLUniformLocation | null;
  numSL: WebGLUniformLocation | null;
  pos: number;
  shininess: WebGLUniformLocation | null;
  specColor: WebGLUniformLocation | null;
  texOffset: WebGLUniformLocation | null;
  texRepeat: WebGLUniformLocation | null;
  uv: number;
  viewPos: WebGLUniformLocation | null;
  vp: WebGLUniformLocation | null;
  skybox: WebGLUniformLocation | null;
}

interface ProgramCache {
  prog: WebGLProgram;
  locs: ShaderLocs;
  pointLightLocs: {
    pos: WebGLUniformLocation | null;
    col: WebGLUniformLocation | null;
  }[];
  spotLightLocs: {
    pos: WebGLUniformLocation | null;
    dir: WebGLUniformLocation | null;
    col: WebGLUniformLocation | null;
    params: WebGLUniformLocation | null;
  }[];
  areaLightLocs: {
    pos: WebGLUniformLocation | null;
    col: WebGLUniformLocation | null;
    right: WebGLUniformLocation | null;
    up: WebGLUniformLocation | null;
    norm: WebGLUniformLocation | null;
    size: WebGLUniformLocation | null;
  }[];
}

/**
 * WebGL 1.0 implementation of the renderer.
 */
export class WebGL1Renderer extends AbstractWebGLRenderer {
  /** @inheritdoc */
  public readonly type: RendererType = RendererType.WEB_GL1;
  declare protected gl: WebGLRenderingContext;

  private _programs: Map<MaterialType, ProgramCache> = new Map();

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

    if (!gl) {
      throw new Error("[WebGL1Renderer] WebGL 1 context could not be initialized.");
    }

    this.gl = gl as WebGLRenderingContext;

    if (!this.gl) {
      throw new Error("[WebGL1Renderer] GL context is null after assignment.");
    }

    // Lade die Shader als Dateien asynchron vom Server herunter!
    await WebGL1ShaderBuilder.preloadShaders();

    // Nutze geerbte Methode für Fallback-Texturen
    this.initDefaultTextures();

    this.gl.enable(this.gl.DEPTH_TEST);
  }

  private _getProgram(type: MaterialType): ProgramCache {
    let cache = this._programs.get(type);
    if (!cache) {
      const source = WebGL1ShaderBuilder.build(type);
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
          norm: this.gl.getUniformLocation(prog, `u_areaLightNormal[${i}]`),
          size: this.gl.getUniformLocation(prog, `u_areaLightSize[${i}]`),
        });
      }

      cache = { prog, locs, pointLightLocs, spotLightLocs, areaLightLocs };
      this._programs.set(type, cache);
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

    // --- PASS 1: Skybox ---
    this.gl.depthMask(false);
    
    for (const obj of scene.objects) {
      this._drawSkybox(obj, vp);
    }
    this.gl.depthMask(true);

    // --- PASS 2: Objects ---
    const extractedLights = this.extractLights(scene);

    for (const obj of scene.objects) {
      this._drawNormal(obj, vp, camPos, extractedLights);
    }
  }
  
  private _drawSkybox(o: Object3D, vp: Float32Array): void {
      if (!o.isVisible || !o.material) {
        return;
      }
      
      if (o.geometry && o.material.type === MaterialType.SKYBOX) {
        const skyMat: SkyboxMaterial = o.material as SkyboxMaterial;
        const cache = this._getProgram(MaterialType.SKYBOX);
        this.gl.useProgram(cache.prog);
        
        if (cache.locs.vp) {
          this.gl.uniformMatrix4fv(cache.locs.vp, false, vp);
        }
        
        let m: Mesh | undefined = this._cache.get(o.geometry);
        if (!m) {
          m = new Mesh(this.gl, o.geometry);
          this._cache.set(o.geometry, m);
        }
        
        m.bind(cache.locs.pos);
        
        if (cache.locs.model) {
          this.gl.uniformMatrix4fv(cache.locs.model, false, o.worldMatrix.data);
        }
        
        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(
          this.gl.TEXTURE_CUBE_MAP,
          skyMat.cubeMap ? this._getWebGLCubeTexture(skyMat.cubeMap) : this.defaultCubeTexture,
        );
        
        if (cache.locs.skybox) {
          this.gl.uniform1i(cache.locs.skybox, 0);
        }
        
        this.gl.drawElements(this.gl.TRIANGLES, m.count, this.gl.UNSIGNED_SHORT, 0);
      }
      
      if (o.children) {
        for (const child of o.children) {
          this._drawSkybox(child, vp);
        }
      }
  }

  private _drawNormal(o: Object3D, vp: Float32Array, camPos: Vector3D, lights: any): void {
      // 1. Wenn das Objekt unsichtbar ist, brechen wir SOFORT ab.
      if (!o.isVisible) {
        return;
      }

      // 2. Wir rendern dieses Objekt nur, wenn es Geometrie und Material hat
      if (o.geometry && o.material && o.material.type !== MaterialType.SKYBOX) {
        const mat: AbstractMaterial = o.material;
        const cache = this._getProgram(mat.type);
        this.gl.useProgram(cache.prog);
        
        if (cache.locs.vp) {
          this.gl.uniformMatrix4fv(cache.locs.vp, false, vp);
        }
        if (cache.locs.viewPos) {
          this.gl.uniform3f(cache.locs.viewPos, camPos.x, camPos.y, camPos.z);
        }

        if (cache.locs.ambient) {
          this.gl.uniform3f(cache.locs.ambient, lights.aCol.r, lights.aCol.g, lights.aCol.b);
        }
        if (cache.locs.dirDir) {
          this.gl.uniform3f(cache.locs.dirDir, lights.dDir.x, lights.dDir.y, lights.dDir.z);
        }
        if (cache.locs.dirColor) {
          this.gl.uniform3f(cache.locs.dirColor, lights.dCol.r, lights.dCol.g, lights.dCol.b);
        }
        
        if (cache.locs.numPL) {
          this.gl.uniform1i(cache.locs.numPL, lights.pLights.length);
        }
        for (let i: number = 0; i < lights.pLights.length; i++) {
          if (cache.pointLightLocs[i]?.pos) {
            this.gl.uniform3f(
              cache.pointLightLocs[i]!.pos!,
              lights.pLights[i]!.worldMatrix.data[12]!,
              lights.pLights[i]!.worldMatrix.data[13]!,
              lights.pLights[i]!.worldMatrix.data[14]!,
            );
          }
          if (cache.pointLightLocs[i]?.col) {
            this.gl.uniform3f(
              cache.pointLightLocs[i]!.col!,
              lights.pLights[i]!.color.r * lights.pLights[i]!.intensity,
              lights.pLights[i]!.color.g * lights.pLights[i]!.intensity,
              lights.pLights[i]!.color.b * lights.pLights[i]!.intensity,
            );
          }
        }
        
        if (cache.locs.numSL) {
          this.gl.uniform1i(cache.locs.numSL, lights.sLights.length);
        }
        for (let i: number = 0; i < lights.sLights.length; i++) {
          if (cache.spotLightLocs[i]?.pos) {
            this.gl.uniform3f(
              cache.spotLightLocs[i]!.pos!,
              lights.sLights[i]!.worldMatrix.data[12]!,
              lights.sLights[i]!.worldMatrix.data[13]!,
              lights.sLights[i]!.worldMatrix.data[14]!,
            );
          }
          const dir: Vector3D = lights.sLights[i]!.direction.clone().normalize();
          if (cache.spotLightLocs[i]?.dir) {
            this.gl.uniform3f(cache.spotLightLocs[i]!.dir!, dir.x, dir.y, dir.z);
          }
          if (cache.spotLightLocs[i]?.col) {
            this.gl.uniform3f(
              cache.spotLightLocs[i]!.col!,
              lights.sLights[i]!.color.r * lights.sLights[i]!.intensity,
              lights.sLights[i]!.color.g * lights.sLights[i]!.intensity,
              lights.sLights[i]!.color.b * lights.sLights[i]!.intensity,
            );
          }
          if (cache.spotLightLocs[i]?.params) {
            this.gl.uniform4f(
              cache.spotLightLocs[i]!.params!,
              Math.cos(lights.sLights[i]!.angle),
              Math.cos(lights.sLights[i]!.angle * (1.0 - lights.sLights[i]!.penumbra)),
              lights.sLights[i]!.distance,
              lights.sLights[i]!.decay,
            );
          }
        }
        
        if (cache.locs.numAL) {
          this.gl.uniform1i(cache.locs.numAL, lights.aLights.length);
        }
        for (let i: number = 0; i < lights.aLights.length; i++) {
          const al: AreaLight = lights.aLights[i] as AreaLight;
          const matData: Float32Array = al.worldMatrix.data;
          if (cache.areaLightLocs[i]?.pos) {
            this.gl.uniform3f(cache.areaLightLocs[i]!.pos!, matData[12]!, matData[13]!, matData[14]!);
          }
          if (cache.areaLightLocs[i]?.col) {
            this.gl.uniform3f(
              cache.areaLightLocs[i]!.col!,
              al.color.r * al.intensity,
              al.color.g * al.intensity,
              al.color.b * al.intensity,
            );
          }
          if (cache.areaLightLocs[i]?.right) {
            this.gl.uniform3f(cache.areaLightLocs[i]!.right!, matData[0]!, matData[1]!, matData[2]!);
          }
          if (cache.areaLightLocs[i]?.up) {
            this.gl.uniform3f(cache.areaLightLocs[i]!.up!, matData[4]!, matData[5]!, matData[6]!);
          }
          if (cache.areaLightLocs[i]?.norm) {
            this.gl.uniform3f(cache.areaLightLocs[i]!.norm!, matData[8]!, matData[9]!, matData[10]!);
          }
          if (cache.areaLightLocs[i]?.size) {
            this.gl.uniform2f(cache.areaLightLocs[i]!.size!, al.width / 2.0, al.height / 2.0);
          }
        }

        let m: Mesh | undefined = this._cache.get(o.geometry);
        if (!m) {
          m = new Mesh(this.gl, o.geometry);
          this._cache.set(o.geometry, m);
        }
        m.bind(cache.locs.pos, cache.locs.norm, cache.locs.uv);

        const modelMatrix: Float32Array = new Float32Array(o.worldMatrix.data);

        // BILLBOARD LOGIC for Sprites
        if (mat.type === MaterialType.SPRITE) {
          const tx: number = modelMatrix[12]!;
          const ty: number = modelMatrix[13]!;
          const tz: number = modelMatrix[14]!;

          const sx: number = Math.sqrt(
            modelMatrix[0]! * modelMatrix[0]! +
              modelMatrix[1]! * modelMatrix[1]! +
              modelMatrix[2]! * modelMatrix[2]!,
          );
          const sy: number = Math.sqrt(
            modelMatrix[4]! * modelMatrix[4]! +
              modelMatrix[5]! * modelMatrix[5]! +
              modelMatrix[6]! * modelMatrix[6]!,
          );
          const sz: number = Math.sqrt(
            modelMatrix[8]! * modelMatrix[8]! +
              modelMatrix[9]! * modelMatrix[9]! +
              modelMatrix[10]! * modelMatrix[10]!,
          );

          modelMatrix[0] = vp[0]! * sx;
          modelMatrix[1] = vp[4]! * sx;
          modelMatrix[2] = vp[8]! * sx;

          modelMatrix[4] = vp[1]! * sy;
          modelMatrix[5] = vp[5]! * sy;
          modelMatrix[6] = vp[9]! * sy;

          modelMatrix[8] = vp[2]! * sz;
          modelMatrix[9] = vp[6]! * sz;
          modelMatrix[10] = vp[10]! * sz;

          modelMatrix[12] = tx;
          modelMatrix[13] = ty;
          modelMatrix[14] = tz;
        }

        if (cache.locs.model) {
          this.gl.uniformMatrix4fv(cache.locs.model, false, modelMatrix);
        }
        if (cache.locs.color) {
          this.gl.uniform4fv(cache.locs.color, mat.color.toArray());
        }

        let shininess: number = -1.0;
        let specCol: number[] = [0, 0, 0, 0];
        let activeTex: WebGLTexture = this.defaultTexture;
        let tOffset: number[] = [0, 0];
        let tRepeat: number[] = [1, 1];

        if (mat.type === MaterialType.LAMBERT) {
          shininess = 0.0;
        } else if (mat.type === MaterialType.PHONG) {
          const pMat: PhongMaterial = mat as PhongMaterial;
          shininess = pMat.shininess || 32;
          specCol = pMat.specularColor ? pMat.specularColor.toArray() : [0, 0, 0, 0];
          if (pMat.diffuseMap) {
            activeTex = this._getWebGLTexture(pMat.diffuseMap);
            tOffset = [pMat.diffuseMap.offset.x, pMat.diffuseMap.offset.y];
            tRepeat = [pMat.diffuseMap.repeat.x, pMat.diffuseMap.repeat.y];
          }
        } else if (mat.type === MaterialType.SPRITE) {
          const sMat: SpriteMaterial = mat as SpriteMaterial;
          if (sMat.texture) {
            activeTex = this._getWebGLTexture(sMat.texture);
            tOffset = [sMat.texture.offset.x, sMat.texture.offset.y];
            tRepeat = [sMat.texture.repeat.x, sMat.texture.repeat.y];
          }
          shininess = -1.0;
        }

        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, activeTex);
        if (cache.locs.diffuseMap) {
          this.gl.uniform1i(cache.locs.diffuseMap, 0);
        }
        if (cache.locs.texOffset) {
          this.gl.uniform2fv(cache.locs.texOffset, tOffset);
        }
        if (cache.locs.texRepeat) {
          this.gl.uniform2fv(cache.locs.texRepeat, tRepeat);
        }
        if (cache.locs.shininess) {
          this.gl.uniform1f(cache.locs.shininess, shininess);
        }
        if (cache.locs.specColor) {
          this.gl.uniform4fv(cache.locs.specColor, specCol);
        }

        const drawMode: number =
          mat.type === MaterialType.WIREFRAME ? this.gl.LINES : this.gl.TRIANGLES;
        this.gl.drawElements(drawMode, m.count, this.gl.UNSIGNED_SHORT, 0);
      }

      // 3. IMMER in die Kinder absteigen
      if (o.children) {
        for (const child of o.children) {
          this._drawNormal(child, vp, camPos, lights);
        }
      }
  }
}

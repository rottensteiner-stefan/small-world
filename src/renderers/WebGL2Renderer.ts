/// src/renderers/WebGL2Renderer.ts

import { AbstractWebGLRenderer } from "./AbstractWebGLRenderer.js";
import {
  CubeTexture,
  ShaderRegistry,
  Texture,
  Color,
  DeviceCaps,
  DeviceLimit,
  DepthMaterial,
} from "../core/index.js";
import { EngineConfig, GeometryDataInterface, LightDataInterface } from "../interfaces/index.js";
import {
  BlendingMode,
  CullMode,
  MaterialType,
  RendererType,
  TextureFilter,
  TextureWrap,
  Topology,
} from "../enums/index.js";
import { Mesh } from "./Mesh.js";
import { Object3D } from "../core/Object3D.js";
import { Scene } from "../core/Scene.js";
import { MathPool, Vector3D } from "../math/index.js";
import { WebGL2UniformBuffer } from "./WebGL2UniformBuffer.js";
import { WebGL2DepthFrameBuffer } from "./WebGL2DepthFrameBuffer.js";
import { AbstractLight } from "../core/lights/AbstractLight.js";

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

  private _shadowMaps: Map<AbstractLight, WebGL2DepthFrameBuffer> = new Map();
  private _dummyShadowMap!: WebGL2DepthFrameBuffer;

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

    this._dummyShadowMap = new WebGL2DepthFrameBuffer(this.gl, 1, 1);
    this._dummyShadowMap.bind();
    this.gl.clear(this.gl.DEPTH_BUFFER_BIT);
    this._dummyShadowMap.unbind();

    this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, false);
    this.initDefaultTextures();
    this.gl.enable(this.gl.DEPTH_TEST);

    // Pre-register internal materials
    new DepthMaterial();

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
        const loc = this.gl.getUniformLocation(prog, name);
        if (
          null === loc &&
          name !== "u_thresholds" &&
          name !== "u_liquidParams" &&
          shaderId !== MaterialType.DEPTH
        ) {
          console.warn(
            `[WebGL2Renderer] Uniform '${name}' defined in material layout but not found in shader '${shaderId}'. It might be unused or optimized away.`,
          );
        }
        uniforms.set(name, loc ?? undefined);
      });

      [
        "u_model",
        "u_color",
        "u_specColor",
        "u_shininess",
        "u_thresholds",
        "u_time",
        "u_flowSpeed",
        "u_noiseScale",
      ].forEach((name) => {
        if (!uniforms.has(name)) {
          uniforms.set(name, this.gl.getUniformLocation(prog, name) ?? undefined);
        }
      });

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

      // Shadow Uniform Arrays
      for (let i = 0; i < 4; i++) {
        const mapName = `u_spotShadowMap[${i}]`;
        const matrixName = `u_spotShadowMatrix[${i}]`;
        const infoName = `u_spotShadowInfo[${i}]`;
        uniforms.set(mapName, this.gl.getUniformLocation(prog, mapName) ?? undefined);
        uniforms.set(matrixName, this.gl.getUniformLocation(prog, matrixName) ?? undefined);
        uniforms.set(infoName, this.gl.getUniformLocation(prog, infoName) ?? undefined);
      }

      // Directional Shadow Uniforms
      ["u_dirShadowMap", "u_cascadeSplits", "u_dirShadowInfo"].forEach((name) => {
        uniforms.set(name, this.gl.getUniformLocation(prog, name) ?? undefined);
      });
      for (let i = 0; i < 4; i++) {
        const name = `u_cascadeMatrices[${i}]`;
        uniforms.set(name, this.gl.getUniformLocation(prog, name) ?? undefined);
      }

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
  public render(
    scene: Scene,
    vp: Float32Array,
    camPos: Vector3D = Vector3D.ZERO,
    vMat?: Float32Array,
  ): void {
    const extractedLights = this.extractLights(scene);
    const renderList = scene.getVisibleObjectsSorted(vp, camPos);

    // --- PASS 0: Shadow Maps ---
    // Pass only the opaque map to shadow maps for now
    this._renderShadowMaps(extractedLights, renderList.opaque);

    // --- SETUP MAIN PASS ---
    this._updateGlobalUBO(vp, camPos, extractedLights);
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
    this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);

    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
    this.gl.enable(this.gl.BLEND);
    this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);

    // --- PASS 1: Skybox / Background ---
    const skyboxShaderMap = renderList.opaque.get(MaterialType.SKYBOX);
    if (skyboxShaderMap) {
      this.gl.depthMask(false);
      for (const [topology, materialGroups] of skyboxShaderMap.entries()) {
        this._renderGroup(
          MaterialType.SKYBOX,
          materialGroups,
          vMat,
          topology,
          extractedLights,
          scene.fog,
        );
      }
      this.gl.depthMask(true);
      renderList.opaque.delete(MaterialType.SKYBOX);
    }

    // --- PASS 2: All other Opaque Objects ---
    for (const [shaderId, topologyMap] of renderList.opaque.entries()) {
      for (const [topology, materialGroups] of topologyMap.entries()) {
        this._renderGroup(shaderId, materialGroups, vMat, topology, extractedLights, scene.fog);
      }
    }

    // --- PASS 3: Transparent Objects ---
    for (const obj of renderList.transparent) {
      const manifest = obj.material!.getRenderManifest();
      const shaderId = manifest.shaderId;
      const topology =
        manifest.state?.topology ||
        obj.geometry?.topology ||
        (obj.geometry?.indices?.length === 2 ? "line-list" : "triangle-list");

      const materialMap = new Map<string, Object3D[]>([[obj.material!.uuid, [obj]]]);
      this._renderGroup(shaderId, materialMap, vMat, topology, extractedLights, scene.fog);
    }
  }

  /**
   * Renders shadow maps for all shadow-casting lights.
   */
  private _renderShadowMaps(
    lights: LightDataInterface,
    sortedGroups: Map<string, Map<string, Map<string, Object3D[]>>>,
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
      this._updateGlobalUBO(
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

        this._updateGlobalUBO(cascadeCam.viewProjectionMatrix, cascadeCam.position, emptyLights);

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
    sortedGroups: Map<string, Map<string, Map<string, Object3D[]>>>,
  ): void {
    for (const [shaderId, topologyMap] of sortedGroups.entries()) {
      if (shaderId === MaterialType.SKYBOX) continue;

      for (const [topology, materialGroups] of topologyMap.entries()) {
        const drawMode = topology === Topology.LINE_LIST ? this.gl.LINES : this.gl.TRIANGLES;

        for (const objects of materialGroups.values()) {
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

            this._scratchModelMatrix.set(o.worldMatrix.data);
            const uModel = cache.uniforms.get("u_model");
            if (uModel) this.gl.uniformMatrix4fv(uModel, false, this._scratchModelMatrix);

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
            mesh.draw(drawMode);
          }
        }
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

    for (let i = 0; i < 4; i++) {
      let loc = cache.uniforms.get(`u_spotShadowMap[${i}]`);
      if (!loc) loc = this.gl.getUniformLocation(cache.prog, `u_spotShadowMap[${i}]`) ?? undefined;
      if (loc) this.gl.uniform1i(loc, dummyUnit);
    }
  }

  /**
   * Renders a group of objects sharing the same shader and topology.
   */
  private _renderGroup(
    shaderId: string,
    materialGroups: Map<string, Object3D[]>,
    vMat?: Float32Array,
    topology: string = "triangle-list",
    lights?: LightDataInterface,
    fog?: import("../core/Fog.js").Fog,
  ): void {
    const cache = this._getProgram(shaderId);
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
              // x: bias, y: normalBias, z: castShadow (1.0 = true)
              if (infoLoc)
                this.gl.uniform4fv(
                  infoLoc,
                  new Float32Array([light.shadowBias, light.shadowNormalBias, 1.0, 0.0]),
                );
            }
          }
        } else {
          if (infoLoc) this.gl.uniform4fv(infoLoc, new Float32Array([0.0, 0.0, 0.0, 0.0]));
        }
      }
    }

    // DirectionalLight Shadows
    if (lights && lights.dLight && lights.dLight.castShadow && lights.dLight.numCascades > 0) {
      const light = lights.dLight;
      const mapLoc = cache.uniforms.get("u_dirShadowMap");
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
            const splits = new Float32Array([
              light.cascadeSplits[0] ?? 0,
              light.cascadeSplits[1] ?? 0,
              light.cascadeSplits[2] ?? 0,
              light.cascadeSplits[3] ?? 0,
            ]);
            this.gl.uniform4fv(splitsLoc, splits);
          }

          if (infoLoc) {
            // x: bias, y: normalBias, z: castShadow, w: numCascades
            this.gl.uniform4fv(
              infoLoc,
              new Float32Array([light.shadowBias, light.shadowNormalBias, 1.0, light.numCascades]),
            );
          }
        }
      }
    } else {
      const infoLoc = cache.uniforms.get("u_dirShadowInfo");
      if (infoLoc) this.gl.uniform4fv(infoLoc, new Float32Array([0.0, 0.0, 0.0, 0.0]));
    }

    for (const materialGroup of materialGroups.values()) {
      const objects = materialGroup;
      const firstObj = objects[0]!;
      const mat = firstObj.material!;
      const manifest = mat.getRenderManifest();
      const u = cache.uniforms;

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

      // --- 1. Bind Material States (Once per material group) ---
      const state = manifest.state;
      if (state && CullMode.NONE === state.culling) this.gl.disable(this.gl.CULL_FACE);
      else {
        this.gl.enable(this.gl.CULL_FACE);
        this.gl.cullFace(state && CullMode.FRONT === state.culling ? this.gl.FRONT : this.gl.BACK);
      }

      if (state?.transparent) {
        this.gl.enable(this.gl.BLEND);
        if (state.blending === BlendingMode.ADDITIVE) {
          this.gl.blendFunc(this.gl.ONE, this.gl.ONE);
        } else if (state.blending === BlendingMode.PREMULTIPLIED_ALPHA) {
          this.gl.blendFunc(this.gl.ONE, this.gl.ONE_MINUS_SRC_ALPHA);
        } else {
          this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
        }
        this.gl.depthMask(false);
      } else {
        this.gl.disable(this.gl.BLEND);
        this.gl.depthMask(true);
      }

      if (state?.depthWrite === false) this.gl.depthMask(false);
      // depthTest is true by default in initialize, but we should respect overrides
      if (state?.depthTest === false) this.gl.disable(this.gl.DEPTH_TEST);
      else this.gl.enable(this.gl.DEPTH_TEST);

      // --- 2. Bind Generic Material Properties (Uniforms) ---
      for (const [name, value] of Object.entries(manifest.properties)) {
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
          if (value.length === 4) this.gl.uniform4fv(loc, new Float32Array(value));
          else if (value.length === 3) this.gl.uniform3fv(loc, new Float32Array(value));
          else if (value.length === 2) this.gl.uniform2fv(loc, new Float32Array(value));
        }
      }

      // --- 3. Bind Textures ---
      const texs = manifest.textures;
      if (shaderId === MaterialType.SKYBOX) {
        this.gl.activeTexture(this.gl.TEXTURE0);
        const skyTex = texs["u_skybox"] as CubeTexture;
        this.gl.bindTexture(
          this.gl.TEXTURE_CUBE_MAP,
          skyTex ? this._getWebGLCubeTexture(skyTex) : this.defaultCubeTexture,
        );
        const uSkybox = u.get("u_skybox");
        if (uSkybox) this.gl.uniform1i(uSkybox, 0);
      } else {
        const samplerUnits: Record<string, number> = {
          u_diffuseMap: 0,
          u_normalMap: 1,
          u_specularMap: 2,
          u_sandMap: 3,
          u_grassMap: 4,
          u_rockMap: 5,
          u_snowMap: 6,
        };
        for (const [uniformName, unit] of Object.entries(samplerUnits)) {
          const loc = u.get(uniformName);
          if (loc) {
            const maxUnits = DeviceCaps.getLimit(DeviceLimit.MAX_TEXTURE_IMAGE_UNITS);
            if (unit >= maxUnits) {
              console.warn(
                `[WebGL2Renderer] Exceeded MAX_TEXTURE_IMAGE_UNITS (${maxUnits}). Cannot bind material texture ${uniformName} to unit ${unit}.`,
              );
            } else {
              this.gl.activeTexture(this.gl.TEXTURE0 + unit);
              const t = texs[uniformName] as Texture;
              if (uniformName === "u_normalMap" && !t)
                this.gl.bindTexture(this.gl.TEXTURE_2D, this.defaultNormalMap);
              else if (uniformName === "u_specularMap" && !t)
                this.gl.bindTexture(this.gl.TEXTURE_2D, this.defaultSpecularMap);
              else
                this.gl.bindTexture(
                  this.gl.TEXTURE_2D,
                  t ? this._getWebGLTexture(t) : this.defaultTexture,
                );
              this.gl.uniform1i(loc, unit);
            }
          }
        }
      }

      // --- 4. Render each object in the material group ---
      for (const o of objects) {
        if (!o.geometry) continue;

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
          // Set rotation part of model matrix to transpose of view matrix rotation
          // This cancels camera rotation.
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

        const drawMode = topology === Topology.LINE_LIST ? this.gl.LINES : this.gl.TRIANGLES;
        mesh.draw(drawMode);
      }
    }
  }

  private _updateGlobalUBO(vp: Float32Array, camPos: Vector3D, lights: LightDataInterface): void {
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
    ubo.setFloat(136, lights.aLights.length);
    ubo.setFloat(140, this._quality.gamma ?? 2.2);
    ubo.setFloat(144, this._quality.exposure ?? 1.0);

    for (let i = 0; i < 4; i++) {
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
      }
    }

    for (let i = 0; i < 4; i++) {
      const offset = 288 + i * 64;
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
      const offset = 544 + i * 112;
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
    ubo.update();
  }
}

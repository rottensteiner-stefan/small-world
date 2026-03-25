/// src/renderers/WebGL1Renderer.ts
import { AbstractWebGLRenderer } from "./AbstractWebGLRenderer.js";
import { CubeTexture, PhongMaterial, SkyboxMaterial, Texture } from "../core/index.js";
import { GeometryData } from "../interfaces/index.js";
import { MaterialType, RendererType } from "../enums/index.js";
import { Mesh } from "./Mesh.js";
import { Object3D } from "../core/Object3D.js";
import { Scene } from "../core/Scene.js";
import { Vector3D } from "../math/Vector3D.js";

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
}

export class WebGL1Renderer extends AbstractWebGLRenderer {
  public readonly type = RendererType.WEB_GL1;
  declare protected gl: WebGLRenderingContext;

  private _prog!: WebGLProgram;
  private _locs!: ShaderLocs;
  private _skyProg!: WebGLProgram;
  private _skyLocs!: {
    pos: number;
    vp: WebGLUniformLocation | null;
    model: WebGLUniformLocation | null;
    skybox: WebGLUniformLocation | null;
  };

  private _cache = new Map<GeometryData, Mesh>();
  private _texCache = new Map<Texture, WebGLTexture>();
  private _texCubeCache = new Map<CubeTexture, WebGLTexture>();

  private _pointLightLocs: {
    pos: WebGLUniformLocation | null;
    col: WebGLUniformLocation | null;
  }[] = [];
  private _spotLightLocs: {
    pos: WebGLUniformLocation | null;
    dir: WebGLUniformLocation | null;
    col: WebGLUniformLocation | null;
    params: WebGLUniformLocation | null;
  }[] = [];
  private _areaLightLocs: {
    pos: WebGLUniformLocation | null;
    col: WebGLUniformLocation | null;
    right: WebGLUniformLocation | null;
    up: WebGLUniformLocation | null;
    norm: WebGLUniformLocation | null;
    size: WebGLUniformLocation | null;
  }[] = [];

  public async initialize(canvas: HTMLCanvasElement) {
    this.gl = (canvas.getContext("webgl", { antialias: true }) ||
      canvas.getContext("experimental-webgl")) as WebGLRenderingContext;

    // Nutze geerbte Methode für Fallback-Texturen
    this.initDefaultTextures();

    const vs = `attribute vec3 a_position; attribute vec3 a_normal; attribute vec2 a_uv; uniform mat4 u_vp; uniform mat4 u_model; uniform vec2 u_texOffset; uniform vec2 u_texRepeat; varying vec3 v_worldPos; varying vec3 v_normal; varying vec2 v_uv; mat3 extractMat3(mat4 m) { return mat3(m[0].xyz, m[1].xyz, m[2].xyz); } void main() { vec4 wp = u_model * vec4(a_position, 1.0); v_worldPos = wp.xyz; v_normal = extractMat3(u_model) * a_normal; v_uv = (a_uv * u_texRepeat) + u_texOffset; gl_Position = u_vp * wp; }`;
    const fs = `precision highp float; varying vec3 v_worldPos; varying vec3 v_normal; varying vec2 v_uv; uniform vec4 u_color; uniform vec4 u_specColor; uniform float u_shininess; uniform vec3 u_viewPos; uniform vec3 u_ambientColor; uniform vec3 u_dirLightColor; uniform vec3 u_dirLightDir; uniform sampler2D u_diffuseMap; uniform int u_numPointLights; uniform vec3 u_pointLightPos[4]; uniform vec3 u_pointLightColor[4]; uniform int u_numSpotLights; uniform vec3 u_spotLightPos[4]; uniform vec3 u_spotLightDir[4]; uniform vec3 u_spotLightColor[4]; uniform vec4 u_spotLightParams[4]; uniform int u_numAreaLights; uniform vec3 u_areaLightPos[4]; uniform vec3 u_areaLightColor[4]; uniform vec3 u_areaLightRight[4]; uniform vec3 u_areaLightUp[4]; uniform vec3 u_areaLightNormal[4]; uniform vec2 u_areaLightSize[4]; void main() { vec4 texColor = texture2D(u_diffuseMap, v_uv); if (u_shininess < -0.5) { gl_FragColor = u_color * texColor; return; } vec3 N = normalize(v_normal); vec3 V = normalize(u_viewPos - v_worldPos); vec3 finalLight = u_ambientColor; vec3 specular = vec3(0.0); vec3 L_dir = normalize(u_dirLightDir); float diff_dir = max(dot(N, L_dir), 0.0); finalLight += diff_dir * u_dirLightColor; if (u_shininess > 0.0 && diff_dir > 0.0) specular += pow(max(dot(V, reflect(-L_dir, N)), 0.0), u_shininess) * u_dirLightColor; for(int i = 0; i < 4; i++) { if (i >= u_numPointLights) break; vec3 lightVec = u_pointLightPos[i] - v_worldPos; float dist = length(lightVec); vec3 L_pt = lightVec / dist; float attenuation = 1.0 / (1.0 + 0.1 * dist + 0.01 * dist * dist); float diff_pt = max(dot(N, L_pt), 0.0); finalLight += diff_pt * u_pointLightColor[i] * attenuation; if (u_shininess > 0.0 && diff_pt > 0.0) specular += pow(max(dot(V, reflect(-L_pt, N)), 0.0), u_shininess) * u_pointLightColor[i] * attenuation; } for(int i = 0; i < 4; i++) { if (i >= u_numSpotLights) break; vec3 lightVec = u_spotLightPos[i] - v_worldPos; float dist = length(lightVec); vec3 L_sp = lightVec / dist; vec3 S_dir = normalize(u_spotLightDir[i]); float theta = dot(-L_sp, S_dir); if(theta > u_spotLightParams[i].x) { float spotEffect = smoothstep(u_spotLightParams[i].x, u_spotLightParams[i].y, theta); float attenuation = 1.0 / (1.0 + 0.1 * dist + 0.01 * dist * dist); float diff_sp = max(dot(N, L_sp), 0.0); finalLight += diff_sp * u_spotLightColor[i] * attenuation * spotEffect; if (u_shininess > 0.0 && diff_sp > 0.0) specular += pow(max(dot(V, reflect(-L_sp, N)), 0.0), u_shininess) * u_spotLightColor[i] * attenuation * spotEffect; } } for(int i = 0; i < 4; i++) { if (i >= u_numAreaLights) break; vec3 L_center = u_areaLightPos[i]; vec3 L_normal = normalize(u_areaLightNormal[i]); vec3 dirFromLight = v_worldPos - L_center; if(dot(dirFromLight, L_normal) >= 0.0) { vec3 L_right = normalize(u_areaLightRight[i]); vec3 L_up = normalize(u_areaLightUp[i]); vec2 size = u_areaLightSize[i]; float projX = clamp(dot(dirFromLight, L_right), -size.x, size.x); float projY = clamp(dot(dirFromLight, L_up), -size.y, size.y); vec3 closestPoint = L_center + L_right * projX + L_up * projY; vec3 lightVec = closestPoint - v_worldPos; float dist = length(lightVec); vec3 L_al = lightVec / (dist + 0.0001); float attenuation = 1.0 / (1.0 + 0.1 * dist + 0.01 * dist * dist); float diff_al = max(dot(N, L_al), 0.0); finalLight += diff_al * u_areaLightColor[i] * attenuation; if (u_shininess > 0.0 && diff_al > 0.0) specular += pow(max(dot(V, reflect(-L_al, N)), 0.0), u_shininess) * u_areaLightColor[i] * attenuation; } } gl_FragColor = vec4((finalLight * u_color.rgb * texColor.rgb) + (specular * u_specColor.rgb), u_color.a * texColor.a); }`;

    const skyVs = `attribute vec3 a_position; uniform mat4 u_vp; uniform mat4 u_model; varying vec3 v_uvw; void main() { v_uvw = a_position; gl_Position = u_vp * u_model * vec4(a_position, 1.0); }`;
    const skyFs = `precision highp float; varying vec3 v_uvw; uniform samplerCube u_skybox; void main() { gl_FragColor = textureCube(u_skybox, v_uvw); }`;

    // Nutze geerbte Methode zum Kompilieren
    this._prog = this.createShaderProgram(vs, fs);
    this._skyProg = this.createShaderProgram(skyVs, skyFs);

    this._locs = {
      pos: this.gl.getAttribLocation(this._prog, "a_position"),
      norm: this.gl.getAttribLocation(this._prog, "a_normal"),
      uv: this.gl.getAttribLocation(this._prog, "a_uv"),
      vp: this.gl.getUniformLocation(this._prog, "u_vp"),
      model: this.gl.getUniformLocation(this._prog, "u_model"),
      color: this.gl.getUniformLocation(this._prog, "u_color"),
      specColor: this.gl.getUniformLocation(this._prog, "u_specColor"),
      ambient: this.gl.getUniformLocation(this._prog, "u_ambientColor"),
      dirColor: this.gl.getUniformLocation(this._prog, "u_dirLightColor"),
      dirDir: this.gl.getUniformLocation(this._prog, "u_dirLightDir"),
      shininess: this.gl.getUniformLocation(this._prog, "u_shininess"),
      viewPos: this.gl.getUniformLocation(this._prog, "u_viewPos"),
      numPL: this.gl.getUniformLocation(this._prog, "u_numPointLights"),
      numSL: this.gl.getUniformLocation(this._prog, "u_numSpotLights"),
      numAL: this.gl.getUniformLocation(this._prog, "u_numAreaLights"),
      diffuseMap: this.gl.getUniformLocation(this._prog, "u_diffuseMap"),
      texOffset: this.gl.getUniformLocation(this._prog, "u_texOffset"),
      texRepeat: this.gl.getUniformLocation(this._prog, "u_texRepeat"),
    };

    this._skyLocs = {
      pos: this.gl.getAttribLocation(this._skyProg, "a_position"),
      vp: this.gl.getUniformLocation(this._skyProg, "u_vp"),
      model: this.gl.getUniformLocation(this._skyProg, "u_model"),
      skybox: this.gl.getUniformLocation(this._skyProg, "u_skybox"),
    };

    for (let i = 0; i < 4; i++) {
      this._pointLightLocs.push({
        pos: this.gl.getUniformLocation(this._prog, `u_pointLightPos[${i}]`),
        col: this.gl.getUniformLocation(this._prog, `u_pointLightColor[${i}]`),
      });
      this._spotLightLocs.push({
        pos: this.gl.getUniformLocation(this._prog, `u_spotLightPos[${i}]`),
        dir: this.gl.getUniformLocation(this._prog, `u_spotLightDir[${i}]`),
        col: this.gl.getUniformLocation(this._prog, `u_spotLightColor[${i}]`),
        params: this.gl.getUniformLocation(this._prog, `u_spotLightParams[${i}]`),
      });
      this._areaLightLocs.push({
        pos: this.gl.getUniformLocation(this._prog, `u_areaLightPos[${i}]`),
        col: this.gl.getUniformLocation(this._prog, `u_areaLightColor[${i}]`),
        right: this.gl.getUniformLocation(this._prog, `u_areaLightRight[${i}]`),
        up: this.gl.getUniformLocation(this._prog, `u_areaLightUp[${i}]`),
        norm: this.gl.getUniformLocation(this._prog, `u_areaLightNormal[${i}]`),
        size: this.gl.getUniformLocation(this._prog, `u_areaLightSize[${i}]`),
      });
    }
    this.gl.enable(this.gl.DEPTH_TEST);
  }

  private _getWebGLTexture(tex: Texture): WebGLTexture {
    if (!tex.isLoaded || !tex.image) return this.defaultTexture;
    let glTex = this._texCache.get(tex);
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
    let glTex = this._texCubeCache.get(tex);
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

  public render(scene: Scene, vp: Float32Array, camPos: Vector3D = new Vector3D()): void {
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

    // --- PASS 1: Skybox ---
    this.gl.depthMask(false);
    this.gl.useProgram(this._skyProg);
    if (this._skyLocs.vp) this.gl.uniformMatrix4fv(this._skyLocs.vp, false, vp);

    const drawSkybox = (o: Object3D): void => {
      if (!o.isVisible || !o.material) return;
      if (o.geometry && o.material.type === MaterialType.SKYBOX) {
        const skyMat = o.material as SkyboxMaterial;
        let m = this._cache.get(o.geometry);
        if (!m) {
          m = new Mesh(this.gl, o.geometry);
          this._cache.set(o.geometry, m);
        }
        m.bind(this._skyLocs.pos);
        if (this._skyLocs.model)
          this.gl.uniformMatrix4fv(this._skyLocs.model, false, o.worldMatrix.data);
        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(
          this.gl.TEXTURE_CUBE_MAP,
          skyMat.cubeMap ? this._getWebGLCubeTexture(skyMat.cubeMap) : this.defaultCubeTexture,
        );
        if (this._skyLocs.skybox) this.gl.uniform1i(this._skyLocs.skybox, 0);
        this.gl.drawElements(this.gl.TRIANGLES, m.count, this.gl.UNSIGNED_SHORT, 0);
      }
      if (o.children) for (const child of o.children) drawSkybox(child);
    };
    for (const obj of scene.objects) drawSkybox(obj);
    this.gl.depthMask(true);

    // --- PASS 2: Objects ---
    this.gl.useProgram(this._prog);
    if (this._locs.vp) this.gl.uniformMatrix4fv(this._locs.vp, false, vp);
    if (this._locs.viewPos) this.gl.uniform3f(this._locs.viewPos, camPos.x, camPos.y, camPos.z);

    // Nutze geerbte Methode zur Licht-Extraktion!
    const { aCol, dDir, dCol, pLights, sLights, aLights } = this.extractLights(scene);

    if (this._locs.ambient) this.gl.uniform3f(this._locs.ambient, aCol.r, aCol.g, aCol.b);
    if (this._locs.dirDir) this.gl.uniform3f(this._locs.dirDir, dDir.x, dDir.y, dDir.z);
    if (this._locs.dirColor) this.gl.uniform3f(this._locs.dirColor, dCol.r, dCol.g, dCol.b);
    if (this._locs.numPL) this.gl.uniform1i(this._locs.numPL, pLights.length);
    for (let i = 0; i < pLights.length; i++) {
      if (this._pointLightLocs[i]?.pos)
        this.gl.uniform3f(
          this._pointLightLocs[i]!.pos!,
          pLights[i]!.worldMatrix.data[12]!,
          pLights[i]!.worldMatrix.data[13]!,
          pLights[i]!.worldMatrix.data[14]!,
        );
      if (this._pointLightLocs[i]?.col)
        this.gl.uniform3f(
          this._pointLightLocs[i]!.col!,
          pLights[i]!.color.r * pLights[i]!.intensity,
          pLights[i]!.color.g * pLights[i]!.intensity,
          pLights[i]!.color.b * pLights[i]!.intensity,
        );
    }
    if (this._locs.numSL) this.gl.uniform1i(this._locs.numSL, sLights.length);
    for (let i = 0; i < sLights.length; i++) {
      if (this._spotLightLocs[i]?.pos)
        this.gl.uniform3f(
          this._spotLightLocs[i]!.pos!,
          sLights[i]!.worldMatrix.data[12]!,
          sLights[i]!.worldMatrix.data[13]!,
          sLights[i]!.worldMatrix.data[14]!,
        );
      const dir = sLights[i]!.direction.clone().normalize();
      if (this._spotLightLocs[i]?.dir)
        this.gl.uniform3f(this._spotLightLocs[i]!.dir!, dir.x, dir.y, dir.z);
      if (this._spotLightLocs[i]?.col)
        this.gl.uniform3f(
          this._spotLightLocs[i]!.col!,
          sLights[i]!.color.r * sLights[i]!.intensity,
          sLights[i]!.color.g * sLights[i]!.intensity,
          sLights[i]!.color.b * sLights[i]!.intensity,
        );
      if (this._spotLightLocs[i]?.params)
        this.gl.uniform4f(
          this._spotLightLocs[i]!.params!,
          Math.cos(sLights[i]!.angle),
          Math.cos(sLights[i]!.angle * (1.0 - sLights[i]!.penumbra)),
          sLights[i]!.distance,
          sLights[i]!.decay,
        );
    }
    if (this._locs.numAL) this.gl.uniform1i(this._locs.numAL, aLights.length);
    for (let i = 0; i < aLights.length; i++) {
      const al = aLights[i] as any;
      const mat = al.worldMatrix.data;
      if (this._areaLightLocs[i]?.pos)
        this.gl.uniform3f(this._areaLightLocs[i]!.pos!, mat[12]!, mat[13]!, mat[14]!);
      if (this._areaLightLocs[i]?.col)
        this.gl.uniform3f(
          this._areaLightLocs[i]!.col!,
          al.color.r * al.intensity,
          al.color.g * al.intensity,
          al.color.b * al.intensity,
        );
      if (this._areaLightLocs[i]?.right)
        this.gl.uniform3f(this._areaLightLocs[i]!.right!, mat[0]!, mat[1]!, mat[2]!);
      if (this._areaLightLocs[i]?.up)
        this.gl.uniform3f(this._areaLightLocs[i]!.up!, mat[4]!, mat[5]!, mat[6]!);
      if (this._areaLightLocs[i]?.norm)
        this.gl.uniform3f(this._areaLightLocs[i]!.norm!, mat[8]!, mat[9]!, mat[10]!);
      if (this._areaLightLocs[i]?.size)
        this.gl.uniform2f(this._areaLightLocs[i]!.size!, al.width / 2.0, al.height / 2.0);
    }

    const drawNormal = (o: Object3D): void => {
      // 1. Wenn das Objekt unsichtbar ist, brechen wir SOFORT ab.
      if (!o.isVisible) return;

      // 2. Wir rendern dieses Objekt nur, wenn es Geometrie und Material hat
      if (o.geometry && o.material && o.material.type !== MaterialType.SKYBOX) {
        const mat = o.material;
        let m = this._cache.get(o.geometry);
        if (!m) {
          m = new Mesh(this.gl, o.geometry);
          this._cache.set(o.geometry, m);
        }
        m.bind(this._locs.pos, this._locs.norm, this._locs.uv);

        if (this._locs.model) this.gl.uniformMatrix4fv(this._locs.model, false, o.worldMatrix.data);
        if (this._locs.color) this.gl.uniform4fv(this._locs.color, mat.color.toArray());

        let shininess = -1.0,
          specCol = [0, 0, 0, 0],
          activeTex = this.defaultTexture,
          tOffset = [0, 0],
          tRepeat = [1, 1];

        if (mat.type === MaterialType.LAMBERT) {
          shininess = 0.0;
        } else if (mat.type === MaterialType.PHONG) {
          const pMat = mat as PhongMaterial;
          shininess = pMat.shininess || 32;
          specCol = pMat.specularColor ? pMat.specularColor.toArray() : [0, 0, 0, 0];
          if (pMat.diffuseMap) {
            activeTex = this._getWebGLTexture(pMat.diffuseMap);
            tOffset = [pMat.diffuseMap.offset.x, pMat.diffuseMap.offset.y];
            tRepeat = [pMat.diffuseMap.repeat.x, pMat.diffuseMap.repeat.y];
          }
        }

        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, activeTex);
        if (this._locs.diffuseMap) this.gl.uniform1i(this._locs.diffuseMap, 0);
        if (this._locs.texOffset) this.gl.uniform2fv(this._locs.texOffset, tOffset);
        if (this._locs.texRepeat) this.gl.uniform2fv(this._locs.texRepeat, tRepeat);
        if (this._locs.shininess) this.gl.uniform1f(this._locs.shininess, shininess);
        if (this._locs.specColor) this.gl.uniform4fv(this._locs.specColor, specCol);

        const drawMode = mat.type === MaterialType.WIREFRAME ? this.gl.LINES : this.gl.TRIANGLES;
        this.gl.drawElements(drawMode, m.count, this.gl.UNSIGNED_SHORT, 0);
      }

      // 3. IMMER in die Kinder absteigen
      if (o.children) {
        for (const child of o.children) drawNormal(child);
      }
    };
    for (const obj of scene.objects) drawNormal(obj);
  }
}

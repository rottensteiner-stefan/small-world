/// src/renderers/WebGL2Renderer.ts
import { AbstractWebGLRenderer } from "./AbstractWebGLRenderer.js";
import {
  AreaLight,
  CubeTexture,
  PhongMaterial,
  SkyboxMaterial,
  TerrainMaterial,
  Texture,
} from "../core/index.js";
import { GeometryDataInterface } from "../interfaces/index.js";
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
  // Terrain Uniforms
  isTerrain: WebGLUniformLocation | null;
  sandMap: WebGLUniformLocation | null;
  grassMap: WebGLUniformLocation | null;
  rockMap: WebGLUniformLocation | null;
  snowMap: WebGLUniformLocation | null;
  thresholds: WebGLUniformLocation | null;
}

export class WebGL2Renderer extends AbstractWebGLRenderer {
  public override readonly type = RendererType.WEB_GL2;
  declare protected gl: WebGL2RenderingContext;

  private _prog!: WebGLProgram;
  private _locs!: ShaderLocs;
  private _skyProg!: WebGLProgram;
  private _skyLocs!: {
    pos: number;
    vp: WebGLUniformLocation | null;
    model: WebGLUniformLocation | null;
    skybox: WebGLUniformLocation | null;
  };

  private _cache = new Map<GeometryDataInterface, Mesh>();
  private _texCache = new Map<Texture, WebGLTexture>();
  private _texCubeCache = new Map<CubeTexture, WebGLTexture>();

  private _pointLightLocs: { pos: WebGLUniformLocation | null; col: WebGLUniformLocation | null }[] =
    [];
  private _spotLightLocs: {
    col: WebGLUniformLocation | null;
    dir: WebGLUniformLocation | null;
    params: WebGLUniformLocation | null;
    pos: WebGLUniformLocation | null;
  }[] = [];
  private _areaLightLocs: {
    col: WebGLUniformLocation | null;
    normal: WebGLUniformLocation | null;
    pos: WebGLUniformLocation | null;
    right: WebGLUniformLocation | null;
    size: WebGLUniformLocation | null;
    up: WebGLUniformLocation | null;
  }[] = [];

  public async initialize(canvas: HTMLCanvasElement): Promise<void> {
    this.gl = canvas.getContext("webgl2", { antialias: true })!;
    this.initDefaultTextures();

    const vsCode = `#version 300 es
    in vec3 a_position; in vec3 a_normal; in vec2 a_uv;
    uniform mat4 u_vp; uniform mat4 u_model; uniform vec2 u_texOffset; uniform vec2 u_texRepeat;
    out vec3 v_worldPos; out vec3 v_normal; out vec2 v_uv;
    void main() {
      vec4 wp = u_model * vec4(a_position, 1.0);
      v_worldPos = wp.xyz; v_normal = mat3(u_model) * a_normal; v_uv = (a_uv * u_texRepeat) + u_texOffset;
      gl_Position = u_vp * wp;
    }`;

    const fsCode = `#version 300 es
    precision highp float;
    in vec3 v_worldPos; in vec3 v_normal; in vec2 v_uv;
    uniform vec4 u_color; uniform vec4 u_specColor; uniform float u_shininess; uniform vec3 u_viewPos;
    uniform vec3 u_ambientColor; uniform vec3 u_dirLightColor; uniform vec3 u_dirLightDir;
    uniform sampler2D u_diffuseMap;
    
    uniform int u_numPointLights; uniform vec3 u_pointLightPos[4]; uniform vec3 u_pointLightColor[4];
    uniform int u_numSpotLights; uniform vec3 u_spotLightPos[4]; uniform vec3 u_spotLightDir[4]; uniform vec3 u_spotLightColor[4]; uniform vec4 u_spotLightParams[4];
    
    uniform int u_numAreaLights;
    uniform vec3 u_areaLightPos[4];
    uniform vec3 u_areaLightColor[4];
    uniform vec3 u_areaLightRight[4];
    uniform vec3 u_areaLightUp[4];
    uniform vec3 u_areaLightNormal[4];
    uniform vec2 u_areaLightSize[4];

    // Terrain Splatmapping Uniforms
    uniform int u_isTerrain;
    uniform sampler2D u_sandMap;
    uniform sampler2D u_grassMap;
    uniform sampler2D u_rockMap;
    uniform sampler2D u_snowMap;
    uniform vec4 u_thresholds;

    out vec4 c;

    void main() {
      vec3 N = normalize(v_normal); 
      vec4 texColor = vec4(1.0);

      // TERRAIN SPLATMAPPING LOGIC
      if (u_isTerrain == 1) {
        vec4 sand = texture(u_sandMap, v_uv);
        vec4 grass = texture(u_grassMap, v_uv);
        vec4 rock = texture(u_rockMap, v_uv);
        vec4 snow = texture(u_snowMap, v_uv);

        float h = v_worldPos.y; 
        
        float b1 = smoothstep(u_thresholds.x - u_thresholds.w, u_thresholds.x + u_thresholds.w, h);
        float b2 = smoothstep(u_thresholds.y - u_thresholds.w, u_thresholds.y + u_thresholds.w, h);
        float b3 = smoothstep(u_thresholds.z - u_thresholds.w, u_thresholds.z + u_thresholds.w, h);

        texColor = mix(sand, grass, b1);
        texColor = mix(texColor, rock, b2);
        texColor = mix(texColor, snow, b3);

        // Klippen (Hangneigung)
        float slope = 1.0 - N.y;
        float slopeBlend = smoothstep(0.25, 0.45, slope);
        texColor = mix(texColor, rock, slopeBlend);

      } else {
        texColor = texture(u_diffuseMap, v_uv);
      }

      if (u_shininess < -0.5) { c = u_color * texColor; return; }
      
      vec3 V = normalize(u_viewPos - v_worldPos);
      vec3 finalLight = u_ambientColor; 
      vec3 specular = vec3(0.0);
      
      // Directional Light
      vec3 L_dir = normalize(u_dirLightDir); float diff_dir = max(dot(N, L_dir), 0.0);
      finalLight += diff_dir * u_dirLightColor;
      if (u_shininess > 0.0 && diff_dir > 0.0) specular += pow(max(dot(V, reflect(-L_dir, N)), 0.0), u_shininess) * u_dirLightColor;
      
      // Point Lights
      for(int i = 0; i < 4; i++) {
        if (i >= u_numPointLights) break;
        vec3 lightVec = u_pointLightPos[i] - v_worldPos; float dist = length(lightVec); vec3 L_pt = lightVec / dist;
        float attenuation = 1.0 / (1.0 + 0.1 * dist + 0.01 * dist * dist); float diff_pt = max(dot(N, L_pt), 0.0);
        finalLight += diff_pt * u_pointLightColor[i] * attenuation;
        if (u_shininess > 0.0 && diff_pt > 0.0) specular += pow(max(dot(V, reflect(-L_pt, N)), 0.0), u_shininess) * u_pointLightColor[i] * attenuation;
      }
      
      // Spot Lights
      for(int i = 0; i < 4; i++) {
        if (i >= u_numSpotLights) break;
        vec3 lightVec = u_spotLightPos[i] - v_worldPos; float dist = length(lightVec); vec3 L_sp = lightVec / dist;
        vec3 S_dir = normalize(u_spotLightDir[i]); float theta = dot(-L_sp, S_dir);
        if(theta > u_spotLightParams[i].x) {
            float spotEffect = smoothstep(u_spotLightParams[i].x, u_spotLightParams[i].y, theta);
            float attenuation = 1.0 / (1.0 + 0.1 * dist + 0.01 * dist * dist); float diff_sp = max(dot(N, L_sp), 0.0);
            finalLight += diff_sp * u_spotLightColor[i] * attenuation * spotEffect;
            if (u_shininess > 0.0 && diff_sp > 0.0) specular += pow(max(dot(V, reflect(-L_sp, N)), 0.0), u_shininess) * u_spotLightColor[i] * attenuation * spotEffect;
        }
      }

      // Area Lights
      for(int i = 0; i < 4; i++) {
        if (i >= u_numAreaLights) break;
        
        vec3 L_center = u_areaLightPos[i];
        vec3 L_normal = normalize(u_areaLightNormal[i]);
        vec3 dirFromLight = v_worldPos - L_center;
        
        if(dot(dirFromLight, L_normal) < 0.0) continue; 
        
        vec3 L_right = normalize(u_areaLightRight[i]);
        vec3 L_up = normalize(u_areaLightUp[i]);
        vec2 size = u_areaLightSize[i];

        float projX = clamp(dot(dirFromLight, L_right), -size.x, size.x);
        float projY = clamp(dot(dirFromLight, L_up), -size.y, size.y);

        vec3 closestPoint = L_center + L_right * projX + L_up * projY;
        
        vec3 lightVec = closestPoint - v_worldPos; 
        float dist = length(lightVec); 
        vec3 L_al = lightVec / (dist + 0.0001); 

        float attenuation = 1.0 / (1.0 + 0.1 * dist + 0.01 * dist * dist); 
        float diff_al = max(dot(N, L_al), 0.0);
        
        finalLight += diff_al * u_areaLightColor[i] * attenuation;
        if (u_shininess > 0.0 && diff_al > 0.0) {
            specular += pow(max(dot(V, reflect(-L_al, N)), 0.0), u_shininess) * u_areaLightColor[i] * attenuation;
        }
      }

      c = vec4((finalLight * u_color.rgb * texColor.rgb) + (specular * u_specColor.rgb), u_color.a * texColor.a);
    }`;

    const skyVsCode = `#version 300 es
    in vec3 a_position; uniform mat4 u_vp; uniform mat4 u_model; out vec3 v_uvw;
    void main() { v_uvw = a_position; gl_Position = u_vp * u_model * vec4(a_position, 1.0); }`;

    const skyFsCode = `#version 300 es
    precision highp float; in vec3 v_uvw; uniform samplerCube u_skybox; out vec4 c;
    void main() { c = texture(u_skybox, v_uvw); }`;

    this._prog = this.createShaderProgram(vsCode, fsCode);
    this._skyProg = this.createShaderProgram(skyVsCode, skyFsCode);

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
      // Terrain Locations
      isTerrain: this.gl.getUniformLocation(this._prog, "u_isTerrain"),
      sandMap: this.gl.getUniformLocation(this._prog, "u_sandMap"),
      grassMap: this.gl.getUniformLocation(this._prog, "u_grassMap"),
      rockMap: this.gl.getUniformLocation(this._prog, "u_rockMap"),
      snowMap: this.gl.getUniformLocation(this._prog, "u_snowMap"),
      thresholds: this.gl.getUniformLocation(this._prog, "u_thresholds"),
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
        normal: this.gl.getUniformLocation(this._prog, `u_areaLightNormal[${i}]`),
        size: this.gl.getUniformLocation(this._prog, `u_areaLightSize[${i}]`),
      });
    }
    this.gl.enable(this.gl.DEPTH_TEST);
  }

  private getWebGLTexture(tex: Texture): WebGLTexture {
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

  private getWebGLCubeTexture(tex: CubeTexture): WebGLTexture {
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
          tex.images[i] as ImageBitmap,
        );
      }
      this.gl.texParameteri(this.gl.TEXTURE_CUBE_MAP, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
      this.gl.texParameteri(this.gl.TEXTURE_CUBE_MAP, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
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

    const drawSkybox = (o: Object3D) => {
      if (!o.isVisible || !o.material) return;
      if (o.geometry && o.material.type === MaterialType.SKYBOX) {
        const skyMat = o.material as SkyboxMaterial;
        let m = this.cache.get(o.geometry);
        if (!m) {
          m = new Mesh(this.gl, o.geometry);
          this.cache.set(o.geometry, m);
        }
        m.bind(this.skyLocs.pos);
        if (this.skyLocs.model)
          this.gl.uniformMatrix4fv(this.skyLocs.model, false, o.worldMatrix.data);
        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(
          this.gl.TEXTURE_CUBE_MAP,
          skyMat.cubeMap ? this.getWebGLCubeTexture(skyMat.cubeMap) : this.defaultCubeTexture,
        );
        if (this.skyLocs.skybox) this.gl.uniform1i(this.skyLocs.skybox, 0);
        this.gl.drawElements(this.gl.TRIANGLES, m.count, this.gl.UNSIGNED_SHORT, 0);
      }
      if (o.children) for (const child of o.children) drawSkybox(child);
    };
    for (const obj of scene.objects) drawSkybox(obj);
    this.gl.depthMask(true);

    // --- PASS 2: Objects ---
    this.gl.useProgram(this.prog);
    if (this.locs.vp) this.gl.uniformMatrix4fv(this.locs.vp, false, vp);
    if (this.locs.viewPos) this.gl.uniform3f(this.locs.viewPos, camPos.x, camPos.y, camPos.z);

    const { aCol, dDir, dCol, pLights, sLights, aLights } = this.extractLights(scene);

    if (this.locs.ambient) this.gl.uniform3f(this.locs.ambient, aCol.r, aCol.g, aCol.b);
    if (this.locs.dirDir) this.gl.uniform3f(this.locs.dirDir, dDir.x, dDir.y, dDir.z);
    if (this.locs.dirColor) this.gl.uniform3f(this.locs.dirColor, dCol.r, dCol.g, dCol.b);

    // Point Lights
    if (this.locs.numPL) this.gl.uniform1i(this.locs.numPL, pLights.length);
    for (let i = 0; i < pLights.length; i++) {
      if (this.pointLightLocs[i].pos)
        this.gl.uniform3f(
          this.pointLightLocs[i].pos!,
          pLights[i].worldMatrix.data[12],
          pLights[i].worldMatrix.data[13],
          pLights[i].worldMatrix.data[14],
        );
      if (this.pointLightLocs[i].col)
        this.gl.uniform3f(
          this.pointLightLocs[i].col!,
          pLights[i].color.r * pLights[i].intensity,
          pLights[i].color.g * pLights[i].intensity,
          pLights[i].color.b * pLights[i].intensity,
        );
    }

    // Spot Lights
    if (this.locs.numSL) this.gl.uniform1i(this.locs.numSL, sLights.length);
    for (let i = 0; i < sLights.length; i++) {
      if (this.spotLightLocs[i].pos)
        this.gl.uniform3f(
          this.spotLightLocs[i].pos!,
          sLights[i].worldMatrix.data[12],
          sLights[i].worldMatrix.data[13],
          sLights[i].worldMatrix.data[14],
        );
      const dir = sLights[i].direction.clone().normalize();
      if (this.spotLightLocs[i].dir)
        this.gl.uniform3f(this.spotLightLocs[i].dir!, dir.x, dir.y, dir.z);
      if (this.spotLightLocs[i].col)
        this.gl.uniform3f(
          this.spotLightLocs[i].col!,
          sLights[i].color.r * sLights[i].intensity,
          sLights[i].color.g * sLights[i].intensity,
          sLights[i].color.b * sLights[i].intensity,
        );
      if (this.spotLightLocs[i].params)
        this.gl.uniform4f(
          this.spotLightLocs[i].params!,
          Math.cos(sLights[i].angle),
          Math.cos(sLights[i].angle * (1.0 - sLights[i].penumbra)),
          sLights[i].distance,
          sLights[i].decay,
        );
    }

    // Area Lights
    if (this.locs.numAL) this.gl.uniform1i(this.locs.numAL, aLights.length);
    for (let i = 0; i < aLights.length; i++) {
      const al = aLights[i] as AreaLight;
      const mat = al.worldMatrix.data;
      if (this._areaLightLocs[i].pos)
        this.gl.uniform3f(this._areaLightLocs[i].pos!, mat[12], mat[13], mat[14]);
      if (this._areaLightLocs[i].col)
        this.gl.uniform3f(
          this._areaLightLocs[i].col!,
          al.color.r * al.intensity,
          al.color.g * al.intensity,
          al.color.b * al.intensity,
        );
      if (this._areaLightLocs[i].right)
        this.gl.uniform3f(this._areaLightLocs[i].right!, mat[0], mat[1], mat[2]);
      if (this._areaLightLocs[i].up)
        this.gl.uniform3f(this._areaLightLocs[i].up!, mat[4], mat[5], mat[6]);
      if (this._areaLightLocs[i].normal)
        this.gl.uniform3f(this._areaLightLocs[i].normal!, mat[8], mat[9], mat[10]);
      if (this._areaLightLocs[i].size)
        this.gl.uniform2f(this._areaLightLocs[i].size!, al.width / 2.0, al.height / 2.0);
    }

    const drawNormal = (o: Object3D) => {
      // 1. Ist das Objekt (und damit alles, was an ihm hängt) unsichtbar? -> Abbruch
      if (!o.isVisible) return;

      // 2. Nur zeichnen, wenn das Objekt Geometrie und Material hat UND keine Skybox ist
      if (o.geometry && o.material && o.material.type !== MaterialType.SKYBOX) {
        const mat = o.material;
        let m = this.cache.get(o.geometry);
        if (!m) {
          m = new Mesh(this.gl, o.geometry);
          this.cache.set(o.geometry, m);
        }
        m.bind(this.locs.pos, this.locs.norm, this.locs.uv);

        if (this.locs.model) this.gl.uniformMatrix4fv(this.locs.model, false, o.worldMatrix.data);
        if (this.locs.color) this.gl.uniform4fv(this.locs.color, mat.color.toArray());

        let shininess = -1.0,
          specCol = [0, 0, 0, 0],
          activeTex = this.defaultTexture,
          tOffset = [0, 0],
          tRepeat = [1, 1];
        let isTerrain = 0,
          thresholds = [0, 0, 0, 0];

        if (mat.type === MaterialType.LAMBERT) {
          shininess = 0.0;
        } else if (mat.type === MaterialType.PHONG) {
          const pMat = mat as PhongMaterial;
          shininess = pMat.shininess || 32;
          specCol = pMat.specularColor ? pMat.specularColor.toArray() : [0, 0, 0, 0];
          if (pMat.diffuseMap) {
            activeTex = this.getWebGLTexture(pMat.diffuseMap);
            tOffset = [pMat.diffuseMap.offset.x, pMat.diffuseMap.offset.y];
            tRepeat = [pMat.diffuseMap.repeat.x, pMat.diffuseMap.repeat.y];
          }
        } else if (mat.type === MaterialType.TERRAIN) {
          isTerrain = 1;
          const tMat = mat as TerrainMaterial;
          shininess = tMat.shininess;
          tRepeat = tMat.texRepeat;
          thresholds = tMat.thresholds;

          this.gl.activeTexture(this.gl.TEXTURE1);
          this.gl.bindTexture(
            this.gl.TEXTURE_2D,
            tMat.sandMap ? this.getWebGLTexture(tMat.sandMap) : this.defaultTexture,
          );
          if (this.locs.sandMap) this.gl.uniform1i(this.locs.sandMap, 1);

          this.gl.activeTexture(this.gl.TEXTURE2);
          this.gl.bindTexture(
            this.gl.TEXTURE_2D,
            tMat.grassMap ? this.getWebGLTexture(tMat.grassMap) : this.defaultTexture,
          );
          if (this.locs.grassMap) this.gl.uniform1i(this.locs.grassMap, 2);

          this.gl.activeTexture(this.gl.TEXTURE3);
          this.gl.bindTexture(
            this.gl.TEXTURE_2D,
            tMat.rockMap ? this.getWebGLTexture(tMat.rockMap) : this.defaultTexture,
          );
          if (this.locs.rockMap) this.gl.uniform1i(this.locs.rockMap, 3);

          this.gl.activeTexture(this.gl.TEXTURE4);
          this.gl.bindTexture(
            this.gl.TEXTURE_2D,
            tMat.snowMap ? this.getWebGLTexture(tMat.snowMap) : this.defaultTexture,
          );
          if (this.locs.snowMap) this.gl.uniform1i(this.locs.snowMap, 4);
        }

        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, activeTex);
        if (this.locs.diffuseMap) this.gl.uniform1i(this.locs.diffuseMap, 0);

        if (this.locs.texOffset) this.gl.uniform2fv(this.locs.texOffset, tOffset);
        if (this.locs.texRepeat) this.gl.uniform2fv(this.locs.texRepeat, tRepeat);
        if (this.locs.shininess) this.gl.uniform1f(this.locs.shininess, shininess);
        if (this.locs.specColor) this.gl.uniform4fv(this.locs.specColor, specCol);
        if (this.locs.isTerrain) this.gl.uniform1i(this.locs.isTerrain, isTerrain);
        if (this.locs.thresholds) this.gl.uniform4fv(this.locs.thresholds, thresholds);

        const drawMode = mat.type === MaterialType.WIREFRAME ? this.gl.LINES : this.gl.TRIANGLES;
        this.gl.drawElements(drawMode, m.count, this.gl.UNSIGNED_INT, 0); // Achtung: UNSIGNED_INT für Terrain-Größe!
      }

      // 3. IMMER in die Kinder absteigen, sofern der Parent sichtbar ist!
      if (o.children) {
        for (const child of o.children) {
          drawNormal(child);
        }
      }
    };

    for (const obj of scene.objects) drawNormal(obj);
  }
}

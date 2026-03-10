import { IRenderer } from "../interfaces/IRenderer.js";
import { Mesh } from "./Mesh.js";
import { Color } from "../core/colors/Color.js";
import { DirectionalLight } from "../core/lights/DirectionalLight.js";
import { AmbientLight } from "../core/lights/AmbientLight.js";
import { PointLight } from "../core/lights/PointLight.js";
import { SpotLight } from "../core/lights/SpotLight.js";
import { Vector3D } from "../math/Vector3D.js";
import { Scene } from "../core/Scene.js";
import { IGeometryData } from "../interfaces/IGeometryData.js";
import { Object3D } from "../core/Object3D.js";
import { PhongMaterial } from "../core/materials/PhongMaterial";

interface ShaderLocs {
  pos: number;
  norm: number;
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
}
interface PointLightLocs {
  pos: WebGLUniformLocation | null;
  col: WebGLUniformLocation | null;
}
interface SpotLightLocs {
  pos: WebGLUniformLocation | null;
  dir: WebGLUniformLocation | null;
  col: WebGLUniformLocation | null;
  params: WebGLUniformLocation | null;
}

export class WebGL2Renderer implements IRenderer {
  private gl!: WebGL2RenderingContext;
  private prog!: WebGLProgram;
  private cache = new Map<IGeometryData, Mesh>();
  private locs!: ShaderLocs;
  private pointLightLocs: PointLightLocs[] = [];
  private spotLightLocs: SpotLightLocs[] = [];

  public async initialize(canvas: HTMLCanvasElement) {
    this.gl = canvas.getContext("webgl2", { antialias: true })!;

    const vsCode = `#version 300 es
    in vec3 a_position; in vec3 a_normal;
    uniform mat4 u_vp; uniform mat4 u_model;
    out vec3 v_worldPos; out vec3 v_normal;
    void main() {
      vec4 wp = u_model * vec4(a_position, 1.0);
      v_worldPos = wp.xyz; v_normal = mat3(u_model) * a_normal;
      gl_Position = u_vp * wp;
    }`;

    const fsCode = `#version 300 es
    precision highp float;
    in vec3 v_worldPos; in vec3 v_normal;
    uniform vec4 u_color; uniform vec4 u_specColor; uniform float u_shininess; uniform vec3 u_viewPos;
    uniform vec3 u_ambientColor; uniform vec3 u_dirLightColor; uniform vec3 u_dirLightDir;
    
    uniform int u_numPointLights; uniform vec3 u_pointLightPos[4]; uniform vec3 u_pointLightColor[4];
    
    uniform int u_numSpotLights;
    uniform vec3 u_spotLightPos[4];
    uniform vec3 u_spotLightDir[4];
    uniform vec3 u_spotLightColor[4];
    uniform vec4 u_spotLightParams[4]; // x: cosOuter, y: cosInner, z: dist, w: decay

    out vec4 c;

    void main() {
      if (u_shininess < -0.5) { c = u_color; return; }
      vec3 N = normalize(v_normal); vec3 V = normalize(u_viewPos - v_worldPos);
      vec3 finalLight = u_ambientColor; vec3 specular = vec3(0.0);

      // Directional
      vec3 L_dir = normalize(u_dirLightDir);
      float diff_dir = max(dot(N, L_dir), 0.0);
      finalLight += diff_dir * u_dirLightColor;
      if (u_shininess > 0.0 && diff_dir > 0.0) specular += pow(max(dot(V, reflect(-L_dir, N)), 0.0), u_shininess) * u_dirLightColor;

      // Point Lights
      for(int i = 0; i < 4; i++) {
        if (i >= u_numPointLights) break;
        vec3 lightVec = u_pointLightPos[i] - v_worldPos;
        float dist = length(lightVec); vec3 L_pt = lightVec / dist;
        float attenuation = 1.0 / (1.0 + 0.1 * dist + 0.01 * dist * dist);
        float diff_pt = max(dot(N, L_pt), 0.0);
        finalLight += diff_pt * u_pointLightColor[i] * attenuation;
        if (u_shininess > 0.0 && diff_pt > 0.0) specular += pow(max(dot(V, reflect(-L_pt, N)), 0.0), u_shininess) * u_pointLightColor[i] * attenuation;
      }

      // Spot Lights
      for(int i = 0; i < 4; i++) {
        if (i >= u_numSpotLights) break;
        vec3 lightVec = u_spotLightPos[i] - v_worldPos;
        float dist = length(lightVec); vec3 L_sp = lightVec / dist;
        vec3 S_dir = normalize(u_spotLightDir[i]);
        
        float theta = dot(-L_sp, S_dir);
        float cosOuter = u_spotLightParams[i].x;
        float cosInner = u_spotLightParams[i].y;
        
        if(theta > cosOuter) {
            float spotEffect = smoothstep(cosOuter, cosInner, theta);
            float attenuation = 1.0 / (1.0 + 0.1 * dist + 0.01 * dist * dist);
            float diff_sp = max(dot(N, L_sp), 0.0);
            
            finalLight += diff_sp * u_spotLightColor[i] * attenuation * spotEffect;
            if (u_shininess > 0.0 && diff_sp > 0.0) {
                specular += pow(max(dot(V, reflect(-L_sp, N)), 0.0), u_shininess) * u_spotLightColor[i] * attenuation * spotEffect;
            }
        }
      }

      c = vec4((finalLight * u_color.rgb) + (specular * u_specColor.rgb), u_color.a);
    }`;

    const vs = this.gl.createShader(this.gl.VERTEX_SHADER)!;
    this.gl.shaderSource(vs, vsCode);
    this.gl.compileShader(vs);
    const fs = this.gl.createShader(this.gl.FRAGMENT_SHADER)!;
    this.gl.shaderSource(fs, fsCode);
    this.gl.compileShader(fs);
    this.prog = this.gl.createProgram()!;
    this.gl.attachShader(this.prog, vs);
    this.gl.attachShader(this.prog, fs);
    this.gl.linkProgram(this.prog);

    this.locs = {
      pos: this.gl.getAttribLocation(this.prog, "a_position"),
      norm: this.gl.getAttribLocation(this.prog, "a_normal"),
      vp: this.gl.getUniformLocation(this.prog, "u_vp"),
      model: this.gl.getUniformLocation(this.prog, "u_model"),
      color: this.gl.getUniformLocation(this.prog, "u_color"),
      specColor: this.gl.getUniformLocation(this.prog, "u_specColor"),
      ambient: this.gl.getUniformLocation(this.prog, "u_ambientColor"),
      dirColor: this.gl.getUniformLocation(this.prog, "u_dirLightColor"),
      dirDir: this.gl.getUniformLocation(this.prog, "u_dirLightDir"),
      shininess: this.gl.getUniformLocation(this.prog, "u_shininess"),
      viewPos: this.gl.getUniformLocation(this.prog, "u_viewPos"),
      numPL: this.gl.getUniformLocation(this.prog, "u_numPointLights"),
      numSL: this.gl.getUniformLocation(this.prog, "u_numSpotLights"),
    };

    for (let i = 0; i < 4; i++) {
      this.pointLightLocs.push({
        pos: this.gl.getUniformLocation(this.prog, `u_pointLightPos[${i}]`),
        col: this.gl.getUniformLocation(this.prog, `u_pointLightColor[${i}]`),
      });
      this.spotLightLocs.push({
        pos: this.gl.getUniformLocation(this.prog, `u_spotLightPos[${i}]`),
        dir: this.gl.getUniformLocation(this.prog, `u_spotLightDir[${i}]`),
        col: this.gl.getUniformLocation(this.prog, `u_spotLightColor[${i}]`),
        params: this.gl.getUniformLocation(this.prog, `u_spotLightParams[${i}]`),
      });
    }
    this.gl.enable(this.gl.DEPTH_TEST);
  }

  public setClearColor(color: Color): void {
    this.gl.clearColor(color.r, color.g, color.b, color.a);
  }

  public render(scene: Scene, vp: Float32Array, camPos: Vector3D = new Vector3D()) {
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
    this.gl.useProgram(this.prog);
    if (this.locs.vp) this.gl.uniformMatrix4fv(this.locs.vp, false, vp);
    if (this.locs.viewPos) this.gl.uniform3f(this.locs.viewPos, camPos.x, camPos.y, camPos.z);

    let aCol = new Color(0, 0, 0),
      dDir = new Vector3D(0, 1, 0),
      dCol = new Color(0, 0, 0);
    const pLights: PointLight[] = [];
    const sLights: SpotLight[] = [];

    const extractLights = (node: Object3D) => {
      if (node instanceof AmbientLight)
        aCol = new Color(
          node.color.r * node.intensity,
          node.color.g * node.intensity,
          node.color.b * node.intensity,
        );
      else if (node instanceof DirectionalLight) {
        dDir = node.direction.clone().scale(-1);
        if (dDir.length() > 0) dDir.scale(1 / dDir.length());
        dCol = new Color(
          node.color.r * node.intensity,
          node.color.g * node.intensity,
          node.color.b * node.intensity,
        );
      } else if (node instanceof PointLight && pLights.length < 4) pLights.push(node);
      else if (node instanceof SpotLight && sLights.length < 4) sLights.push(node);
      if (node.children) node.children.forEach(extractLights);
    };
    for (const obj of scene.objects) extractLights(obj);

    if (this.locs.ambient) this.gl.uniform3f(this.locs.ambient, aCol.r, aCol.g, aCol.b);
    if (this.locs.dirDir) this.gl.uniform3f(this.locs.dirDir, dDir.x, dDir.y, dDir.z);
    if (this.locs.dirColor) this.gl.uniform3f(this.locs.dirColor, dCol.r, dCol.g, dCol.b);

    if (this.locs.numPL) this.gl.uniform1i(this.locs.numPL, pLights.length);
    for (let i = 0; i < pLights.length; i++) {
      const pl = pLights[i];
      if (this.pointLightLocs[i].pos)
        this.gl.uniform3f(
          this.pointLightLocs[i].pos!,
          pl.worldMatrix.data[12],
          pl.worldMatrix.data[13],
          pl.worldMatrix.data[14],
        );
      if (this.pointLightLocs[i].col)
        this.gl.uniform3f(
          this.pointLightLocs[i].col!,
          pl.color.r * pl.intensity,
          pl.color.g * pl.intensity,
          pl.color.b * pl.intensity,
        );
    }

    if (this.locs.numSL) this.gl.uniform1i(this.locs.numSL, sLights.length);
    for (let i = 0; i < sLights.length; i++) {
      const sl = sLights[i];
      if (this.spotLightLocs[i].pos)
        this.gl.uniform3f(
          this.spotLightLocs[i].pos!,
          sl.worldMatrix.data[12],
          sl.worldMatrix.data[13],
          sl.worldMatrix.data[14],
        );

      const dir = sl.direction.clone();
      if (dir.length() > 0) dir.scale(1 / dir.length());
      if (this.spotLightLocs[i].dir)
        this.gl.uniform3f(this.spotLightLocs[i].dir!, dir.x, dir.y, dir.z);

      if (this.spotLightLocs[i].col)
        this.gl.uniform3f(
          this.spotLightLocs[i].col!,
          sl.color.r * sl.intensity,
          sl.color.g * sl.intensity,
          sl.color.b * sl.intensity,
        );

      if (this.spotLightLocs[i].params) {
        this.gl.uniform4f(
          this.spotLightLocs[i].params!,
          Math.cos(sl.angle),
          Math.cos(sl.angle * (1.0 - sl.penumbra)),
          sl.distance,
          sl.decay,
        );
      }
    }

    for (const o of scene.objects) {
      if (o.isVisible === false || !o.material || !o.geometry) continue;
      let m = this.cache.get(o.geometry);
      if (!m) {
        m = new Mesh(this.gl, o.geometry);
        this.cache.set(o.geometry, m);
      }
      m.bind(this.locs.pos, this.locs.norm);

      if (this.locs.model) this.gl.uniformMatrix4fv(this.locs.model, false, o.worldMatrix.data);
      if (this.locs.color) this.gl.uniform4fv(this.locs.color, o.material.color.toArray());

      let shininess = -1.0;
      let specCol = [0, 0, 0, 0];
      if (o.material.type === "LambertMaterial") shininess = 0.0;
      else if (o.material.type === "PhongMaterial") {
        const material = o.material as PhongMaterial;
        shininess = material.shininess || 32;
        specCol = material.specularColor ? material.specularColor.toArray() : [0, 0, 0, 0];
      }

      if (this.locs.shininess) this.gl.uniform1f(this.locs.shininess, shininess);
      if (this.locs.specColor) this.gl.uniform4fv(this.locs.specColor, specCol);

      const drawMode = o.material.type === "WireframeMaterial" ? this.gl.LINES : this.gl.TRIANGLES;
      this.gl.drawElements(drawMode, m.count, this.gl.UNSIGNED_SHORT, 0);
    }
  }
  public setSize(w: number, h: number) {
    this.gl.canvas.width = w * devicePixelRatio;
    this.gl.canvas.height = h * devicePixelRatio;
    this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
  }
}

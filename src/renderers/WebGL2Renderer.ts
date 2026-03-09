import { IRenderer } from "../interfaces/IRenderer.js";
import { Mesh } from "./Mesh.js";
import { Color } from "../core/colors/Color.js";
import { DirectionalLight } from "../core/lights/DirectionalLight.js";
import { AmbientLight } from "../core/lights/AmbientLight.js";
import { PointLight } from "../core/lights/PointLight.js";
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
}

interface PointLightLocs {
  pos: WebGLUniformLocation | null;
  col: WebGLUniformLocation | null;
}

export class WebGL2Renderer implements IRenderer {
  private gl!: WebGL2RenderingContext;
  private prog!: WebGLProgram;
  private cache = new Map<IGeometryData, Mesh>();
  private locs!: ShaderLocs;
  private pointLightLocs: PointLightLocs[] = [];

  public async initialize(canvas: HTMLCanvasElement) {
    this.gl = canvas.getContext("webgl2", { antialias: true })!;

    const vsCode = `#version 300 es
    in vec3 a_position; in vec3 a_normal;
    uniform mat4 u_vp; uniform mat4 u_model;
    out vec3 v_worldPos; out vec3 v_normal;
    void main() {
      vec4 wp = u_model * vec4(a_position, 1.0);
      v_worldPos = wp.xyz;
      v_normal = mat3(u_model) * a_normal;
      gl_Position = u_vp * wp;
    }`;

    const fsCode = `#version 300 es
    precision highp float;
    in vec3 v_worldPos; in vec3 v_normal;

    uniform vec4 u_color; uniform vec4 u_specColor;
    uniform float u_shininess; uniform vec3 u_viewPos;

    uniform vec3 u_ambientColor;
    uniform vec3 u_dirLightColor; uniform vec3 u_dirLightDir;

    uniform int u_numPointLights;
    uniform vec3 u_pointLightPos[4];
    uniform vec3 u_pointLightColor[4];

    out vec4 c;

    void main() {
      if (u_shininess < -0.5) { c = u_color; return; }

      vec3 N = normalize(v_normal);
      vec3 V = normalize(u_viewPos - v_worldPos);

      // 1. Ambient
      vec3 finalLight = u_ambientColor;

      // 2. Directional Light
      vec3 L_dir = normalize(u_dirLightDir);
      float diff_dir = max(dot(N, L_dir), 0.0);
      finalLight += diff_dir * u_dirLightColor;

      vec3 specular = vec3(0.0);
      if (u_shininess > 0.0 && diff_dir > 0.0) {
        vec3 R_dir = reflect(-L_dir, N);
        specular += pow(max(dot(V, R_dir), 0.0), u_shininess) * u_dirLightColor;
      }

      // 3. Point Lights
      for(int i = 0; i < 4; i++) {
        if (i >= u_numPointLights) break;

        vec3 lightVec = u_pointLightPos[i] - v_worldPos;
        float dist = length(lightVec);
        vec3 L_pt = lightVec / dist;

        // Simpler, aber schöner Lichtabfall (Attenuation)
        float attenuation = 1.0 / (1.0 + 0.1 * dist + 0.01 * dist * dist);

        float diff_pt = max(dot(N, L_pt), 0.0);
        finalLight += diff_pt * u_pointLightColor[i] * attenuation;

        if (u_shininess > 0.0 && diff_pt > 0.0) {
          vec3 R_pt = reflect(-L_pt, N);
          specular += pow(max(dot(V, R_pt), 0.0), u_shininess) * u_pointLightColor[i] * attenuation;
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
    };

    for (let i = 0; i < 4; i++) {
      this.pointLightLocs.push({
        pos: this.gl.getUniformLocation(this.prog, `u_pointLightPos[${i}]`),
        col: this.gl.getUniformLocation(this.prog, `u_pointLightColor[${i}]`),
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

    for (const obj of scene.objects) {
      if (obj instanceof AmbientLight)
        aCol = new Color(
          obj.color.r * obj.intensity,
          obj.color.g * obj.intensity,
          obj.color.b * obj.intensity,
        );
      else if (obj instanceof DirectionalLight) {
        dDir = obj.direction.clone().scale(-1);
        const len = dDir.length();
        if (len > 0) dDir.scale(1 / len);
        dCol = new Color(
          obj.color.r * obj.intensity,
          obj.color.g * obj.intensity,
          obj.color.b * obj.intensity,
        );
      }

      const findPointLights = (node: Object3D) => {
        if (node instanceof PointLight && pLights.length < 4) pLights.push(node);
        if (node.children) node.children.forEach(findPointLights);
      };
      findPointLights(obj);
    }

    if (this.locs.ambient) this.gl.uniform3f(this.locs.ambient, aCol.r, aCol.g, aCol.b);
    if (this.locs.dirDir) this.gl.uniform3f(this.locs.dirDir, dDir.x, dDir.y, dDir.z);
    if (this.locs.dirColor) this.gl.uniform3f(this.locs.dirColor, dCol.r, dCol.g, dCol.b);

    if (this.locs.numPL) this.gl.uniform1i(this.locs.numPL, pLights.length);
    for (let i = 0; i < pLights.length; i++) {
      const pl = pLights[i];
      const wPos = new Vector3D().set(
        pl.worldMatrix.data[12],
        pl.worldMatrix.data[13],
        pl.worldMatrix.data[14],
      );
      if (this.pointLightLocs[i].pos)
        this.gl.uniform3f(this.pointLightLocs[i].pos!, wPos.x, wPos.y, wPos.z);
      if (this.pointLightLocs[i].col)
        this.gl.uniform3f(
          this.pointLightLocs[i].col!,
          pl.color.r * pl.intensity,
          pl.color.g * pl.intensity,
          pl.color.b * pl.intensity,
        );
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
        // Sicherer Zugriff auf child-spezifische Properties
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

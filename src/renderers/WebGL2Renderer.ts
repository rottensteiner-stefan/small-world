import { IRenderer } from "../interfaces/IRenderer.js";
import { Mesh } from "./Mesh.js";
import { Color } from "../core/Color.js";
import { DirectionalLight } from "../core/DirectionalLight.js";
import { Vector3D } from "../math/Vector3D.js";

export class WebGL2Renderer implements IRenderer {
  private gl!: WebGL2RenderingContext;
  private prog!: WebGLProgram;
  private cache = new Map<any, Mesh>();
  private locs: any = {};

  public async initialize(canvas: HTMLCanvasElement) {
    this.gl = canvas.getContext("webgl2", { antialias: true })!;

    const vsCode = `#version 300 es
    in vec3 a_position; in vec3 a_normal;
    uniform mat4 u_vp; uniform mat4 u_model;
    out vec3 v_worldPos; out vec3 v_normal;
    void main() {
      vec4 wp = u_model * vec4(a_position, 1.0);
      v_worldPos = wp.xyz;
      // Einfache Normalenmatrix (funktioniert für gleichmäßige Skalierung)
      v_normal = mat3(u_model) * a_normal;
      gl_Position = u_vp * wp;
    }`;

    const fsCode = `#version 300 es
    precision highp float;
    in vec3 v_worldPos; in vec3 v_normal;
    uniform vec4 u_color; uniform vec4 u_specColor; uniform vec4 u_lightColor;
    uniform vec3 u_lightDir; uniform float u_shininess; uniform vec3 u_viewPos;
    out vec4 c;
    void main() {
      // Unlit (Basic/Wireframe)
      if (u_shininess < -0.5) { c = u_color; return; }

      vec3 N = normalize(v_normal);
      vec3 L = normalize(u_lightDir);
      vec3 V = normalize(u_viewPos - v_worldPos);
      vec3 R = reflect(-L, N);

      // Umgebungslicht (Ambient)
      vec3 ambient = u_color.rgb * 0.15;

      // Diffuses Licht (Lambert)
      float diff = max(dot(N, L), 0.0);
      vec3 diffuse = diff * u_color.rgb * u_lightColor.rgb;

      // Glanzlicht (Phong)
      vec3 specular = vec3(0.0);
      if (u_shininess > 0.0 && diff > 0.0) {
        float spec = pow(max(dot(V, R), 0.0), u_shininess);
        specular = spec * u_specColor.rgb * u_lightColor.rgb;
      }

      c = vec4(ambient + diffuse + specular, u_color.a);
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
      lightColor: this.gl.getUniformLocation(this.prog, "u_lightColor"),
      lightDir: this.gl.getUniformLocation(this.prog, "u_lightDir"),
      shininess: this.gl.getUniformLocation(this.prog, "u_shininess"),
      viewPos: this.gl.getUniformLocation(this.prog, "u_viewPos"),
    };
    this.gl.enable(this.gl.DEPTH_TEST);
  }
  public setClearColor(color: Color): void {
    this.gl.clearColor(color.r, color.g, color.b, color.a);
  }

  public render(scene: any, vp: Float32Array, camPos: Vector3D = new Vector3D()) {
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
    this.gl.useProgram(this.prog);
    this.gl.uniformMatrix4fv(this.locs.vp, false, vp);
    this.gl.uniform3f(this.locs.viewPos, camPos.x, camPos.y, camPos.z);

    // Licht suchen
    let lDir = new Vector3D(0, 1, 0),
      lCol = new Color(1, 1, 1, 1);
    for (const obj of scene.objects) {
      if (obj instanceof DirectionalLight) {
        lDir = obj.direction.clone().scale(-1); // Vektor zeigt ZUM Licht
        const len = lDir.length();
        if (len > 0) lDir.scale(1 / len);
        lCol = new Color(
          obj.color.r * obj.intensity,
          obj.color.g * obj.intensity,
          obj.color.b * obj.intensity,
          1,
        );
        break;
      }
    }
    this.gl.uniform3f(this.locs.lightDir, lDir.x, lDir.y, lDir.z);
    this.gl.uniform4fv(this.locs.lightColor, lCol.toArray());

    for (const o of scene.objects) {
      if (o.isVisible === false || !o.material) continue;

      let m = this.cache.get(o.geometry);
      if (!m) {
        m = new Mesh(this.gl, o.geometry);
        this.cache.set(o.geometry, m);
      }
      m.bind(this.locs.pos, this.locs.norm);

      this.gl.uniformMatrix4fv(this.locs.model, false, o.worldMatrix.data);
      this.gl.uniform4fv(this.locs.color, o.material.color.toArray());

      let shininess = -1.0;
      let specCol = [0, 0, 0, 0];
      if (o.material.type === "LambertMaterial") shininess = 0.0;
      else if (o.material.type === "PhongMaterial") {
        shininess = o.material.shininess;
        specCol = o.material.specularColor.toArray();
      }

      this.gl.uniform1f(this.locs.shininess, shininess);
      this.gl.uniform4fv(this.locs.specColor, specCol);

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

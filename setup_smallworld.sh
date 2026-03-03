# 1. Verzeichnisstruktur erstellen
mkdir -p config src/core src/interfaces src/math/projections src/geometry src/renderers/shaders examples

# 2. Projekt-Metadaten & Konfiguration
cat <<EOF > config/small-world.json
{
  "rendererType": "BEST",
  "canvasId": "viewport",
  "debug": true
}
EOF

cat <<EOF > package.json
{
  "name": "smallworld-engine",
  "version": "0.8.12",
  "type": "module",
  "scripts": {
    "build": "tsc",
    "start": "npm run build && npx serve ."
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "serve": "^14.0.0",
    "@webgpu/types": "^0.1.40"
  }
}
EOF

cat <<EOF > tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022", "module": "ESNext", "moduleResolution": "node",
    "outDir": "./dist", "rootDir": "./", "strict": true, "sourceMap": true,
    "esModuleInterop": true, "types": ["@webgpu/types"]
  },
  "include": ["src/**/*", "examples/**/*"]
}
EOF

cat <<EOF > index.html
<!DOCTYPE html><html><head><title>SmallWorld Beta v0.8.12</title>
<style>body{margin:0;background:#000;overflow:hidden}canvas{width:100vw;height:100vh;display:block}</style></head>
<body><canvas id="viewport"></canvas><script type="module" src="./dist/examples/cube-demo.js"></script></body></html>
EOF

# 3. Interfaces
cat <<EOF > src/interfaces/RendererTypes.ts
export enum RendererType { WEBGL1 = "WEBGL1", WEBGL2 = "WEBGL2", WEBGPU = "WEBGPU", BEST = "BEST" }
EOF

cat <<EOF > src/interfaces/IRenderer.ts
import { Scene } from '../core/Scene.js';
export interface IRenderer {
    initialize(canvas: HTMLCanvasElement): Promise<void>;
    render(scene: Scene, vpMatrix: Float32Array): void;
    setSize(width: number, height: number): void;
}
EOF

cat <<EOF > src/interfaces/IGeometry.ts
export interface GeometryData { vertices: Float32Array; indices: Uint16Array; }
EOF

# 4. Mathematik & Projections
cat <<EOF > src/math/MathUtils.ts
export class MathUtils {
    private static SIN_TABLE = new Float32Array(3600);
    private static COS_TABLE = new Float32Array(3600);
    private static isInit = false;
    public static init() {
        if (this.isInit) return;
        for (let i = 0; i < 3600; i++) {
            const rad = (i / 10) * (Math.PI / 180);
            this.SIN_TABLE[i] = Math.sin(rad); this.COS_TABLE[i] = Math.cos(rad);
        }
        this.isInit = true;
    }
    public static fastSin(rad: number): number {
        let deg = (rad * 572.957) | 0; deg = ((deg % 3600) + 3600) % 3600;
        return this.SIN_TABLE[deg];
    }
}
EOF

cat <<EOF > src/math/Matrix4.ts
export class Matrix4 {
    public data: Float32Array = new Float32Array(16);
    constructor() { this.identity(); }
    public identity(): Matrix4 {
        const d = this.data; d.fill(0); d[0] = 1; d[5] = 1; d[10] = 1; d[15] = 1; return this;
    }
    public static orthographic(l: number, r: number, b: number, t: number, n: number, f: number, out: Matrix4): void {
        const d = out.data; d.fill(0);
        d[0] = 2 / (r - l); d[5] = 2 / (t - b); d[10] = -2 / (f - n);
        d[12] = -(r + l) / (r - l); d[13] = -(t + b) / (t - b); d[14] = -(f + n) / (f - n); d[15] = 1;
    }
    public static multiply(a: Matrix4, b: Matrix4, out: Matrix4): void {
        const ae = a.data, be = b.data, te = out.data;
        const a00 = ae[0], a01 = ae[1], a02 = ae[2], a03 = ae[3],
              a10 = ae[4], a11 = ae[5], a12 = ae[6], a13 = ae[7],
              a20 = ae[8], a21 = ae[9], a22 = ae[10], a23 = ae[11],
              a30 = ae[12], a31 = ae[13], a32 = ae[14], a33 = ae[15];
        for (let i = 0; i < 4; i++) {
            const b0 = be[i*4], b1 = be[i*4+1], b2 = be[i*4+2], b3 = be[i*4+3];
            te[i*4]   = b0*a00 + b1*a10 + b2*a20 + b3*a30;
            te[i*4+1] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
            te[i*4+2] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
            te[i*4+3] = b0*a03 + b1*a13 + b2*a23 + b3*a33;
        }
    }
    public static translate(x: number, y: number, z: number, out: Matrix4): void {
        out.identity(); out.data[12] = x; out.data[13] = y; out.data[14] = z;
    }
    public static scale(x: number, y: number, z: number, out: Matrix4): void {
        out.identity(); out.data[0] = x; out.data[5] = y; out.data[10] = z;
    }
    public static rotateX(r: number, out: Matrix4): void {
        const s = Math.sin(r), c = Math.cos(r); out.identity();
        out.data[5] = c; out.data[6] = s; out.data[9] = -s; out.data[10] = c;
    }
    public static rotateY(r: number, out: Matrix4): void {
        const s = Math.sin(r), c = Math.cos(r); out.identity();
        out.data[0] = c; out.data[2] = -s; out.data[8] = s; out.data[10] = c;
    }
    public static rotateZ(r: number, out: Matrix4): void {
        const s = Math.sin(r), c = Math.cos(r); out.identity();
        out.data[0] = c; out.data[1] = s; out.data[4] = -s; out.data[5] = c;
    }
    public static perspective(fov: number, aspect: number, near: number, far: number, out: Matrix4): void {
        const f = 1.0 / Math.tan(fov / 2), rInv = 1.0 / (near - far);
        const d = out.data; d.fill(0); d[0] = f / aspect; d[5] = f; d[10] = (near + far) * rInv; d[11] = -1; d[14] = (2 * near * far) * rInv;
    }
    public static lookAt(eye: number[], target: number[], up: number[], out: Matrix4): void {
        const d = out.data;
        const sub = (a:any, b:any) => [a[0]-b[0], a[1]-b[1], a[2]-b[2]];
        const dot = (a:any, b:any) => a[0]*b[0] + a[1]*b[1] + a[2]*b[2];
        const cross = (a:any, b:any) => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
        const norm = (a:any) => { const l=Math.sqrt(a[0]*a[0]+a[1]*a[1]+a[2]*a[2]); return l>0?[a[0]/l,a[1]/l,a[2]/l]:[0,0,0]; };
        const z = norm(sub(eye, target)), x = norm(cross(up, z)), y = cross(z, x);
        d[0]=x[0]; d[4]=x[1]; d[8]=x[2]; d[12]=-dot(x, eye);
        d[1]=y[0]; d[5]=y[1]; d[9]=y[2]; d[13]=-dot(y, eye);
        d[2]=z[0]; d[6]=z[1]; d[10]=z[2]; d[14]=-dot(z, eye); d[15]=1;
    }
}
EOF

cat <<EOF > src/math/projections/Projection.ts
import { Matrix4 } from '../Matrix4.js';
export abstract class Projection {
    protected matrix: Matrix4 = new Matrix4();
    public abstract getMatrix(): Matrix4;
    public abstract update(): void;
}
EOF

cat <<EOF > src/math/projections/PerspectiveProjection.ts
import { Projection } from './Projection.js';
import { Matrix4 } from '../Matrix4.js';
export class PerspectiveProjection extends Projection {
    constructor(public fov: number, public aspect: number, public near: number, public far: number) {
        super(); this.update();
    }
    public update(): void { Matrix4.perspective(this.fov, this.aspect, this.near, this.far, this.matrix); }
    public getMatrix(): Matrix4 { return this.matrix; }
}
EOF

cat <<EOF > src/math/projections/OrthographicProjection.ts
import { Projection } from './Projection.js';
import { Matrix4 } from '../Matrix4.js';
export class OrthographicProjection extends Projection {
    constructor(public left: number, public right: number, public bottom: number, public top: number, public near: number, public far: number) {
        super(); this.update();
    }
    public update(): void { Matrix4.orthographic(this.left, this.right, this.bottom, this.top, this.near, this.far, this.matrix); }
    public getMatrix(): Matrix4 { return this.matrix; }
}
EOF

# 5. Core Engine
cat <<EOF > src/core/Input.ts
export class Input {
    private static keys: Record<string, boolean> = {};
    public static mouse = { x: 0, y: 0, dx: 0, dy: 0, right: false };
    public static init() {
        window.addEventListener("keydown", e => { this.keys[e.code] = true; });
        window.addEventListener("keyup", e => { this.keys[e.code] = false; });
        window.addEventListener("mousedown", e => { if(e.button===2) this.mouse.right=true; });
        window.addEventListener("mouseup", e => { if(e.button===2) this.mouse.right=false; });
        window.addEventListener("mousemove", e => { this.mouse.dx=e.movementX; this.mouse.dy=e.movementY; });
        window.addEventListener("contextmenu", e => e.preventDefault());
    }
    public static getAxis(neg: string, pos: string): number {
        let a = 0; if(this.keys[neg]) a -= 1; if(this.keys[pos]) a += 1; return a;
    }
}
EOF

cat <<EOF > src/core/Object3D.ts
import { Matrix4 } from '../math/Matrix4.js';
import { GeometryData } from '../interfaces/IGeometry.js';
export class Object3D {
    public position: [number, number, number] = [0, 0, 0];
    public rotation: [number, number, number] = [0, 0, 0];
    public scale: [number, number, number] = [1, 1, 1];
    public color: [number, number, number, number] = [0, 1, 0, 1];
    public geometry: GeometryData | null = null;
    public modelMatrix = new Matrix4();
    private static temp = new Matrix4();
    public updateMatrix(): void {
        Matrix4.translate(this.position[0], this.position[1], this.position[2], this.modelMatrix);
        Matrix4.rotateY(this.rotation[1], Object3D.temp); Matrix4.multiply(this.modelMatrix, Object3D.temp, this.modelMatrix);
        Matrix4.rotateX(this.rotation[0], Object3D.temp); Matrix4.multiply(this.modelMatrix, Object3D.temp, this.modelMatrix);
        Matrix4.rotateZ(this.rotation[2], Object3D.temp); Matrix4.multiply(this.modelMatrix, Object3D.temp, this.modelMatrix);
        Matrix4.scale(this.scale[0], this.scale[1], this.scale[2], Object3D.temp);
        Matrix4.multiply(this.modelMatrix, Object3D.temp, this.modelMatrix);
    }
}
EOF

cat <<EOF > src/core/Scene.ts
import { Object3D } from './Object3D.js';
export class Scene {
    private _children: Object3D[] = [];
    public add(obj: Object3D) { this._children.push(obj); }
    public update() { for(const c of this._children) c.updateMatrix(); }
    public get children() { return this._children; }
}
EOF

cat <<EOF > src/core/Camera.ts
import { Matrix4 } from '../math/Matrix4.js';
import { Projection } from '../math/projections/Projection.js';
export class Camera {
    public position: [number, number, number] = [0, 5, 10];
    public target: [number, number, number] = [0, 0, 0];
    public up: [number, number, number] = [0, 1, 0];
    public theta: number = 0; public phi: number = 0.5; public radius: number = 15;
    constructor(public projection: Projection) {}
    public updateOrbit(dx: number, dy: number) {
        this.theta -= dx * 0.01; this.phi += dy * 0.01;
        const limit = Math.PI / 2 - 0.01;
        if (this.phi > limit) this.phi = limit; if (this.phi < -limit) this.phi = -limit;
        this.applyOrbit();
    }
    public applyOrbit() {
        this.position[0] = this.target[0] + this.radius * Math.sin(this.theta) * Math.cos(this.phi);
        this.position[1] = this.target[1] + this.radius * Math.sin(this.phi);
        this.position[2] = this.target[2] + this.radius * Math.cos(this.theta) * Math.cos(this.phi);
    }
    public getViewProjection(v: Matrix4, out: Matrix4) { Matrix4.multiply(this.projection.getMatrix(), v, out); }
}
EOF

cat <<EOF > src/core/SmallWorld.ts
import { ConfigLoader } from './ConfigLoader.js';
import { RendererFactory } from '../renderers/RendererFactory.js';
import { IRenderer } from '../interfaces/IRenderer.js';
export class SmallWorld {
    private _renderer!: IRenderer;
    public async init(path: string) {
        const config = await ConfigLoader.load(path);
        const canvas = document.getElementById(config.canvasId) as HTMLCanvasElement;
        RendererFactory.init();
        this._renderer = RendererFactory.create(config.rendererType);
        await this._renderer.initialize(canvas);
    }
    public get activeRenderer() { return this._renderer; }
}
EOF

cat <<EOF > src/core/ConfigLoader.ts
export class ConfigLoader { public static async load(p: string) { const r = await fetch(p); return r.json(); } }
EOF

cat <<EOF > src/core/FPSCounter.ts
export class FPSCounter {
    private last = performance.now(); private frames = 0; private el = document.createElement("div");
    constructor() { Object.assign(this.el.style, { position:"fixed", top:"10px", left:"10px", color:"#0f0", fontFamily:"monospace", background:"#000", padding:"4px", zIndex:"1000" }); document.body.appendChild(this.el); }
    public update() { this.frames++; const now = performance.now(); if(now >= this.last + 1000) { this.el.innerText = "FPS: " + this.frames; this.frames = 0; this.last = now; } }
}
EOF

cat <<EOF > src/core/ShaderLoader.ts
export class ShaderLoader {
    public static createProgram(gl: any, vs: string, fs: string) {
        const v = gl.createShader(gl.VERTEX_SHADER)!; gl.shaderSource(v, vs); gl.compileShader(v);
        const f = gl.createShader(gl.FRAGMENT_SHADER)!; gl.shaderSource(f, fs); gl.compileShader(f);
        const p = gl.createProgram()!; gl.attachShader(p, v); gl.attachShader(p, f); gl.linkProgram(p); return p;
    }
}
EOF

cat <<EOF > src/core/AssetManager.ts
import { GeometryData } from '../interfaces/IGeometry.js';
export class AssetManager {
    private static geometries = new Map<string, GeometryData>();
    public static register(id: string, data: GeometryData): GeometryData { this.geometries.set(id, data); return data; }
    public static get(id: string) { return this.geometries.get(id); }
}
EOF

# 6. Geometrien
cat <<EOF > src/geometry/Cube.ts
export class Cube { constructor(public s: number = 1) {} getPrimitiveData() { const h = this.s / 2; const v = new Float32Array([-h,-h,h, h,-h,h, h,h,h, -h,h,h, -h,-h,-h, h,-h,-h, h,h,-h, -h,h,-h]); const i = new Uint16Array([0,1,1,2,2,3,3,0, 4,5,5,6,6,7,7,4, 0,4,1,5,2,6,3,7]); return { vertices: v, indices: i }; } }
EOF

cat <<EOF > src/geometry/Sphere.ts
export class Sphere { constructor(public r: number = 1, public s: number = 16) {} getPrimitiveData() { const v: number[] = [], i: number[] = []; for (let lat = 0; lat <= this.s; lat++) { const theta = (lat * Math.PI) / this.s, sinT = Math.sin(theta), cosT = Math.cos(theta); for (let lon = 0; lon <= this.s; lon++) { const phi = (lon * 2 * Math.PI) / this.s; v.push(Math.cos(phi) * sinT * this.r, cosT * this.r, Math.sin(phi) * sinT * this.r); } } for (let lat = 0; lat < this.s; lat++) { for (let lon = 0; lon < this.s; lon++) { const f = lat * (this.s + 1) + lon, s = f + this.s + 1; i.push(f, s, s, s + 1, s + 1, f + 1, f + 1, f); } } return { vertices: new Float32Array(v), indices: new Uint16Array(i) }; } }
EOF

cat <<EOF > src/geometry/Plane.ts
export class Plane { constructor(public w:number, public h:number, public s:number) {} getPrimitiveData() { const v:number[] = [], i:number[] = []; for (let y=0; y<=this.s; y++) for (let x=0; x<=this.s; x++) v.push(x*(this.w/this.s)-this.w/2, 0, y*(this.h/this.s)-this.h/2); for (let y=0; y<=this.s; y++) for (let x=0; x<this.s; x++) { const s = y*(this.s+1)+x; i.push(s, s+1); } for (let x=0; x<=this.s; x++) for (let y=0; y<this.s; y++) { const s = y*(this.s+1)+x; i.push(s, s+(this.s+1)); } return { vertices: new Float32Array(v), indices: new Uint16Array(i) }; } }
EOF

# 7. Renderers & Shaders
cat <<EOF > src/renderers/shaders/WireframeShader.ts
export const WireframeVS_300 = \`#version 300 es
in vec3 a_position; uniform mat4 u_vp; uniform mat4 u_model; void main() { gl_Position = u_vp * u_model * vec4(a_position, 1.0); }\`;
export const WireframeFS_300 = \`#version 300 es
precision highp float; uniform vec4 u_color; out vec4 c; void main() { c = u_color; }\`;
export const WireframeVS_100 = \`attribute vec3 a_position; uniform mat4 u_vp; uniform mat4 u_model; void main() { gl_Position = u_vp * u_model * vec4(a_position, 1.0); }\`;
export const WireframeFS_100 = \`precision highp float; uniform vec4 u_color; void main() { gl_FragColor = u_color; }\`;
EOF

cat <<EOF > src/renderers/shaders/WireframeWGSL.ts
export const WireframeWGSL = \`
struct U { vp : mat4x4<f32>, model: mat4x4<f32>, color: vec4<f32> };
@group(0) @binding(0) var<uniform> uniforms : U;
struct Out { @builtin(position) pos : vec4<f32> };
@vertex fn vs_main(@location(0) p: vec3<f32>) -> Out {
    var o : Out; o.pos = uniforms.vp * uniforms.model * vec4<f32>(p, 1.0); return o;
}
@fragment fn fs_main() -> @location(0) vec4<f32> { return uniforms.color; }
\`;
EOF

cat <<EOF > src/renderers/Mesh.ts
export class Mesh { public vbo: any; public ebo: any; public count: number; constructor(private gl: any, data: any) { this.vbo = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo); gl.bufferData(gl.ARRAY_BUFFER, data.vertices, gl.STATIC_DRAW); this.ebo = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ebo); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, data.indices, gl.STATIC_DRAW); this.count = data.indices.length; } public bind(loc: number) { this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vbo); this.gl.vertexAttribPointer(loc, 3, this.gl.FLOAT, false, 0, 0); this.gl.enableVertexAttribArray(loc); this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.ebo); } }
EOF

cat <<EOF > src/renderers/RendererFactory.ts
import { RendererType } from '../interfaces/RendererTypes.js';
import { WebGL1Renderer } from './WebGL1Renderer.js';
import { WebGL2Renderer } from './WebGL2Renderer.js';
import { WebGPURenderer } from './WebGPURenderer.js';
export class RendererFactory {
    private static reg = new Map<string, any>();
    public static init() {
        this.reg.set(RendererType.WEBGL1, WebGL1Renderer);
        this.reg.set(RendererType.WEBGL2, WebGL2Renderer);
        this.reg.set(RendererType.WEBGPU, WebGPURenderer);
    }
    public static create(type: string) {
        const t = type === "BEST" ? (('gpu' in navigator) ? RendererType.WEBGPU : RendererType.WEBGL2) : type;
        const C = this.reg.get(t); return new C();
    }
}
EOF

cat <<EOF > src/renderers/WebGL1Renderer.ts
import { IRenderer } from '../interfaces/IRenderer.js';
import { ShaderLoader } from '../core/ShaderLoader.js';
import { WireframeVS_100, WireframeFS_100 } from './shaders/WireframeShader.js';
import { Mesh } from './Mesh.js';
import { Scene } from '../core/Scene.js';
export class WebGL1Renderer implements IRenderer {
    private gl!: WebGLRenderingContext; private prog!: WebGLProgram; private uVP!: any; private uM!: any; private uC!: any;
    private cache = new Map<any, Mesh>();
    public async initialize(canvas: HTMLCanvasElement) {
        this.gl = (canvas.getContext("webgl") || canvas.getContext("experimental-webgl")) as WebGLRenderingContext;
        this.prog = ShaderLoader.createProgram(this.gl, WireframeVS_100, WireframeFS_100);
        this.uVP = this.gl.getUniformLocation(this.prog, "u_vp");
        this.uM = this.gl.getUniformLocation(this.prog, "u_model");
        this.uC = this.gl.getUniformLocation(this.prog, "u_color");
        this.gl.useProgram(this.prog); this.gl.enable(this.gl.DEPTH_TEST);
    }
    public render(scene: Scene, vp: Float32Array) {
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
        this.gl.uniformMatrix4fv(this.uVP, false, vp);
        const pos = this.gl.getAttribLocation(this.prog, "a_position");
        for(const o of scene.children) {
            if(!o.geometry) continue;
            let m = this.cache.get(o.geometry);
            if(!m) { m = new Mesh(this.gl, o.geometry); this.cache.set(o.geometry, m); }
            this.gl.uniformMatrix4fv(this.uM, false, o.modelMatrix.data);
            this.gl.uniform4fv(this.uC, o.color);
            m.bind(pos); this.gl.drawElements(this.gl.LINES, m.count, this.gl.UNSIGNED_SHORT, 0);
        }
    }
    public setSize(w: number, h: number) {
        const d = window.devicePixelRatio; this.gl.canvas.width = w * d; this.gl.canvas.height = h * d;
        (this.gl.canvas as any).style.width = w + "px"; (this.gl.canvas as any).style.height = h + "px";
        this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
    }
}
EOF

cat <<EOF > src/renderers/WebGL2Renderer.ts
import { IRenderer } from '../interfaces/IRenderer.js';
import { ShaderLoader } from '../core/ShaderLoader.js';
import { WireframeVS_300, WireframeFS_300 } from './shaders/WireframeShader.js';
import { Mesh } from './Mesh.js';
import { Scene } from '../core/Scene.js';
export class WebGL2Renderer implements IRenderer {
    private gl!: WebGL2RenderingContext; private prog!: WebGLProgram; private uVP!: any; private uM!: any; private uC!: any;
    private cache = new Map<any, Mesh>();
    public async initialize(canvas: HTMLCanvasElement) {
        this.gl = canvas.getContext("webgl2", { antialias: true })!;
        this.prog = ShaderLoader.createProgram(this.gl, WireframeVS_300, WireframeFS_300);
        this.uVP = this.gl.getUniformLocation(this.prog, "u_vp");
        this.uM = this.gl.getUniformLocation(this.prog, "u_model");
        this.uC = this.gl.getUniformLocation(this.prog, "u_color");
        this.gl.useProgram(this.prog); this.gl.enable(this.gl.DEPTH_TEST);
    }
    public render(scene: Scene, vp: Float32Array) {
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
        this.gl.uniformMatrix4fv(this.uVP, false, vp);
        for(const o of scene.children) {
            if(!o.geometry) continue;
            let m = this.cache.get(o.geometry);
            if(!m) { m = new Mesh(this.gl, o.geometry); this.cache.set(o.geometry, m); }
            this.gl.uniformMatrix4fv(this.uM, false, o.modelMatrix.data);
            this.gl.uniform4fv(this.uC, o.color);
            m.bind(0); this.gl.drawElements(this.gl.LINES, m.count, this.gl.UNSIGNED_SHORT, 0);
        }
    }
    public setSize(w: number, h: number) {
        const d = window.devicePixelRatio; this.gl.canvas.width = w * d; this.gl.canvas.height = h * d;
        (this.gl.canvas as any).style.width = w + "px"; (this.gl.canvas as any).style.height = h + "px";
        this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
    }
}
EOF

cat <<EOF > src/renderers/WebGPURenderer.ts
import { IRenderer } from '../interfaces/IRenderer.js';
import { WireframeWGSL } from './shaders/WireframeWGSL.js';
import { Scene } from '../core/Scene.js';
export class WebGPURenderer implements IRenderer {
    private device!: GPUDevice; private ctx!: GPUCanvasContext; private pipe!: GPURenderPipeline;
    private uBuf!: GPUBuffer; private bG!: GPUBindGroup; private fmt!: GPUTextureFormat; private canvas!: HTMLCanvasElement;
    private cache = new Map<any, any>();
    public async initialize(canvas: HTMLCanvasElement) {
        this.canvas = canvas; const adp = await navigator.gpu?.requestAdapter();
        this.device = await adp!.requestDevice(); this.ctx = canvas.getContext('webgpu')!;
        this.fmt = navigator.gpu.getPreferredCanvasFormat();
        this.reconf();
        const mod = this.device.createShaderModule({ code: WireframeWGSL });
        this.uBuf = this.device.createBuffer({ size: 144, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
        this.pipe = this.device.createRenderPipeline({
            layout: 'auto',
            vertex: { module: mod, entryPoint: 'vs_main', buffers: [{ arrayStride: 12, attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x3' }] }] },
            fragment: { module: mod, entryPoint: 'fs_main', targets: [{ format: this.fmt }] },
            primitive: { topology: 'line-list' }
        });
        this.bG = this.device.createBindGroup({ layout: this.pipe.getBindGroupLayout(0), entries: [{ binding: 0, resource: { buffer: this.uBuf } }] });
    }
    private reconf() { this.ctx.configure({ device: this.device, format: this.fmt, alphaMode: 'premultiplied' }); }
    public render(scene: Scene, vp: Float32Array) {
        this.device.queue.writeBuffer(this.uBuf, 0, vp.buffer, vp.byteOffset, vp.byteLength);
        const enc = this.device.createCommandEncoder();
        const p = enc.beginRenderPass({ colorAttachments: [{ view: this.ctx.getCurrentTexture().createView(), loadOp: 'clear', storeOp: 'store', clearValue: {r:0,g:0,b:0,a:1} }] });
        p.setPipeline(this.pipe);
        for(const o of scene.children) {
            if(!o.geometry) continue;
            this.device.queue.writeBuffer(this.uBuf, 64, o.modelMatrix.data.buffer);
            this.device.queue.writeBuffer(this.uBuf, 128, new Float32Array(o.color).buffer);
            let g = this.cache.get(o.geometry);
            if(!g) {
                const vb = this.device.createBuffer({ size: o.geometry.vertices.byteLength, usage: GPUBufferUsage.VERTEX, mappedAtCreation: true });
                new Float32Array(vb.getMappedRange()).set(o.geometry.vertices); vb.unmap();
                const ib = this.device.createBuffer({ size: o.geometry.indices.byteLength, usage: GPUBufferUsage.INDEX, mappedAtCreation: true });
                new Uint16Array(ib.getMappedRange()).set(o.geometry.indices); ib.unmap();
                g = { vb, ib, cnt: o.geometry.indices.length }; this.cache.set(o.geometry, g);
            }
            p.setBindGroup(0, this.bG); p.setVertexBuffer(0, g.vb); p.setIndexBuffer(g.ib, 'uint16'); p.drawIndexed(g.cnt);
        }
        p.end(); this.device.queue.submit([enc.finish()]);
    }
    public setSize(w: number, h: number) {
        const d = window.devicePixelRatio; this.canvas.width = w * d; this.canvas.height = h * d;
        this.canvas.style.width = w + "px"; this.canvas.style.height = h + "px";
        if (this.device) this.reconf();
    }
}
EOF

# 8. Demo
cat <<EOF > examples/cube-demo.ts
import { SmallWorld } from '../src/core/SmallWorld.js';
import { Scene } from '../src/core/Scene.js';
import { Object3D } from '../src/core/Object3D.js';
import { Cube } from '../src/geometry/Cube.js';
import { Sphere } from '../src/geometry/Sphere.js';
import { Camera } from '../src/core/Camera.js';
import { PerspectiveProjection } from '../src/math/projections/PerspectiveProjection.js';
import { Matrix4 } from '../src/math/Matrix4.js';
import { MathUtils } from '../src/math/MathUtils.js';
import { FPSCounter } from '../src/core/FPSCounter.js';
import { Input } from '../src/core/Input.js';

async function start() {
    MathUtils.init(); Input.init();
    const sw = new SmallWorld();
    await sw.init('./config/small-world.json');
    sw.activeRenderer.setSize(window.innerWidth, window.innerHeight);

    const scene = new Scene();
    const fps = new FPSCounter();

    const player = new Object3D();
    player.geometry = new Cube(1).getPrimitiveData();
    player.color = [1, 0.5, 0, 1]; scene.add(player);

    const sphereData = new Sphere(0.4, 12).getPrimitiveData();
    for(let i=0; i<30; i++) {
        const s = new Object3D(); s.geometry = sphereData;
        s.position = [Math.random()*20-10, Math.random()*5, Math.random()*20-10];
        s.color = [0, 0.4 + Math.random()*0.6, 0.7 + Math.random()*0.3, 1];
        scene.add(s);
    }

    const cam = new Camera(new PerspectiveProjection(Math.PI/4, window.innerWidth/window.innerHeight, 0.1, 100));
    const vM = new Matrix4(), vpM = new Matrix4();

    function loop() {
        fps.update();
        const s = 0.15;
        player.position[0] += Input.getAxis("KeyA", "KeyD") * s;
        player.position[2] += Input.getAxis("KeyW", "KeyS") * s;
        player.rotation[1] += 0.01;
        if (Input.mouse.right) cam.updateOrbit(Input.mouse.dx, Input.mouse.dy);
        Input.mouse.dx = 0; Input.mouse.dy = 0;
        scene.update();
        Matrix4.lookAt(cam.position, cam.target, cam.up, vM);
        cam.getViewProjection(vM, vpM);
        sw.activeRenderer.render(scene, vpM.data);
        requestAnimationFrame(loop);
    }
    loop();
}
start();
EOF

echo "✅ SmallWorld v0.8.12 'Complete Edition' erfolgreich installiert!"
echo "Führe nun 'npm install' und 'npm run build' aus."
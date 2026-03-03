# 1. Struktur reinigen und aufbauen
mkdir -p config src/core src/interfaces src/math/projections src/geometry src/renderers/shaders examples

# 2. Projekt-Konfiguration
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
  "version": "0.8.18",
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
<!DOCTYPE html><html><head><title>SmallWorld Beta v0.8.18</title>
<style>body{margin:0;background:#000;overflow:hidden}canvas{width:100vw;height:100vh;display:block}</style></head>
<body><canvas id="viewport"></canvas><script type="module" src="./dist/examples/cube-demo.js"></script></body></html>
EOF

# 3. MATHEMATIK (Matrix4 mit allen Methoden)
cat <<EOF > src/math/Matrix4.ts
export class Matrix4 {
    public data = new Float32Array(16);
    constructor() { this.identity(); }
    public identity(): Matrix4 {
        const d = this.data; d.fill(0); d[0] = 1; d[5] = 1; d[10] = 1; d[15] = 1; return this;
    }
    public static translate(x: number, y: number, z: number, out: Matrix4): void {
        out.identity(); out.data[12] = x; out.data[13] = y; out.data[14] = z;
    }
    public static rotateY(r: number, out: Matrix4): void {
        const s = Math.sin(r), c = Math.cos(r); out.identity();
        out.data[0] = c; out.data[2] = -s; out.data[8] = s; out.data[10] = c;
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
    public static perspective(fov: number, aspect: number, near: number, far: number, out: Matrix4): void {
        const f = 1.0 / Math.tan(fov / 2), rInv = 1.0 / (near - far);
        const d = out.data; d.fill(0); d[0] = f / aspect; d[5] = f; d[10] = (near + far) * rInv; d[11] = -1; d[14] = (2 * near * far) * rInv;
    }
    public static orthographic(l: number, r: number, b: number, t: number, n: number, f: number, out: Matrix4): void {
        const d = out.data; d.fill(0);
        d[0] = 2 / (r - l); d[5] = 2 / (t - b); d[10] = -2 / (f - n);
        d[12] = -(r + l) / (r - l); d[13] = -(t + b) / (t - b); d[14] = -(f + n) / (f - n); d[15] = 1;
    }
    public static lookAt(eye: number[], target: number[], up: number[], out: Matrix4): void {
        const d = out.data;
        const sub = (a:any, b:any) => [a[0]-b[0], a[1]-b[1], a[2]-b[2]];
        const dot = (a:any, b:any) => a[0]*b[0] + a[1]*b[1] + a[2]*b[2];
        const cross = (a:any, b:any) => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
        const norm = (a:any) => { const l=Math.sqrt(a[0]*a[0]+a[1]*a[1]+a[2]*a[2]); return l>0?[a[0]/l,a[1]/l,a[2]/l]:[0,0,0]; };
        const z = norm(sub(eye, target)), x = norm(cross(up, z)), y = cross(z, x);
        d[0]=x[0]; d[4]=x[1]; d[8]=x[2]; d[12]=-dot(x, eye); d[1]=y[0]; d[5]=y[1]; d[9]=y[2]; d[13]=-dot(y, eye); d[2]=z[0]; d[6]=z[1]; d[10]=z[2]; d[14]=-dot(z, eye); d[15]=1;
    }
}
EOF

# 4. PROJEKTIONEN (Fix: Oblique & Ortho nun korrekt verknüpft)
cat <<EOF > src/math/projections/Projection.ts
import { Matrix4 } from '../Matrix4.js';
export abstract class Projection { protected matrix = new Matrix4(); public abstract getMatrix(): Matrix4; public abstract update(): void; }
EOF

cat <<EOF > src/math/projections/OrthographicProjection.ts
import { Projection } from './Projection.js'; import { Matrix4 } from '../Matrix4.js';
export class OrthographicProjection extends Projection {
    constructor(public l: number, public r: number, public b: number, public t: number, public n: number, public f: number) { super(); this.update(); }
    public update(): void { Matrix4.orthographic(this.l, this.r, this.b, this.t, this.n, this.f, this.matrix); }
    public getMatrix(): Matrix4 { return this.matrix; }
}
EOF

cat <<EOF > src/math/projections/ObliqueProjection.ts
import { Projection } from './Projection.js'; import { Matrix4 } from '../Matrix4.js';
export class ObliqueProjection extends Projection {
    constructor(public l: number, public r: number, public b: number, public t: number, public n: number, public f: number) { super(); this.update(); }
    public update(): void { Matrix4.orthographic(this.l, this.r, this.b, this.t, this.n, this.f, this.matrix); }
    public getMatrix(): Matrix4 { return this.matrix; }
}
EOF

cat <<EOF > src/math/projections/PerspectiveProjection.ts
import { Projection } from './Projection.js'; import { Matrix4 } from '../Matrix4.js';
export class PerspectiveProjection extends Projection {
    constructor(public fov: number, public aspect: number, public near: number, public far: number) { super(); this.update(); }
    public update(): void { Matrix4.perspective(this.fov, this.aspect, this.near, this.far, this.matrix); }
    public getMatrix(): Matrix4 { return this.matrix; }
}
EOF

# 5. CORE ENGINE & INPUT
cat <<EOF > src/core/Input.ts
export class Input {
    private static keys = new Map<string, boolean>();
    public static mouse = { x: 0, y: 0, dx: 0, dy: 0, right: false };
    public static debug = false;
    public static init() {
        window.addEventListener("keydown", e => { this.keys.set(e.code, true); if(this.debug) console.log("%c[Input] Key: " + e.code, "color: #ff0"); });
        window.addEventListener("keyup", e => this.keys.set(e.code, false));
        window.addEventListener("mousedown", e => { if(e.button===2) this.mouse.right=true; });
        window.addEventListener("mouseup", e => { if(e.button===2) this.mouse.right=false; });
        window.addEventListener("mousemove", e => { this.mouse.dx=e.movementX; this.mouse.dy=e.movementY; });
        window.addEventListener("contextmenu", e => e.preventDefault());
    }
    public static getAxis(neg: string, pos: string): number {
        let v = 0; if(this.keys.get(neg)) v -= 1; if(this.keys.get(pos)) v += 1; return v;
    }
}
EOF

cat <<EOF > src/core/Object3D.ts
import { Matrix4 } from '../math/Matrix4.js';
export class Object3D {
    public position: [number, number, number] = [0, 0, 0];
    public rotation: [number, number, number] = [0, 0, 0];
    public color: [number, number, number, number] = [0, 1, 0, 1];
    public geometry: any = null;
    public modelMatrix = new Matrix4();
    private static tM = new Matrix4();
    private static rM = new Matrix4();
    public updateMatrix(): void {
        Matrix4.translate(this.position[0], this.position[1], this.position[2], this.modelMatrix);
        if(this.rotation[1] !== 0) {
            Matrix4.rotateY(this.rotation[1], Object3D.rM);
            Matrix4.multiply(this.modelMatrix, Object3D.rM, Object3D.tM);
            this.modelMatrix.data.set(Object3D.tM.data);
        }
    }
}
EOF

cat <<EOF > src/core/Scene.ts
import { Object3D } from './Object3D.js';
export class Scene {
    public children: Object3D[] = [];
    public add(o: Object3D) { this.children.push(o); }
    public update() { for(const c of this.children) c.updateMatrix(); }
}
EOF

cat <<EOF > src/core/SmallWorld.ts
import { RendererFactory } from '../renderers/RendererFactory.js';
import { Input } from './Input.js';
export class SmallWorld {
    private _renderer: any;
    public async init(p: string) {
        const c = await (await fetch(p)).json();
        Input.debug = c.debug;
        RendererFactory.init();
        this._renderer = RendererFactory.create(c.rendererType);
        await this._renderer.initialize(document.getElementById(c.canvasId));
    }
    public get activeRenderer() { return this._renderer; }
}
EOF

# 6. RENDERER (Fix: WebGPU SharedBuffer Error behoben)
cat <<EOF > src/renderers/Mesh.ts
export class Mesh {
    public vbo: any; public ebo: any; public count: number;
    constructor(private gl: any, data: any) {
        this.vbo = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo); gl.bufferData(gl.ARRAY_BUFFER, data.vertices, gl.STATIC_DRAW);
        this.ebo = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ebo); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, data.indices, gl.STATIC_DRAW);
        this.count = data.indices.length;
    }
    public bind(loc: number) {
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vbo);
        this.gl.vertexAttribPointer(loc, 3, this.gl.FLOAT, false, 0, 0);
        this.gl.enableVertexAttribArray(loc);
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.ebo);
    }
}
EOF

cat <<EOF > src/renderers/WebGL2Renderer.ts
import { Mesh } from './Mesh.js';
export class WebGL2Renderer {
    private gl!: WebGL2RenderingContext; private prog!: WebGLProgram; private uVP!: any; private uM!: any; private uC!: any;
    private cache = new Map<any, Mesh>();
    public async initialize(canvas: HTMLCanvasElement) {
        this.gl = canvas.getContext("webgl2", { antialias: true })!;
        const vs = this.gl.createShader(this.gl.VERTEX_SHADER)!; this.gl.shaderSource(vs, \`#version 300 es
        in vec3 a_position; uniform mat4 u_vp; uniform mat4 u_model; void main() { gl_Position = u_vp * u_model * vec4(a_position, 1.0); }\`); this.gl.compileShader(vs);
        const fs = this.gl.createShader(this.gl.FRAGMENT_SHADER)!; this.gl.shaderSource(fs, \`#version 300 es
        precision highp float; uniform vec4 u_color; out vec4 c; void main() { c = u_color; }\`); this.gl.compileShader(fs);
        this.prog = this.gl.createProgram()!; this.gl.attachShader(this.prog, vs); this.gl.attachShader(this.prog, fs); this.gl.linkProgram(this.prog);
        this.uVP = this.gl.getUniformLocation(this.prog, "u_vp"); this.uM = this.gl.getUniformLocation(this.prog, "u_model"); this.uC = this.gl.getUniformLocation(this.prog, "u_color");
        this.gl.enable(this.gl.DEPTH_TEST);
    }
    public render(scene: any, vp: Float32Array) {
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT); this.gl.useProgram(this.prog);
        this.gl.uniformMatrix4fv(this.uVP, false, vp);
        for(const o of scene.children) {
            let m = this.cache.get(o.geometry); if(!m) { m = new Mesh(this.gl, o.geometry); this.cache.set(o.geometry, m); }
            m.bind(0); this.gl.uniformMatrix4fv(this.uM, false, o.modelMatrix.data); this.gl.uniform4fv(this.uC, o.color);
            this.gl.drawElements(this.gl.LINES, m.count, this.gl.UNSIGNED_SHORT, 0);
        }
    }
    public setSize(w: number, h: number) { this.gl.canvas.width = w*devicePixelRatio; this.gl.canvas.height = h*devicePixelRatio; this.gl.viewport(0,0,w*devicePixelRatio,h*devicePixelRatio); }
}
EOF

cat <<EOF > src/renderers/WebGPURenderer.ts
export class WebGPURenderer {
    private device!: GPUDevice; private ctx!: GPUCanvasContext; private pipe!: GPURenderPipeline;
    private cache = new Map<any, any>();
    public async initialize(canvas: HTMLCanvasElement) {
        const adp = await navigator.gpu.requestAdapter(); this.device = await adp!.requestDevice();
        this.ctx = canvas.getContext("webgpu")!; this.ctx.configure({ device: this.device, format: navigator.gpu.getPreferredCanvasFormat() });
        const mod = this.device.createShaderModule({ code: \`
            struct U { vp: mat4x4<f32>, model: mat4x4<f32>, color: vec4<f32> };
            @group(0) @binding(0) var<uniform> u: U;
            @vertex fn vs_main(@location(0) p: vec3<f32>) -> @builtin(position) vec4<f32> { return u.vp * u.model * vec4<f32>(p, 1.0); }
            @fragment fn fs_main() -> @location(0) vec4<f32> { return u.color; }
        \`});
        this.pipe = this.device.createRenderPipeline({
            layout: "auto", vertex: { module: mod, entryPoint: "vs_main", buffers: [{ arrayStride: 12, attributes: [{ shaderLocation: 0, offset: 0, format: "float32x3" }] }] },
            fragment: { module: mod, entryPoint: "fs_main", targets: [{ format: navigator.gpu.getPreferredCanvasFormat() }] },
            primitive: { topology: "line-list" }
        });
    }
    public render(scene: any, vp: Float32Array) {
        const enc = this.device.createCommandEncoder();
        const p = enc.beginRenderPass({ colorAttachments: [{ view: this.ctx.getCurrentTexture().createView(), loadOp: "clear", storeOp: "store", clearValue: [0,0,0,1] }] });
        p.setPipeline(this.pipe);
        for(const o of scene.children) {
            let res = this.cache.get(o);
            if(!res) {
                const uBuf = this.device.createBuffer({ size: 144, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
                const bG = this.device.createBindGroup({ layout: this.pipe.getBindGroupLayout(0), entries: [{ binding: 0, resource: { buffer: uBuf } }] });
                const vb = this.device.createBuffer({ size: o.geometry.vertices.byteLength, usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST });
                this.device.queue.writeBuffer(vb, 0, o.geometry.vertices);
                const ib = this.device.createBuffer({ size: o.geometry.indices.byteLength, usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST });
                this.device.queue.writeBuffer(ib, 0, o.geometry.indices);
                res = { uBuf, bG, vb, ib, cnt: o.geometry.indices.length }; this.cache.set(o, res);
            }
            // Fix: Benutze .buffer, .byteOffset und .byteLength um SharedArrayBuffer Errors zu vermeiden
            this.device.queue.writeBuffer(res.uBuf, 0, vp.buffer, vp.byteOffset, vp.byteLength);
            this.device.queue.writeBuffer(res.uBuf, 64, o.modelMatrix.data.buffer, o.modelMatrix.data.byteOffset, o.modelMatrix.data.byteLength);
            const colorData = new Float32Array(o.color);
            this.device.queue.writeBuffer(res.uBuf, 128, colorData.buffer, colorData.byteOffset, colorData.byteLength);
            p.setBindGroup(0, res.bG); p.setVertexBuffer(0, res.vb); p.setIndexBuffer(res.ib, "uint16"); p.drawIndexed(res.cnt);
        }
        p.end(); this.device.queue.submit([enc.finish()]);
    }
    public setSize(w: number, h: number) { this.ctx.canvas.width = w*devicePixelRatio; this.ctx.canvas.height = h*devicePixelRatio; }
}
EOF

cat <<EOF > src/renderers/RendererFactory.ts
import { RendererType } from '../interfaces/RendererTypes.js';
import { WebGL2Renderer } from './WebGL2Renderer.js';
import { WebGPURenderer } from './WebGPURenderer.js';
export class RendererFactory {
    private static reg = new Map<string, any>();
    public static init() { this.reg.set(RendererType.WEBGL2, WebGL2Renderer); this.reg.set(RendererType.WEBGPU, WebGPURenderer); }
    public static create(type: string) {
        const t = type === "BEST" ? (('gpu' in navigator) ? RendererType.WEBGPU : RendererType.WEBGL2) : type;
        return new (this.reg.get(t))();
    }
}
EOF

# 7. GEOMETRIE & CAMERA
cat <<EOF > src/geometry/Cube.ts
export class Cube { constructor(public s=1) {} getPrimitiveData() { const h=this.s/2; return { vertices: new Float32Array([-h,-h,h, h,-h,h, h,h,h, -h,h,h, -h,-h,-h, h,-h,-h, h,h,-h, -h,h,-h]), indices: new Uint16Array([0,1,1,2,2,3,3,0, 4,5,5,6,6,7,7,4, 0,4,1,5,2,6,3,7]) }; } }
EOF
cat <<EOF > src/geometry/Sphere.ts
export class Sphere { constructor(public r=1, public s=12) {} getPrimitiveData() {
    const v: number[] = [], i: number[] = [];
    for(let y=0; y<=this.s; y++) {
        const lat = y*Math.PI/this.s, sinL = Math.sin(lat), cosL = Math.cos(lat);
        for(let x=0; x<=this.s; x++) {
            const lon = x*2*Math.PI/this.s; v.push(Math.cos(lon)*sinL*this.r, cosL*this.r, Math.sin(lon)*sinL*this.r);
        }
    }
    for(let y=0; y<this.s; y++) for(let x=0; x<this.s; x++) {
        const f = y*(this.s+1)+x, s = f+this.s+1; i.push(f,s,s,s+1,s+1,f+1,f+1,f);
    }
    return { vertices: new Float32Array(v), indices: new Uint16Array(i) };
} }
EOF

cat <<EOF > src/core/Camera.ts
import { Matrix4 } from '../math/Matrix4.js';
export class Camera {
    public position: [number, number, number] = [0, 8, 20];
    public target: [number, number, number] = [0, 0, 0];
    public up: [number, number, number] = [0, 1, 0];
    public theta = 0; public phi = 0.6; public radius = 20;
    constructor(public projection: any) {}
    public updateOrbit(dx: number, dy: number) {
        this.theta -= dx * 0.01; this.phi += dy * 0.01;
        const limit = Math.PI/2 - 0.01; if(this.phi > limit) this.phi = limit; if(this.phi < -limit) this.phi = -limit;
        this.position[0] = this.target[0] + this.radius * Math.sin(this.theta) * Math.cos(this.phi);
        this.position[1] = this.target[1] + this.radius * Math.sin(this.phi);
        this.position[2] = this.target[2] + this.radius * Math.cos(this.theta) * Math.cos(this.phi);
    }
    public getViewProjection(v: Matrix4, out: Matrix4) { Matrix4.multiply(this.projection.getMatrix(), v, out); }
}
EOF

# 8. DIE DEMO
cat <<EOF > examples/cube-demo.ts
import { SmallWorld } from '../src/core/SmallWorld.js';
import { Scene } from '../src/core/Scene.js';
import { Object3D } from '../src/core/Object3D.js';
import { Cube } from '../src/geometry/Cube.js';
import { Sphere } from '../src/geometry/Sphere.js';
import { Camera } from '../src/core/Camera.js';
import { PerspectiveProjection } from '../src/math/projections/PerspectiveProjection.js';
import { Matrix4 } from '../src/math/Matrix4.js';
import { Input } from '../src/core/Input.js';

async function start() {
    Input.init();
    const sw = new SmallWorld();
    await sw.init('./config/small-world.json');
    sw.activeRenderer.setSize(window.innerWidth, window.innerHeight);

    const scene = new Scene();
    const player = new Object3D();
    player.geometry = new Cube(1.5).getPrimitiveData();
    player.color = [1, 0.5, 0, 1]; scene.add(player);

    const sData = new Sphere(0.6, 12).getPrimitiveData();
    for(let i=0; i<25; i++) {
        const s = new Object3D(); s.geometry = sData;
        s.position = [Math.random()*20-10, 0, Math.random()*20-10];
        s.color = [0, 0.5, 1, 1]; scene.add(s);
    }

    const cam = new Camera(new PerspectiveProjection(Math.PI/4, window.innerWidth/window.innerHeight, 0.1, 100));
    const vM = new Matrix4(), vpM = new Matrix4();

    function loop() {
        const speed = 0.2;
        player.position[0] += Input.getAxis("KeyA", "KeyD") * speed;
        player.position[2] += Input.getAxis("KeyW", "KeyS") * speed;

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

echo "🏁 SmallWorld v0.8.18 'Total Sync' Edition installiert!"
echo "Bitte 'npm run build' ausführen. Der orange Würfel sollte nun endlich laufen!"
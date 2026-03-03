import { IRenderer } from '../interfaces/IRenderer.js';
import { WireframeVS_100, WireframeFS_100 } from './shaders/WireframeShader.js';
import { Mesh } from './Mesh.js';
export class WebGL1Renderer implements IRenderer {
    private gl!: WebGLRenderingContext; private prog!: WebGLProgram; private uVP!: any; private uM!: any; private uC!: any;
    private cache = new Map<any, Mesh>();
    public async initialize(canvas: HTMLCanvasElement) {
        this.gl = (canvas.getContext("webgl") || canvas.getContext("experimental-webgl")) as WebGLRenderingContext;
        const vs = this.gl.createShader(this.gl.VERTEX_SHADER)!; this.gl.shaderSource(vs, WireframeVS_100); this.gl.compileShader(vs);
        const fs = this.gl.createShader(this.gl.FRAGMENT_SHADER)!; this.gl.shaderSource(fs, WireframeFS_100); this.gl.compileShader(fs);
        this.prog = this.gl.createProgram()!; this.gl.attachShader(this.prog, vs); this.gl.attachShader(this.prog, fs); this.gl.linkProgram(this.prog);
        this.uVP = this.gl.getUniformLocation(this.prog, "u_vp"); this.uM = this.gl.getUniformLocation(this.prog, "u_model"); this.uC = this.gl.getUniformLocation(this.prog, "u_color");
        this.gl.enable(this.gl.DEPTH_TEST);
    }
    public render(scene: any, vp: Float32Array) {
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT); this.gl.useProgram(this.prog);
        this.gl.uniformMatrix4fv(this.uVP, false, vp);
        for(const o of scene.children) {
            let m = this.cache.get(o.geometry); if(!m) { m = new Mesh(this.gl, o.geometry); this.cache.set(o.geometry, m); }
            m.bind(this.gl.getAttribLocation(this.prog, "a_position"));
            this.gl.uniformMatrix4fv(this.uM, false, o.modelMatrix.data); this.gl.uniform4fv(this.uC, o.color);
            this.gl.drawElements(this.gl.LINES, m.count, this.gl.UNSIGNED_SHORT, 0);
        }
    }
    public setSize(w: number, h: number) { this.gl.canvas.width = w*devicePixelRatio; this.gl.canvas.height = h*devicePixelRatio; this.gl.viewport(0,0,w*devicePixelRatio,h*devicePixelRatio); }
}

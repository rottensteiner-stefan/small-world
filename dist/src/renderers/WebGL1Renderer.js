import { WireframeFS_100, WireframeVS_100 } from "./shaders/WireframeShader.js";
import { Mesh } from "./Mesh.js";
export class WebGL1Renderer {
    gl;
    prog;
    uVP;
    uM;
    uC;
    cache = new Map();
    async initialize(canvas) {
        this.gl = (canvas.getContext("webgl") ||
            canvas.getContext("experimental-webgl"));
        const vs = this.gl.createShader(this.gl.VERTEX_SHADER);
        this.gl.shaderSource(vs, WireframeVS_100);
        this.gl.compileShader(vs);
        const fs = this.gl.createShader(this.gl.FRAGMENT_SHADER);
        this.gl.shaderSource(fs, WireframeFS_100);
        this.gl.compileShader(fs);
        this.prog = this.gl.createProgram();
        this.gl.attachShader(this.prog, vs);
        this.gl.attachShader(this.prog, fs);
        this.gl.linkProgram(this.prog);
        this.uVP = this.gl.getUniformLocation(this.prog, "u_vp");
        this.uM = this.gl.getUniformLocation(this.prog, "u_model");
        this.uC = this.gl.getUniformLocation(this.prog, "u_color");
        this.gl.enable(this.gl.DEPTH_TEST);
    }
    setClearColor(color) {
        this.gl.clearColor(color.r, color.g, color.b, color.a);
    }
    render(scene, vp) {
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
        this.gl.useProgram(this.prog);
        if (this.uVP)
            this.gl.uniformMatrix4fv(this.uVP, false, vp);
        const posLoc = this.gl.getAttribLocation(this.prog, "a_position");
        for (const o of scene.objects) {
            if (!o.isVisible || !o.material || !o.geometry)
                continue;
            let m = this.cache.get(o.geometry);
            if (!m) {
                m = new Mesh(this.gl, o.geometry);
                this.cache.set(o.geometry, m);
            }
            m.bind(posLoc);
            if (this.uM)
                this.gl.uniformMatrix4fv(this.uM, false, o.worldMatrix.data);
            if (this.uC)
                this.gl.uniform4fv(this.uC, o.material.color.toArray());
            const drawMode = o.material.type === "WireframeMaterial" ? this.gl.LINES : this.gl.TRIANGLES;
            this.gl.drawElements(drawMode, m.count, this.gl.UNSIGNED_SHORT, 0);
        }
    }
    setSize(w, h) {
        const d = window.devicePixelRatio;
        this.gl.canvas.width = w * d;
        this.gl.canvas.height = h * d;
        this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
    }
}
//# sourceMappingURL=WebGL1Renderer.js.map
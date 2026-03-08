import { WireframeVS_300, WireframeFS_300 } from "./shaders/WireframeShader.js";
import { Mesh } from "./Mesh.js";
export class WebGL2Renderer {
    gl;
    prog;
    uVP;
    uM;
    uC;
    cache = new Map();
    async initialize(canvas) {
        this.gl = canvas.getContext("webgl2", { antialias: true });
        const vs = this.gl.createShader(this.gl.VERTEX_SHADER);
        this.gl.shaderSource(vs, WireframeVS_300);
        this.gl.compileShader(vs);
        const fs = this.gl.createShader(this.gl.FRAGMENT_SHADER);
        this.gl.shaderSource(fs, WireframeFS_300);
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
    setClearColor(color) { this.gl.clearColor(color.r, color.g, color.b, color.a); }
    render(scene, vp) {
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
        this.gl.useProgram(this.prog);
        this.gl.uniformMatrix4fv(this.uVP, false, vp);
        for (const o of scene.objects) {
            if (o.isVisible === false)
                continue;
            let m = this.cache.get(o.geometry);
            if (!m) {
                m = new Mesh(this.gl, o.geometry);
                this.cache.set(o.geometry, m);
            }
            m.bind(0);
            this.gl.uniformMatrix4fv(this.uM, false, o.worldMatrix.data);
            this.gl.uniform4fv(this.uC, o.color.toArray());
            this.gl.drawElements(this.gl.LINES, m.count, this.gl.UNSIGNED_SHORT, 0);
        }
    }
    setSize(w, h) {
        this.gl.canvas.width = w * devicePixelRatio;
        this.gl.canvas.height = h * devicePixelRatio;
        this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
    }
}
//# sourceMappingURL=WebGL2Renderer.js.map
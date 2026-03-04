export class WebGPURenderer {
    device;
    ctx;
    pipe;
    clearValue = { r: 0, g: 0, b: 0, a: 1 };
    cache = new Map();
    async initialize(canvas) {
        const adp = await navigator.gpu.requestAdapter();
        this.device = await adp.requestDevice();
        this.ctx = canvas.getContext("webgpu");
        this.ctx.configure({ device: this.device, format: navigator.gpu.getPreferredCanvasFormat() });
        const mod = this.device.createShaderModule({ code: `
      struct U { vp: mat4x4<f32>, model: mat4x4<f32>, color: vec4<f32> };
      @group(0) @binding(0) var<uniform> u: U;
      @vertex fn vs_main(@location(0) p: vec3<f32>) -> @builtin(position) vec4<f32> { return u.vp * u.model * vec4<f32>(p, 1.0); }
      @fragment fn fs_main() -> @location(0) vec4<f32> { return u.color; }
    ` });
        this.pipe = this.device.createRenderPipeline({
            layout: "auto",
            vertex: { module: mod, entryPoint: "vs_main", buffers: [{ arrayStride: 12, attributes: [{ shaderLocation: 0, offset: 0, format: "float32x3" }] }] },
            fragment: { module: mod, entryPoint: "fs_main", targets: [{ format: navigator.gpu.getPreferredCanvasFormat() }] },
            primitive: { topology: "line-list" }
        });
    }
    setClearColor(color) {
        this.clearValue = { r: color.r, g: color.g, b: color.b, a: color.a };
    }
    render(scene, vp) {
        const enc = this.device.createCommandEncoder();
        const p = enc.beginRenderPass({
            colorAttachments: [{
                    view: this.ctx.getCurrentTexture().createView(),
                    loadOp: "clear", storeOp: "store",
                    clearValue: this.clearValue
                }]
        });
        p.setPipeline(this.pipe);
        for (const o of scene.children) {
            let res = this.cache.get(o);
            if (!res) {
                const uBuf = this.device.createBuffer({ size: 144, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
                const bG = this.device.createBindGroup({ layout: this.pipe.getBindGroupLayout(0), entries: [{ binding: 0, resource: { buffer: uBuf } }] });
                const vb = this.device.createBuffer({ size: o.geometry.vertices.byteLength, usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST });
                this.device.queue.writeBuffer(vb, 0, o.geometry.vertices);
                const ib = this.device.createBuffer({ size: o.geometry.indices.byteLength, usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST });
                this.device.queue.writeBuffer(ib, 0, o.geometry.indices);
                res = { uBuf, bG, vb, ib, cnt: o.geometry.indices.length };
                this.cache.set(o, res);
            }
            this.device.queue.writeBuffer(res.uBuf, 0, vp.buffer, vp.byteOffset, vp.byteLength);
            this.device.queue.writeBuffer(res.uBuf, 64, o.modelMatrix.data.buffer, o.modelMatrix.data.byteOffset, o.modelMatrix.data.byteLength);
            const colorArr = new Float32Array(o.color.toArray());
            this.device.queue.writeBuffer(res.uBuf, 128, colorArr.buffer, colorArr.byteOffset, colorArr.byteLength);
            p.setBindGroup(0, res.bG);
            p.setVertexBuffer(0, res.vb);
            p.setIndexBuffer(res.ib, "uint16");
            p.drawIndexed(res.cnt);
        }
        p.end();
        this.device.queue.submit([enc.finish()]);
    }
    setSize(w, h) { this.ctx.canvas.width = w * devicePixelRatio; this.ctx.canvas.height = h * devicePixelRatio; }
}
//# sourceMappingURL=WebGPURenderer.js.map
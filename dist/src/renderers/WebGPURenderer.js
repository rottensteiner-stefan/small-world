export class WebGPURenderer {
    device;
    context;
    format;
    pipeline;
    depthTexture;
    canvas;
    clearColor = [0.1, 0.1, 0.1, 1.0];
    // Caches für Geometrien und Objekte
    geoCache = new Map();
    objCache = new Map();
    async initialize(canvas) {
        this.canvas = canvas;
        const adapter = await navigator.gpu.requestAdapter();
        this.device = await adapter.requestDevice();
        this.context = canvas.getContext("webgpu");
        this.format = navigator.gpu.getPreferredCanvasFormat();
        this.context.configure({ device: this.device, format: this.format });
        const shader = this.device.createShaderModule({
            code: `
                struct Unifs { vp: mat4x4f, model: mat4x4f, color: vec4f }
                @group(0) @binding(0) var<uniform> u: Unifs;
                struct Out { @builtin(position) pos: vec4f, @location(0) col: vec4f }
                @vertex fn vs(@location(0) p: vec3f) -> Out {
                    var o: Out;
                    o.pos = u.vp * u.model * vec4f(p, 1.0);
                    o.col = u.color;
                    return o;
                }
                @fragment fn fs(i: Out) -> @location(0) vec4f { return i.col; }
            `,
        });
        this.pipeline = this.device.createRenderPipeline({
            layout: "auto",
            vertex: {
                module: shader,
                entryPoint: "vs",
                buffers: [
                    { arrayStride: 12, attributes: [{ shaderLocation: 0, offset: 0, format: "float32x3" }] },
                ],
            },
            fragment: { module: shader, entryPoint: "fs", targets: [{ format: this.format }] },
            primitive: { topology: "line-list", cullMode: "none" },
            depthStencil: { depthWriteEnabled: true, depthCompare: "less", format: "depth24plus" },
        });
        this.createDepthTexture();
    }
    setClearColor(color) {
        this.clearColor = color.toArray();
    }
    createDepthTexture() {
        if (this.depthTexture)
            this.depthTexture.destroy();
        this.depthTexture = this.device.createTexture({
            size: [this.canvas.width, this.canvas.height],
            format: "depth24plus",
            usage: GPUTextureUsage.RENDER_ATTACHMENT,
        });
    }
    setSize(w, h) {
        this.canvas.width = w;
        this.canvas.height = h;
        this.createDepthTexture();
    }
    // Hilfsmethode, um Geometrie-Buffer zu erstellen und zu cachen
    getGeoCache(geometry) {
        let entry = this.geoCache.get(geometry);
        if (!entry) {
            const vertices = geometry.vertices;
            const vb = this.device.createBuffer({
                size: vertices.byteLength,
                usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
            });
            this.device.queue.writeBuffer(vb, 0, vertices.buffer, vertices.byteOffset, vertices.byteLength);
            let ib;
            let format;
            let indexCount = 0;
            if (geometry.indices && geometry.indices.length > 0) {
                const indices = geometry.indices;
                indexCount = indices.length;
                ib = this.device.createBuffer({
                    size: indices.byteLength,
                    usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
                });
                this.device.queue.writeBuffer(ib, 0, indices.buffer, indices.byteOffset, indices.byteLength);
                format = indices instanceof Uint32Array ? "uint32" : "uint16";
            }
            entry = { vb, ib, format, vertexCount: vertices.length / 3, indexCount };
            this.geoCache.set(geometry, entry);
        }
        return entry;
    }
    // Hilfsmethode, um Uniform-Buffer pro Objekt zu erstellen und zu cachen
    getObjCache(obj) {
        let entry = this.objCache.get(obj);
        if (!entry) {
            // 36 Floats = 144 Bytes
            const ub = this.device.createBuffer({
                size: 144,
                usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            });
            const bg = this.device.createBindGroup({
                layout: this.pipeline.getBindGroupLayout(0),
                entries: [{ binding: 0, resource: { buffer: ub } }],
            });
            entry = { ub, bg };
            this.objCache.set(obj, entry);
        }
        return entry;
    }
    render(scene, vpMatrix) {
        if (!this.device)
            return;
        const ce = this.device.createCommandEncoder();
        const rp = ce.beginRenderPass({
            colorAttachments: [
                {
                    view: this.context.getCurrentTexture().createView(),
                    clearValue: this.clearColor,
                    loadOp: "clear",
                    storeOp: "store",
                },
            ],
            depthStencilAttachment: {
                view: this.depthTexture.createView(),
                depthClearValue: 1.0,
                depthLoadOp: "clear",
                depthStoreOp: "store",
            },
        });
        rp.setPipeline(this.pipeline);
        // Temporäres Array für die Uniform-Daten (wird in jedem Frame überschrieben)
        const uData = new Float32Array(36);
        uData.set(vpMatrix, 0);
        const drawObject = (obj) => {
            if (obj.geometry && obj.worldMatrix) {
                // 1. Uniform-Daten vorbereiten und an die GPU senden
                uData.set(obj.worldMatrix.data, 16);
                uData.set(obj.color.toArray(), 32);
                const oCache = this.getObjCache(obj);
                this.device.queue.writeBuffer(oCache.ub, 0, uData.buffer, uData.byteOffset, uData.byteLength);
                // 2. Geometrie-Buffer abrufen (aus Cache)
                const gCache = this.getGeoCache(obj.geometry);
                // 3. Zeichnen
                rp.setBindGroup(0, oCache.bg);
                rp.setVertexBuffer(0, gCache.vb);
                if (gCache.ib && gCache.format) {
                    rp.setIndexBuffer(gCache.ib, gCache.format);
                    rp.drawIndexed(gCache.indexCount);
                }
                else {
                    rp.draw(gCache.vertexCount);
                }
            }
            // Rekursion für Kind-Objekte
            if (obj.children) {
                for (const child of obj.children) {
                    drawObject(child);
                }
            }
        };
        for (const obj of scene.objects || []) {
            drawObject(obj);
        }
        rp.end();
        this.device.queue.submit([ce.finish()]);
    }
}
//# sourceMappingURL=WebGPURenderer.js.map
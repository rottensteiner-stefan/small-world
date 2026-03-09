import { Color } from "../core/Color.js";
import { DirectionalLight } from "../core/DirectionalLight.js";
import { AmbientLight } from "../core/AmbientLight.js";
import { PointLight } from "../core/PointLight.js";
import { Vector3D } from "../math/Vector3D.js";
export class WebGPURenderer {
    device;
    context;
    format;
    pipelineLines;
    pipelineTriangles;
    bindGroupLayout;
    depthTexture;
    canvas;
    clearColor = [0.1, 0.1, 0.1, 1.0];
    geoCache = new Map();
    objCache = new Map();
    async initialize(canvas) {
        this.canvas = canvas;
        const adapter = await navigator.gpu.requestAdapter();
        this.device = await adapter.requestDevice();
        this.context = canvas.getContext("webgpu");
        this.format = navigator.gpu.getPreferredCanvasFormat();
        this.context.configure({ device: this.device, format: this.format });
        // Shader mit Arrays und strict Padding für WebGPU (16-byte aligned)
        const shader = this.device.createShaderModule({
            code: `
        struct PointLight {
          pos: vec4f,
          color: vec4f,
        }

        struct Unifs {
          vp: mat4x4f,           // 0
          model: mat4x4f,        // 64
          color: vec4f,          // 128
          specColor: vec4f,      // 144
          ambientColor: vec4f,   // 160
          dirLightColor: vec4f,  // 176
          dirLightDir: vec4f,    // 192 (xyz, w pad)
          camPos: vec4f,         // 208 (xyz, w pad)
          shininess: f32,        // 224
          numPointLights: f32,   // 228
          pad1: f32,             // 232
          pad2: f32,             // 236
          pointLights: array<PointLight, 4> // 240
        }

        @group(0) @binding(0) var<uniform> u: Unifs;

        struct In { @location(0) pos: vec3f, @location(1) normal: vec3f }
        struct Out { @builtin(position) pos: vec4f, @location(0) worldPos: vec3f, @location(1) normal: vec3f }

        @vertex fn vs(i: In) -> Out {
            var o: Out;
            let wp = u.model * vec4f(i.pos, 1.0);
            o.worldPos = wp.xyz;
            o.pos = u.vp * wp;
            o.normal = (u.model * vec4f(i.normal, 0.0)).xyz;
            return o;
        }

        @fragment fn fs(i: Out) -> @location(0) vec4f {
            if (u.shininess < -0.5) { return u.color; }

            let N = normalize(i.normal);
            let V = normalize(u.camPos.xyz - i.worldPos);

            // Ambient
            var finalLight = u.ambientColor.rgb;
            var specular = vec3f(0.0);

            // Directional Light
            let L_dir = normalize(u.dirLightDir.xyz);
            let diff_dir = max(dot(N, L_dir), 0.0);
            finalLight += diff_dir * u.dirLightColor.rgb;

            if (u.shininess > 0.0 && diff_dir > 0.0) {
                let R_dir = reflect(-L_dir, N);
                specular += pow(max(dot(V, R_dir), 0.0), u.shininess) * u.dirLightColor.rgb;
            }

            // Point Lights
            let numLights = i32(u.numPointLights);
            for(var j = 0; j < 4; j++) {
                if (j >= numLights) { break; }

                let lightVec = u.pointLights[j].pos.xyz - i.worldPos;
                let dist = length(lightVec);
                let L_pt = lightVec / dist;

                let attenuation = 1.0 / (1.0 + 0.1 * dist + 0.01 * dist * dist);
                let diff_pt = max(dot(N, L_pt), 0.0);

                finalLight += diff_pt * u.pointLights[j].color.rgb * attenuation;

                if (u.shininess > 0.0 && diff_pt > 0.0) {
                    let R_pt = reflect(-L_pt, N);
                    specular += pow(max(dot(V, R_pt), 0.0), u.shininess) * u.pointLights[j].color.rgb * attenuation;
                }
            }

            return vec4f((finalLight * u.color.rgb) + (specular * u.specColor.rgb), u.color.a);
        }
      `,
        });
        this.bindGroupLayout = this.device.createBindGroupLayout({
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                    buffer: { type: "uniform" },
                },
            ],
        });
        const pipelineLayout = this.device.createPipelineLayout({
            bindGroupLayouts: [this.bindGroupLayout],
        });
        const pipelineConfig = {
            layout: pipelineLayout,
            vertex: {
                module: shader,
                entryPoint: "vs",
                buffers: [
                    { arrayStride: 12, attributes: [{ shaderLocation: 0, offset: 0, format: "float32x3" }] },
                    { arrayStride: 12, attributes: [{ shaderLocation: 1, offset: 0, format: "float32x3" }] },
                ],
            },
            fragment: { module: shader, entryPoint: "fs", targets: [{ format: this.format }] },
            depthStencil: { depthWriteEnabled: true, depthCompare: "less", format: "depth24plus" },
        };
        this.pipelineTriangles = this.device.createRenderPipeline({
            ...pipelineConfig,
            primitive: { topology: "triangle-list", cullMode: "back" },
        });
        this.pipelineLines = this.device.createRenderPipeline({
            ...pipelineConfig,
            primitive: { topology: "line-list", cullMode: "none" },
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
    getGeoCache(geometry) {
        let entry = this.geoCache.get(geometry);
        if (!entry) {
            const vb = this.device.createBuffer({
                size: geometry.vertices.byteLength,
                usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
            });
            this.device.queue.writeBuffer(vb, 0, geometry.vertices.buffer, geometry.vertices.byteOffset, geometry.vertices.byteLength);
            let nb;
            if (geometry.normals && geometry.normals.length > 0) {
                nb = this.device.createBuffer({
                    size: geometry.normals.byteLength,
                    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
                });
                this.device.queue.writeBuffer(nb, 0, geometry.normals.buffer, geometry.normals.byteOffset, geometry.normals.byteLength);
            }
            let ib;
            let format;
            let indexCount = 0;
            if (geometry.indices && geometry.indices.length > 0) {
                indexCount = geometry.indices.length;
                ib = this.device.createBuffer({
                    size: geometry.indices.byteLength,
                    usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
                });
                this.device.queue.writeBuffer(ib, 0, geometry.indices.buffer, geometry.indices.byteOffset, geometry.indices.byteLength);
                format = geometry.indices instanceof Uint32Array ? "uint32" : "uint16";
            }
            entry = { vb, nb, ib, format, vertexCount: geometry.vertices.length / 3, indexCount };
            this.geoCache.set(geometry, entry);
        }
        return entry;
    }
    getObjCache(obj) {
        let entry = this.objCache.get(obj);
        if (!entry) {
            // Neuer Buffer-Size: 368 Bytes (92 Floats)
            const ub = this.device.createBuffer({
                size: 368,
                usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            });
            const bg = this.device.createBindGroup({
                layout: this.bindGroupLayout,
                entries: [{ binding: 0, resource: { buffer: ub } }],
            });
            entry = { ub, bg };
            this.objCache.set(obj, entry);
        }
        return entry;
    }
    render(scene, vpMatrix, camPos = new Vector3D()) {
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
        let aCol = new Color(0, 0, 0), dDir = new Vector3D(0, 1, 0), dCol = new Color(0, 0, 0);
        const pLights = [];
        for (const obj of scene.objects) {
            if (obj instanceof AmbientLight)
                aCol = new Color(obj.color.r * obj.intensity, obj.color.g * obj.intensity, obj.color.b * obj.intensity);
            else if (obj instanceof DirectionalLight) {
                dDir = obj.direction.clone().scale(-1);
                const len = dDir.length();
                if (len > 0)
                    dDir.scale(1 / len);
                dCol = new Color(obj.color.r * obj.intensity, obj.color.g * obj.intensity, obj.color.b * obj.intensity);
            }
            const findPointLights = (node) => {
                if (node instanceof PointLight && pLights.length < 4)
                    pLights.push(node);
                if (node.children)
                    node.children.forEach(findPointLights);
            };
            findPointLights(obj);
        }
        // Uniform Data Structure befüllen (Exaktes Float32 Alignment)
        const uData = new Float32Array(92);
        uData.set(vpMatrix, 0); // 0-15
        uData.set([aCol.r, aCol.g, aCol.b, 1.0], 40); // 40-43
        uData.set([dCol.r, dCol.g, dCol.b, 1.0], 44); // 44-47
        uData.set([dDir.x, dDir.y, dDir.z, 0.0], 48); // 48-51
        uData.set([camPos.x, camPos.y, camPos.z, 0.0], 52); // 52-55
        uData[57] = pLights.length; // 57 (numPointLights)
        // Packe PointLights in den Buffer (startet bei Float 60)
        for (let i = 0; i < pLights.length; i++) {
            const pl = pLights[i];
            const offset = 60 + i * 8;
            uData.set([pl.worldMatrix.data[12], pl.worldMatrix.data[13], pl.worldMatrix.data[14], 0.0], offset);
            uData.set([pl.color.r * pl.intensity, pl.color.g * pl.intensity, pl.color.b * pl.intensity, 0.0], offset + 4);
        }
        const drawObject = (obj) => {
            if (obj.isVisible === false || !obj.material)
                return;
            if (obj.geometry && obj.worldMatrix) {
                rp.setPipeline(obj.material.type === "WireframeMaterial" ? this.pipelineLines : this.pipelineTriangles);
                uData.set(obj.worldMatrix.data, 16); // 16-31
                uData.set(obj.material.color.toArray(), 32); // 32-35
                let shininess = -1.0;
                let specCol = [0, 0, 0, 0];
                if (obj.material.type === "LambertMaterial")
                    shininess = 0.0;
                else if (obj.material.type === "PhongMaterial") {
                    shininess = obj.material.shininess;
                    specCol = obj.material.specularColor.toArray();
                }
                uData.set(specCol, 36); // 36-39
                uData[56] = shininess; // 56
                const oCache = this.getObjCache(obj);
                this.device.queue.writeBuffer(oCache.ub, 0, uData.buffer, uData.byteOffset, uData.byteLength);
                const gCache = this.getGeoCache(obj.geometry);
                rp.setBindGroup(0, oCache.bg);
                rp.setVertexBuffer(0, gCache.vb);
                rp.setVertexBuffer(1, gCache.nb ? gCache.nb : gCache.vb);
                if (gCache.ib && gCache.format) {
                    rp.setIndexBuffer(gCache.ib, gCache.format);
                    rp.drawIndexed(gCache.indexCount);
                }
                else {
                    rp.draw(gCache.vertexCount);
                }
            }
            if (obj.children) {
                for (const child of obj.children)
                    drawObject(child);
            }
        };
        for (const obj of scene.objects || [])
            drawObject(obj);
        rp.end();
        this.device.queue.submit([ce.finish()]);
    }
}
//# sourceMappingURL=WebGPURenderer.js.map
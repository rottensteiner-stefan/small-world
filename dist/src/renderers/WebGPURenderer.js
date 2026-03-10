import { Color } from "../core/colors/Color.js";
import { DirectionalLight } from "../core/lights/DirectionalLight.js";
import { AmbientLight } from "../core/lights/AmbientLight.js";
import { PointLight } from "../core/lights/PointLight.js";
import { SpotLight } from "../core/lights/SpotLight.js";
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
        const shader = this.device.createShaderModule({
            code: `
        struct PointLight { pos: vec4f, color: vec4f }
        struct SpotLight { pos: vec4f, dir: vec4f, color: vec4f, params: vec4f } // x: cosOuter, y: cosInner, z: dist, w: decay

        struct Unifs {
          vp: mat4x4f, model: mat4x4f, color: vec4f, specColor: vec4f,
          ambientColor: vec4f, dirLightColor: vec4f, dirLightDir: vec4f, camPos: vec4f,
          shininess: f32, numPointLights: f32, numSpotLights: f32, pad: f32,
          pointLights: array<PointLight, 4>,
          spotLights: array<SpotLight, 4>
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
            var finalLight = u.ambientColor.rgb;
            var specular = vec3f(0.0);

            // Directional Light
            let L_dir = normalize(u.dirLightDir.xyz);
            let diff_dir = max(dot(N, L_dir), 0.0);
            finalLight += diff_dir * u.dirLightColor.rgb;
            if (u.shininess > 0.0 && diff_dir > 0.0) {
                specular += pow(max(dot(V, reflect(-L_dir, N)), 0.0), u.shininess) * u.dirLightColor.rgb;
            }

            // Point Lights
            for(var j = 0; j < 4; j++) {
                if (j >= i32(u.numPointLights)) { break; }
                let lightVec = u.pointLights[j].pos.xyz - i.worldPos;
                let dist = length(lightVec);
                let L_pt = lightVec / dist;
                let attenuation = 1.0 / (1.0 + 0.1 * dist + 0.01 * dist * dist);
                let diff_pt = max(dot(N, L_pt), 0.0);
                finalLight += diff_pt * u.pointLights[j].color.rgb * attenuation;
                if (u.shininess > 0.0 && diff_pt > 0.0) {
                    specular += pow(max(dot(V, reflect(-L_pt, N)), 0.0), u.shininess) * u.pointLights[j].color.rgb * attenuation;
                }
            }

            // Spot Lights
            for(var k = 0; k < 4; k++) {
                if (k >= i32(u.numSpotLights)) { break; }
                let lightVec = u.spotLights[k].pos.xyz - i.worldPos;
                let dist = length(lightVec);
                let L_sp = lightVec / dist;
                let S_dir = normalize(u.spotLights[k].dir.xyz);
                let theta = dot(-L_sp, S_dir);
                let cosOuter = u.spotLights[k].params.x;
                let cosInner = u.spotLights[k].params.y;

                if(theta > cosOuter) {
                    let spotEffect = smoothstep(cosOuter, cosInner, theta);
                    let attenuation = 1.0 / (1.0 + 0.1 * dist + 0.01 * dist * dist);
                    let diff_sp = max(dot(N, L_sp), 0.0);
                    finalLight += diff_sp * u.spotLights[k].color.rgb * attenuation * spotEffect;
                    if (u.shininess > 0.0 && diff_sp > 0.0) {
                        specular += pow(max(dot(V, reflect(-L_sp, N)), 0.0), u.shininess) * u.spotLights[k].color.rgb * attenuation * spotEffect;
                    }
                }
            }
            return vec4f((finalLight * u.color.rgb) + (specular * u.specColor.rgb), u.color.a);
        }
      `,
        });
        this.bindGroupLayout = this.device.createBindGroupLayout({
            entries: [{ binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: "uniform" } }],
        });
        const pipelineLayout = this.device.createPipelineLayout({ bindGroupLayouts: [this.bindGroupLayout] });
        const pipelineDescriptorTemplate = {
            layout: pipelineLayout,
            vertex: {
                module: shader, entryPoint: "vs",
                buffers: [
                    { arrayStride: 12, attributes: [{ shaderLocation: 0, offset: 0, format: "float32x3" }] },
                    { arrayStride: 12, attributes: [{ shaderLocation: 1, offset: 0, format: "float32x3" }] },
                ],
            },
            fragment: { module: shader, entryPoint: "fs", targets: [{ format: this.format }] },
            depthStencil: { depthWriteEnabled: true, depthCompare: "less", format: "depth24plus" },
        };
        this.pipelineTriangles = this.device.createRenderPipeline({ ...pipelineDescriptorTemplate, primitive: { topology: "triangle-list", cullMode: "back" } });
        this.pipelineLines = this.device.createRenderPipeline({ ...pipelineDescriptorTemplate, primitive: { topology: "line-list", cullMode: "none" } });
        this.createDepthTexture();
    }
    setClearColor(color) { this.clearColor = color.toArray(); }
    createDepthTexture() {
        if (this.depthTexture)
            this.depthTexture.destroy();
        this.depthTexture = this.device.createTexture({ size: [this.canvas.width, this.canvas.height], format: "depth24plus", usage: GPUTextureUsage.RENDER_ATTACHMENT });
    }
    setSize(w, h) { this.canvas.width = w; this.canvas.height = h; this.createDepthTexture(); }
    getGeoCache(geometry) {
        let entry = this.geoCache.get(geometry);
        if (!entry) {
            const vb = this.device.createBuffer({ size: geometry.vertices.byteLength, usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST });
            this.device.queue.writeBuffer(vb, 0, geometry.vertices.buffer, geometry.vertices.byteOffset, geometry.vertices.byteLength);
            let nb;
            if (geometry.normals && geometry.normals.length > 0) {
                nb = this.device.createBuffer({ size: geometry.normals.byteLength, usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST });
                this.device.queue.writeBuffer(nb, 0, geometry.normals.buffer, geometry.normals.byteOffset, geometry.normals.byteLength);
            }
            let ib;
            let format;
            let indexCount = 0;
            if (geometry.indices && geometry.indices.length > 0) {
                indexCount = geometry.indices.length;
                ib = this.device.createBuffer({ size: geometry.indices.byteLength, usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST });
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
            // Neuer Size: 624 Bytes (156 Floats) wegen Spotlights
            const ub = this.device.createBuffer({ size: 624, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
            const bg = this.device.createBindGroup({ layout: this.bindGroupLayout, entries: [{ binding: 0, resource: { buffer: ub } }] });
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
            colorAttachments: [{ view: this.context.getCurrentTexture().createView(), clearValue: this.clearColor, loadOp: "clear", storeOp: "store" }],
            depthStencilAttachment: { view: this.depthTexture.createView(), depthClearValue: 1.0, depthLoadOp: "clear", depthStoreOp: "store" },
        });
        let aCol = new Color(0, 0, 0), dDir = new Vector3D(0, 1, 0), dCol = new Color(0, 0, 0);
        const pLights = [];
        const sLights = []; // <-- NEU
        const extractLights = (node) => {
            if (node instanceof AmbientLight)
                aCol = new Color(node.color.r * node.intensity, node.color.g * node.intensity, node.color.b * node.intensity);
            else if (node instanceof DirectionalLight) {
                dDir = node.direction.clone().scale(-1);
                if (dDir.length() > 0)
                    dDir.scale(1 / dDir.length());
                dCol = new Color(node.color.r * node.intensity, node.color.g * node.intensity, node.color.b * node.intensity);
            }
            else if (node instanceof PointLight && pLights.length < 4)
                pLights.push(node);
            else if (node instanceof SpotLight && sLights.length < 4)
                sLights.push(node);
            if (node.children)
                node.children.forEach(extractLights);
        };
        for (const obj of scene.objects)
            extractLights(obj);
        const uData = new Float32Array(156);
        uData.set(vpMatrix, 0);
        uData.set([aCol.r, aCol.g, aCol.b, 1.0], 40);
        uData.set([dCol.r, dCol.g, dCol.b, 1.0], 44);
        uData.set([dDir.x, dDir.y, dDir.z, 0.0], 48);
        uData.set([camPos.x, camPos.y, camPos.z, 0.0], 52);
        uData[57] = pLights.length;
        uData[58] = sLights.length; // <-- NEU
        for (let i = 0; i < pLights.length; i++) {
            const pl = pLights[i];
            const offset = 60 + i * 8;
            uData.set([pl.worldMatrix.data[12], pl.worldMatrix.data[13], pl.worldMatrix.data[14], 0.0], offset);
            uData.set([pl.color.r * pl.intensity, pl.color.g * pl.intensity, pl.color.b * pl.intensity, 0.0], offset + 4);
        }
        // <-- NEU: SpotLights packen
        for (let i = 0; i < sLights.length; i++) {
            const sl = sLights[i];
            const offset = 92 + i * 16;
            uData.set([sl.worldMatrix.data[12], sl.worldMatrix.data[13], sl.worldMatrix.data[14], 0.0], offset);
            // Direction normalisieren
            const dir = sl.direction.clone();
            if (dir.length() > 0)
                dir.scale(1 / dir.length());
            uData.set([dir.x, dir.y, dir.z, 0.0], offset + 4);
            uData.set([sl.color.r * sl.intensity, sl.color.g * sl.intensity, sl.color.b * sl.intensity, 0.0], offset + 8);
            const cosOuter = Math.cos(sl.angle);
            const cosInner = Math.cos(sl.angle * (1.0 - sl.penumbra));
            uData.set([cosOuter, cosInner, sl.distance, sl.decay], offset + 12);
        }
        const drawObject = (obj) => {
            if (obj.isVisible === false || !obj.material || !obj.geometry)
                return;
            if (obj.worldMatrix) {
                rp.setPipeline(obj.material.type === "WireframeMaterial" ? this.pipelineLines : this.pipelineTriangles);
                uData.set(obj.worldMatrix.data, 16);
                uData.set(obj.material.color.toArray(), 32);
                let shininess = -1.0;
                let specCol = [0, 0, 0, 0];
                if (obj.material.type === "LambertMaterial")
                    shininess = 0.0;
                else if (obj.material.type === "PhongMaterial") {
                    shininess = obj.material.shininess || 32;
                    specCol = obj.material.specularColor ? obj.material.specularColor.toArray() : [0, 0, 0, 0];
                }
                uData.set(specCol, 36);
                uData[56] = shininess;
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
                else
                    rp.draw(gCache.vertexCount);
            }
            if (obj.children)
                for (const child of obj.children)
                    drawObject(child);
        };
        for (const obj of scene.objects || [])
            drawObject(obj);
        rp.end();
        this.device.queue.submit([ce.finish()]);
    }
}
//# sourceMappingURL=WebGPURenderer.js.map
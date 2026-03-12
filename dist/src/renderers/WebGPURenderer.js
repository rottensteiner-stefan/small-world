import { Color } from "../core/colors/Color.js";
import { AbstractLight } from "../core/lights/AbstractLight.js";
import { LightType } from "../enums/LightType.js";
import { Vector3D } from "../math/Vector3D.js";
import { RendererType } from "../enums/RendererType.js";
import { MaterialType } from "../enums/MaterialType.js";
export class WebGPURenderer {
    type = RendererType.WEB_GPU;
    adapter = null;
    device = null;
    context;
    format;
    pipelineTriangles;
    pipelineLines;
    pipelineSkybox;
    objBGL;
    texBGL;
    skyTexBGL;
    defaultTexBindGroup;
    defaultCubeTexBindGroup;
    sampler;
    geoCache = new Map();
    objCache = new Map();
    texCache = new Map();
    texCubeCache = new Map();
    samplerCache = new Map();
    clearColor = { r: 0, g: 0, b: 0, a: 1 };
    depthTexture;
    async initialize(canvas) {
        this.adapter = await navigator.gpu.requestAdapter();
        this.device = await this.adapter.requestDevice();
        this.context = canvas.getContext("webgpu");
        this.format = navigator.gpu.getPreferredCanvasFormat();
        this.context.configure({
            device: this.device,
            format: this.format,
            alphaMode: "premultiplied",
        });
        this.sampler = this.device.createSampler({
            magFilter: "linear",
            minFilter: "linear",
            addressModeU: "repeat",
            addressModeV: "repeat",
        });
        const sm = this.device.createShaderModule({
            code: `
          struct U { vp: mat4x4f, model: mat4x4f, color: vec4f, specCol: vec4f, amb: vec4f, dCol: vec4f, dDir: vec4f, cam: vec4f, tOff: vec2f, tRep: vec2f, shininess: f32, numPL: f32, numSL: f32 }
          @group(0) @binding(0) var<uniform> u: U;
          struct PL { pos: vec4f, col: vec4f }
          @group(0) @binding(1) var<storage> pLights: array<PL>;
          struct SL { pos: vec4f, dir: vec4f, col: vec4f, params: vec4f }
          @group(0) @binding(2) var<storage> sLights: array<SL>;
          @group(1) @binding(0) var t: texture_2d<f32>;
          @group(1) @binding(1) var s: sampler;
          struct Out { @builtin(position) p: vec4f, @location(0) wp: vec3f, @location(1) n: vec3f, @location(2) uv: vec2f }
          @vertex fn vs(@location(0) p: vec3f, @location(1) n: vec3f, @location(2) uv: vec2f) -> Out {
            var o: Out; let worldP = u.model * vec4f(p, 1.0); o.p = u.vp * worldP; o.wp = worldP.xyz;
            o.n = (u.model * vec4f(n, 0.0)).xyz; o.uv = (uv * u.tRep) + u.tOff; return o;
          }
          @fragment fn fs(i: Out) -> @location(0) vec4f {
            let texCol = textureSample(t, s, i.uv);
            if (u.shininess < -0.5) { return u.color * texCol; }
            let N = normalize(i.n); let V = normalize(u.cam.xyz - i.wp); var fL = u.amb.xyz; var spec = vec3f(0.0);
            let L_dir = normalize(u.dDir.xyz); let diff_dir = max(dot(N, L_dir), 0.0); fL += diff_dir * u.dCol.xyz;
            if (u.shininess > 0.0 && diff_dir > 0.0) { spec += pow(max(dot(V, reflect(-L_dir, N)), 0.0), u.shininess) * u.dCol.xyz; }
            for(var j=0u; j<u32(u.numPL); j++) {
              let lVec = pLights[j].pos.xyz - i.wp; let d = length(lVec); let L = lVec/d;
              let atten = 1.0 / (1.0 + 0.1*d + 0.01*d*d); let diff = max(dot(N, L), 0.0); fL += diff * pLights[j].col.xyz * atten;
              if (u.shininess > 0.0 && diff > 0.0) { spec += pow(max(dot(V, reflect(-L, N)), 0.0), u.shininess) * pLights[j].col.xyz * atten; }
            }
            for(var j=0u; j<u32(u.numSL); j++) {
              let lVec = sLights[j].pos.xyz - i.wp; let d = length(lVec); let L = lVec/d; let S = normalize(sLights[j].dir.xyz); let theta = dot(-L, S);
              if(theta > sLights[j].params.x) {
                let sEff = smoothstep(sLights[j].params.x, sLights[j].params.y, theta);
                let atten = 1.0 / (1.0 + 0.1*d + 0.01*d*d); let diff = max(dot(N, L), 0.0); fL += diff * sLights[j].col.xyz * atten * sEff;
                if (u.shininess > 0.0 && diff > 0.0) { spec += pow(max(dot(V, reflect(-L, N)), 0.0), u.shininess) * sLights[j].col.xyz * atten * sEff; }
              }
            }
            return vec4f((fL * u.color.rgb * texCol.rgb) + (spec * u.specCol.rgb), u.color.a * texCol.a);
          }
        `,
        });
        const skySm = this.device.createShaderModule({
            code: `
          struct U { vp: mat4x4f, model: mat4x4f, color: vec4f, specCol: vec4f, amb: vec4f, dCol: vec4f, dDir: vec4f, cam: vec4f, tOff: vec2f, tRep: vec2f, shininess: f32, numPL: f32, numSL: f32 }
          @group(0) @binding(0) var<uniform> u: U;
          @group(1) @binding(0) var t: texture_cube<f32>; @group(1) @binding(1) var s: sampler;
          struct Out { @builtin(position) p: vec4f, @location(0) uvw: vec3f }
          @vertex fn vs(@location(0) p: vec3f) -> Out {
            var o: Out; o.uvw = p; o.p = u.vp * u.model * vec4f(p, 1.0); return o;
          }
          @fragment fn fs(i: Out) -> @location(0) vec4f { return textureSample(t, s, i.uvw); }
        `,
        });
        this.objBGL = this.device.createBindGroupLayout({
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                    buffer: { type: "uniform" },
                },
                { binding: 1, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "read-only-storage" } },
                { binding: 2, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "read-only-storage" } },
            ],
        });
        this.texBGL = this.device.createBindGroupLayout({
            entries: [
                { binding: 0, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "float" } },
                { binding: 1, visibility: GPUShaderStage.FRAGMENT, sampler: { type: "filtering" } },
            ],
        });
        this.skyTexBGL = this.device.createBindGroupLayout({
            entries: [
                { binding: 0, visibility: GPUShaderStage.FRAGMENT, texture: { viewDimension: "cube" } },
                { binding: 1, visibility: GPUShaderStage.FRAGMENT, sampler: { type: "filtering" } },
            ],
        });
        const layout = this.device.createPipelineLayout({
            bindGroupLayouts: [this.objBGL, this.texBGL],
        });
        const skyLayout = this.device.createPipelineLayout({
            bindGroupLayouts: [this.objBGL, this.skyTexBGL],
        });
        const common = {
            vertex: {
                module: sm,
                buffers: [
                    {
                        arrayStride: 12,
                        attributes: [{ shaderLocation: 0, offset: 0, format: "float32x3" }],
                    },
                    {
                        arrayStride: 12,
                        attributes: [{ shaderLocation: 1, offset: 0, format: "float32x3" }],
                    },
                    { arrayStride: 8, attributes: [{ shaderLocation: 2, offset: 0, format: "float32x2" }] },
                ],
            },
            fragment: { module: sm, targets: [{ format: this.format }] },
            primitive: { topology: "triangle-list", cullMode: "back" },
            depthStencil: { depthWriteEnabled: true, depthCompare: "less", format: "depth24plus" },
            layout,
        };
        this.pipelineTriangles = this.device.createRenderPipeline(common);
        common.primitive.topology = "line-list";
        this.pipelineLines = this.device.createRenderPipeline(common);
        this.pipelineSkybox = this.device.createRenderPipeline({
            vertex: { module: skySm, buffers: [common.vertex.buffers[0]] },
            fragment: { module: skySm, targets: [{ format: this.format }] },
            primitive: { topology: "triangle-list" },
            depthStencil: { depthWriteEnabled: false, depthCompare: "less", format: "depth24plus" },
            layout: skyLayout,
        });
        const whiteTex = this.device.createTexture({
            size: [1, 1],
            format: "rgba8unorm",
            usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
        });
        this.device.queue.writeTexture({ texture: whiteTex }, new Uint8Array([255, 255, 255, 255]), { bytesPerRow: 4 }, [1, 1]);
        this.defaultTexBindGroup = this.device.createBindGroup({
            layout: this.texBGL,
            entries: [
                { binding: 0, resource: whiteTex.createView() },
                { binding: 1, resource: this.sampler },
            ],
        });
        const whiteCube = this.device.createTexture({
            size: [1, 1, 6],
            format: "rgba8unorm",
            usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
        });
        for (let i = 0; i < 6; i++)
            this.device.queue.writeTexture({
                texture: whiteCube,
                origin: [0, 0, i],
            }, new Uint8Array([50, 50, 100, 255]), { bytesPerRow: 4 }, [1, 1]);
        this.defaultCubeTexBindGroup = this.device.createBindGroup({
            layout: this.skyTexBGL,
            entries: [
                { binding: 0, resource: whiteCube.createView({ dimension: "cube" }) },
                { binding: 1, resource: this.sampler },
            ],
        });
        this.setSize(canvas.clientWidth, canvas.clientHeight);
    }
    getSampler(tex) {
        const key = `${tex.addressModeU}_${tex.addressModeV}_${tex.magFilter}_${tex.minFilter}`;
        if (!this.samplerCache.has(key)) {
            const sampler = this.device.createSampler({
                addressModeU: tex.addressModeU,
                addressModeV: tex.addressModeV,
                magFilter: tex.magFilter,
                minFilter: tex.minFilter,
                mipmapFilter: "linear",
            });
            this.samplerCache.set(key, sampler);
        }
        return this.samplerCache.get(key);
    }
    setClearColor(color) {
        this.clearColor = { r: color.r, g: color.g, b: color.b, a: color.a };
    }
    setSize(width, height) {
        if (!this.device)
            return;
        const d = devicePixelRatio;
        this.context.canvas.width = width * d;
        this.context.canvas.height = height * d;
        this.depthTexture = this.device.createTexture({
            size: [this.context.canvas.width, this.context.canvas.height],
            format: "depth24plus",
            usage: GPUTextureUsage.RENDER_ATTACHMENT,
        });
    }
    getGeoCache(geo) {
        let c = this.geoCache.get(geo);
        if (!c) {
            const createBuf = (data, usage) => {
                const b = this.device.createBuffer({
                    size: (data.byteLength + 3) & ~3,
                    usage,
                    mappedAtCreation: true,
                });
                if (data instanceof Float32Array)
                    new Float32Array(b.getMappedRange()).set(data);
                else if (data instanceof Uint16Array)
                    new Uint16Array(b.getMappedRange()).set(data);
                else
                    new Uint32Array(b.getMappedRange()).set(data);
                b.unmap();
                return b;
            };
            c = {
                vb: createBuf(geo.vertices, GPUBufferUsage.VERTEX),
                nb: geo.normals ? createBuf(geo.normals, GPUBufferUsage.VERTEX) : null,
                uvb: geo.uvs ? createBuf(geo.uvs, GPUBufferUsage.VERTEX) : null,
                ib: geo.indices ? createBuf(geo.indices, GPUBufferUsage.INDEX) : null,
                indexCount: geo.indices ? geo.indices.length : 0,
                vertexCount: geo.vertices.length / 3,
                format: geo.indices ? (geo.indices instanceof Uint16Array ? "uint16" : "uint32") : null,
            };
            this.geoCache.set(geo, c);
        }
        return c;
    }
    getObjCache(obj) {
        let c = this.objCache.get(obj);
        if (!c) {
            const ub = this.device.createBuffer({
                size: 1024,
                usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            });
            const plb = this.device.createBuffer({
                size: 512,
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
            });
            const slb = this.device.createBuffer({
                size: 1024,
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
            });
            const bg = this.device.createBindGroup({
                layout: this.objBGL,
                entries: [
                    { binding: 0, resource: { buffer: ub } },
                    { binding: 1, resource: { buffer: plb } },
                    {
                        binding: 2,
                        resource: { buffer: slb },
                    },
                ],
            });
            c = { ub, plb, slb, bg };
            this.objCache.set(obj, c);
        }
        return c;
    }
    getGPUTextureBindGroup(tex) {
        if (!tex.isLoaded || !tex.image)
            return this.defaultTexBindGroup;
        let bg = this.texCache.get(tex);
        if (!bg) {
            const t = this.device.createTexture({
                size: [tex.image.width, tex.image.height],
                format: "rgba8unorm",
                usage: GPUTextureUsage.TEXTURE_BINDING |
                    GPUTextureUsage.COPY_DST |
                    GPUTextureUsage.RENDER_ATTACHMENT,
            });
            this.device.queue.copyExternalImageToTexture({ source: tex.image }, { texture: t }, [
                tex.image.width,
                tex.image.height,
            ]);
            const sampler = this.getSampler(tex);
            bg = this.device.createBindGroup({
                layout: this.texBGL,
                entries: [
                    { binding: 0, resource: t.createView() },
                    { binding: 1, resource: sampler },
                ],
            });
            this.texCache.set(tex, bg);
        }
        return bg;
    }
    getGPUCubeTextureBindGroup(tex) {
        if (!tex.isLoaded || tex.images.length !== 6)
            return this.defaultCubeTexBindGroup;
        let bg = this.texCubeCache.get(tex);
        if (!bg) {
            const img = tex.images[0];
            const t = this.device.createTexture({
                size: [img.width, img.height, 6],
                format: "rgba8unorm",
                usage: GPUTextureUsage.TEXTURE_BINDING |
                    GPUTextureUsage.COPY_DST |
                    GPUTextureUsage.RENDER_ATTACHMENT,
            });
            for (let i = 0; i < 6; i++)
                this.device.queue.copyExternalImageToTexture({ source: tex.images[i] }, {
                    texture: t,
                    origin: [0, 0, i],
                }, [img.width, img.height]);
            bg = this.device.createBindGroup({
                layout: this.skyTexBGL,
                entries: [
                    { binding: 0, resource: t.createView({ dimension: "cube" }) },
                    {
                        binding: 1,
                        resource: this.sampler,
                    },
                ],
            });
            this.texCubeCache.set(tex, bg);
        }
        return bg;
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
        const pLights = [], sLights = [];
        const extractLights = (node) => {
            if (node instanceof AbstractLight) {
                const light = node;
                switch (light.type) {
                    case LightType.AMBIENT:
                        aCol = new Color(light.color.r * light.intensity, light.color.g * light.intensity, light.color.b * light.intensity);
                        break;
                    case LightType.DIRECTIONAL:
                        const dLight = light;
                        dDir = dLight.direction.clone().scale(-1).normalize();
                        dCol = new Color(light.color.r * light.intensity, light.color.g * light.intensity, light.color.b * light.intensity);
                        break;
                    case LightType.POINT:
                        if (pLights.length < 4)
                            pLights.push(light);
                        break;
                    case LightType.SPOT:
                        if (sLights.length < 4)
                            sLights.push(light);
                        break;
                }
            }
            if (node.children)
                node.children.forEach(extractLights);
        };
        for (const obj of scene.objects)
            extractLights(obj);
        const uData = new Float32Array(160);
        uData.set(vpMatrix, 0);
        uData.set([aCol.r, aCol.g, aCol.b, 1.0], 40);
        uData.set([dCol.r, dCol.g, dCol.b, 1.0], 44);
        uData.set([dDir.x, dDir.y, dDir.z, 0.0], 48);
        uData.set([camPos.x, camPos.y, camPos.z, 0.0], 52);
        uData[61] = pLights.length;
        uData[62] = sLights.length;
        const plData = new Float32Array(32);
        for (let i = 0; i < pLights.length; i++) {
            const pl = pLights[i];
            plData.set([pl.worldMatrix.data[12], pl.worldMatrix.data[13], pl.worldMatrix.data[14], 0.0], i * 8);
            plData.set([pl.color.r * pl.intensity, pl.color.g * pl.intensity, pl.color.b * pl.intensity, 0.0], i * 8 + 4);
        }
        const slData = new Float32Array(64);
        for (let i = 0; i < sLights.length; i++) {
            const sl = sLights[i], offset = i * 16;
            slData.set([sl.worldMatrix.data[12], sl.worldMatrix.data[13], sl.worldMatrix.data[14], 0.0], offset);
            const dir = sl.direction.clone().normalize();
            slData.set([dir.x, dir.y, dir.z, 0.0], offset + 4);
            slData.set([sl.color.r * sl.intensity, sl.color.g * sl.intensity, sl.color.b * sl.intensity, 0.0], offset + 8);
            slData.set([Math.cos(sl.angle), Math.cos(sl.angle * (1.0 - sl.penumbra)), sl.distance, sl.decay], offset + 12);
        }
        const drawObject = (obj) => {
            if (!obj.isVisible || !obj.geometry || !obj.material)
                return;
            const mat = obj.material;
            let texBindGroup = this.defaultTexBindGroup;
            let shininess = -1.0;
            let specCol = [0, 0, 0, 0];
            let tOffset = [0, 0];
            let tRepeat = [1, 1];
            if (mat.type === MaterialType.SKYBOX) {
                rp.setPipeline(this.pipelineSkybox);
                const skyMat = mat;
                texBindGroup = skyMat.cubeMap ? this.getGPUCubeTextureBindGroup(skyMat.cubeMap) : this.defaultCubeTexBindGroup;
            }
            else {
                rp.setPipeline(mat.type === MaterialType.WIREFRAME ? this.pipelineLines : this.pipelineTriangles);
                if (mat.type === MaterialType.LAMBERT) {
                    shininess = 0.0;
                }
                else if (mat.type === MaterialType.PHONG) {
                    const phongMat = mat;
                    shininess = phongMat.shininess || 32;
                    specCol = phongMat.specularColor ? phongMat.specularColor.toArray() : [0, 0, 0, 0];
                    if (phongMat.diffuseMap) {
                        texBindGroup = this.getGPUTextureBindGroup(phongMat.diffuseMap);
                        tOffset = [phongMat.diffuseMap.offset.x, phongMat.diffuseMap.offset.y];
                        tRepeat = [phongMat.diffuseMap.repeat.x, phongMat.diffuseMap.repeat.y];
                    }
                }
            }
            uData.set(obj.worldMatrix.data, 16);
            uData.set(mat.color.toArray(), 32);
            uData.set(specCol, 36);
            uData.set(tOffset, 56);
            uData.set(tRepeat, 58);
            uData[60] = shininess;
            const oCache = this.getObjCache(obj);
            this.device.queue.writeBuffer(oCache.ub, 0, uData);
            this.device.queue.writeBuffer(oCache.plb, 0, plData);
            this.device.queue.writeBuffer(oCache.slb, 0, slData);
            const gCache = this.getGeoCache(obj.geometry);
            rp.setBindGroup(0, oCache.bg);
            rp.setBindGroup(1, texBindGroup);
            rp.setVertexBuffer(0, gCache.vb);
            rp.setVertexBuffer(1, gCache.nb ? gCache.nb : gCache.vb);
            rp.setVertexBuffer(2, gCache.uvb ? gCache.uvb : gCache.vb);
            if (gCache.ib && gCache.format) {
                rp.setIndexBuffer(gCache.ib, gCache.format);
                rp.drawIndexed(gCache.indexCount);
            }
            else
                rp.draw(gCache.vertexCount);
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
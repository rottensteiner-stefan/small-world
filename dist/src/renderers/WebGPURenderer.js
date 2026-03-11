import { Color } from "../core/colors/Color.js";
import { LightType } from "../enums/LightType.js";
import { Vector3D } from "../math/Vector3D.js";
import { RendererType } from "../enums/RendererType.js";
export class WebGPURenderer {
    type = RendererType.WEB_GPU; // <--- NEU
    device;
    context;
    format;
    pipelineLines;
    pipelineTriangles;
    pipelineSkybox; // <--- NEU
    bindGroupLayout;
    textureBindGroupLayout;
    cubeTextureBindGroupLayout; // <--- NEU
    depthTexture;
    canvas;
    clearColor = [0.1, 0.1, 0.1, 1.0];
    geoCache = new Map();
    objCache = new Map();
    texCache = new Map();
    defaultTexBindGroup;
    texCubeCache = new Map(); // <--- NEU
    defaultCubeTexBindGroup; // <--- NEU
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
        struct SpotLight { pos: vec4f, dir: vec4f, color: vec4f, params: vec4f }
        struct Unifs {
          vp: mat4x4f, model: mat4x4f, color: vec4f, specColor: vec4f,
          ambientColor: vec4f, dirLightColor: vec4f, dirLightDir: vec4f, camPos: vec4f,
          texOffset: vec2f, texRepeat: vec2f, shininess: f32, numPointLights: f32, numSpotLights: f32, pad: f32,
          pointLights: array<PointLight, 4>, spotLights: array<SpotLight, 4>
        }

        @group(0) @binding(0) var<uniform> u: Unifs;
        @group(1) @binding(0) var t_diffuse: texture_2d<f32>;
        @group(1) @binding(1) var s_diffuse: sampler;

        struct In { @location(0) pos: vec3f, @location(1) normal: vec3f, @location(2) uv: vec2f }
        struct Out { @builtin(position) pos: vec4f, @location(0) worldPos: vec3f, @location(1) normal: vec3f, @location(2) uv: vec2f }

        @vertex fn vs(i: In) -> Out {
            var o: Out;
            let wp = u.model * vec4f(i.pos, 1.0);
            o.worldPos = wp.xyz; o.pos = u.vp * wp; o.normal = (u.model * vec4f(i.normal, 0.0)).xyz; 
            o.uv = (i.uv * u.texRepeat) + u.texOffset;
            return o;
        }

        @fragment fn fs(i: Out) -> @location(0) vec4f {
            let texColor = textureSample(t_diffuse, s_diffuse, i.uv);
            if (u.shininess < -0.5) { return u.color * texColor; }
            
            let N = normalize(i.normal); let V = normalize(u.camPos.xyz - i.worldPos);
            var finalLight = u.ambientColor.rgb; var specular = vec3f(0.0);

            let L_dir = normalize(u.dirLightDir.xyz); let diff_dir = max(dot(N, L_dir), 0.0);
            finalLight += diff_dir * u.dirLightColor.rgb;
            if (u.shininess > 0.0 && diff_dir > 0.0) { specular += pow(max(dot(V, reflect(-L_dir, N)), 0.0), u.shininess) * u.dirLightColor.rgb; }

            for(var j = 0; j < 4; j++) {
                if (j >= i32(u.numPointLights)) { break; }
                let lightVec = u.pointLights[j].pos.xyz - i.worldPos; let dist = length(lightVec); let L_pt = lightVec / dist;
                let attenuation = 1.0 / (1.0 + 0.1 * dist + 0.01 * dist * dist); let diff_pt = max(dot(N, L_pt), 0.0);
                finalLight += diff_pt * u.pointLights[j].color.rgb * attenuation;
                if (u.shininess > 0.0 && diff_pt > 0.0) { specular += pow(max(dot(V, reflect(-L_pt, N)), 0.0), u.shininess) * u.pointLights[j].color.rgb * attenuation; }
            }

            for(var k = 0; k < 4; k++) {
                if (k >= i32(u.numSpotLights)) { break; }
                let lightVec = u.spotLights[k].pos.xyz - i.worldPos; let dist = length(lightVec); let L_sp = lightVec / dist;
                let S_dir = normalize(u.spotLights[k].dir.xyz); let theta = dot(-L_sp, S_dir);
                let cosOuter = u.spotLights[k].params.x; let cosInner = u.spotLights[k].params.y;
                if(theta > cosOuter) {
                    let spotEffect = smoothstep(cosOuter, cosInner, theta); let attenuation = 1.0 / (1.0 + 0.1 * dist + 0.01 * dist * dist); let diff_sp = max(dot(N, L_sp), 0.0);
                    finalLight += diff_sp * u.spotLights[k].color.rgb * attenuation * spotEffect;
                    if (u.shininess > 0.0 && diff_sp > 0.0) { specular += pow(max(dot(V, reflect(-L_sp, N)), 0.0), u.shininess) * u.spotLights[k].color.rgb * attenuation * spotEffect; }
                }
            }
            return vec4f((finalLight * u.color.rgb * texColor.rgb) + (specular * u.specColor.rgb), u.color.a * texColor.a);
        }

        // --- NEU: SKYBOX SHADER ---
        @group(1) @binding(0) var t_cube: texture_cube<f32>;
        @group(1) @binding(1) var s_cube: sampler;

        @vertex fn vs_sky(i: In) -> Out {
            var o: Out;
            let wp = u.model * vec4f(i.pos, 1.0);
            o.worldPos = wp.xyz; o.pos = u.vp * wp;
            o.uv = vec2f(0.0); 
            o.normal = i.pos; // Wir missbrauchen die Normal als Richtung für die Cubemap!
            return o;
        }

        @fragment fn fs_sky(i: Out) -> @location(0) vec4f {
            return textureSample(t_cube, s_cube, i.normal);
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
        this.textureBindGroupLayout = this.device.createBindGroupLayout({
            entries: [
                { binding: 0, visibility: GPUShaderStage.FRAGMENT, texture: {} },
                { binding: 1, visibility: GPUShaderStage.FRAGMENT, sampler: {} },
            ],
        });
        this.cubeTextureBindGroupLayout = this.device.createBindGroupLayout({
            entries: [
                { binding: 0, visibility: GPUShaderStage.FRAGMENT, texture: { viewDimension: "cube" } },
                { binding: 1, visibility: GPUShaderStage.FRAGMENT, sampler: {} },
            ],
        }); // <--- NEU
        const pipelineLayout = this.device.createPipelineLayout({
            bindGroupLayouts: [this.bindGroupLayout, this.textureBindGroupLayout],
        });
        const skyboxPipelineLayout = this.device.createPipelineLayout({
            bindGroupLayouts: [this.bindGroupLayout, this.cubeTextureBindGroupLayout],
        });
        const pipelineDescriptorTemplate = {
            layout: pipelineLayout,
            vertex: {
                module: shader,
                entryPoint: "vs",
                buffers: [
                    {
                        arrayStride: 12,
                        attributes: [{ shaderLocation: 0, offset: 0, format: "float32x3" }],
                    },
                    {
                        arrayStride: 12,
                        attributes: [{ shaderLocation: 1, offset: 0, format: "float32x3" }],
                    },
                    {
                        arrayStride: 8,
                        attributes: [{ shaderLocation: 2, offset: 0, format: "float32x2" }],
                    },
                ],
            },
            fragment: { module: shader, entryPoint: "fs", targets: [{ format: this.format }] },
            depthStencil: {
                depthWriteEnabled: true,
                depthCompare: "less",
                format: "depth24plus",
            },
        };
        this.pipelineTriangles = this.device.createRenderPipeline({
            ...pipelineDescriptorTemplate,
            primitive: { topology: "triangle-list", cullMode: "back" },
        });
        this.pipelineLines = this.device.createRenderPipeline({
            ...pipelineDescriptorTemplate,
            primitive: { topology: "line-list", cullMode: "none" },
        });
        // --- NEU: Skybox Pipeline ---
        this.pipelineSkybox = this.device.createRenderPipeline({
            ...pipelineDescriptorTemplate,
            layout: skyboxPipelineLayout,
            vertex: { ...pipelineDescriptorTemplate.vertex, entryPoint: "vs_sky" },
            fragment: { module: shader, entryPoint: "fs_sky", targets: [{ format: this.format }] },
            depthStencil: {
                depthWriteEnabled: false,
                depthCompare: "less",
                format: "depth24plus",
            }, // Kein Depth-Writing!
            primitive: { topology: "triangle-list", cullMode: "none" }, // Keine Kanten verbergen, wir sind drinnen!
        });
        this.createDepthTexture();
        this.createDefaultTexture();
    }
    createDefaultTexture() {
        const defaultTex = this.device.createTexture({
            size: [1, 1, 1],
            format: "rgba8unorm",
            usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
        });
        this.device.queue.writeTexture({ texture: defaultTex }, new Uint8Array([255, 255, 255, 255]), { bytesPerRow: 4, rowsPerImage: 1 }, [1, 1, 1]);
        const defaultSampler = this.device.createSampler();
        this.defaultTexBindGroup = this.device.createBindGroup({
            layout: this.textureBindGroupLayout,
            entries: [
                { binding: 0, resource: defaultTex.createView() },
                { binding: 1, resource: defaultSampler },
            ],
        });
        // --- Default CUBE Texture ---
        const defaultCube = this.device.createTexture({
            size: [1, 1, 6],
            format: "rgba8unorm",
            dimension: "2d",
            usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
        });
        for (let i = 0; i < 6; i++) {
            this.device.queue.writeTexture({ texture: defaultCube, origin: [0, 0, i] }, new Uint8Array([50, 50, 100, 255]), { bytesPerRow: 4, rowsPerImage: 1 }, [1, 1, 1]);
        }
        this.defaultCubeTexBindGroup = this.device.createBindGroup({
            layout: this.cubeTextureBindGroupLayout,
            entries: [
                { binding: 0, resource: defaultCube.createView({ dimension: "cube" }) },
                { binding: 1, resource: defaultSampler },
            ],
        });
    }
    getGPUTextureBindGroup(tex) {
        if (!tex.isLoaded || !tex.image)
            return this.defaultTexBindGroup;
        let entry = this.texCache.get(tex);
        if (!entry) {
            const gpuTex = this.device.createTexture({
                size: [tex.image.width, tex.image.height, 1],
                format: "rgba8unorm",
                usage: GPUTextureUsage.TEXTURE_BINDING |
                    GPUTextureUsage.COPY_DST |
                    GPUTextureUsage.RENDER_ATTACHMENT,
            });
            this.device.queue.copyExternalImageToTexture({ source: tex.image }, { texture: gpuTex }, [
                tex.image.width,
                tex.image.height,
            ]);
            const sampler = this.device.createSampler({
                magFilter: tex.magFilter,
                minFilter: tex.minFilter,
                addressModeU: tex.wrapS,
                addressModeV: tex.wrapT,
            });
            entry = this.device.createBindGroup({
                layout: this.textureBindGroupLayout,
                entries: [
                    { binding: 0, resource: gpuTex.createView() },
                    { binding: 1, resource: sampler },
                ],
            });
            this.texCache.set(tex, entry);
        }
        return entry;
    }
    // --- NEU: CubeTexture Loader ---
    getGPUCubeTextureBindGroup(tex) {
        if (!tex.isLoaded || tex.images.length !== 6)
            return this.defaultCubeTexBindGroup;
        let entry = this.texCubeCache.get(tex);
        if (!entry) {
            const w = tex.images[0].width;
            const h = tex.images[0].height;
            const gpuTex = this.device.createTexture({
                size: [w, h, 6],
                dimension: "2d",
                format: "rgba8unorm",
                usage: GPUTextureUsage.COPY_DST |
                    GPUTextureUsage.RENDER_ATTACHMENT |
                    GPUTextureUsage.TEXTURE_BINDING,
            });
            for (let i = 0; i < 6; i++) {
                this.device.queue.copyExternalImageToTexture({ source: tex.images[i] }, { texture: gpuTex, origin: [0, 0, i] }, [w, h]);
            }
            const sampler = this.device.createSampler({ magFilter: "linear", minFilter: "linear" });
            entry = this.device.createBindGroup({
                layout: this.cubeTextureBindGroupLayout,
                entries: [
                    { binding: 0, resource: gpuTex.createView({ dimension: "cube" }) },
                    { binding: 1, resource: sampler },
                ],
            });
            this.texCubeCache.set(tex, entry);
        }
        return entry;
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
            usage: GPUTextureUsage.TEXTURE_BINDING |
                GPUTextureUsage.COPY_DST |
                GPUTextureUsage.RENDER_ATTACHMENT,
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
            let uvb;
            if (geometry.uvs && geometry.uvs.length > 0) {
                uvb = this.device.createBuffer({
                    size: geometry.uvs.byteLength,
                    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
                });
                this.device.queue.writeBuffer(uvb, 0, geometry.uvs.buffer, geometry.uvs.byteOffset, geometry.uvs.byteLength);
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
            entry = { vb, nb, uvb, ib, format, vertexCount: geometry.vertices.length / 3, indexCount };
            this.geoCache.set(geometry, entry);
        }
        return entry;
    }
    getObjCache(obj) {
        let entry = this.objCache.get(obj);
        if (!entry) {
            const ub = this.device.createBuffer({
                size: 640,
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
        const pLights = [], sLights = [];
        const extractLights = (node) => {
            if ("lightType" in node) {
                const light = node;
                switch (light.lightType) {
                    case LightType.AMBIENT:
                        aCol = new Color(light.color.r * light.intensity, light.color.g * light.intensity, light.color.b * light.intensity);
                        break;
                    case LightType.DIRECTIONAL: {
                        const dLight = light;
                        dDir = dLight.direction.clone().scale(-1).normalize();
                        dCol = new Color(light.color.r * light.intensity, light.color.g * light.intensity, light.color.b * light.intensity);
                        break;
                    }
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
        for (let i = 0; i < pLights.length; i++) {
            const pl = pLights[i], offset = 64 + i * 8;
            uData.set([pl.worldMatrix.data[12], pl.worldMatrix.data[13], pl.worldMatrix.data[14], 0.0], offset);
            uData.set([pl.color.r * pl.intensity, pl.color.g * pl.intensity, pl.color.b * pl.intensity, 0.0], offset + 4);
        }
        for (let i = 0; i < sLights.length; i++) {
            const sl = sLights[i], offset = 96 + i * 16;
            uData.set([sl.worldMatrix.data[12], sl.worldMatrix.data[13], sl.worldMatrix.data[14], 0.0], offset);
            const dir = sl.direction.clone();
            if (dir.length() > 0)
                dir.scale(1 / dir.length());
            uData.set([dir.x, dir.y, dir.z, 0.0], offset + 4);
            uData.set([sl.color.r * sl.intensity, sl.color.g * sl.intensity, sl.color.b * sl.intensity, 0.0], offset + 8);
            uData.set([Math.cos(sl.angle), Math.cos(sl.angle * (1.0 - sl.penumbra)), sl.distance, sl.decay], offset + 12);
        }
        const drawObject = (obj) => {
            if (obj.isVisible === false || !obj.material || !obj.geometry)
                return;
            if (obj.worldMatrix) {
                const isSkybox = obj.material.type === "SkyboxMaterial";
                // Pipeline auswählen!
                if (isSkybox) {
                    rp.setPipeline(this.pipelineSkybox);
                }
                else {
                    rp.setPipeline(obj.material.type === "WireframeMaterial" ? this.pipelineLines : this.pipelineTriangles);
                }
                uData.set(obj.worldMatrix.data, 16);
                uData.set(obj.material.color.toArray(), 32);
                let shininess = -1.0;
                let specCol = [0, 0, 0, 0];
                let texBindGroup = this.defaultTexBindGroup;
                let tOffset = [0, 0];
                let tRepeat = [1, 1];
                if (isSkybox) {
                    const mat = obj.material;
                    texBindGroup = mat.cubeMap
                        ? this.getGPUCubeTextureBindGroup(mat.cubeMap)
                        : this.defaultCubeTexBindGroup;
                }
                else if (obj.material.type === "LambertMaterial") {
                    shininess = 0.0;
                }
                else if (obj.material.type === "PhongMaterial") {
                    const material = obj.material;
                    shininess = material.shininess || 32;
                    specCol = material.specularColor ? material.specularColor.toArray() : [0, 0, 0, 0];
                    if (material.diffuseMap) {
                        texBindGroup = this.getGPUTextureBindGroup(material.diffuseMap);
                        tOffset = [material.diffuseMap.offset.x, material.diffuseMap.offset.y];
                        tRepeat = [material.diffuseMap.repeat.x, material.diffuseMap.repeat.y];
                    }
                }
                uData.set(specCol, 36);
                uData.set(tOffset, 56);
                uData.set(tRepeat, 58);
                uData[60] = shininess;
                const oCache = this.getObjCache(obj);
                this.device.queue.writeBuffer(oCache.ub, 0, uData.buffer, uData.byteOffset, uData.byteLength);
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
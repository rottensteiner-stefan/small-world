// src/renderers/WebGPURenderer.ts
import { Scene } from "../core/Scene.js";
import { IRenderer } from "../interfaces/IRenderer.js";
import { Color } from "../core/colors/Color.js";
import { DirectionalLight } from "../core/lights/DirectionalLight.js";
import { AmbientLight } from "../core/lights/AmbientLight.js";
import { PointLight } from "../core/lights/PointLight.js";
import { SpotLight } from "../core/lights/SpotLight.js";
import { Vector3D } from "../math/Vector3D.js";
import { IGeometryData } from "../interfaces/IGeometryData.js";
import { Object3D } from "../core/Object3D.js";
import { PhongMaterial } from "../core/materials/PhongMaterial.js";
import { LightType } from "../enums/LightType.js";
import { Light } from "../core/lights/Light.js";
import { Texture } from "../core/textures/Texture.js";

interface GeoCacheEntry { vb: GPUBuffer; nb?: GPUBuffer; uvb?: GPUBuffer; ib?: GPUBuffer; format?: GPUIndexFormat; vertexCount: number; indexCount: number; }
interface ObjCacheEntry { ub: GPUBuffer; bg: GPUBindGroup; }

export class WebGPURenderer implements IRenderer {
    private device!: GPUDevice;
    private context!: GPUCanvasContext;
    private format!: GPUTextureFormat;
    private pipelineLines!: GPURenderPipeline;
    private pipelineTriangles!: GPURenderPipeline;

    private bindGroupLayout!: GPUBindGroupLayout;         // Für Matrizen/Lichter (Group 0)
    private textureBindGroupLayout!: GPUBindGroupLayout;  // Für Texturen (Group 1)

    private depthTexture!: GPUTexture;
    private canvas!: HTMLCanvasElement;
    private clearColor: number[] = [0.1, 0.1, 0.1, 1.0];

    private geoCache = new Map<IGeometryData, GeoCacheEntry>();
    private objCache = new Map<Object3D, ObjCacheEntry>();
    private texCache = new Map<Texture, GPUBindGroup>();  // <--- NEU
    private defaultTexBindGroup!: GPUBindGroup;           // <--- NEU

    public async initialize(canvas: HTMLCanvasElement): Promise<void> {
        this.canvas = canvas;
        const adapter = await navigator.gpu.requestAdapter();
        this.device = await adapter!.requestDevice();
        this.context = canvas.getContext("webgpu")!;
        this.format = navigator.gpu.getPreferredCanvasFormat();
        this.context.configure({ device: this.device, format: this.format });

        // --- WGSL SHADER UPDATE (Group 1 & UVs) ---
        const shader = this.device.createShaderModule({
            code: `
        struct PointLight { pos: vec4f, color: vec4f }
        struct SpotLight { pos: vec4f, dir: vec4f, color: vec4f, params: vec4f }

        struct Unifs {
          vp: mat4x4f, model: mat4x4f, color: vec4f, specColor: vec4f,
          ambientColor: vec4f, dirLightColor: vec4f, dirLightDir: vec4f, camPos: vec4f,
          shininess: f32, numPointLights: f32, numSpotLights: f32, pad: f32,
          pointLights: array<PointLight, 4>,
          spotLights: array<SpotLight, 4>
        }

        @group(0) @binding(0) var<uniform> u: Unifs;
        @group(1) @binding(0) var t_diffuse: texture_2d<f32>;
        @group(1) @binding(1) var s_diffuse: sampler;

        struct In { @location(0) pos: vec3f, @location(1) normal: vec3f, @location(2) uv: vec2f }
        struct Out { @builtin(position) pos: vec4f, @location(0) worldPos: vec3f, @location(1) normal: vec3f, @location(2) uv: vec2f }

        @vertex fn vs(i: In) -> Out {
            var o: Out;
            let wp = u.model * vec4f(i.pos, 1.0);
            o.worldPos = wp.xyz; o.pos = u.vp * wp; o.normal = (u.model * vec4f(i.normal, 0.0)).xyz; o.uv = i.uv;
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
            // HIER IST DER FIX: u.specColor.rgb statt u_specColor.rgb
            return vec4f((finalLight * u.color.rgb * texColor.rgb) + (specular * u.specColor.rgb), u.color.a * texColor.a);
        }
      `,
        });

        // --- Layouts ---
        this.bindGroupLayout = this.device.createBindGroupLayout({
            entries: [{ binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: "uniform" } }],
        });
        this.textureBindGroupLayout = this.device.createBindGroupLayout({
            entries: [
                { binding: 0, visibility: GPUShaderStage.FRAGMENT, texture: {} },
                { binding: 1, visibility: GPUShaderStage.FRAGMENT, sampler: {} }
            ]
        });

        const pipelineLayout = this.device.createPipelineLayout({ bindGroupLayouts: [this.bindGroupLayout, this.textureBindGroupLayout] });

        const pipelineDescriptorTemplate = {
            layout: pipelineLayout,
            vertex: {
                module: shader, entryPoint: "vs",
                buffers: [
                    { arrayStride: 12, attributes: [{ shaderLocation: 0, offset: 0, format: "float32x3" as GPUVertexFormat }] },
                    { arrayStride: 12, attributes: [{ shaderLocation: 1, offset: 0, format: "float32x3" as GPUVertexFormat }] },
                    { arrayStride: 8, attributes: [{ shaderLocation: 2, offset: 0, format: "float32x2" as GPUVertexFormat }] }, // UV Buffer
                ],
            },
            fragment: { module: shader, entryPoint: "fs", targets: [{ format: this.format }] },
            depthStencil: { depthWriteEnabled: true, depthCompare: "less" as GPUCompareFunction, format: "depth24plus" as GPUTextureFormat },
        };

        this.pipelineTriangles = this.device.createRenderPipeline({ ...pipelineDescriptorTemplate, primitive: { topology: "triangle-list", cullMode: "back" } } as GPURenderPipelineDescriptor);
        this.pipelineLines = this.device.createRenderPipeline({ ...pipelineDescriptorTemplate, primitive: { topology: "line-list", cullMode: "none" } } as GPURenderPipelineDescriptor);

        this.createDepthTexture();
        this.createDefaultTexture();
    }

    // --- NEU: Standard weiße Textur ---
    private createDefaultTexture() {
        const defaultTex = this.device.createTexture({ size: [1, 1, 1], format: 'rgba8unorm', usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST });
        this.device.queue.writeTexture({ texture: defaultTex }, new Uint8Array([255, 255, 255, 255]), { bytesPerRow: 4, rowsPerImage: 1 }, [1, 1, 1]);
        const defaultSampler = this.device.createSampler();
        this.defaultTexBindGroup = this.device.createBindGroup({ layout: this.textureBindGroupLayout, entries: [{ binding: 0, resource: defaultTex.createView() }, { binding: 1, resource: defaultSampler }] });
    }

    // --- NEU: Texturen asynchron laden und BindGroup erstellen ---
    private getGPUTextureBindGroup(tex: Texture): GPUBindGroup {
        if (!tex.isLoaded || !tex.image) return this.defaultTexBindGroup;
        let entry = this.texCache.get(tex);
        if (!entry) {
            const gpuTex = this.device.createTexture({
                size: [tex.image.width, tex.image.height, 1],
                format: 'rgba8unorm',
                usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT
            });
            this.device.queue.copyExternalImageToTexture({ source: tex.image }, { texture: gpuTex }, [tex.image.width, tex.image.height]);

            const mapWrap = (w: string) => w === "clamp" ? "clamp-to-edge" : (w === "mirror" ? "mirror-repeat" : "repeat");
            const sampler = this.device.createSampler({
                magFilter: tex.magFilter as GPUFilterMode,
                minFilter: tex.minFilter as GPUFilterMode,
                addressModeU: mapWrap(tex.wrapS) as GPUAddressMode,
                addressModeV: mapWrap(tex.wrapT) as GPUAddressMode
            });

            entry = this.device.createBindGroup({ layout: this.textureBindGroupLayout, entries: [{ binding: 0, resource: gpuTex.createView() }, { binding: 1, resource: sampler }] });
            this.texCache.set(tex, entry);
        }
        return entry;
    }

    public setClearColor(color: Color): void { this.clearColor = color.toArray(); }
    private createDepthTexture() {
        if (this.depthTexture) this.depthTexture.destroy();
        this.depthTexture = this.device.createTexture({ size: [this.canvas.width, this.canvas.height], format: "depth24plus", usage: GPUTextureUsage.RENDER_ATTACHMENT });
    }
    public setSize(w: number, h: number) { this.canvas.width = w; this.canvas.height = h; this.createDepthTexture(); }

    private getGeoCache(geometry: IGeometryData): GeoCacheEntry {
        let entry = this.geoCache.get(geometry);
        if (!entry) {
            const vb = this.device.createBuffer({ size: geometry.vertices.byteLength, usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST });
            this.device.queue.writeBuffer(vb, 0, geometry.vertices.buffer as ArrayBuffer, geometry.vertices.byteOffset, geometry.vertices.byteLength);

            let nb: GPUBuffer | undefined;
            if (geometry.normals && geometry.normals.length > 0) {
                nb = this.device.createBuffer({ size: geometry.normals.byteLength, usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST });
                this.device.queue.writeBuffer(nb, 0, geometry.normals.buffer as ArrayBuffer, geometry.normals.byteOffset, geometry.normals.byteLength);
            }

            // --- NEU: UV Puffer ---
            let uvb: GPUBuffer | undefined;
            if (geometry.uvs && geometry.uvs.length > 0) {
                uvb = this.device.createBuffer({ size: geometry.uvs.byteLength, usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST });
                this.device.queue.writeBuffer(uvb, 0, geometry.uvs.buffer as ArrayBuffer, geometry.uvs.byteOffset, geometry.uvs.byteLength);
            }

            let ib: GPUBuffer | undefined; let format: GPUIndexFormat | undefined; let indexCount = 0;
            if (geometry.indices && geometry.indices.length > 0) {
                indexCount = geometry.indices.length;
                ib = this.device.createBuffer({ size: geometry.indices.byteLength, usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST });
                this.device.queue.writeBuffer(ib, 0, geometry.indices.buffer as ArrayBuffer, geometry.indices.byteOffset, geometry.indices.byteLength);
                format = geometry.indices instanceof Uint32Array ? "uint32" : "uint16";
            }
            entry = { vb, nb, uvb, ib, format, vertexCount: geometry.vertices.length / 3, indexCount };
            this.geoCache.set(geometry, entry);
        }
        return entry;
    }

    private getObjCache(obj: Object3D): ObjCacheEntry {
        let entry = this.objCache.get(obj);
        if (!entry) {
            const ub = this.device.createBuffer({ size: 624, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
            const bg = this.device.createBindGroup({ layout: this.bindGroupLayout, entries: [{ binding: 0, resource: { buffer: ub } }] });
            entry = { ub, bg };
            this.objCache.set(obj, entry);
        }
        return entry;
    }

    public render(scene: Scene, vpMatrix: Float32Array, camPos: Vector3D = new Vector3D()) {
        if (!this.device) return;
        const ce = this.device.createCommandEncoder();
        const rp = ce.beginRenderPass({
            colorAttachments: [{ view: this.context.getCurrentTexture().createView(), clearValue: this.clearColor, loadOp: "clear", storeOp: "store" }],
            depthStencilAttachment: { view: this.depthTexture.createView(), depthClearValue: 1.0, depthLoadOp: "clear", depthStoreOp: "store" },
        });

        let aCol = new Color(0,0,0), dDir = new Vector3D(0,1,0), dCol = new Color(0,0,0);
        const pLights: PointLight[] = [], sLights: SpotLight[] = [];
        const extractLights = (node: Object3D | Light) => {
            if ("lightType" in node) {
                const light = node as Light;
                switch (light.lightType) {
                    case LightType.AMBIENT: aCol = new Color(light.color.r * light.intensity, light.color.g * light.intensity, light.color.b * light.intensity); break;
                    case LightType.DIRECTIONAL: { const dLight = light as DirectionalLight; dDir = dLight.direction.clone().scale(-1); if (dDir.length() > 0) dDir.scale(1 / dDir.length()); dCol = new Color(light.color.r * light.intensity, light.color.g * light.intensity, light.color.b * light.intensity); break; }
                    case LightType.POINT: if (pLights.length < 4) pLights.push(light as PointLight); break;
                    case LightType.SPOT: if (sLights.length < 4) sLights.push(light as SpotLight); break;
                }
            }
            if (node.children) node.children.forEach(extractLights);
        };
        for (const obj of scene.objects) extractLights(obj);

        const uData = new Float32Array(156);
        uData.set(vpMatrix, 0); uData.set([aCol.r, aCol.g, aCol.b, 1.0], 40); uData.set([dCol.r, dCol.g, dCol.b, 1.0], 44); uData.set([dDir.x, dDir.y, dDir.z, 0.0], 48); uData.set([camPos.x, camPos.y, camPos.z, 0.0], 52); uData[57] = pLights.length; uData[58] = sLights.length;

        for (let i = 0; i < pLights.length; i++) {
            const pl = pLights[i], offset = 60 + i * 8;
            uData.set([pl.worldMatrix.data[12], pl.worldMatrix.data[13], pl.worldMatrix.data[14], 0.0], offset); uData.set([pl.color.r * pl.intensity, pl.color.g * pl.intensity, pl.color.b * pl.intensity, 0.0], offset + 4);
        }
        for (let i = 0; i < sLights.length; i++) {
            const sl = sLights[i], offset = 92 + i * 16;
            uData.set([sl.worldMatrix.data[12], sl.worldMatrix.data[13], sl.worldMatrix.data[14], 0.0], offset);
            const dir = sl.direction.clone(); if (dir.length() > 0) dir.scale(1 / dir.length());
            uData.set([dir.x, dir.y, dir.z, 0.0], offset + 4); uData.set([sl.color.r * sl.intensity, sl.color.g * sl.intensity, sl.color.b * sl.intensity, 0.0], offset + 8);
            uData.set([Math.cos(sl.angle), Math.cos(sl.angle * (1.0 - sl.penumbra)), sl.distance, sl.decay], offset + 12);
        }

        const drawObject = (obj: Object3D) => {
            if (obj.isVisible === false || !obj.material || !obj.geometry) return;
            if (obj.worldMatrix) {
                rp.setPipeline(obj.material.type === "WireframeMaterial" ? this.pipelineLines : this.pipelineTriangles);
                uData.set(obj.worldMatrix.data, 16);
                uData.set(obj.material.color.toArray(), 32);

                let shininess = -1.0; let specCol = [0, 0, 0, 0];
                let texBindGroup = this.defaultTexBindGroup; // <--- DEFAULT WEIß

                if (obj.material.type === "LambertMaterial") { shininess = 0.0; }
                else if (obj.material.type === "PhongMaterial") {
                    const material = obj.material as PhongMaterial;
                    shininess = material.shininess || 32;
                    specCol = material.specularColor ? material.specularColor.toArray() : [0, 0, 0, 0];

                    if (material.diffuseMap) {
                        texBindGroup = this.getGPUTextureBindGroup(material.diffuseMap);
                    }
                }

                uData.set(specCol, 36); uData[56] = shininess;

                const oCache = this.getObjCache(obj);
                this.device.queue.writeBuffer(oCache.ub, 0, uData.buffer as ArrayBuffer, uData.byteOffset, uData.byteLength);

                const gCache = this.getGeoCache(obj.geometry);
                rp.setBindGroup(0, oCache.bg);
                rp.setBindGroup(1, texBindGroup); // <--- Textur an Shader übergeben!

                rp.setVertexBuffer(0, gCache.vb);
                rp.setVertexBuffer(1, gCache.nb ? gCache.nb : gCache.vb);
                rp.setVertexBuffer(2, gCache.uvb ? gCache.uvb : gCache.vb); // <--- UV Buffer

                if (gCache.ib && gCache.format) { rp.setIndexBuffer(gCache.ib, gCache.format); rp.drawIndexed(gCache.indexCount); } else rp.draw(gCache.vertexCount);
            }
            if (obj.children) for (const child of obj.children) drawObject(child);
        };
        for (const obj of scene.objects || []) drawObject(obj);
        rp.end(); this.device.queue.submit([ce.finish()]);
    }
}
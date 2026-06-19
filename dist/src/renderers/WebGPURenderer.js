/// src/renderers/WebGPURenderer.ts
import { ShaderRegistry, DeviceCaps } from "../core/index.js";
import { MathPool, Vector3D, Matrix4 } from "../math/index.js";
import { BlendingMode, RendererType, TextureFilter, TextureWrap, PostProcessingEffectType, } from "../enums/index.js";
import { AbstractRenderer } from "./AbstractRenderer.js";
import { MainRenderPass } from "./passes/MainRenderPass.js";
import { PostProcessPass } from "./passes/PostProcessPass.js";
import { BloomPassGPU } from "./post/BloomPassGPU.js";
import { UniformPacker } from "../core/renderers/shaders/UniformPacker.js";
/**
 * Modern WebGPU implementation with dynamic vertex updates and memory management.
 */
export class WebGPURenderer extends AbstractRenderer {
    type = RendererType.WEB_GPU;
    _adapter = undefined;
    _device = undefined;
    /** Satisfies Renderer interface */
    get gpuDevice() {
        return this._device;
    }
    _context;
    _format;
    _pipelines = new Map();
    _shaderModules = new Map();
    _whiteTexView;
    _flatNormalTexView;
    _objectUniformBuffers = new Map();
    _materialBindGroups = new Map();
    _textureViewCache = new Map();
    _dummyNormalBuffer;
    _dummyUvBuffer;
    _dummyTangentBuffer;
    _geoCache = new Map();
    _frameCount = 0;
    _scratchModelMatrix = new Float32Array(16);
    _scratchColorArray = new Float32Array(3);
    _scratchUniformValues = {};
    _defaultCubeTexView;
    _samplerCache = new Map();
    _dummyBufferSize = 0;
    _cubeTextureViewCache = new Map();
    _scratchGlobalBufferData = new Float32Array(48);
    _scratchPointLightData = new Float32Array(32); // Max 4 lights
    _scratchSpotLightData = new Float32Array(64); // Max 4 lights
    _scratchAreaLightData = new Float32Array(96); // Max 4 lights
    _scratchObjBufferData = new Float32Array(256 / 4); // Max 256 bytes
    _depthTexture;
    _opaqueTexture;
    _opaqueTextureView;
    _hdrTexture = undefined;
    _hdrTextureView = undefined;
    _bloomPassGPU = undefined;
    _bloomTextureView = undefined;
    // Render Pass System
    _passes = [];
    _globalUniformBuffer;
    _pointLightBuffer;
    _spotLightBuffer;
    _areaLightBuffer;
    _globalBindGroup;
    _globalBGL;
    _materialBGL;
    _objectBGL;
    /** @inheritdoc */
    async initialize(canvas, attributes, config) {
        this._adapter = (await navigator.gpu.requestAdapter(attributes)) ?? undefined;
        if (!this._adapter)
            throw new Error("[WebGPURenderer] No adapter found.");
        this._device = await this._adapter.requestDevice();
        // Update DeviceCaps with actual WebGPU limits
        DeviceCaps.updateLimits({
            maxTextureSize: this._device.limits.maxTextureDimension2D,
            maxUniformBufferSize: this._device.limits.maxUniformBufferBindingSize,
            maxTextureImageUnits: this._device.limits.maxSampledTexturesPerShaderStage,
        });
        // Add uncapturederror listener
        this._device.onuncapturederror = (event) => {
            console.error("[WebGPU Error]:", event.error.message);
        };
        if (config?.quality) {
            this._quality = { ...this._quality, ...config.quality };
        }
        this._context = canvas.getContext("webgpu");
        this._format = navigator.gpu.getPreferredCanvasFormat();
        this._context.configure({
            device: this._device,
            format: this._format,
            usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC,
            alphaMode: "premultiplied",
        });
        this._initDefaultResources();
        this._initGlobalBuffers();
        this.setSize(canvas.clientWidth, canvas.clientHeight);
        // Default Pass Setup
        this._passes = [new MainRenderPass(), new PostProcessPass()];
    }
    /**
     * Adds a render pass to the pipeline.
     * @param pass The pass to add.
     */
    addPass(pass) {
        this._passes.push(pass);
    }
    _initDefaultResources() {
        const create1x1 = (col) => {
            const t = this._device.createTexture({
                size: [1, 1],
                format: "rgba8unorm",
                usage: GPUTextureUsage.TEXTURE_BINDING |
                    GPUTextureUsage.COPY_DST |
                    GPUTextureUsage.RENDER_ATTACHMENT,
            });
            this._device.queue.writeTexture({ texture: t }, new Uint8Array(col), { bytesPerRow: 4 }, [1, 1]);
            return t.createView();
        };
        this._whiteTexView = create1x1([255, 255, 255, 255]);
        this._flatNormalTexView = create1x1([128, 128, 255, 255]);
        const whiteCube = this._device.createTexture({
            size: [1, 1, 6],
            format: "rgba8unorm",
            usage: GPUTextureUsage.TEXTURE_BINDING |
                GPUTextureUsage.COPY_DST |
                GPUTextureUsage.RENDER_ATTACHMENT,
        });
        for (let i = 0; i < 6; i++) {
            this._device.queue.writeTexture({ texture: whiteCube, origin: [0, 0, i] }, new Uint8Array([50, 50, 100, 255]), { bytesPerRow: 4 }, [1, 1]);
        }
        this._defaultCubeTexView = whiteCube.createView({ dimension: "cube" });
        this._ensureDummyBufferSize(1000);
    }
    _getSampler(tex) {
        const mag = tex?.magFilter === TextureFilter.NEAREST ? "nearest" : "linear";
        const min = tex?.minFilter === TextureFilter.NEAREST ? "nearest" : "linear";
        const mapWrap = (w) => {
            if (w === TextureWrap.REPEAT)
                return "repeat";
            if (w === TextureWrap.MIRRORED_REPEAT)
                return "mirror-repeat";
            return "clamp-to-edge";
        };
        const u = mapWrap(tex?.addressModeU);
        const v = mapWrap(tex?.addressModeV);
        const key = mag + "_" + min + "_" + u + "_" + v;
        let s = this._samplerCache.get(key);
        if (!s) {
            s = this._device.createSampler({
                magFilter: mag,
                minFilter: min,
                addressModeU: u,
                addressModeV: v,
                mipmapFilter: "linear",
            });
            this._samplerCache.set(key, s);
        }
        return s;
    }
    _ensureDummyBufferSize(vertexCount) {
        if (this._dummyBufferSize >= vertexCount * 3 && this._dummyNormalBuffer)
            return;
        const newSize = Math.max(this._dummyBufferSize * 2, vertexCount * 3, 3000);
        if (this._dummyNormalBuffer)
            this._dummyNormalBuffer.destroy();
        if (this._dummyUvBuffer)
            this._dummyUvBuffer.destroy();
        if (this._dummyTangentBuffer)
            this._dummyTangentBuffer.destroy();
        const normalData = new Float32Array(newSize).fill(0);
        for (let i = 0; i < newSize; i += 3)
            normalData[i + 1] = 1.0;
        this._dummyNormalBuffer = this._device.createBuffer({
            size: normalData.byteLength,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
        });
        this._device.queue.writeBuffer(this._dummyNormalBuffer, 0, normalData);
        const uvData = new Float32Array(newSize).fill(0);
        this._dummyUvBuffer = this._device.createBuffer({
            size: uvData.byteLength,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
        });
        this._device.queue.writeBuffer(this._dummyUvBuffer, 0, uvData);
        const tangentData = new Float32Array(newSize).fill(0);
        for (let i = 0; i < newSize; i += 3)
            tangentData[i] = 1.0;
        this._dummyTangentBuffer = this._device.createBuffer({
            size: tangentData.byteLength,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
        });
        this._device.queue.writeBuffer(this._dummyTangentBuffer, 0, tangentData);
        this._dummyBufferSize = newSize;
    }
    _initGlobalBuffers() {
        this._globalUniformBuffer = this._device.createBuffer({
            size: 256,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });
        this._pointLightBuffer = this._device.createBuffer({
            size: 2048,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        });
        this._spotLightBuffer = this._device.createBuffer({
            size: 4096,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        });
        this._areaLightBuffer = this._device.createBuffer({
            size: 4096,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        });
        this._globalBGL = this._device.createBindGroupLayout({
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                    buffer: { type: "uniform" },
                },
                { binding: 1, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "read-only-storage" } },
                { binding: 2, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "read-only-storage" } },
                { binding: 3, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "read-only-storage" } },
            ],
        });
        this._globalBindGroup = this._device.createBindGroup({
            layout: this._globalBGL,
            entries: [
                { binding: 0, resource: { buffer: this._globalUniformBuffer } },
                { binding: 1, resource: { buffer: this._pointLightBuffer } },
                { binding: 2, resource: { buffer: this._spotLightBuffer } },
                { binding: 3, resource: { buffer: this._areaLightBuffer } },
            ],
        });
        const matEntries = [
            { binding: 1, visibility: GPUShaderStage.FRAGMENT, sampler: { type: "filtering" } },
        ];
        for (let i = 2; i <= 10; i++) {
            matEntries.push({
                binding: i,
                visibility: GPUShaderStage.FRAGMENT,
                texture: { sampleType: "float" },
            });
        }
        matEntries.push({
            binding: 11,
            visibility: GPUShaderStage.FRAGMENT,
            texture: { viewDimension: "cube" },
        });
        matEntries.push({
            binding: 12,
            visibility: GPUShaderStage.FRAGMENT,
            texture: { viewDimension: "2d", sampleType: "float" },
        }, {
            binding: 13,
            visibility: GPUShaderStage.FRAGMENT,
            texture: { viewDimension: "2d", sampleType: "float" },
        }, {
            binding: 14,
            visibility: GPUShaderStage.FRAGMENT,
            texture: { viewDimension: "2d", sampleType: "float" },
        });
        this._materialBGL = this._device.createBindGroupLayout({ entries: matEntries });
        this._objectBGL = this._device.createBindGroupLayout({
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                    buffer: { type: "uniform" },
                },
            ],
        });
    }
    _getPipeline(manifest, topology) {
        const shaderId = manifest.shaderId;
        const state = manifest.state || {};
        const targetFormat = this.postProcessing.enabled ? "rgba16float" : this._format;
        const key = shaderId +
            "_" +
            topology +
            "_" +
            (state.culling || "back") +
            "_" +
            (state.blending || "none") +
            "_" +
            (state.depthWrite !== false) +
            "_" +
            (state.depthTest !== false) +
            "_" +
            targetFormat;
        let cache = this._pipelines.get(key);
        if (!cache) {
            console.log("[WebGPURenderer] Creating new pipeline:", key);
            const sm = this._getShaderModule(shaderId);
            const pipelineLayout = this._device.createPipelineLayout({
                bindGroupLayouts: [this._globalBGL, this._materialBGL, this._objectBGL],
            });
            const vertexBuffers = [
                { arrayStride: 12, attributes: [{ shaderLocation: 0, offset: 0, format: "float32x3" }] },
                { arrayStride: 12, attributes: [{ shaderLocation: 1, offset: 0, format: "float32x3" }] },
                { arrayStride: 8, attributes: [{ shaderLocation: 2, offset: 0, format: "float32x2" }] },
                { arrayStride: 12, attributes: [{ shaderLocation: 3, offset: 0, format: "float32x3" }] },
            ];
            const targets = [{ format: targetFormat }];
            if (state.blending === BlendingMode.ALPHA) {
                targets[0].blend = {
                    color: { srcFactor: "src-alpha", dstFactor: "one-minus-src-alpha", operation: "add" },
                    alpha: { srcFactor: "one", dstFactor: "one-minus-src-alpha", operation: "add" },
                };
            }
            else if (state.blending === BlendingMode.ADDITIVE) {
                targets[0].blend = {
                    color: { srcFactor: "one", dstFactor: "one", operation: "add" },
                    alpha: { srcFactor: "one", dstFactor: "one", operation: "add" },
                };
            }
            else if (state.blending === BlendingMode.PREMULTIPLIED_ALPHA) {
                targets[0].blend = {
                    color: { srcFactor: "one", dstFactor: "one-minus-src-alpha", operation: "add" },
                    alpha: { srcFactor: "one", dstFactor: "one-minus-src-alpha", operation: "add" },
                };
            }
            const pipeline = this._device.createRenderPipeline({
                layout: pipelineLayout,
                vertex: { module: sm, entryPoint: "vs", buffers: vertexBuffers },
                fragment: { module: sm, entryPoint: "fs", targets },
                primitive: { topology, cullMode: state.culling || "back" },
                depthStencil: {
                    depthWriteEnabled: state.depthWrite !== false,
                    depthCompare: state.depthTest === false ? "always" : "less-equal",
                    format: "depth24plus",
                },
            });
            cache = {
                pipeline,
                layout: pipelineLayout,
                bgLayouts: [this._globalBGL, this._materialBGL, this._objectBGL],
            };
            this._pipelines.set(key, cache);
        }
        return cache;
    }
    _getShaderModule(shaderId) {
        let sm = this._shaderModules.get(shaderId);
        if (!sm) {
            const def = ShaderRegistry.instance.get(shaderId);
            const code = ShaderRegistry.instance.assemble(def.sources.wgsl, "wgsl");
            sm = this._device.createShaderModule({ code });
            this._shaderModules.set(shaderId, sm);
        }
        return sm;
    }
    _getGeoCache(geo) {
        let c = this._geoCache.get(geo);
        if (!c || geo.needsUpdate) {
            const createBuf = (data, usage) => {
                const b = this._device.createBuffer({
                    size: (data.byteLength + 3) & ~3,
                    usage,
                    mappedAtCreation: true,
                });
                new Uint8Array(b.getMappedRange()).set(new Uint8Array(data.buffer, data.byteOffset, data.byteLength));
                b.unmap();
                return b;
            };
            if (c && geo.needsUpdate) {
                this._device.queue.writeBuffer(c.vb, 0, geo.vertices);
                if (c.nb && geo.normals)
                    this._device.queue.writeBuffer(c.nb, 0, geo.normals);
                geo.needsUpdate = false;
                return c;
            }
            c = {
                vb: createBuf(geo.vertices, GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST),
                nb: geo.normals?.length
                    ? createBuf(geo.normals, GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST)
                    : undefined,
                uvb: geo.uvs?.length ? createBuf(geo.uvs, GPUBufferUsage.VERTEX) : undefined,
                tb: geo.tangents?.length
                    ? createBuf(geo.tangents, GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST)
                    : undefined,
                ib: geo.indices?.length ? createBuf(geo.indices, GPUBufferUsage.INDEX) : undefined,
                wib: geo.wireframeIndices?.length
                    ? createBuf(geo.wireframeIndices, GPUBufferUsage.INDEX)
                    : undefined,
                indexCount: geo.indices?.length || 0,
                wireframeIndexCount: geo.wireframeIndices?.length || 0,
                vertexCount: geo.vertices.length / 3,
                format: geo.indices?.BYTES_PER_ELEMENT === 4 || geo.wireframeIndices?.BYTES_PER_ELEMENT === 4
                    ? "uint32"
                    : "uint16",
            };
            this._geoCache.set(geo, c);
            geo.needsUpdate = false;
        }
        return c;
    }
    render(scene, vp, camPos = Vector3D.ZERO, vMat) {
        if (!this._device)
            return;
        this._frameCount++;
        const lights = this.extractLights(scene);
        this._updateGlobalBuffers(vp, camPos, lights, scene.fog);
        const ce = this._device.createCommandEncoder();
        if (this.postProcessing.enabled && !this._hdrTexture) {
            this._hdrTexture = this._device.createTexture({
                size: [this._context.canvas.width, this._context.canvas.height],
                format: "rgba16float",
                usage: GPUTextureUsage.RENDER_ATTACHMENT |
                    GPUTextureUsage.TEXTURE_BINDING |
                    GPUTextureUsage.COPY_SRC,
            });
            this._hdrTextureView = this._hdrTexture.createView();
        }
        else if (!this.postProcessing.enabled && this._hdrTexture) {
            this._hdrTexture.destroy();
            this._hdrTexture = undefined;
            this._hdrTextureView = undefined;
        }
        const screenView = this._context.getCurrentTexture().createView();
        const renderTargetView = this.postProcessing.enabled ? this._hdrTextureView : screenView;
        const bloomNode = this.postProcessing.get(PostProcessingEffectType.BLOOM);
        for (const pass of this._passes) {
            if (pass.name === "PostProcessPass" &&
                bloomNode &&
                bloomNode.enabled &&
                this._hdrTexture &&
                this._hdrTextureView) {
                this._bloomPassGPU ??= new BloomPassGPU(this._device);
                this._bloomTextureView =
                    this._bloomPassGPU.execute(ce, this._hdrTexture, this._hdrTextureView, bloomNode) ??
                        undefined;
            }
            else if (pass.name === "PostProcessPass") {
                this._bloomTextureView = undefined;
            }
            pass.execute(this, scene, ce, renderTargetView, vp, camPos, vMat);
        }
        this._device.queue.submit([ce.finish()]);
        if (this._frameCount % 100 === 0)
            this._pruneObjectBuffers();
    }
    captureOpaqueTexture(ce, targetTex) {
        if (!this._opaqueTexture ||
            this._opaqueTexture.width !== targetTex.width ||
            this._opaqueTexture.height !== targetTex.height) {
            if (this._opaqueTexture)
                this._opaqueTexture.destroy();
            this._opaqueTexture = this._device.createTexture({
                size: [targetTex.width, targetTex.height, 1],
                format: targetTex.format,
                usage: GPUTextureUsage.COPY_DST | GPUTextureUsage.TEXTURE_BINDING,
            });
            this._opaqueTextureView = this._opaqueTexture.createView();
        }
        ce.copyTextureToTexture({ texture: targetTex }, { texture: this._opaqueTexture }, [
            targetTex.width,
            targetTex.height,
            1,
        ]);
    }
    _pruneObjectBuffers() {
        for (const [uuid, data] of this._objectUniformBuffers.entries()) {
            if (this._frameCount - data.lastFrame > 100) {
                data.buffer.destroy();
                this._objectUniformBuffers.delete(uuid);
            }
        }
    }
    _renderGroup(rp, _shaderId, materialGroups, vMat, topology = "triangle-list") {
        rp.setBindGroup(0, this._globalBindGroup);
        for (const [matUuid, objects] of materialGroups.entries()) {
            const mat = objects[0]?.material;
            if (!mat)
                continue;
            const manifest = mat.getRenderManifest();
            const cache = this._getPipeline(manifest, topology);
            rp.setPipeline(cache.pipeline);
            const matBindGroup = this._getMaterialBindGroup(matUuid, manifest, cache.bgLayouts[1]);
            rp.setBindGroup(1, matBindGroup);
            for (const obj of objects) {
                if (!obj.geometry)
                    continue;
                const uBufferData = this._getObjUniformBufferData(obj);
                this._updateObjUniformBuffer(uBufferData.buffer, obj, manifest, vMat);
                const objBindGroup = this._getObjBindGroup(uBufferData, cache.bgLayouts[2]);
                rp.setBindGroup(2, objBindGroup);
                const gCache = this._getGeoCache(obj.geometry);
                this._ensureDummyBufferSize(gCache.vertexCount);
                rp.setVertexBuffer(0, gCache.vb);
                rp.setVertexBuffer(1, gCache.nb || this._dummyNormalBuffer);
                rp.setVertexBuffer(2, gCache.uvb || this._dummyUvBuffer);
                rp.setVertexBuffer(3, gCache.tb || this._dummyTangentBuffer);
                if (topology === "line-list") {
                    if (gCache.wib) {
                        rp.setIndexBuffer(gCache.wib, gCache.format);
                        rp.drawIndexed(gCache.wireframeIndexCount);
                    }
                    else if (gCache.ib) {
                        rp.setIndexBuffer(gCache.ib, gCache.format);
                        rp.drawIndexed(gCache.indexCount);
                    }
                    else {
                        rp.draw(gCache.vertexCount);
                    }
                }
                else if (gCache.ib) {
                    rp.setIndexBuffer(gCache.ib, gCache.format);
                    rp.drawIndexed(gCache.indexCount);
                }
                else {
                    rp.draw(gCache.vertexCount);
                }
            }
        }
    }
    _getObjUniformBufferData(obj) {
        let data = this._objectUniformBuffers.get(obj.uuid);
        if (!data) {
            const buffer = this._device.createBuffer({
                size: 256,
                usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            });
            data = { buffer, lastFrame: this._frameCount };
            this._objectUniformBuffers.set(obj.uuid, data);
        }
        data.lastFrame = this._frameCount;
        return data;
    }
    _updateObjUniformBuffer(b, o, m, vMat) {
        const shaderDef = ShaderRegistry.instance.get(m.shaderId);
        if (!shaderDef)
            return;
        this._scratchModelMatrix.set(o.worldMatrix.data);
        const state = m.state;
        if (state?.isSprite && vMat) {
            const sx = Math.sqrt(this._scratchModelMatrix[0] ** 2 +
                this._scratchModelMatrix[1] ** 2 +
                this._scratchModelMatrix[2] ** 2);
            const sy = Math.sqrt(this._scratchModelMatrix[4] ** 2 +
                this._scratchModelMatrix[5] ** 2 +
                this._scratchModelMatrix[6] ** 2);
            const sz = Math.sqrt(this._scratchModelMatrix[8] ** 2 +
                this._scratchModelMatrix[9] ** 2 +
                this._scratchModelMatrix[10] ** 2);
            this._scratchModelMatrix[0] = vMat[0] * sx;
            this._scratchModelMatrix[1] = vMat[4] * sx;
            this._scratchModelMatrix[2] = vMat[8] * sx;
            this._scratchModelMatrix[4] = vMat[1] * sy;
            this._scratchModelMatrix[5] = vMat[5] * sy;
            this._scratchModelMatrix[6] = vMat[9] * sy;
            this._scratchModelMatrix[8] = vMat[2] * sz;
            this._scratchModelMatrix[9] = vMat[6] * sz;
            this._scratchModelMatrix[10] = vMat[10] * sz;
        }
        const values = this._scratchUniformValues;
        // Clear old values to avoid leaking without modifying the hidden class shape
        for (const k in values) {
            values[k] = undefined;
        }
        // Copy properties
        for (const k in m.properties) {
            values[k] = m.properties[k];
        }
        values["u_model"] = this._scratchModelMatrix;
        if (values["u_color"] === undefined && o.material) {
            this._scratchColorArray[0] = o.material.color.r;
            this._scratchColorArray[1] = o.material.color.g;
            this._scratchColorArray[2] = o.material.color.b;
            values["u_color"] = this._scratchColorArray;
        }
        UniformPacker.packInto(shaderDef.layout, values, this._scratchObjBufferData);
        this._device.queue.writeBuffer(b, 0, this._scratchObjBufferData);
    }
    _getMaterialBindGroup(matUuid, m, layout) {
        const r1 = this._getSampler(m.textures["u_diffuseMap"]);
        const r2 = this._getTextureView(m.textures["u_diffuseMap"]);
        const r3 = this._getNormalTextureView(m.textures["u_normalMap"]);
        const r4 = this._getTextureView(m.textures["u_specularMap"]);
        const r5 = this._getTextureView(m.textures["u_sandMap"]);
        const r6 = this._getTextureView(m.textures["u_grassMap"]);
        const r7 = this._getTextureView(m.textures["u_rockMap"]);
        const r8 = this._getTextureView(m.textures["u_snowMap"]);
        const r9 = this._getTextureView(m.textures["u_metallicMap"]);
        const r10 = this._getTextureView(m.textures["u_roughnessMap"]);
        const envOrSkybox = m.textures["u_skybox"] || m.textures["u_envMap"];
        const r11 = this._getGPUCubeTextureView(envOrSkybox);
        const r12 = this._getTextureView(m.textures["u_emissiveMap"]);
        const r13 = this._getTextureView(m.textures["u_alphaMap"]);
        const r14 = m.textures["u_opaqueMap"]
            ? this._getTextureView(m.textures["u_opaqueMap"])
            : this._opaqueTextureView || this._whiteTexView;
        const cache = this._materialBindGroups.get(matUuid);
        if (cache) {
            const resources = cache.resources;
            if (resources[0] === r1 &&
                resources[1] === r2 &&
                resources[2] === r3 &&
                resources[3] === r4 &&
                resources[4] === r5 &&
                resources[5] === r6 &&
                resources[6] === r7 &&
                resources[7] === r8 &&
                resources[8] === r9 &&
                resources[9] === r10 &&
                resources[10] === r11 &&
                resources[11] === r12 &&
                resources[12] === r13 &&
                resources[13] === r14) {
                return cache.bg;
            }
        }
        const entries = [
            { binding: 1, resource: r1 },
            { binding: 2, resource: r2 },
            { binding: 3, resource: r3 },
            { binding: 4, resource: r4 },
            { binding: 5, resource: r5 },
            { binding: 6, resource: r6 },
            { binding: 7, resource: r7 },
            { binding: 8, resource: r8 },
            { binding: 9, resource: r9 },
            { binding: 10, resource: r10 },
            { binding: 11, resource: r11 },
            { binding: 12, resource: r12 },
            { binding: 13, resource: r13 },
            { binding: 14, resource: r14 },
        ];
        const bg = this._device.createBindGroup({ layout, entries });
        this._materialBindGroups.set(matUuid, {
            bg,
            resources: [r1, r2, r3, r4, r5, r6, r7, r8, r9, r10, r11, r12, r13, r14],
        });
        return bg;
    }
    _getObjBindGroup(objBufferData, layout) {
        if (objBufferData.objBg)
            return objBufferData.objBg;
        objBufferData.objBg = this._device.createBindGroup({
            layout,
            entries: [{ binding: 0, resource: { buffer: objBufferData.buffer } }],
        });
        return objBufferData.objBg;
    }
    _getTextureView(tex) {
        if (!tex || !tex.isLoaded || !tex.image)
            return this._whiteTexView;
        let v = this._textureViewCache.get(tex);
        if (!v) {
            const t = this._device.createTexture({
                size: [tex.image.width, tex.image.height],
                format: "rgba8unorm",
                usage: GPUTextureUsage.TEXTURE_BINDING |
                    GPUTextureUsage.COPY_DST |
                    GPUTextureUsage.RENDER_ATTACHMENT,
            });
            this._device.queue.copyExternalImageToTexture({ source: tex.image }, { texture: t }, [
                tex.image.width,
                tex.image.height,
            ]);
            v = t.createView();
            this._textureViewCache.set(tex, v);
        }
        return v;
    }
    _getNormalTextureView(tex) {
        if (!tex || !tex.isLoaded || !tex.image)
            return this._flatNormalTexView;
        return this._getTextureView(tex);
    }
    _getGPUCubeTextureView(tex) {
        if (!tex || !tex.isLoaded || tex.images.length !== 6)
            return this._defaultCubeTexView;
        let v = this._cubeTextureViewCache.get(tex);
        if (!v) {
            const img = tex.images[0];
            const t = this._device.createTexture({
                size: [img.width, img.height, 6],
                format: "rgba8unorm",
                usage: GPUTextureUsage.TEXTURE_BINDING |
                    GPUTextureUsage.COPY_DST |
                    GPUTextureUsage.RENDER_ATTACHMENT,
            });
            for (let i = 0; i < 6; i++)
                this._device.queue.copyExternalImageToTexture({ source: tex.images[i] }, { texture: t, origin: [0, 0, i] }, [img.width, img.height]);
            v = t.createView({ dimension: "cube" });
            this._cubeTextureViewCache.set(tex, v);
        }
        return v;
    }
    _updateGlobalBuffers(vp, camPos, lights, fog) {
        const correctedVp = MathPool.acquireMatrix();
        const originalVp = MathPool.acquireMatrix();
        originalVp.data.set(vp);
        // WebGPU uses [0, 1] depth range, but our projection matrices use [-1, 1] (OpenGL standard).
        // Apply ZO (Zero-to-One) correction matrix to fix clipping without modifying shaders.
        Matrix4.multiply(Matrix4.ZO_CORRECTION, originalVp, correctedVp);
        const gData = this._scratchGlobalBufferData;
        gData.set(correctedVp.data, 0);
        gData.set([camPos.x, camPos.y, camPos.z, 1], 16);
        MathPool.releaseMatrix(originalVp);
        MathPool.releaseMatrix(correctedVp);
        gData.set([
            lights.aCol.r * lights.aIntensity,
            lights.aCol.g * lights.aIntensity,
            lights.aCol.b * lights.aIntensity,
            1,
        ], 20);
        gData.set([
            lights.dCol.r * lights.dIntensity,
            lights.dCol.g * lights.dIntensity,
            lights.dCol.b * lights.dIntensity,
            1,
        ], 24);
        // Fix: lights.dDir is already negated to point TO the light in applyTo.
        gData.set([lights.dDir.x, lights.dDir.y, lights.dDir.z, 0], 28);
        const gamma = this.postProcessing.enabled ? 1.0 : (this._quality.gamma ?? 2.2);
        const exposure = this.postProcessing.enabled ? 1.0 : (this._quality.exposure ?? 1.0);
        gData.set([lights.pLights.length, lights.sLights.length, lights.aLights.length, gamma], 32);
        gData[36] = exposure; // exposure
        if (fog) {
            gData[37] = fog.mode;
            gData[38] = fog.density;
            gData[39] = fog.near;
            gData[40] = fog.far;
            gData[41] = fog.height;
            gData[42] = fog.heightFalloff;
            gData[43] = 0.0; // _pad
            gData.set([fog.color.r, fog.color.g, fog.color.b, 1.0], 44);
        }
        else {
            gData[37] = 0.0; // fogMode NONE
        }
        this._device.queue.writeBuffer(this._globalUniformBuffer, 0, gData);
        const plDataSize = Math.max(lights.pLights.length * 8, 8);
        if (this._scratchPointLightData.length < plDataSize) {
            this._scratchPointLightData = new Float32Array(plDataSize);
        }
        const plData = this._scratchPointLightData;
        for (let i = 0; i < lights.pLights.length; i++) {
            const l = lights.pLights[i];
            const d = l.worldMatrix.data;
            plData.set([d[12], d[13], d[14], l.distance], i * 8);
            plData.set([l.color.r * l.intensity, l.color.g * l.intensity, l.color.b * l.intensity, l.decay], i * 8 + 4);
        }
        this._device.queue.writeBuffer(this._pointLightBuffer, 0, plData.subarray(0, plDataSize));
        const slDataSize = Math.max(lights.sLights.length * 16, 16);
        if (this._scratchSpotLightData.length < slDataSize) {
            this._scratchSpotLightData = new Float32Array(slDataSize);
        }
        const slData = this._scratchSpotLightData;
        for (let i = 0; i < lights.sLights.length; i++) {
            const l = lights.sLights[i];
            const d = l.worldMatrix.data;
            slData.set([d[12], d[13], d[14], 1], i * 16);
            const dir = MathPool.acquireVector().copyFrom(l.direction).normalize();
            slData.set([dir.x, dir.y, dir.z, 0], i * 16 + 4);
            slData.set([l.color.r * l.intensity, l.color.g * l.intensity, l.color.b * l.intensity, 1], i * 16 + 8);
            slData.set([Math.cos(l.angle), Math.cos(l.angle * (1.0 - l.penumbra)), l.distance, l.decay], i * 16 + 12);
            MathPool.releaseVector(dir);
        }
        this._device.queue.writeBuffer(this._spotLightBuffer, 0, slData.subarray(0, slDataSize));
        const alDataSize = Math.max(lights.aLights.length * 24, 24);
        if (this._scratchAreaLightData.length < alDataSize) {
            this._scratchAreaLightData = new Float32Array(alDataSize);
        }
        const alData = this._scratchAreaLightData;
        for (let i = 0; i < lights.aLights.length; i++) {
            const l = lights.aLights[i];
            const m = l.worldMatrix.data;
            const off = i * 24;
            alData.set([m[12], m[13], m[14], 1], off);
            alData.set([l.color.r * l.intensity, l.color.g * l.intensity, l.color.b * l.intensity, 1], off + 4);
            alData.set([m[0], m[1], m[2], 0], off + 8);
            alData.set([m[4], m[5], m[6], 0], off + 12);
            alData.set([m[8], m[9], m[10], 0], off + 16);
            alData.set([l.width / 2, l.height / 2, 0, 0], off + 20);
        }
        this._device.queue.writeBuffer(this._areaLightBuffer, 0, alData.subarray(0, alDataSize));
    }
    setSize(width, height) {
        if (!this._device)
            return;
        const d = devicePixelRatio;
        this._context.canvas.width = width * d;
        this._context.canvas.height = height * d;
        this._depthTexture = this._device.createTexture({
            size: [this._context.canvas.width, this._context.canvas.height],
            format: "depth24plus",
            usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
        });
        if (this.postProcessing.enabled) {
            if (this._hdrTexture)
                this._hdrTexture.destroy();
            this._hdrTexture = this._device.createTexture({
                size: [this._context.canvas.width, this._context.canvas.height],
                format: "rgba16float",
                usage: GPUTextureUsage.RENDER_ATTACHMENT |
                    GPUTextureUsage.TEXTURE_BINDING |
                    GPUTextureUsage.COPY_SRC,
            });
            this._hdrTextureView = this._hdrTexture.createView();
        }
        else if (this._hdrTexture) {
            this._hdrTexture.destroy();
            this._hdrTexture = undefined;
            this._hdrTextureView = undefined;
        }
    }
}
//# sourceMappingURL=WebGPURenderer.js.map
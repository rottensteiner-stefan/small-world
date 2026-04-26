/// src/renderers/WebGPURenderer.ts

import { CubeTexture, FluidParticleSystem, RenderManifest, ShaderRegistry, Texture } from "../core/index.js";
import { GeometryDataInterface, LightDataInterface } from "../interfaces/index.js";
import { Object3D } from "../core/Object3D.js";
import { Scene } from "../core/Scene.js";
import { MathPool, Vector3D } from "../math/index.js";
import {
  BlendingMode,
  MaterialType,
  RendererType,
  TextureFilter,
  TextureWrap,
} from "../enums/index.js";
import { EngineConfig } from "../interfaces/EngineConfig.js";

import { AbstractRenderer } from "./AbstractRenderer.js";
import { FluidRenderingWGSL } from "./shaders/FluidRenderingWGSL.js";

interface WebGPUGeoCache {
  vb: GPUBuffer;
  nb: GPUBuffer | undefined;
  uvb: GPUBuffer | undefined;
  tb: GPUBuffer | undefined;
  ib: GPUBuffer | undefined;
  wib: GPUBuffer | undefined;
  indexCount: number;
  wireframeIndexCount: number;
  vertexCount: number;
  format: GPUIndexFormat | undefined;
}

interface WebGPUPipelineCache {
  pipeline: GPURenderPipeline;
  layout: GPUPipelineLayout;
  bgLayouts: GPUBindGroupLayout[];
}

/**
 * Modern WebGPU implementation with dynamic vertex updates and memory management.
 */
export class WebGPURenderer extends AbstractRenderer {
  public override readonly type: RendererType = RendererType.WEB_GPU;
  private _adapter: GPUAdapter | undefined = undefined;
  private _device: GPUDevice | undefined = undefined;

  /** Satisfies Renderer interface */
  public get gpuDevice(): GPUDevice | undefined {
    return this._device;
  }

  private _context!: GPUCanvasContext;
  private _format!: GPUTextureFormat;

  private _pipelines: Map<string, WebGPUPipelineCache> = new Map();
  private _shaderModules: Map<string, GPUShaderModule> = new Map();
  private _fluidCompositePipeline: GPURenderPipeline | undefined;

  private _whiteTexView!: GPUTextureView;
  private _flatNormalTexView!: GPUTextureView;
  private _defaultCubeTexView!: GPUTextureView;

  private _samplerCache: Map<string, GPUSampler> = new Map();

  private _dummyNormalBuffer!: GPUBuffer;
  private _dummyUvBuffer!: GPUBuffer;
  private _dummyTangentBuffer!: GPUBuffer;
  private _dummyBufferSize: number = 0;

  private _geoCache: Map<GeometryDataInterface, WebGPUGeoCache> = new Map();
  private _textureViewCache: Map<Texture, GPUTextureView> = new Map();
  private _cubeTextureViewCache: Map<CubeTexture, GPUTextureView> = new Map();

  private _depthTexture!: GPUTexture;

  // Fluid Rendering Resources
  private _fluidDepthTexture!: GPUTexture;
  private _fluidThicknessTexture!: GPUTexture;
  private _fluidDepthView!: GPUTextureView;
  private _fluidThicknessView!: GPUTextureView;

  private _globalUniformBuffer!: GPUBuffer;
  private _pointLightBuffer!: GPUBuffer;
  private _spotLightBuffer!: GPUBuffer;
  private _areaLightBuffer!: GPUBuffer;
  private _globalBindGroup!: GPUBindGroup;
  private _globalBGL!: GPUBindGroupLayout;

  private _objectUniformBuffers: Map<string, { buffer: GPUBuffer; lastFrame: number }> = new Map();
  private _frameCount: number = 0;
  private _scratchModelMatrix: Float32Array = new Float32Array(16);

  /** @inheritdoc */
  public async initialize(
    canvas: HTMLCanvasElement,
    attributes?: Record<string, unknown>,
    config?: EngineConfig,
  ): Promise<void> {
    this._adapter = (await navigator.gpu.requestAdapter(attributes)) ?? undefined;
    if (!this._adapter) throw new Error("[WebGPURenderer] No adapter found.");
    this._device = await this._adapter.requestDevice();

    if (config?.quality) {
      this._quality = { ...this._quality, ...config.quality };
    }

    this._context = canvas.getContext("webgpu") as GPUCanvasContext;
    this._format = navigator.gpu.getPreferredCanvasFormat();
    this._context.configure({
      device: this._device,
      format: this._format,
      alphaMode: "premultiplied",
    });

    this._initDefaultResources();
    this._initGlobalBuffers();
    this.setSize(canvas.clientWidth, canvas.clientHeight);
  }

  private _initDefaultResources(): void {
    const create1x1 = (col: number[]): GPUTextureView => {
      const t = this._device!.createTexture({
        size: [1, 1],
        format: "rgba8unorm",
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
      });
      this._device!.queue.writeTexture({ texture: t }, new Uint8Array(col), { bytesPerRow: 4 }, [1, 1]);
      return t.createView();
    };
    this._whiteTexView = create1x1([255, 255, 255, 255]);
    this._flatNormalTexView = create1x1([128, 128, 255, 255]);

    const whiteCube = this._device!.createTexture({
      size: [1, 1, 6],
      format: "rgba8unorm",
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
    });
    for (let i = 0; i < 6; i++) {
      this._device!.queue.writeTexture({ texture: whiteCube, origin: [0, 0, i] }, new Uint8Array([50, 50, 100, 255]), { bytesPerRow: 4 }, [1, 1]);
    }
    this._defaultCubeTexView = whiteCube.createView({ dimension: "cube" });

    this._ensureDummyBufferSize(1000);
  }

  private _getSampler(tex: Texture | undefined): GPUSampler {
    const mag = tex?.magFilter === TextureFilter.NEAREST ? "nearest" : "linear";
    const min = tex?.minFilter === TextureFilter.NEAREST ? "nearest" : "linear";
    const mapWrap = (w: TextureWrap | undefined): GPUAddressMode => {
      if (w === TextureWrap.REPEAT) return "repeat";
      if (w === TextureWrap.MIRRORED_REPEAT) return "mirror-repeat";
      return "clamp-to-edge";
    };
    const u = mapWrap(tex?.addressModeU);
    const v = mapWrap(tex?.addressModeV);
    const key = mag + "_" + min + "_" + u + "_" + v;
    let s = this._samplerCache.get(key);
    if (!s) {
      s = this._device!.createSampler({ magFilter: mag, minFilter: min, addressModeU: u, addressModeV: v, mipmapFilter: "linear" });
      this._samplerCache.set(key, s);
    }
    return s;
  }

  private _ensureDummyBufferSize(vertexCount: number): void {
    if (this._dummyBufferSize >= vertexCount * 3 && this._dummyNormalBuffer) return;
    const newSize = Math.max(this._dummyBufferSize * 2, vertexCount * 3, 3000);
    if (this._dummyNormalBuffer) this._dummyNormalBuffer.destroy();
    if (this._dummyUvBuffer) this._dummyUvBuffer.destroy();
    if (this._dummyTangentBuffer) this._dummyTangentBuffer.destroy();
    const normalData = new Float32Array(newSize).fill(0);
    for (let i = 0; i < newSize; i += 3) normalData[i + 1] = 1.0;
    this._dummyNormalBuffer = this._device!.createBuffer({ size: normalData.byteLength, usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST });
    this._device!.queue.writeBuffer(this._dummyNormalBuffer, 0, normalData);
    const uvData = new Float32Array(newSize).fill(0);
    this._dummyUvBuffer = this._device!.createBuffer({ size: uvData.byteLength, usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST });
    this._device!.queue.writeBuffer(this._dummyUvBuffer, 0, uvData);
    const tangentData = new Float32Array(newSize).fill(0);
    for (let i = 0; i < newSize; i += 3) tangentData[i] = 1.0;
    this._dummyTangentBuffer = this._device!.createBuffer({ size: tangentData.byteLength, usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST });
    this._device!.queue.writeBuffer(this._dummyTangentBuffer, 0, tangentData);
    this._dummyBufferSize = newSize;
  }

  private _initGlobalBuffers(): void {
    this._globalUniformBuffer = this._device!.createBuffer({ size: 256, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    this._pointLightBuffer = this._device!.createBuffer({ size: 1024, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
    this._spotLightBuffer = this._device!.createBuffer({ size: 2048, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
    this._areaLightBuffer = this._device!.createBuffer({ size: 4096, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });

    this._globalBGL = this._device!.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: "uniform" } },
        { binding: 1, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "read-only-storage" } },
        { binding: 2, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "read-only-storage" } },
        { binding: 3, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "read-only-storage" } },
      ],
    });

    this._globalBindGroup = this._device!.createBindGroup({
      layout: this._globalBGL,
      entries: [
        { binding: 0, resource: { buffer: this._globalUniformBuffer } },
        { binding: 1, resource: { buffer: this._pointLightBuffer } },
        { binding: 2, resource: { buffer: this._spotLightBuffer } },
        { binding: 3, resource: { buffer: this._areaLightBuffer } },
      ],
    });
  }

  private _getPipeline(manifest: RenderManifest, topology: GPUPrimitiveTopology): WebGPUPipelineCache {
    const shaderId = manifest.shaderId;
    const state = manifest.state || {};
    const key = shaderId + "_" + topology + "_" + state.culling + "_" + state.blending;
    let cache = this._pipelines.get(key);
    if (!cache) {
      const sm = this._getShaderModule(shaderId);
      const objEntries: GPUBindGroupLayoutEntry[] = [
        { binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: "uniform" } },
        { binding: 1, visibility: GPUShaderStage.FRAGMENT, sampler: { type: "filtering" } },
      ];
      if (shaderId === MaterialType.SKYBOX) {
        objEntries.push({ binding: 9, visibility: GPUShaderStage.FRAGMENT, texture: { viewDimension: "cube" } });
      } else {
        for (let i = 2; i <= 8; i++) objEntries.push({ binding: i, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "float" } });
      }
      const objBGL = this._device!.createBindGroupLayout({ entries: objEntries });
      const pipelineLayout = this._device!.createPipelineLayout({ bindGroupLayouts: [this._globalBGL, objBGL] });
      
      const isFluid = shaderId === MaterialType.FLUID;
      const vertexBuffers: GPUVertexBufferLayout[] = [
        { arrayStride: isFluid ? 16 : 12, attributes: [{ shaderLocation: 0, offset: 0, format: isFluid ? "float32x4" : "float32x3" }] },
        { arrayStride: 12, attributes: [{ shaderLocation: 1, offset: 0, format: "float32x3" }] },
        { arrayStride: 8, attributes: [{ shaderLocation: 2, offset: 0, format: "float32x2" }] },
        { arrayStride: 12, attributes: [{ shaderLocation: 3, offset: 0, format: "float32x3" }] },
      ];
      const targets: GPUColorTargetState[] = [{ format: this._format }];
      if (state.blending === BlendingMode.ALPHA) {
        targets[0]!.blend = {
          color: { srcFactor: "src-alpha", dstFactor: "one-minus-src-alpha", operation: "add" },
          alpha: { srcFactor: "one", dstFactor: "one-minus-src-alpha", operation: "add" },
        };
      }
      const pipeline = this._device!.createRenderPipeline({
        layout: pipelineLayout,
        vertex: { module: sm, entryPoint: "vs", buffers: vertexBuffers },
        fragment: { module: sm, entryPoint: "fs", targets },
        primitive: { topology, cullMode: state.culling || "back" },
        depthStencil: { depthWriteEnabled: state.depthWrite !== false, depthCompare: "less-equal", format: "depth24plus" },
      });
      cache = { pipeline, layout: pipelineLayout, bgLayouts: [this._globalBGL, objBGL] };
      this._pipelines.set(key, cache);
    }
    return cache;
  }

  private _getShaderModule(shaderId: string): GPUShaderModule {
    let sm = this._shaderModules.get(shaderId);
    if (!sm) {
      const def = ShaderRegistry.instance.get(shaderId);
      const code = ShaderRegistry.instance.assemble(def!.sources.wgsl!, "wgsl");
      sm = this._device!.createShaderModule({ code });
      this._shaderModules.set(shaderId, sm);
    }
    return sm;
  }

  private _getGeoCache(geo: GeometryDataInterface): WebGPUGeoCache {
    let c = this._geoCache.get(geo);
    if (!c || geo.needsUpdate) {
      const createBuf = (data: ArrayBufferView, usage: number): GPUBuffer => {
        const b = this._device!.createBuffer({ size: (data.byteLength + 3) & ~3, usage, mappedAtCreation: true });
        new Uint8Array(b.getMappedRange()).set(new Uint8Array(data.buffer, data.byteOffset, data.byteLength));
        b.unmap();
        return b;
      };
      if (c && geo.needsUpdate) {
        this._device!.queue.writeBuffer(c.vb, 0, geo.vertices);
        if (c.nb && geo.normals) this._device!.queue.writeBuffer(c.nb, 0, geo.normals);
        geo.needsUpdate = false;
        return c;
      }
      c = {
        vb: createBuf(geo.vertices, GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST),
        nb: geo.normals?.length ? createBuf(geo.normals, GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST) : undefined,
        uvb: geo.uvs?.length ? createBuf(geo.uvs, GPUBufferUsage.VERTEX) : undefined,
        tb: geo.tangents?.length ? createBuf(geo.tangents, GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST) : undefined,
        ib: geo.indices?.length ? createBuf(geo.indices, GPUBufferUsage.INDEX) : undefined,
        wib: geo.wireframeIndices?.length ? createBuf(geo.wireframeIndices, GPUBufferUsage.INDEX) : undefined,
        indexCount: geo.indices?.length || 0,
        wireframeIndexCount: geo.wireframeIndices?.length || 0,
        vertexCount: geo.vertices.length / 3,
        format: geo.indices?.BYTES_PER_ELEMENT === 4 || geo.wireframeIndices?.BYTES_PER_ELEMENT === 4 ? "uint32" : "uint16",
      };
      this._geoCache.set(geo, c);
      geo.needsUpdate = false;
    }
    return c;
  }

  public render(scene: Scene, vp: Float32Array, camPos: Vector3D = Vector3D.ZERO, vMat?: Float32Array): void {
    if (!this._device) return;
    this._frameCount++;
    const lights = this.extractLights(scene);
    this._updateGlobalBuffers(vp, camPos, lights);
    const ce = this._device.createCommandEncoder();

    const currentView = this._context.getCurrentTexture().createView();

    const sortedGroups = scene.getVisibleObjectsSorted();
    const fluidGroup = sortedGroups.get(MaterialType.FLUID);
    if (fluidGroup) {
      this._renderFluidPasses(ce, fluidGroup, vMat);
      sortedGroups.delete(MaterialType.FLUID);
    }
    const rp = ce.beginRenderPass({
      colorAttachments: [{ view: currentView, clearValue: this._clearColor, loadOp: "clear", storeOp: "store" }],
      depthStencilAttachment: { view: this._depthTexture.createView(), depthClearValue: 1.0, depthLoadOp: "clear", depthStoreOp: "store" },
    });
    const skyboxGroup = sortedGroups.get(MaterialType.SKYBOX);
    if (skyboxGroup) {
      this._renderGroup(rp, MaterialType.SKYBOX, skyboxGroup, vMat);
      sortedGroups.delete(MaterialType.SKYBOX);
    }
    for (const [shaderId, materialGroups] of sortedGroups.entries()) {
      this._renderGroup(rp, shaderId, materialGroups, vMat);
    }
    rp.end();
    if (fluidGroup) this._renderFluidComposite(ce, fluidGroup, currentView);
    this._device.queue.submit([ce.finish()]);
    if (this._frameCount % 100 === 0) this._pruneObjectBuffers();
  }

  private _pruneObjectBuffers(): void {
    for (const [uuid, data] of this._objectUniformBuffers.entries()) {
      if (this._frameCount - data.lastFrame > 100) { data.buffer.destroy(); this._objectUniformBuffers.delete(uuid); }
    }
  }

  private _renderGroup(rp: GPURenderPassEncoder, shaderId: string, materialGroups: Map<string, Object3D[]>, vMat?: Float32Array): void {
    const groupIterator = materialGroups.values();
    const firstGroup = groupIterator.next().value;
    if (!firstGroup || firstGroup.length === 0) return;
    const firstObj = firstGroup[0];
    if (!firstObj || !firstObj.material) return;
    const topology: GPUPrimitiveTopology = shaderId === MaterialType.WIREFRAME ? "line-list" : shaderId === MaterialType.FLUID ? "point-list" : "triangle-list";
    const cache = this._getPipeline(firstObj.material.getRenderManifest(), topology);
    rp.setPipeline(cache.pipeline);
    rp.setBindGroup(0, this._globalBindGroup);
    for (const objects of materialGroups.values()) {
      const mat = objects[0]?.material;
      if (!mat) continue;
      const manifest = mat.getRenderManifest();
      for (const obj of objects) {
        const isFluid = obj instanceof FluidParticleSystem;
        if (!obj.geometry && !isFluid) continue;
        const uBuffer = this._getObjUniformBuffer(obj);
        this._updateObjUniformBuffer(uBuffer, obj, manifest, vMat);
        const texBindGroup = this._getTexBindGroup(uBuffer, manifest, cache.bgLayouts[1]!);
        rp.setBindGroup(1, texBindGroup);
        if (isFluid) {
          const fluid = obj as FluidParticleSystem;
          if (fluid.positionBuffer) {
            rp.setVertexBuffer(0, fluid.positionBuffer);
            rp.setVertexBuffer(1, this._dummyNormalBuffer);
            rp.setVertexBuffer(2, this._dummyUvBuffer);
            rp.setVertexBuffer(3, this._dummyTangentBuffer);
            rp.draw(fluid.config.particleCount);
          }
          continue;
        }
        const gCache = this._getGeoCache(obj.geometry!);
        this._ensureDummyBufferSize(gCache.vertexCount);
        rp.setVertexBuffer(0, gCache.vb);
        rp.setVertexBuffer(1, gCache.nb || this._dummyNormalBuffer);
        rp.setVertexBuffer(2, gCache.uvb || this._dummyUvBuffer);
        rp.setVertexBuffer(3, gCache.tb || this._dummyTangentBuffer);
        if (topology === "line-list" && gCache.wib) { rp.setIndexBuffer(gCache.wib, gCache.format!); rp.drawIndexed(gCache.wireframeIndexCount); }
        else if (gCache.ib) { rp.setIndexBuffer(gCache.ib, gCache.format!); rp.drawIndexed(gCache.indexCount); }
        else { rp.draw(gCache.vertexCount); }
      }
    }
  }

  private _getObjUniformBuffer(obj: Object3D): GPUBuffer {
    let data = this._objectUniformBuffers.get(obj.uuid);
    if (!data) {
      const buffer = this._device!.createBuffer({ size: 256, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
      data = { buffer, lastFrame: this._frameCount };
      this._objectUniformBuffers.set(obj.uuid, data);
    }
    data.lastFrame = this._frameCount;
    return data.buffer;
  }

  private _updateObjUniformBuffer(b: GPUBuffer, o: Object3D, m: RenderManifest, vMat?: Float32Array): void {
    const data = new Float32Array(64);
    const props = m.properties;
    this._scratchModelMatrix.set(o.worldMatrix.data);
    const state = m.state;
    if (state?.isSprite && vMat) {
      const sx = Math.sqrt(this._scratchModelMatrix[0]! ** 2 + this._scratchModelMatrix[1]! ** 2 + this._scratchModelMatrix[2]! ** 2);
      const sy = Math.sqrt(this._scratchModelMatrix[4]! ** 2 + this._scratchModelMatrix[5]! ** 2 + this._scratchModelMatrix[6]! ** 2);
      const sz = Math.sqrt(this._scratchModelMatrix[8]! ** 2 + this._scratchModelMatrix[9]! ** 2 + this._scratchModelMatrix[10]! ** 2);
      this._scratchModelMatrix[0] = vMat[0]! * sx; this._scratchModelMatrix[1] = vMat[4]! * sx; this._scratchModelMatrix[2] = vMat[8]! * sx;
      this._scratchModelMatrix[4] = vMat[1]! * sy; this._scratchModelMatrix[5] = vMat[5]! * sy; this._scratchModelMatrix[6] = vMat[9]! * sy;
      this._scratchModelMatrix[8] = vMat[2]! * sz; this._scratchModelMatrix[9] = vMat[6]! * sz; this._scratchModelMatrix[10] = vMat[10]! * sz;
    }
    data.set(this._scratchModelMatrix, 0);
    const color = (props["u_color"] as Float32Array) || o.material!.color.toFloat32Array();
    data.set(color, 16);
    this._device!.queue.writeBuffer(b, 0, data);
  }

  private _getTexBindGroup(objBuffer: GPUBuffer, m: RenderManifest, layout: GPUBindGroupLayout): GPUBindGroup {
    const entries: GPUBindGroupEntry[] = [
      { binding: 0, resource: { buffer: objBuffer } },
      { binding: 1, resource: this._getSampler(undefined) },
    ];
    if (m.shaderId === MaterialType.SKYBOX) {
        entries.push({ binding: 9, resource: this._getGPUCubeTextureView(m.textures["u_skybox"] as CubeTexture) });
    } else {
        entries.push({ binding: 2, resource: this._getTextureView(m.textures["u_diffuseMap"] as Texture) });
        entries.push({ binding: 3, resource: this._getNormalTextureView(m.textures["u_normalMap"] as Texture) });
        entries.push({ binding: 4, resource: this._getTextureView(m.textures["u_specularMap"] as Texture) });
        entries.push({ binding: 5, resource: this._getTextureView(m.textures["u_sandMap"] as Texture) });
        entries.push({ binding: 6, resource: this._getTextureView(m.textures["u_grassMap"] as Texture) });
        entries.push({ binding: 7, resource: this._getTextureView(m.textures["u_rockMap"] as Texture) });
        entries.push({ binding: 8, resource: this._getTextureView(m.textures["u_snowMap"] as Texture) });
    }
    return this._device!.createBindGroup({ layout, entries });
  }

  private _getTextureView(tex: Texture | undefined): GPUTextureView {
    if (!tex || !tex.isLoaded || !tex.image) return this._whiteTexView;
    let v = this._textureViewCache.get(tex);
    if (!v) {
      const t = this._device!.createTexture({ size: [tex.image.width, tex.image.height], format: "rgba8unorm", usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT });
      this._device!.queue.copyExternalImageToTexture({ source: tex.image }, { texture: t }, [tex.image.width, tex.image.height]);
      v = t.createView(); this._textureViewCache.set(tex, v);
    }
    return v;
  }

  private _getNormalTextureView(tex: Texture | undefined): GPUTextureView {
    if (!tex || !tex.isLoaded || !tex.image) return this._flatNormalTexView;
    return this._getTextureView(tex);
  }

  private _getGPUCubeTextureView(tex: CubeTexture | undefined): GPUTextureView {
    if (!tex || !tex.isLoaded || tex.images.length !== 6) return this._defaultCubeTexView;
    let v = this._cubeTextureViewCache.get(tex);
    if (!v) {
      const img = tex.images[0]!;
      const t = this._device!.createTexture({ size: [img.width, img.height, 6], format: "rgba8unorm", usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT });
      for (let i = 0; i < 6; i++) this._device!.queue.copyExternalImageToTexture({ source: tex.images[i]! }, { texture: t, origin: [0, 0, i] }, [img.width, img.height]);
      v = t.createView({ dimension: "cube" }); this._cubeTextureViewCache.set(tex, v);
    }
    return v;
  }

  private _updateGlobalBuffers(vp: Float32Array, camPos: Vector3D, _lights: LightDataInterface): void {
    const gData = new Float32Array(64);
    gData.set(vp, 0);
    gData.set([camPos.x, camPos.y, camPos.z, 1], 16);
    this._device!.queue.writeBuffer(this._globalUniformBuffer, 0, gData);
  }

  private _renderFluidComposite(ce: GPUCommandEncoder, materialGroups: Map<string, Object3D[]>, targetView: GPUTextureView): void {
    if (!this._fluidCompositePipeline) {
        const sm = this._device!.createShaderModule({ code: FluidRenderingWGSL });
        const objBGL = this._device!.createBindGroupLayout({ entries: [{ binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: "uniform" } }] });
        const compositeBGL = this._device!.createBindGroupLayout({
            entries: [
                { binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: "uniform" } },
                { binding: 1, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "depth" } },
                { binding: 2, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "float" } },
                { binding: 3, visibility: GPUShaderStage.FRAGMENT, sampler: { type: "filtering" } },
            ]
        });
        this._fluidCompositePipeline = this._device!.createRenderPipeline({
            layout: this._device!.createPipelineLayout({ bindGroupLayouts: [compositeBGL, objBGL] }),
            vertex: { module: sm, entryPoint: "vs_main" },
            fragment: { module: sm, entryPoint: "fs_main", targets: [{ format: this._format, blend: { color: { srcFactor: "src-alpha", dstFactor: "one-minus-src-alpha", operation: "add" }, alpha: { srcFactor: "one", dstFactor: "one-minus-src-alpha", operation: "add" } } }] },
            primitive: { topology: "triangle-list" },
        });
    }
    const rp = ce.beginRenderPass({ colorAttachments: [{ view: targetView, loadOp: "load", storeOp: "store" }] });
    rp.setPipeline(this._fluidCompositePipeline);
    for (const objects of materialGroups.values()) {
        const firstObj = objects[0]!;
        const uBuffer = this._getObjUniformBuffer(firstObj);
        const bindGroup0 = this._device!.createBindGroup({ layout: this._fluidCompositePipeline.getBindGroupLayout(0), entries: [{ binding: 0, resource: { buffer: this._globalUniformBuffer } }, { binding: 1, resource: this._fluidDepthView }, { binding: 2, resource: this._fluidThicknessView }, { binding: 3, resource: this._getSampler(undefined) }] });
        const bindGroup1 = this._device!.createBindGroup({ layout: this._fluidCompositePipeline.getBindGroupLayout(1), entries: [{ binding: 0, resource: { buffer: uBuffer } }] });
        rp.setBindGroup(0, bindGroup0); rp.setBindGroup(1, bindGroup1); rp.draw(3);
    }
    rp.end();
  }

  private _renderFluidPasses(ce: GPUCommandEncoder, materialGroups: Map<string, Object3D[]>, vMat?: Float32Array): void {
    const depthPass = ce.beginRenderPass({ colorAttachments: [], depthStencilAttachment: { view: this._fluidDepthView, depthClearValue: 1.0, depthLoadOp: "clear", depthStoreOp: "store" } });
    this._renderGroup(depthPass, MaterialType.FLUID, materialGroups, vMat);
    depthPass.end();
    const thicknessPass = ce.beginRenderPass({ colorAttachments: [{ view: this._fluidThicknessView, clearValue: { r: 0, g: 0, b: 0, a: 0 }, loadOp: "clear", storeOp: "store" }] });
    this._renderGroup(thicknessPass, MaterialType.FLUID, materialGroups, vMat);
    thicknessPass.end();
  }

  public override setSize(width: number, height: number): void {
    if (!this._device) return;
    const d = devicePixelRatio;
    this._context.canvas.width = width * d; this._context.canvas.height = height * d;
    this._depthTexture = this._device.createTexture({ size: [this._context.canvas.width, this._context.canvas.height], format: "depth24plus", usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING });
    if (this._fluidDepthTexture) this._fluidDepthTexture.destroy();
    if (this._fluidThicknessTexture) this._fluidThicknessTexture.destroy();
    this._fluidDepthTexture = this._device.createTexture({ size: [this._context.canvas.width, this._context.canvas.height], format: "depth24plus", usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING });
    this._fluidDepthView = this._fluidDepthTexture.createView();
    this._fluidThicknessTexture = this._device.createTexture({ size: [this._context.canvas.width, this._context.canvas.height], format: "rgba8unorm", usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING });
    this._fluidThicknessView = this._fluidThicknessTexture.createView();
  }
}

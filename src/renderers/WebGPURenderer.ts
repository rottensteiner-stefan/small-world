/// src/renderers/WebGPURenderer.ts

import { CubeTexture, RenderManifest, ShaderRegistry, Texture } from "../core/index.js";
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
import { RenderPass } from "./RenderPass.js";
import { MainRenderPass } from "./passes/MainRenderPass.js";
import { UniformPacker } from "../core/renderers/shaders/UniformPacker.js";

export interface WebGPUGeoCache {
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

export interface WebGPUPipelineCache {
  pipeline: GPURenderPipeline;
  layout: GPUPipelineLayout;
  bgLayouts: GPUBindGroupLayout[];
}

/**
 * Modern WebGPU implementation with dynamic vertex updates and memory management.
 */
export class WebGPURenderer extends AbstractRenderer {
  public override readonly type: RendererType = RendererType.WEB_GPU;
  protected _adapter: GPUAdapter | undefined = undefined;
  public _device: GPUDevice | undefined = undefined;

  /** Satisfies Renderer interface */
  public get gpuDevice(): GPUDevice | undefined {
    return this._device;
  }

  protected _context!: GPUCanvasContext;
  public _format!: GPUTextureFormat;

  protected _pipelines: Map<string, WebGPUPipelineCache> = new Map();
  protected _shaderModules: Map<string, GPUShaderModule> = new Map();

  protected _whiteTexView!: GPUTextureView;
  protected _flatNormalTexView!: GPUTextureView;
  protected _defaultCubeTexView!: GPUTextureView;

  protected _samplerCache: Map<string, GPUSampler> = new Map();

  protected _dummyNormalBuffer!: GPUBuffer;
  protected _dummyUvBuffer!: GPUBuffer;
  protected _dummyTangentBuffer!: GPUBuffer;
  protected _dummyBufferSize: number = 0;

  protected _geoCache: Map<GeometryDataInterface, WebGPUGeoCache> = new Map();
  protected _textureViewCache: Map<Texture, GPUTextureView> = new Map();
  protected _cubeTextureViewCache: Map<CubeTexture, GPUTextureView> = new Map();

  public _depthTexture!: GPUTexture;

  // Render Pass System
  protected _passes: RenderPass[] = [];

  public _globalUniformBuffer!: GPUBuffer;
  public _pointLightBuffer!: GPUBuffer;
  public _spotLightBuffer!: GPUBuffer;
  public _areaLightBuffer!: GPUBuffer;
  public _globalBindGroup!: GPUBindGroup;
  public _globalBGL!: GPUBindGroupLayout;

  protected _objectUniformBuffers: Map<string, { buffer: GPUBuffer; lastFrame: number }> =
    new Map();
  protected _frameCount: number = 0;
  protected _scratchModelMatrix: Float32Array = new Float32Array(16);

  /** @inheritdoc */
  public async initialize(
    canvas: HTMLCanvasElement,
    attributes?: Record<string, unknown>,
    config?: EngineConfig,
  ): Promise<void> {
    this._adapter = (await navigator.gpu.requestAdapter(attributes)) ?? undefined;
    if (!this._adapter) throw new Error("[WebGPURenderer] No adapter found.");

    console.log("[WebGPURenderer] Adapter limits:", this._adapter.limits);

    this._device = await this._adapter.requestDevice();

    // Add uncapturederror listener
    this._device.onuncapturederror = (event: GPUUncapturedErrorEvent): void => {
      console.error("[WebGPU Error]:", event.error.message);
    };

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

    // Default Pass Setup
    this._passes = [new MainRenderPass()];
  }

  /**
   * Adds a render pass to the pipeline.
   * @param pass The pass to add.
   */
  public addPass(pass: RenderPass): void {
    this._passes.push(pass);
  }

  private _initDefaultResources(): void {
    const create1x1 = (col: number[]): GPUTextureView => {
      const t = this._device!.createTexture({
        size: [1, 1],
        format: "rgba8unorm",
        usage:
          GPUTextureUsage.TEXTURE_BINDING |
          GPUTextureUsage.COPY_DST |
          GPUTextureUsage.RENDER_ATTACHMENT,
      });
      this._device!.queue.writeTexture(
        { texture: t },
        new Uint8Array(col),
        { bytesPerRow: 4 },
        [1, 1],
      );
      return t.createView();
    };
    this._whiteTexView = create1x1([255, 255, 255, 255]);
    this._flatNormalTexView = create1x1([128, 128, 255, 255]);

    const whiteCube = this._device!.createTexture({
      size: [1, 1, 6],
      format: "rgba8unorm",
      usage:
        GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.COPY_DST |
        GPUTextureUsage.RENDER_ATTACHMENT,
    });
    for (let i = 0; i < 6; i++) {
      this._device!.queue.writeTexture(
        { texture: whiteCube, origin: [0, 0, i] },
        new Uint8Array([50, 50, 100, 255]),
        { bytesPerRow: 4 },
        [1, 1],
      );
    }
    this._defaultCubeTexView = whiteCube.createView({ dimension: "cube" });

    this._ensureDummyBufferSize(1000);
  }

  protected _getSampler(tex: Texture | undefined): GPUSampler {
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
      s = this._device!.createSampler({
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

  protected _ensureDummyBufferSize(vertexCount: number): void {
    if (this._dummyBufferSize >= vertexCount * 3 && this._dummyNormalBuffer) return;
    const newSize = Math.max(this._dummyBufferSize * 2, vertexCount * 3, 3000);
    if (this._dummyNormalBuffer) this._dummyNormalBuffer.destroy();
    if (this._dummyUvBuffer) this._dummyUvBuffer.destroy();
    if (this._dummyTangentBuffer) this._dummyTangentBuffer.destroy();
    const normalData = new Float32Array(newSize).fill(0);
    for (let i = 0; i < newSize; i += 3) normalData[i + 1] = 1.0;
    this._dummyNormalBuffer = this._device!.createBuffer({
      size: normalData.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    this._device!.queue.writeBuffer(this._dummyNormalBuffer, 0, normalData);
    const uvData = new Float32Array(newSize).fill(0);
    this._dummyUvBuffer = this._device!.createBuffer({
      size: uvData.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    this._device!.queue.writeBuffer(this._dummyUvBuffer, 0, uvData);
    const tangentData = new Float32Array(newSize).fill(0);
    for (let i = 0; i < newSize; i += 3) tangentData[i] = 1.0;
    this._dummyTangentBuffer = this._device!.createBuffer({
      size: tangentData.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    this._device!.queue.writeBuffer(this._dummyTangentBuffer, 0, tangentData);
    this._dummyBufferSize = newSize;
  }

  private _initGlobalBuffers(): void {
    this._globalUniformBuffer = this._device!.createBuffer({
      size: 256,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this._pointLightBuffer = this._device!.createBuffer({
      size: 2048,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    this._spotLightBuffer = this._device!.createBuffer({
      size: 4096,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    this._areaLightBuffer = this._device!.createBuffer({
      size: 4096,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    this._globalBGL = this._device!.createBindGroupLayout({
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

  protected _getPipeline(
    manifest: RenderManifest,
    topology: GPUPrimitiveTopology,
  ): WebGPUPipelineCache {
    const shaderId = manifest.shaderId;
    const state = manifest.state || {};
    const key =
      shaderId +
      "_" +
      topology +
      "_" +
      (state.culling || "back") +
      "_" +
      (state.blending || "none") +
      "_" +
      (state.depthWrite !== false) +
      "_" +
      (state.depthTest !== false);
    let cache = this._pipelines.get(key);
    if (!cache) {
      console.log("[WebGPURenderer] Creating new pipeline:", key);
      const sm = this._getShaderModule(shaderId);
      const objEntries: GPUBindGroupLayoutEntry[] = [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
          buffer: { type: "uniform" },
        },
        { binding: 1, visibility: GPUShaderStage.FRAGMENT, sampler: { type: "filtering" } },
      ];
      for (let i = 2; i <= 8; i++) {
        objEntries.push({
          binding: i,
          visibility: GPUShaderStage.FRAGMENT,
          texture: { sampleType: "float" },
        });
      }
      objEntries.push({
        binding: 9,
        visibility: GPUShaderStage.FRAGMENT,
        texture: { viewDimension: "cube" },
      });
      const objBGL = this._device!.createBindGroupLayout({ entries: objEntries });
      const pipelineLayout = this._device!.createPipelineLayout({
        bindGroupLayouts: [this._globalBGL, objBGL],
      });

      const vertexBuffers: GPUVertexBufferLayout[] = [
        { arrayStride: 12, attributes: [{ shaderLocation: 0, offset: 0, format: "float32x3" }] },
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
        depthStencil: {
          depthWriteEnabled: state.depthWrite !== false,
          depthCompare: state.depthTest === false ? "always" : "less-equal",
          format: "depth24plus",
        },
      });
      cache = { pipeline, layout: pipelineLayout, bgLayouts: [this._globalBGL, objBGL] };
      this._pipelines.set(key, cache);
    }
    return cache;
  }

  protected _getShaderModule(shaderId: string): GPUShaderModule {
    let sm = this._shaderModules.get(shaderId);
    if (!sm) {
      const def = ShaderRegistry.instance.get(shaderId);
      const code = ShaderRegistry.instance.assemble(def!.sources.wgsl!, "wgsl");
      sm = this._device!.createShaderModule({ code });
      this._shaderModules.set(shaderId, sm);
    }
    return sm;
  }

  protected _getGeoCache(geo: GeometryDataInterface): WebGPUGeoCache {
    let c = this._geoCache.get(geo);
    if (!c || geo.needsUpdate) {
      const createBuf = (data: ArrayBufferView, usage: number): GPUBuffer => {
        const b = this._device!.createBuffer({
          size: (data.byteLength + 3) & ~3,
          usage,
          mappedAtCreation: true,
        });
        new Uint8Array(b.getMappedRange()).set(
          new Uint8Array(data.buffer, data.byteOffset, data.byteLength),
        );
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
        format:
          geo.indices?.BYTES_PER_ELEMENT === 4 || geo.wireframeIndices?.BYTES_PER_ELEMENT === 4
            ? "uint32"
            : "uint16",
      };
      this._geoCache.set(geo, c);
      geo.needsUpdate = false;
    }
    return c;
  }

  public render(
    scene: Scene,
    vp: Float32Array,
    camPos: Vector3D = Vector3D.ZERO,
    vMat?: Float32Array,
  ): void {
    if (!this._device) return;
    this._frameCount++;
    const lights = this.extractLights(scene);
    this._updateGlobalBuffers(vp, camPos, lights);
    const ce = this._device.createCommandEncoder();

    const currentView = this._context.getCurrentTexture().createView();

    for (const pass of this._passes) {
      pass.execute(this, scene, ce, currentView, vp, camPos, vMat);
    }

    this._device.queue.submit([ce.finish()]);
    if (this._frameCount % 100 === 0) this._pruneObjectBuffers();
  }

  protected _pruneObjectBuffers(): void {
    for (const [uuid, data] of this._objectUniformBuffers.entries()) {
      if (this._frameCount - data.lastFrame > 100) {
        data.buffer.destroy();
        this._objectUniformBuffers.delete(uuid);
      }
    }
  }

  public _renderGroup(
    rp: GPURenderPassEncoder,
    shaderId: string,
    materialGroups: Map<string, Object3D[]>,
    vMat?: Float32Array,
  ): void {
    const groupIterator = materialGroups.values();
    const firstGroup = groupIterator.next().value;
    if (!firstGroup || firstGroup.length === 0) return;
    const firstObj = firstGroup[0];
    if (!firstObj || !firstObj.material) return;
    const topology: GPUPrimitiveTopology =
      shaderId === MaterialType.WIREFRAME ? "line-list" : "triangle-list";
    const cache = this._getPipeline(firstObj.material.getRenderManifest(), topology);
    rp.setPipeline(cache.pipeline);
    rp.setBindGroup(0, this._globalBindGroup);
    for (const objects of materialGroups.values()) {
      const mat = objects[0]?.material;
      if (!mat) continue;
      const manifest = mat.getRenderManifest();
      for (const obj of objects) {
        if (!obj.geometry) continue;
        const uBuffer = this._getObjUniformBuffer(obj);
        this._updateObjUniformBuffer(uBuffer, obj, manifest, vMat);
        const texBindGroup = this._getTexBindGroup(uBuffer, manifest, cache.bgLayouts[1]!);
        rp.setBindGroup(1, texBindGroup);
        const gCache = this._getGeoCache(obj.geometry!);
        this._ensureDummyBufferSize(gCache.vertexCount);
        rp.setVertexBuffer(0, gCache.vb);
        rp.setVertexBuffer(1, gCache.nb || this._dummyNormalBuffer);
        rp.setVertexBuffer(2, gCache.uvb || this._dummyUvBuffer);
        rp.setVertexBuffer(3, gCache.tb || this._dummyTangentBuffer);
        if (topology === "line-list" && gCache.wib) {
          rp.setIndexBuffer(gCache.wib, gCache.format!);
          rp.drawIndexed(gCache.wireframeIndexCount);
        } else if (gCache.ib) {
          rp.setIndexBuffer(gCache.ib, gCache.format!);
          rp.drawIndexed(gCache.indexCount);
        } else {
          rp.draw(gCache.vertexCount);
        }
      }
    }
  }

  protected _getObjUniformBuffer(obj: Object3D): GPUBuffer {
    let data = this._objectUniformBuffers.get(obj.uuid);
    if (!data) {
      const buffer = this._device!.createBuffer({
        size: 256,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      });
      data = { buffer, lastFrame: this._frameCount };
      this._objectUniformBuffers.set(obj.uuid, data);
    }
    data.lastFrame = this._frameCount;
    return data.buffer;
  }

  protected _updateObjUniformBuffer(
    b: GPUBuffer,
    o: Object3D,
    m: RenderManifest,
    vMat?: Float32Array,
  ): void {
    const shaderDef = ShaderRegistry.instance.get(m.shaderId);
    if (!shaderDef) return;

    this._scratchModelMatrix.set(o.worldMatrix.data);
    const state = m.state;
    if (state?.isSprite && vMat) {
      const sx = Math.sqrt(
        this._scratchModelMatrix[0]! ** 2 +
          this._scratchModelMatrix[1]! ** 2 +
          this._scratchModelMatrix[2]! ** 2,
      );
      const sy = Math.sqrt(
        this._scratchModelMatrix[4]! ** 2 +
          this._scratchModelMatrix[5]! ** 2 +
          this._scratchModelMatrix[6]! ** 2,
      );
      const sz = Math.sqrt(
        this._scratchModelMatrix[8]! ** 2 +
          this._scratchModelMatrix[9]! ** 2 +
          this._scratchModelMatrix[10]! ** 2,
      );
      this._scratchModelMatrix[0] = vMat[0]! * sx;
      this._scratchModelMatrix[1] = vMat[4]! * sx;
      this._scratchModelMatrix[2] = vMat[8]! * sx;
      this._scratchModelMatrix[4] = vMat[1]! * sy;
      this._scratchModelMatrix[5] = vMat[5]! * sy;
      this._scratchModelMatrix[6] = vMat[9]! * sy;
      this._scratchModelMatrix[8] = vMat[2]! * sz;
      this._scratchModelMatrix[9] = vMat[6]! * sz;
      this._scratchModelMatrix[10] = vMat[10]! * sz;
    }

    const values: Record<string, unknown> = { ...m.properties };
    values["u_model"] = this._scratchModelMatrix;
    if (values["u_color"] === undefined) values["u_color"] = o.material?.color.toFloat32Array();

    const packedData = UniformPacker.pack(shaderDef.layout, values);
    this._device!.queue.writeBuffer(b, 0, packedData);
  }

  protected _getTexBindGroup(
    objBuffer: GPUBuffer,
    m: RenderManifest,
    layout: GPUBindGroupLayout,
  ): GPUBindGroup {
    const entries: GPUBindGroupEntry[] = [
      { binding: 0, resource: { buffer: objBuffer } },
      { binding: 1, resource: this._getSampler(m.textures["u_diffuseMap"] as Texture) },
      { binding: 2, resource: this._getTextureView(m.textures["u_diffuseMap"] as Texture) },
      { binding: 3, resource: this._getNormalTextureView(m.textures["u_normalMap"] as Texture) },
      { binding: 4, resource: this._getTextureView(m.textures["u_specularMap"] as Texture) },
      { binding: 5, resource: this._getTextureView(m.textures["u_sandMap"] as Texture) },
      { binding: 6, resource: this._getTextureView(m.textures["u_grassMap"] as Texture) },
      { binding: 7, resource: this._getTextureView(m.textures["u_rockMap"] as Texture) },
      { binding: 8, resource: this._getTextureView(m.textures["u_snowMap"] as Texture) },
      {
        binding: 9,
        resource: this._getGPUCubeTextureView(m.textures["u_skybox"] as CubeTexture),
      },
    ];
    return this._device!.createBindGroup({ layout, entries });
  }

  protected _getTextureView(tex: Texture | undefined): GPUTextureView {
    if (!tex || !tex.isLoaded || !tex.image) return this._whiteTexView;
    let v = this._textureViewCache.get(tex);
    if (!v) {
      const t = this._device!.createTexture({
        size: [tex.image.width, tex.image.height],
        format: "rgba8unorm",
        usage:
          GPUTextureUsage.TEXTURE_BINDING |
          GPUTextureUsage.COPY_DST |
          GPUTextureUsage.RENDER_ATTACHMENT,
      });
      this._device!.queue.copyExternalImageToTexture({ source: tex.image }, { texture: t }, [
        tex.image.width,
        tex.image.height,
      ]);
      v = t.createView();
      this._textureViewCache.set(tex, v);
    }
    return v;
  }

  protected _getNormalTextureView(tex: Texture | undefined): GPUTextureView {
    if (!tex || !tex.isLoaded || !tex.image) return this._flatNormalTexView;
    return this._getTextureView(tex);
  }

  protected _getGPUCubeTextureView(tex: CubeTexture | undefined): GPUTextureView {
    if (!tex || !tex.isLoaded || tex.images.length !== 6) return this._defaultCubeTexView;
    let v = this._cubeTextureViewCache.get(tex);
    if (!v) {
      const img = tex.images[0]!;
      const t = this._device!.createTexture({
        size: [img.width, img.height, 6],
        format: "rgba8unorm",
        usage:
          GPUTextureUsage.TEXTURE_BINDING |
          GPUTextureUsage.COPY_DST |
          GPUTextureUsage.RENDER_ATTACHMENT,
      });
      for (let i = 0; i < 6; i++)
        this._device!.queue.copyExternalImageToTexture(
          { source: tex.images[i]! },
          { texture: t, origin: [0, 0, i] },
          [img.width, img.height],
        );
      v = t.createView({ dimension: "cube" });
      this._cubeTextureViewCache.set(tex, v);
    }
    return v;
  }

  private _updateGlobalBuffers(
    vp: Float32Array,
    camPos: Vector3D,
    lights: LightDataInterface,
  ): void {
    const gData = new Float32Array(64);
    gData.set(vp, 0);
    gData.set([camPos.x, camPos.y, camPos.z, 1], 16);
    gData.set(
      [
        lights.aCol.r * lights.aIntensity,
        lights.aCol.g * lights.aIntensity,
        lights.aCol.b * lights.aIntensity,
        1,
      ],
      20,
    );
    gData.set(
      [
        lights.dCol.r * lights.dIntensity,
        lights.dCol.g * lights.dIntensity,
        lights.dCol.b * lights.dIntensity,
        1,
      ],
      24,
    );
    // Fix: lights.dDir is already negated to point TO the light in applyTo.
    gData.set([lights.dDir.x, lights.dDir.y, lights.dDir.z, 0], 28);
    gData.set([lights.pLights.length, lights.sLights.length, lights.aLights.length, 2.2], 32);
    gData[36] = 1.0;
    this._device!.queue.writeBuffer(this._globalUniformBuffer, 0, gData);

    const plData = new Float32Array(Math.max(lights.pLights.length * 8, 8));
    for (let i = 0; i < lights.pLights.length; i++) {
      const l = lights.pLights[i]!;
      const d = l.worldMatrix.data;
      plData.set([d[12]!, d[13]!, d[14]!, 1], i * 8);
      plData.set(
        [l.color.r * l.intensity, l.color.g * l.intensity, l.color.b * l.intensity, 1],
        i * 8 + 4,
      );
    }
    this._device!.queue.writeBuffer(this._pointLightBuffer, 0, plData);

    const slData = new Float32Array(Math.max(lights.sLights.length * 16, 16));
    for (let i = 0; i < lights.sLights.length; i++) {
      const l = lights.sLights[i]!;
      const d = l.worldMatrix.data;
      slData.set([d[12]!, d[13]!, d[14]!, 1], i * 16);
      const dir = MathPool.acquireVector().copyFrom(l.direction).normalize();
      slData.set([dir.x, dir.y, dir.z, 0], i * 16 + 4);
      slData.set(
        [l.color.r * l.intensity, l.color.g * l.intensity, l.color.b * l.intensity, 1],
        i * 16 + 8,
      );
      slData.set(
        [Math.cos(l.angle), Math.cos(l.angle * (1.0 - l.penumbra)), l.distance, l.decay],
        i * 16 + 12,
      );
      MathPool.releaseVector(dir);
    }
    this._device!.queue.writeBuffer(this._spotLightBuffer, 0, slData);

    const alData = new Float32Array(Math.max(lights.aLights.length * 24, 24));
    for (let i = 0; i < lights.aLights.length; i++) {
      const l = lights.aLights[i]!;
      const m = l.worldMatrix.data;
      const off = i * 24;
      alData.set([m[12]!, m[13]!, m[14]!, 1], off);
      alData.set(
        [l.color.r * l.intensity, l.color.g * l.intensity, l.color.b * l.intensity, 1],
        off + 4,
      );
      alData.set([m[0]!, m[1]!, m[2]!, 0], off + 8);
      alData.set([m[4]!, m[5]!, m[6]!, 0], off + 12);
      alData.set([m[8]!, m[9]!, m[10]!, 0], off + 16);
      alData.set([l.width / 2, l.height / 2, 0, 0], off + 20);
    }
    this._device!.queue.writeBuffer(this._areaLightBuffer, 0, alData);
  }

  public override setSize(width: number, height: number): void {
    if (!this._device) return;
    const d = devicePixelRatio;
    this._context.canvas.width = width * d;
    this._context.canvas.height = height * d;
    this._depthTexture = this._device.createTexture({
      size: [this._context.canvas.width, this._context.canvas.height],
      format: "depth24plus",
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
    });
  }
}

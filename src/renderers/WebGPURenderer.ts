/// src/renderers/WebGPURenderer.ts

import {
  CubeTexture,
  RenderManifest,
  ShaderRegistry,
  Texture,
  DeviceCaps,
  InstancedMesh,
  RenderTarget,
  RenderTargetCube,
} from "../core/index.js";
import { EngineOptions, GeometryDataInterface, LightDataInterface } from "../interfaces/index.js";
import { Object3D } from "../core/Object3D.js";
import { Scene } from "../core/Scene.js";
import { MathPool, Vector3D, Matrix4 } from "../math/index.js";
import {
  BlendingMode,
  RendererType,
  TextureFilter,
  TextureWrap,
  PostProcessingEffectType,
} from "../enums/index.js";
import { Fog } from "../core/Fog.js";

import { AbstractRenderer } from "./AbstractRenderer.js";
import { RenderPass } from "./RenderPass.js";
import { MainRenderPass } from "./passes/MainRenderPass.js";
import { PostProcessPass } from "./passes/PostProcessPass.js";
import { BloomPassGPU } from "./post/BloomPassGPU.js";
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

  public _context!: GPUCanvasContext;
  public _format!: GPUTextureFormat;

  protected _pipelines: Map<string, WebGPUPipelineCache> = new Map();
  protected _shaderModules: Map<string, GPUShaderModule> = new Map();

  public _whiteTexView!: GPUTextureView;
  protected _flatNormalTexView!: GPUTextureView;
  protected _objectUniformBuffers = new Map<
    string,
    {
      buffer: GPUBuffer;
      lastFrame: number;
      objBg?: GPUBindGroup;
    }
  >();
  protected _materialBindGroups = new Map<
    string,
    {
      bg: GPUBindGroup;
      resources: unknown[];
    }
  >();
  protected _textureViewCache = new Map<Texture, GPUTextureView>();
  protected _dummyNormalBuffer!: GPUBuffer;
  protected _dummyUvBuffer!: GPUBuffer;
  protected _dummyTangentBuffer!: GPUBuffer;
  protected _geoCache = new Map<GeometryDataInterface, WebGPUGeoCache>();
  protected _gpuInstanceBuffers: WeakMap<InstancedMesh, GPUBuffer> = new WeakMap();
  protected _frameCount = 0;
  protected _scratchModelMatrix = new Float32Array(16);
  protected _scratchColorArray = new Float32Array(3);
  protected _scratchUniformValues: Record<string, unknown> = {};
  protected _defaultCubeTexView!: GPUTextureView;

  protected _samplerCache: Map<string, GPUSampler> = new Map();

  protected _dummyBufferSize: number = 0;

  protected _cubeTextureViewCache: Map<CubeTexture, GPUTextureView> = new Map();

  protected _scratchGlobalBufferData = new Float32Array(48);
  protected _scratchPointLightData = new Float32Array(32); // Max 4 lights
  protected _scratchSpotLightData = new Float32Array(64); // Max 4 lights
  protected _scratchAreaLightData = new Float32Array(96); // Max 4 lights
  protected _scratchObjBufferData = new Float32Array(256 / 4); // Max 256 bytes

  public _depthTexture!: GPUTexture;

  protected _opaqueTextures = new WeakMap<
    object,
    { tex: GPUTexture; view: GPUTextureView; width: number; height: number }
  >();
  protected _screenOpaqueTexture?: {
    tex: GPUTexture;
    view: GPUTextureView;
    width: number;
    height: number;
  };
  public _opaqueTextureView?: GPUTextureView;

  public _hdrTexture: GPUTexture | undefined = undefined;
  public _hdrTextureView: GPUTextureView | undefined = undefined;
  public _bloomPassGPU: BloomPassGPU | undefined = undefined;
  public _bloomTextureView: GPUTextureView | undefined = undefined;

  protected _activeRenderTarget: RenderTarget | RenderTargetCube | null = null;
  protected _activeCubeFace: number = 0;
  protected _renderTargetTextures: Map<
    RenderTarget,
    { tex: GPUTexture; view: GPUTextureView; depth?: GPUTexture; depthView?: GPUTextureView }
  > = new Map();
  protected _renderTargetCubeTextures: Map<
    RenderTargetCube,
    {
      tex: GPUTexture;
      cubeView: GPUTextureView;
      faceViews: GPUTextureView[];
      depth?: GPUTexture;
      depthView?: GPUTextureView;
    }
  > = new Map();

  // Render Pass System
  protected _passes: RenderPass[] = [];

  public _globalUniformBuffer!: GPUBuffer;
  public _pointLightBuffer!: GPUBuffer;
  public _spotLightBuffer!: GPUBuffer;
  public _areaLightBuffer!: GPUBuffer;
  public _globalBindGroup!: GPUBindGroup;
  public _globalBGL!: GPUBindGroupLayout;
  public _materialBGL!: GPUBindGroupLayout;
  public _objectBGL!: GPUBindGroupLayout;

  /** @inheritdoc */
  public override setRenderTarget(
    target: RenderTarget | RenderTargetCube | null,
    activeCubeFace?: number,
  ): void {
    this._activeRenderTarget = target;
    this._activeCubeFace = activeCubeFace ?? 0;
  }

  public get activeDepthView(): GPUTextureView {
    if (this._activeRenderTarget) {
      if (this._activeRenderTarget instanceof RenderTargetCube) {
        const data = this._renderTargetCubeTextures.get(this._activeRenderTarget);
        if (data && data.depthView) return data.depthView;
      } else {
        const data = this._renderTargetTextures.get(this._activeRenderTarget);
        if (data && data.depthView) return data.depthView;
      }
    }
    return this._depthTexture.createView();
  }

  /** @inheritdoc */
  public async initialize(
    canvas: HTMLCanvasElement,
    attributes?: Record<string, unknown>,
    config?: EngineOptions,
  ): Promise<void> {
    this._adapter = (await navigator.gpu.requestAdapter(attributes)) ?? undefined;
    if (!this._adapter) throw new Error("[WebGPURenderer] No adapter found.");

    this._device = await this._adapter.requestDevice();

    // Update DeviceCaps with actual WebGPU limits
    DeviceCaps.updateLimits({
      maxTextureSize: this._device.limits.maxTextureDimension2D,
      maxUniformBufferSize: this._device.limits.maxUniformBufferBindingSize,
      maxTextureImageUnits: this._device.limits.maxSampledTexturesPerShaderStage,
    });

    // Add uncapturederror listener
    this._device.onuncapturederror = (event: GPUUncapturedErrorEvent): void => {
      console.error("[WebGPU Error]:", event.error.message);
    };

    if (config?.quality) {
      this._quality = { ...this._quality, ...config.quality };
    }
    if (config?.postProcessing) {
      this.postProcessing.loadConfig(config.postProcessing);
    }

    this._context = canvas.getContext("webgpu") as GPUCanvasContext;
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

    const matEntries: GPUBindGroupLayoutEntry[] = [
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
    matEntries.push(
      {
        binding: 12,
        visibility: GPUShaderStage.FRAGMENT,
        texture: { viewDimension: "2d", sampleType: "float" },
      },
      {
        binding: 13,
        visibility: GPUShaderStage.FRAGMENT,
        texture: { viewDimension: "2d", sampleType: "float" },
      },
      {
        binding: 14,
        visibility: GPUShaderStage.FRAGMENT,
        texture: { viewDimension: "2d", sampleType: "float" },
      },
      {
        binding: 15,
        visibility: GPUShaderStage.FRAGMENT,
        texture: { viewDimension: "2d", sampleType: "float" },
      },
    );
    this._materialBGL = this._device!.createBindGroupLayout({ entries: matEntries });

    this._objectBGL = this._device!.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
          buffer: { type: "uniform" },
        },
      ],
    });
  }

  protected _getPipeline(
    manifest: RenderManifest,
    topology: GPUPrimitiveTopology,
    isInstanced: boolean = false,
  ): WebGPUPipelineCache {
    const shaderId = manifest.shaderId;
    const state = manifest.state || {};
    const targetFormat = this.postProcessing.enabled ? "rgba16float" : this._format;
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
      (state.depthTest !== false) +
      "_" +
      targetFormat +
      (isInstanced ? "_instanced" : "");
    let cache = this._pipelines.get(key);
    if (!cache) {
      console.log("[WebGPURenderer] Creating new pipeline:", key);
      const sm = this._getShaderModule(shaderId, isInstanced);
      const pipelineLayout = this._device!.createPipelineLayout({
        bindGroupLayouts: [this._globalBGL, this._materialBGL, this._objectBGL],
      });

      const vertexBuffers: GPUVertexBufferLayout[] = [
        { arrayStride: 12, attributes: [{ shaderLocation: 0, offset: 0, format: "float32x3" }] },
        { arrayStride: 12, attributes: [{ shaderLocation: 1, offset: 0, format: "float32x3" }] },
        { arrayStride: 8, attributes: [{ shaderLocation: 2, offset: 0, format: "float32x2" }] },
        { arrayStride: 12, attributes: [{ shaderLocation: 3, offset: 0, format: "float32x3" }] },
      ];

      if (isInstanced) {
        vertexBuffers.push({
          arrayStride: 64, // 16 floats * 4 bytes
          stepMode: "instance",
          attributes: [
            { shaderLocation: 4, offset: 0, format: "float32x4" },
            { shaderLocation: 5, offset: 16, format: "float32x4" },
            { shaderLocation: 6, offset: 32, format: "float32x4" },
            { shaderLocation: 7, offset: 48, format: "float32x4" },
          ],
        });
      }

      const targets: GPUColorTargetState[] = [{ format: targetFormat as GPUTextureFormat }];
      if (state.blending === BlendingMode.ALPHA) {
        targets[0]!.blend = {
          color: { srcFactor: "src-alpha", dstFactor: "one-minus-src-alpha", operation: "add" },
          alpha: { srcFactor: "one", dstFactor: "one-minus-src-alpha", operation: "add" },
        };
      } else if (state.blending === BlendingMode.ADDITIVE) {
        targets[0]!.blend = {
          color: { srcFactor: "one", dstFactor: "one", operation: "add" },
          alpha: { srcFactor: "one", dstFactor: "one", operation: "add" },
        };
      } else if (state.blending === BlendingMode.PREMULTIPLIED_ALPHA) {
        targets[0]!.blend = {
          color: { srcFactor: "one", dstFactor: "one-minus-src-alpha", operation: "add" },
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
      cache = {
        pipeline,
        layout: pipelineLayout,
        bgLayouts: [this._globalBGL, this._materialBGL, this._objectBGL],
      };
      this._pipelines.set(key, cache);
    }
    return cache;
  }

  protected _getShaderModule(shaderId: string, isInstanced: boolean = false): GPUShaderModule {
    const key = isInstanced ? `${shaderId}_instanced` : shaderId;
    let sm = this._shaderModules.get(key);
    if (!sm) {
      const def = ShaderRegistry.instance.get(shaderId);
      let code = ShaderRegistry.instance.assemble(def!.sources.wgsl!, "wgsl");

      if (isInstanced) {
        // Match the entire function signature fn vs(...) -> Out {
        code = code.replace(/fn\s+vs\s*\(([\s\S]*?)\)\s*->\s*Out\s*\{/, (_match, params) => {
          const trimmedParams = params.trim();
          const comma = trimmedParams.length > 0 ? "," : "";
          return `fn vs(
  ${trimmedParams}${comma}
  @location(4) inst_col0: vec4f,
  @location(5) inst_col1: vec4f,
  @location(6) inst_col2: vec4f,
  @location(7) inst_col3: vec4f
) -> Out {
  let instMatrix = mat4x4f(inst_col0, inst_col1, inst_col2, inst_col3);`;
        });

        // Replace obj.model with (obj.model * instMatrix)
        code = code.replace(/obj\.model/g, "(obj.model * instMatrix)");
      }

      sm = this._device!.createShaderModule({ code });
      this._shaderModules.set(key, sm);
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
    this._updateGlobalBuffers(vp, camPos, lights, scene.fog);
    const ce = this._device.createCommandEncoder();

    if (this.postProcessing.enabled && !this._hdrTexture) {
      this._hdrTexture = this._device.createTexture({
        size: [this._context.canvas.width, this._context.canvas.height],
        format: "rgba16float",
        usage:
          GPUTextureUsage.RENDER_ATTACHMENT |
          GPUTextureUsage.TEXTURE_BINDING |
          GPUTextureUsage.COPY_SRC,
      });
      this._hdrTextureView = this._hdrTexture.createView();
    } else if (!this.postProcessing.enabled && this._hdrTexture) {
      this._hdrTexture.destroy();
      this._hdrTexture = undefined;
      this._hdrTextureView = undefined;
    }

    const screenView = this._context.getCurrentTexture().createView();
    let renderTargetView = this.postProcessing.enabled ? this._hdrTextureView! : screenView;
    let isOffscreen = false;

    if (this._activeRenderTarget) {
      isOffscreen = true;

      if (this._activeRenderTarget instanceof RenderTargetCube) {
        let data = this._renderTargetCubeTextures.get(this._activeRenderTarget);
        if (!data || !this._activeRenderTarget.isLoaded) {
          if (data) {
            data.tex.destroy();
            if (data.depth) data.depth.destroy();
          }

          const tex = this._device!.createTexture({
            size: {
              width: this._activeRenderTarget.width,
              height: this._activeRenderTarget.height,
              depthOrArrayLayers: 6,
            },
            format: this._format,
            usage:
              GPUTextureUsage.RENDER_ATTACHMENT |
              GPUTextureUsage.TEXTURE_BINDING |
              GPUTextureUsage.COPY_SRC,
          });

          const cubeView = tex.createView({ dimension: "cube" });
          const faceViews: GPUTextureView[] = [];
          for (let i = 0; i < 6; i++) {
            faceViews.push(
              tex.createView({ dimension: "2d", baseArrayLayer: i, arrayLayerCount: 1 }),
            );
          }

          let depth: GPUTexture | undefined;
          let depthView: GPUTextureView | undefined;

          if (this._activeRenderTarget.depth) {
            depth = this._device!.createTexture({
              size: [this._activeRenderTarget.width, this._activeRenderTarget.height],
              format: "depth24plus",
              usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
            });
            depthView = depth.createView();
          }

          data = { tex, cubeView, faceViews };
          if (depth !== undefined) data.depth = depth;
          if (depthView !== undefined) data.depthView = depthView;
          this._renderTargetCubeTextures.set(this._activeRenderTarget, data);
          this._cubeTextureViewCache.set(this._activeRenderTarget, cubeView);
          this._activeRenderTarget.isLoaded = true;
        }
        renderTargetView = data.faceViews[this._activeCubeFace]!;
      } else {
        let data = this._renderTargetTextures.get(this._activeRenderTarget);
        if (!data || !this._activeRenderTarget.isLoaded) {
          if (data) {
            data.tex.destroy();
            if (data.depth) data.depth.destroy();
          }

          const tex = this._device.createTexture({
            size: [this._activeRenderTarget.width, this._activeRenderTarget.height],
            format: this._format,
            usage:
              GPUTextureUsage.RENDER_ATTACHMENT |
              GPUTextureUsage.TEXTURE_BINDING |
              GPUTextureUsage.COPY_SRC,
          });
          const view = tex.createView();

          let depth: GPUTexture | undefined;
          let depthView: GPUTextureView | undefined;

          if (this._activeRenderTarget.depth) {
            depth = this._device.createTexture({
              size: [this._activeRenderTarget.width, this._activeRenderTarget.height],
              format: "depth24plus",
              usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
            });
            depthView = depth.createView();
          }

          data = { tex, view };
          if (depth !== undefined) data.depth = depth;
          if (depthView !== undefined) data.depthView = depthView;
          this._renderTargetTextures.set(this._activeRenderTarget, data);
          this._textureViewCache.set(this._activeRenderTarget, view);
          this._activeRenderTarget.isLoaded = true;
        }
        renderTargetView = data.view;
      }
    }

    const bloomNode = this.postProcessing.get<
      import("./post/PostProcessingElement.js").BloomElement
    >(PostProcessingEffectType.BLOOM);

    for (const pass of this._passes) {
      if (
        pass.name === "PostProcessPass" &&
        bloomNode &&
        bloomNode.enabled &&
        this._hdrTexture &&
        this._hdrTextureView
      ) {
        this._bloomPassGPU ??= new BloomPassGPU(this._device);
        this._bloomTextureView =
          this._bloomPassGPU.execute(ce, this._hdrTexture, this._hdrTextureView, bloomNode) ??
          undefined;
      } else if (pass.name === "PostProcessPass") {
        this._bloomTextureView = undefined;
      }

      if (pass.name === "PostProcessPass" && isOffscreen) {
        continue;
      }

      pass.execute(this, scene, ce, renderTargetView, vp, camPos, vMat);
    }

    this._device.queue.submit([ce.finish()]);
    if (this._frameCount % 100 === 0) this._pruneObjectBuffers();
  }

  public captureOpaqueTexture(ce: GPUCommandEncoder, targetTex: GPUTexture): void {
    let cacheObj = this._activeRenderTarget
      ? this._opaqueTextures.get(this._activeRenderTarget)
      : this._screenOpaqueTexture;

    if (!cacheObj || cacheObj.width !== targetTex.width || cacheObj.height !== targetTex.height) {
      if (cacheObj) cacheObj.tex.destroy();

      const tex = this._device!.createTexture({
        size: [targetTex.width, targetTex.height, 1],
        format: targetTex.format,
        usage: GPUTextureUsage.COPY_DST | GPUTextureUsage.TEXTURE_BINDING,
      });
      cacheObj = { tex, view: tex.createView(), width: targetTex.width, height: targetTex.height };

      if (this._activeRenderTarget) {
        this._opaqueTextures.set(this._activeRenderTarget, cacheObj);
      } else {
        this._screenOpaqueTexture = cacheObj;
      }
    }

    this._opaqueTextureView = cacheObj.view;

    ce.copyTextureToTexture({ texture: targetTex }, { texture: cacheObj.tex }, [
      targetTex.width,
      targetTex.height,
      1,
    ]);
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
    _shaderId: string,
    materialGroups: Map<string, Object3D[]>,
    vMat?: Float32Array,
    topology: GPUPrimitiveTopology = "triangle-list",
  ): void {
    rp.setBindGroup(0, this._globalBindGroup);
    for (const [matUuid, objects] of materialGroups.entries()) {
      if (objects.length === 0) continue;

      const instancedObjects: Object3D[] = [];
      const standardObjects: Object3D[] = [];

      for (const o of objects) {
        if (o instanceof InstancedMesh) {
          instancedObjects.push(o);
        } else {
          standardObjects.push(o);
        }
      }

      const mat = objects[0]?.material;
      if (!mat) continue;
      const manifest = mat.getRenderManifest();

      if (standardObjects.length > 0) {
        this._renderSubgroup(rp, standardObjects, false, matUuid, manifest, vMat, topology);
      }

      if (instancedObjects.length > 0) {
        this._renderSubgroup(rp, instancedObjects, true, matUuid, manifest, vMat, topology);
      }
    }
  }

  private _renderSubgroup(
    rp: GPURenderPassEncoder,
    objects: Object3D[],
    isInstanced: boolean,
    matUuid: string,
    manifest: RenderManifest,
    vMat?: Float32Array,
    topology: GPUPrimitiveTopology = "triangle-list",
  ): void {
    const cache = this._getPipeline(manifest, topology, isInstanced);
    rp.setPipeline(cache.pipeline);

    const matBindGroup = this._getMaterialBindGroup(matUuid, manifest, cache.bgLayouts[1]!);
    rp.setBindGroup(1, matBindGroup);

    for (const obj of objects) {
      if (!obj.geometry) continue;

      const uBufferData = this._getObjUniformBufferData(obj);
      this._updateObjUniformBuffer(uBufferData.buffer, obj, manifest, vMat);
      const objBindGroup = this._getObjBindGroup(uBufferData, cache.bgLayouts[2]!);
      rp.setBindGroup(2, objBindGroup);

      const gCache = this._getGeoCache(obj.geometry!);
      this._ensureDummyBufferSize(gCache.vertexCount);
      rp.setVertexBuffer(0, gCache.vb);
      rp.setVertexBuffer(1, gCache.nb || this._dummyNormalBuffer);
      rp.setVertexBuffer(2, gCache.uvb || this._dummyUvBuffer);
      rp.setVertexBuffer(3, gCache.tb || this._dummyTangentBuffer);

      if (isInstanced) {
        const instMesh = obj as InstancedMesh;
        let instanceBuf = this._gpuInstanceBuffers.get(instMesh);
        const matrixByteLength = instMesh.instanceMatrices.byteLength;

        if (!instanceBuf || instanceBuf.size < matrixByteLength) {
          if (instanceBuf) instanceBuf.destroy();
          instanceBuf = this._device!.createBuffer({
            size: matrixByteLength,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
          });
          this._gpuInstanceBuffers.set(instMesh, instanceBuf);
          instMesh.instanceMatrixNeedsUpdate = true;
        }

        if (instMesh.instanceMatrixNeedsUpdate) {
          this._device!.queue.writeBuffer(instanceBuf, 0, instMesh.instanceMatrices);
          instMesh.instanceMatrixNeedsUpdate = false;
        }

        rp.setVertexBuffer(4, instanceBuf);

        if (topology === "line-list") {
          if (gCache.wib) {
            rp.setIndexBuffer(gCache.wib, gCache.format!);
            rp.drawIndexed(gCache.wireframeIndexCount, instMesh.instanceCount);
          } else if (gCache.ib) {
            rp.setIndexBuffer(gCache.ib, gCache.format!);
            rp.drawIndexed(gCache.indexCount, instMesh.instanceCount);
          } else {
            rp.draw(gCache.vertexCount, instMesh.instanceCount);
          }
        } else if (gCache.ib) {
          rp.setIndexBuffer(gCache.ib, gCache.format!);
          rp.drawIndexed(gCache.indexCount, instMesh.instanceCount);
        } else {
          rp.draw(gCache.vertexCount, instMesh.instanceCount);
        }
      } else {
        if (topology === "line-list") {
          if (gCache.wib) {
            rp.setIndexBuffer(gCache.wib, gCache.format!);
            rp.drawIndexed(gCache.wireframeIndexCount);
          } else if (gCache.ib) {
            rp.setIndexBuffer(gCache.ib, gCache.format!);
            rp.drawIndexed(gCache.indexCount);
          } else {
            rp.draw(gCache.vertexCount);
          }
        } else if (gCache.ib) {
          rp.setIndexBuffer(gCache.ib, gCache.format!);
          rp.drawIndexed(gCache.indexCount);
        } else {
          rp.draw(gCache.vertexCount);
        }
      }
    }
  }

  protected _getObjUniformBufferData(obj: Object3D): {
    buffer: GPUBuffer;
    lastFrame: number;
    objBg?: GPUBindGroup;
  } {
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
    return data;
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
    this._device!.queue.writeBuffer(b, 0, this._scratchObjBufferData);
  }

  protected _getMaterialBindGroup(
    matUuid: string,
    m: RenderManifest,
    layout: GPUBindGroupLayout,
  ): GPUBindGroup {
    const r1 = this._getSampler(m.textures["u_diffuseMap"] as Texture);
    const r2 = this._getTextureView(m.textures["u_diffuseMap"] as Texture);
    const r3 = this._getNormalTextureView(m.textures["u_normalMap"] as Texture);
    const r4 = this._getTextureView(m.textures["u_specularMap"] as Texture);
    const r5 = this._getTextureView(m.textures["u_sandMap"] as Texture);
    const r6 = this._getTextureView(m.textures["u_grassMap"] as Texture);
    const r7 = this._getTextureView(m.textures["u_rockMap"] as Texture);
    const r8 = this._getTextureView(m.textures["u_snowMap"] as Texture);
    const r9 = this._getTextureView(m.textures["u_metallicMap"] as Texture);
    const r10 = this._getTextureView(m.textures["u_roughnessMap"] as Texture);
    const envOrSkybox = m.textures["u_skybox"] || m.textures["u_envMap"];
    const r11 = this._getGPUCubeTextureView(envOrSkybox as CubeTexture);
    const r12 = this._getTextureView(m.textures["u_emissiveMap"] as Texture);
    const r13 = this._getTextureView(m.textures["u_alphaMap"] as Texture);
    const r14 = m.textures["u_opaqueMap"]
      ? this._getTextureView(m.textures["u_opaqueMap"] as Texture)
      : this._opaqueTextureView || this._whiteTexView;
    const r15 = this._getTextureView(m.textures["u_reflectionMap"] as Texture);

    const cache = this._materialBindGroups.get(matUuid);
    if (cache) {
      const resources = cache.resources;
      if (
        resources[0] === r1 &&
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
        resources[13] === r14 &&
        resources[14] === r15
      ) {
        return cache.bg;
      }
    }

    const entries: GPUBindGroupEntry[] = [
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
      { binding: 15, resource: r15 },
    ];
    const bg = this._device!.createBindGroup({ layout, entries });
    this._materialBindGroups.set(matUuid, {
      bg,
      resources: [r1, r2, r3, r4, r5, r6, r7, r8, r9, r10, r11, r12, r13, r14, r15],
    });
    return bg;
  }

  protected _getObjBindGroup(
    objBufferData: { buffer: GPUBuffer; objBg?: GPUBindGroup },
    layout: GPUBindGroupLayout,
  ): GPUBindGroup {
    if (objBufferData.objBg) return objBufferData.objBg;

    objBufferData.objBg = this._device!.createBindGroup({
      layout,
      entries: [{ binding: 0, resource: { buffer: objBufferData.buffer } }],
    });
    return objBufferData.objBg;
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
    if (!tex || !tex.isLoaded) return this._defaultCubeTexView;
    if (tex instanceof RenderTargetCube) {
      const v = this._cubeTextureViewCache.get(tex);
      return v || this._defaultCubeTexView;
    }
    if (tex.images.length !== 6) return this._defaultCubeTexView;
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
    fog?: Fog,
  ): void {
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
    } else {
      gData[37] = 0.0; // fogMode NONE
    }
    this._device!.queue.writeBuffer(this._globalUniformBuffer, 0, gData);

    const plDataSize = Math.max(lights.pLights.length * 8, 8);
    if (this._scratchPointLightData.length < plDataSize) {
      this._scratchPointLightData = new Float32Array(plDataSize);
    }
    const plData = this._scratchPointLightData;
    for (let i = 0; i < lights.pLights.length; i++) {
      const l = lights.pLights[i]!;
      const d = l.worldMatrix.data;
      plData.set([d[12]!, d[13]!, d[14]!, l.distance], i * 8);
      plData.set(
        [l.color.r * l.intensity, l.color.g * l.intensity, l.color.b * l.intensity, l.decay],
        i * 8 + 4,
      );
    }
    this._device!.queue.writeBuffer(this._pointLightBuffer, 0, plData.subarray(0, plDataSize));

    const slDataSize = Math.max(lights.sLights.length * 16, 16);
    if (this._scratchSpotLightData.length < slDataSize) {
      this._scratchSpotLightData = new Float32Array(slDataSize);
    }
    const slData = this._scratchSpotLightData;
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
    this._device!.queue.writeBuffer(this._spotLightBuffer, 0, slData.subarray(0, slDataSize));

    const alDataSize = Math.max(lights.aLights.length * 24, 24);
    if (this._scratchAreaLightData.length < alDataSize) {
      this._scratchAreaLightData = new Float32Array(alDataSize);
    }
    const alData = this._scratchAreaLightData;
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
    this._device!.queue.writeBuffer(this._areaLightBuffer, 0, alData.subarray(0, alDataSize));
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

    if (this.postProcessing.enabled) {
      if (this._hdrTexture) this._hdrTexture.destroy();
      this._hdrTexture = this._device.createTexture({
        size: [this._context.canvas.width, this._context.canvas.height],
        format: "rgba16float",
        usage:
          GPUTextureUsage.RENDER_ATTACHMENT |
          GPUTextureUsage.TEXTURE_BINDING |
          GPUTextureUsage.COPY_SRC,
      });
      this._hdrTextureView = this._hdrTexture.createView();
    } else if (this._hdrTexture) {
      this._hdrTexture.destroy();
      this._hdrTexture = undefined;
      this._hdrTextureView = undefined;
    }
  }
}

// Removed Fog import
import {
  CubeTexture,
  RenderManifest,
  ShaderRegistry,
  DeviceCaps,
  DeviceLimit,
  InstancedMesh,
  Object3D,
  Scene,
  TextureArray,
  Texture,
} from "../../core/index.js";
import { RenderTarget, RenderTargetCube } from "../../core/textures/index.js";
import {
  EngineOptions,
  GeometryDataInterface,
  LightDataInterface,
} from "../../interfaces/index.js";

import { MathPool, Vector3D, Matrix4 } from "../../math/index.js";
import {
  BlendingMode,
  CullMode,
  RendererType,
  TextureFilter,
  TextureWrap,
  Topology,
  PostProcessingEffectType,
} from "../../enums/index.js";
import { AbstractRenderer } from "../AbstractRenderer.js";
import { RenderPass } from "../RenderPass.js";
import {
  MainRenderPass,
  PostProcessPass,
  CascadedShadowPassGPU,
  SpotShadowPassGPU,
} from "../passes/index.js";
import { BloomPassGPU } from "../post/passes/index.js";
import { UniformPacker } from "../../core/renderers/shaders/index.js";

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
  /** Number of live Object3D instances currently referencing this geometry. */
  refCount: number;
}

export interface WebGPUPipelineCache {
  pipeline: GPURenderPipeline;
  layout: GPUPipelineLayout;
  bgLayouts: GPUBindGroupLayout[];
  /** Number of live Object3D instances currently referencing this pipeline. */
  refCount: number;
}

/**
 * GPU binding-slot metadata for every material texture that ISN'T always bound (see
 * `_getMaterialBGL`'s fixed set: sampler/normalMap/envMap/emissiveMap). Mirrors `structs.wgsl`'s
 * `@group(1)` binding numbers 1:1 -- this is stable GPU-type metadata (what shape is this
 * texture?), not a "which material uses this?" list. That answer comes from each material's own
 * `getShaderDefinition().layout.textures`, which is what `_getMaterialBGL`/`_getMaterialBindGroup`
 * actually consult to decide which of these entries a given material's bind group needs.
 *
 * Built lazily (not a module-scope literal): it references the `GPUShaderStage` global, which
 * only exists where the WebGPU API is present -- eagerly evaluating it at import time would break
 * every environment without that global (e.g. Vitest), even for tests unrelated to WebGPU, since
 * they transitively import this module via `RendererFactory`.
 */
let _optionalMaterialTextureBindings:
  Record<string, { binding: number; layoutEntry: GPUBindGroupLayoutEntry }> | undefined;

function getOptionalMaterialTextureBindings(): Record<
  string,
  { binding: number; layoutEntry: GPUBindGroupLayoutEntry }
> {
  if (!_optionalMaterialTextureBindings) {
    _optionalMaterialTextureBindings = {
      u_diffuseMap: {
        binding: 2,
        layoutEntry: {
          binding: 2,
          visibility: GPUShaderStage.FRAGMENT,
          texture: { sampleType: "float" },
        },
      },
      u_specularMap: {
        binding: 4,
        layoutEntry: {
          binding: 4,
          visibility: GPUShaderStage.FRAGMENT,
          texture: { sampleType: "float" },
        },
      },
      u_sandMap: {
        binding: 5,
        layoutEntry: {
          binding: 5,
          visibility: GPUShaderStage.FRAGMENT,
          texture: { sampleType: "float" },
        },
      },
      u_grassMap: {
        binding: 6,
        layoutEntry: {
          binding: 6,
          visibility: GPUShaderStage.FRAGMENT,
          texture: { sampleType: "float" },
        },
      },
      u_rockMap: {
        binding: 7,
        layoutEntry: {
          binding: 7,
          visibility: GPUShaderStage.FRAGMENT,
          texture: { sampleType: "float" },
        },
      },
      u_snowMap: {
        binding: 8,
        layoutEntry: {
          binding: 8,
          visibility: GPUShaderStage.FRAGMENT,
          texture: { sampleType: "float" },
        },
      },
      u_metallicMap: {
        binding: 9,
        layoutEntry: {
          binding: 9,
          visibility: GPUShaderStage.FRAGMENT,
          texture: { sampleType: "float" },
        },
      },
      u_roughnessMap: {
        binding: 10,
        layoutEntry: {
          binding: 10,
          visibility: GPUShaderStage.FRAGMENT,
          texture: { sampleType: "float" },
        },
      },
      u_alphaMap: {
        binding: 13,
        layoutEntry: {
          binding: 13,
          visibility: GPUShaderStage.FRAGMENT,
          texture: { viewDimension: "2d", sampleType: "float" },
        },
      },
      u_opaqueMap: {
        binding: 14,
        layoutEntry: {
          binding: 14,
          visibility: GPUShaderStage.FRAGMENT,
          texture: { viewDimension: "2d", sampleType: "float" },
        },
      },
      u_reflectionMap: {
        binding: 15,
        layoutEntry: {
          binding: 15,
          visibility: GPUShaderStage.FRAGMENT,
          texture: { viewDimension: "2d", sampleType: "float" },
        },
      },
      u_opaqueDepthMap: {
        binding: 16,
        layoutEntry: {
          binding: 16,
          visibility: GPUShaderStage.FRAGMENT,
          texture: { viewDimension: "2d", sampleType: "depth" },
        },
      },
    };
  }
  return _optionalMaterialTextureBindings;
}

/**
 * Number of sampled-texture bindings in `_globalBGL` (irradianceMap, prefilterMap, brdfLUT,
 * dirShadowMap, spotShadowMap -- bindings 4/5/6/8/9; binding 7 and 10 are samplers, not counted
 * against the per-stage sampled-texture budget). Every material bind group's own texture count
 * is added on top of this fixed cost when checking against the device's real per-stage limit.
 */
const GLOBAL_BIND_GROUP_TEXTURE_COUNT = 5;

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
  protected _textureViewCache = new Map<Texture, { texture: GPUTexture; view: GPUTextureView }>();
  private _texRefCounts: Map<Texture, number> = new Map();
  public _whiteTexView!: GPUTextureView;
  public _blackTexView!: GPUTextureView;
  public _dummyDepthTexView!: GPUTextureView;
  protected _flatNormalTexView!: GPUTextureView;
  protected _defaultCubeTexView!: GPUTextureView;
  protected _blackCubeTexView!: GPUTextureView;
  protected _defaultBrdfTexView!: GPUTextureView;
  protected _dummyNormalBuffer!: GPUBuffer;
  protected _dummyUvBuffer!: GPUBuffer;
  protected _dummyTangentBuffer!: GPUBuffer;

  public _defaultDirShadowTexView!: GPUTextureView;
  public _defaultSpotShadowTexView!: GPUTextureView;
  protected _shadowSampler!: GPUSampler;
  protected _geoCache = new Map<GeometryDataInterface, WebGPUGeoCache>();
  private _lastKnownGeometry = new WeakMap<Object3D, GeometryDataInterface>();
  private _lastKnownPipelineKey = new WeakMap<Object3D, string>();
  protected _gpuInstanceBuffers: WeakMap<InstancedMesh, GPUBuffer> = new WeakMap();
  protected _gpuInstanceDataBuffers: WeakMap<InstancedMesh, GPUBuffer> = new WeakMap();
  protected _materialBGLCache = new Map<string, GPUBindGroupLayout>();
  /** `shaderId`s already warned about in `_getMaterialBGL`'s sampled-texture budget guard. */
  private _warnedMaterialTextureBudget = new Set<string>();
  protected _frameCount = 0;
  protected _scratchModelMatrix = new Float32Array(16);
  protected _scratchColorArray = new Float32Array(3);
  protected _scratchUniformValues: Record<string, unknown> = {};

  protected _samplerCache: Map<string, GPUSampler> = new Map();

  protected _dummyBufferSize: number = 0;

  protected _cubeTextureViewCache: Map<CubeTexture, { texture: GPUTexture; view: GPUTextureView }> =
    new Map();
  private _texCubeRefCounts: Map<CubeTexture, number> = new Map();
  private _lastKnownTextures: WeakMap<Object3D, Record<string, Texture | CubeTexture | undefined>> =
    new WeakMap();

  public _scratchGlobalBufferData = new Float32Array(204);
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

  public _shadowMaps = new Map<
    import("../../core/index.js").DirectionalLight | import("../../core/index.js").SpotLight,
    GPUTexture
  >();

  public _hdrTexture: GPUTexture | undefined = undefined;
  public _hdrTextureView: GPUTextureView | undefined = undefined;
  public _bloomPassGPU: BloomPassGPU | undefined = undefined;
  public _bloomTextureView: GPUTextureView | undefined = undefined;

  public _activeRenderTarget:
    | import("../../core/index.js").RenderTarget
    | import("../../core/index.js").RenderTargetCube
    | null = null;
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

    const requiredLimits: Record<string, number> = {};

    if (this._adapter.limits.maxSampledTexturesPerShaderStage) {
      requiredLimits["maxSampledTexturesPerShaderStage"] =
        this._adapter.limits.maxSampledTexturesPerShaderStage;
    }
    if (this._adapter.limits.maxUniformBuffersPerShaderStage) {
      requiredLimits["maxUniformBuffersPerShaderStage"] =
        this._adapter.limits.maxUniformBuffersPerShaderStage;
    }
    if (this._adapter.limits.maxStorageBuffersPerShaderStage) {
      requiredLimits["maxStorageBuffersPerShaderStage"] =
        this._adapter.limits.maxStorageBuffersPerShaderStage;
    }
    if (this._adapter.limits.maxBindGroups) {
      requiredLimits["maxBindGroups"] = this._adapter.limits.maxBindGroups;
    }
    if (this._adapter.limits.maxBindingsPerBindGroup) {
      requiredLimits["maxBindingsPerBindGroup"] = this._adapter.limits.maxBindingsPerBindGroup;
    }
    if (this._adapter.limits.maxTextureDimension2D) {
      requiredLimits["maxTextureDimension2D"] = this._adapter.limits.maxTextureDimension2D;
    }
    if (this._adapter.limits.maxUniformBufferBindingSize) {
      requiredLimits["maxUniformBufferBindingSize"] =
        this._adapter.limits.maxUniformBufferBindingSize;
    }

    this._device = await this._adapter.requestDevice({
      requiredLimits,
    });

    // Update DeviceCaps with actual WebGPU limits. `maxSampledTexturesPerShaderStage` deliberately
    // goes into its own `webgpuMaxSampledTexturesPerStage` field, NOT the shared
    // `maxTextureImageUnits` -- that field is `Math.max()`'d against WebGL1/WebGL2 probes taken
    // unconditionally at `DeviceCaps.init()`, so a higher WebGL number could mask a lower real
    // WebGPU one (exactly how a 20-texture WebGPU bind group went undetected on a device whose
    // WebGL2 context happened to report more texture units than this API actually allows).
    DeviceCaps.updateLimits({
      maxTextureSize: this._device.limits.maxTextureDimension2D,
      maxUniformBufferSize: this._device.limits.maxUniformBufferBindingSize,
      webgpuMaxSampledTexturesPerStage: this._device.limits.maxSampledTexturesPerShaderStage,
      webgpuMaxSamplersPerStage: this._device.limits.maxSamplersPerShaderStage,
      webgpuMaxBindGroups: this._device.limits.maxBindGroups,
      webgpuMaxBindingsPerBindGroup: this._device.limits.maxBindingsPerBindGroup,
      webgpuMaxUniformBufferBindingSize: this._device.limits.maxUniformBufferBindingSize,
      webgpuMaxTextureDimension2D: this._device.limits.maxTextureDimension2D,
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

    this._passes = [
      new CascadedShadowPassGPU(),
      new SpotShadowPassGPU(),
      new MainRenderPass(),
      new PostProcessPass(),
    ];
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
    this._blackTexView = create1x1([0, 0, 0, 255]);
    this._defaultBrdfTexView = create1x1([255, 0, 0, 255]); // scale=1, bias=0
    this._flatNormalTexView = create1x1([128, 128, 255, 255]);

    const dummyDepth = this._device!.createTexture({
      size: [1, 1],
      format: "depth32float",
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT,
    });
    this._dummyDepthTexView = dummyDepth.createView();

    const createCube = (col: number[]): GPUTextureView => {
      const cube = this._device!.createTexture({
        size: [1, 1, 6],
        format: "rgba8unorm",
        usage:
          GPUTextureUsage.TEXTURE_BINDING |
          GPUTextureUsage.COPY_DST |
          GPUTextureUsage.RENDER_ATTACHMENT,
      });
      for (let i = 0; i < 6; i++) {
        this._device!.queue.writeTexture(
          { texture: cube, origin: [0, 0, i] },
          new Uint8Array(col),
          { bytesPerRow: 4 },
          [1, 1],
        );
      }
      return cube.createView({ dimension: "cube" });
    };

    this._defaultCubeTexView = createCube([50, 50, 100, 255]);
    this._blackCubeTexView = createCube([0, 0, 0, 255]);

    this._ensureDummyBufferSize(1000);
  }

  protected _getSampler(tex: Texture | undefined): GPUSampler {
    const mag =
      tex?.magFilter === TextureFilter.NEAREST ? TextureFilter.NEAREST : TextureFilter.LINEAR;
    const min =
      tex?.minFilter === TextureFilter.NEAREST ? TextureFilter.NEAREST : TextureFilter.LINEAR;
    const mapWrap = (w: TextureWrap | undefined): GPUAddressMode => {
      if (w === TextureWrap.REPEAT) return TextureWrap.REPEAT;
      if (w === TextureWrap.MIRRORED_REPEAT) return TextureWrap.MIRRORED_REPEAT;
      return TextureWrap.CLAMP_TO_EDGE;
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
        mipmapFilter: TextureFilter.LINEAR,
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

    // Default dummy shadow textures (2D Arrays, Depth24Plus)
    const dummyDirShadow = this._device!.createTexture({
      size: [1, 1, 4],
      format: "depth32float",
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT,
    });
    this._defaultDirShadowTexView = dummyDirShadow.createView({ dimension: "2d-array" });

    const dummySpotShadow = this._device!.createTexture({
      size: [1, 1, 16],
      format: "depth32float",
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT,
    });
    this._defaultSpotShadowTexView = dummySpotShadow.createView({ dimension: "2d-array" });

    this._shadowSampler = this._device!.createSampler({
      magFilter: TextureFilter.LINEAR,
      minFilter: TextureFilter.LINEAR,
      compare: "less",
      addressModeU: TextureWrap.CLAMP_TO_EDGE,
      addressModeV: TextureWrap.CLAMP_TO_EDGE,
    });

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
      size: 816,
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
        { binding: 4, visibility: GPUShaderStage.FRAGMENT, texture: { viewDimension: "cube" } },
        { binding: 5, visibility: GPUShaderStage.FRAGMENT, texture: { viewDimension: "cube" } },
        { binding: 6, visibility: GPUShaderStage.FRAGMENT, texture: { viewDimension: "2d" } },
        { binding: 7, visibility: GPUShaderStage.FRAGMENT, sampler: { type: "filtering" } },
        {
          binding: 8,
          visibility: GPUShaderStage.FRAGMENT,
          texture: { viewDimension: "2d-array", sampleType: "depth" },
        },
        {
          binding: 9,
          visibility: GPUShaderStage.FRAGMENT,
          texture: { viewDimension: "2d-array", sampleType: "depth" },
        },
        { binding: 10, visibility: GPUShaderStage.FRAGMENT, sampler: { type: "comparison" } },
      ],
    });

    this._globalBindGroup = this._createGlobalBindGroup();

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

  private _currentIrradianceMap?: import("../../core/textures/index.js").CubeTexture | undefined;
  private _currentPrefilterMap?: import("../../core/textures/index.js").CubeTexture | undefined;
  private _currentBrdfLUT?: import("../../core/textures/index.js").Texture | undefined;

  public _createGlobalBindGroup(scene?: Scene): GPUBindGroup {
    const irrView = scene?.irradianceMap
      ? this._getGPUCubeTextureView(scene.irradianceMap)
      : this._blackCubeTexView!;
    const prefView = scene?.prefilterMap
      ? this._getGPUCubeTextureView(scene.prefilterMap)
      : this._blackCubeTexView!;
    const brdfView = scene?.brdfLUT
      ? this._getTextureView(scene.brdfLUT)
      : this._defaultBrdfTexView!;
    const sampler = this._getSampler(scene?.brdfLUT); // Use default sampler for global maps

    return this._device!.createBindGroup({
      layout: this._globalBGL,
      entries: [
        { binding: 0, resource: { buffer: this._globalUniformBuffer } },
        { binding: 1, resource: { buffer: this._pointLightBuffer } },
        { binding: 2, resource: { buffer: this._spotLightBuffer } },
        { binding: 3, resource: { buffer: this._areaLightBuffer } },
        { binding: 4, resource: irrView },
        { binding: 5, resource: prefView },
        { binding: 6, resource: brdfView },
        { binding: 7, resource: sampler },
        { binding: 8, resource: this._defaultDirShadowTexView },
        { binding: 9, resource: this._defaultSpotShadowTexView },
        { binding: 10, resource: this._shadowSampler },
      ],
    });
  }

  /**
   * Names from `shaderId`'s own `layout.textures` that also appear in
   * `getOptionalMaterialTextureBindings()` -- i.e. the material-specific textures (beyond the
   * always-bound sampler/normalMap/envMap/emissiveMap) this material's bind group actually needs.
   */
  private _getOptionalMaterialTextureNames(shaderId: string): string[] {
    const declared = ShaderRegistry.instance.get(shaderId)?.layout.textures;
    if (!declared) return [];
    const bindings = getOptionalMaterialTextureBindings();
    return Object.keys(declared).filter((name) => name in bindings);
  }

  /**
   * Builds the material bind group layout for `shaderId`, containing only the texture bindings
   * that material actually declares (plus normalMap/envMap/emissiveMap, which the shared PBR
   * lighting chunk references regardless of what an individual material's own layout declares).
   * A layout with every possible material texture bound at once (diffuse, normal, specular,
   * terrain x4, metallic, roughness, env, emissive, alpha, opaque, reflection, opaqueDepth = 15,
   * plus the 5 IBL/shadow textures in the global bind group = 20) exceeds WebGPU's guaranteed
   * per-stage sampled-texture minimum of 16 on any device that doesn't happen to allow more.
   */
  protected _getMaterialBGL(shaderId: string, flags: string[]): GPUBindGroupLayout {
    const key = shaderId + "_" + flags.join("_");
    let bgl = this._materialBGLCache.get(key);
    if (!bgl) {
      const matEntries: GPUBindGroupLayoutEntry[] = [
        { binding: 1, visibility: GPUShaderStage.FRAGMENT, sampler: { type: "filtering" } },
        { binding: 3, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "float" } },
        { binding: 11, visibility: GPUShaderStage.FRAGMENT, texture: { viewDimension: "cube" } },
        {
          binding: 12,
          visibility: GPUShaderStage.FRAGMENT,
          texture: { viewDimension: "2d", sampleType: "float" },
        },
      ];
      const bindingInfo = getOptionalMaterialTextureBindings();
      for (const name of this._getOptionalMaterialTextureNames(shaderId)) {
        const info = bindingInfo[name]!;
        if ("u_diffuseMap" === name && flags.includes("USE_TEXTURE_ARRAY")) {
          matEntries.push({
            binding: info.binding,
            visibility: GPUShaderStage.FRAGMENT,
            texture: { viewDimension: "2d-array", sampleType: "float" },
          });
        } else {
          matEntries.push(info.layoutEntry);
        }
      }
      this._checkSampledTextureBudget(shaderId, matEntries);
      bgl = this._device!.createBindGroupLayout({ entries: matEntries });
      this._materialBGLCache.set(key, bgl);
    }
    return bgl;
  }

  /**
   * Warns (once per `shaderId`) if `shaderId`'s material bind group, combined with the global
   * bind group's fixed textures, would exceed this device's real per-stage sampled-texture
   * budget -- or the WebGPU spec's guaranteed minimum if the real device limit isn't known yet.
   * `createBindGroupLayout` itself doesn't validate this (the failure only surfaces later, as a
   * cryptic "Invalid PipelineLayout"/"Invalid RenderPipeline" cascade at actual pipeline creation
   * time); this gives an early, actionable diagnostic naming the actual offending material.
   */
  private _checkSampledTextureBudget(
    shaderId: string,
    matEntries: GPUBindGroupLayoutEntry[],
  ): void {
    if (this._warnedMaterialTextureBudget.has(shaderId)) return;

    const materialTextureCount = matEntries.filter((e) => "texture" in e).length;
    const total = GLOBAL_BIND_GROUP_TEXTURE_COUNT + materialTextureCount;
    const deviceLimit = DeviceCaps.getLimit(DeviceLimit.WEBGPU_MAX_SAMPLED_TEXTURES_PER_STAGE);
    const limit =
      deviceLimit > 0
        ? deviceLimit
        : DeviceCaps.getGuaranteedMinimum(DeviceLimit.WEBGPU_MAX_SAMPLED_TEXTURES_PER_STAGE);

    if (total > limit) {
      this._warnedMaterialTextureBudget.add(shaderId);
      console.warn(
        `[WebGPURenderer] Material '${shaderId}' needs ${total} sampled textures in the ` +
          `fragment stage (${GLOBAL_BIND_GROUP_TEXTURE_COUNT} global + ${materialTextureCount} ` +
          `material-specific), exceeding this device's per-stage limit of ${limit}. Pipeline ` +
          `creation for this material will likely fail.`,
      );
    }
  }

  protected _pipelineCacheKey(
    manifest: RenderManifest,
    topology: GPUPrimitiveTopology,
    isInstanced: boolean,
  ): string {
    const shaderId = manifest.shaderId;
    const flags = manifest.flags || [];
    const flagKey = flags.length > 0 ? "_" + flags.join("_") : "";
    const state = manifest.state || {};
    const targetFormat = this.postProcessing.enabled ? "rgba16float" : this._format;
    return (
      shaderId +
      "_" +
      topology +
      "_" +
      (state.culling || CullMode.DEFAULT) +
      "_" +
      (state.blending || BlendingMode.DEFAULT) +
      "_" +
      (state.depthWrite !== false) +
      "_" +
      (state.depthTest !== false) +
      "_" +
      targetFormat +
      (isInstanced ? "_instanced" : "") +
      flagKey
    );
  }

  protected _getPipeline(
    manifest: RenderManifest,
    topology: GPUPrimitiveTopology,
    isInstanced: boolean = false,
  ): WebGPUPipelineCache {
    const shaderId = manifest.shaderId;
    const flags = manifest.flags || [];
    const state = manifest.state || {};
    const targetFormat = this.postProcessing.enabled ? "rgba16float" : this._format;
    const key = this._pipelineCacheKey(manifest, topology, isInstanced);
    let cache = this._pipelines.get(key);
    if (!cache) {
      const sm = this._getShaderModule(shaderId, isInstanced, flags);
      const materialBGL = this._getMaterialBGL(shaderId, flags);
      const pipelineLayout = this._device!.createPipelineLayout({
        bindGroupLayouts: [this._globalBGL, materialBGL, this._objectBGL],
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

        vertexBuffers.push({
          arrayStride: 16, // 4 floats * 4 bytes for instanceData
          stepMode: "instance",
          attributes: [{ shaderLocation: 8, offset: 0, format: "float32x4" }],
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
        primitive: { topology, cullMode: state.culling || CullMode.DEFAULT },
        depthStencil: {
          depthWriteEnabled: state.depthWrite !== false,
          depthCompare: state.depthTest === false ? "always" : "less-equal",
          format: "depth32float",
        },
      });
      cache = {
        pipeline,
        layout: pipelineLayout,
        bgLayouts: [this._globalBGL, materialBGL, this._objectBGL],
        refCount: 0,
      };
      this._pipelines.set(key, cache);
    }
    return cache;
  }

  /**
   * Tracks that `obj` currently depends on the pipeline identified by `key` (same key
   * format `_pipelineCacheKey` computes). Called once per object per frame from the
   * render loop, independent from `_getPipeline`'s own batch-level lookup-or-create,
   * since one pipeline is typically shared by many objects at once.
   */
  private _acquirePipeline(obj: Object3D, key: string): void {
    const lastKey = this._lastKnownPipelineKey.get(obj);
    if (lastKey === key) return;
    if (lastKey) this._releasePipelineFor(obj);

    const cache = this._pipelines.get(key);
    if (cache) cache.refCount++;
    this._lastKnownPipelineKey.set(obj, key);
  }

  /** Releases the pipeline this object was referencing, if its refCount drops to zero. */
  private _releasePipelineFor(obj: Object3D): void {
    const key = this._lastKnownPipelineKey.get(obj);
    if (!key) return;
    this._lastKnownPipelineKey.delete(obj);

    const cache = this._pipelines.get(key);
    if (!cache) return;
    cache.refCount--;
    if (cache.refCount <= 0) {
      // GPURenderPipeline has no explicit destroy(); dropping the cache entry (and all
      // other references) lets it be garbage-collected. The dependent GPUPipelineLayout
      // has no destroy() either.
      this._pipelines.delete(key);
    }
  }

  protected _getShaderModule(
    shaderId: string,
    isInstanced: boolean = false,
    flags: string[] = [],
  ): GPUShaderModule {
    const flagKey = flags.length > 0 ? "_" + flags.join("_") : "";
    const key = isInstanced ? `${shaderId}_instanced${flagKey}` : `${shaderId}${flagKey}`;
    let sm = this._shaderModules.get(key);
    if (!sm) {
      const def = ShaderRegistry.instance.get(shaderId);
      let code = ShaderRegistry.instance.assemble(def!.sources.wgsl!, "wgsl");

      let wgslConstants = "";
      if (flags.includes("USE_TEXTURE_ARRAY")) {
        wgslConstants += "const USE_TEXTURE_ARRAY: bool = true;\n";
        code = code.replace(
          /var u_diffuseMap:\s*texture_2d<f32>;/g,
          "var u_diffuseMap: texture_2d_array<f32>;",
        );
        code = code.replace(
          /textureSample\(u_diffuseMap,\s*s,\s*([^)]+)\)/g,
          "textureSample(u_diffuseMap, s, $1, u32(i.texIndex))",
        );
      } else {
        wgslConstants += "const USE_TEXTURE_ARRAY: bool = false;\n";
      }
      if (isInstanced) {
        wgslConstants += "const USE_INSTANCING: bool = true;\n";
      } else {
        wgslConstants += "const USE_INSTANCING: bool = false;\n";
      }
      code = wgslConstants + "\n" + code;

      if (isInstanced) {
        // Match the entire function signature fn vs(...) -> Out {
        code = code.replace(
          /fn\s+vs\s*\(([\s\S]*?)\)\s*->\s*Out\s*\{/,
          (_match: string, params: string) => {
            const trimmedParams = params.trim();
            const comma = trimmedParams.length > 0 ? "," : "";
            return `fn vs(
  ${trimmedParams}${comma}
  @location(4) inst_col0: vec4f,
  @location(5) inst_col1: vec4f,
  @location(6) inst_col2: vec4f,
  @location(7) inst_col3: vec4f,
  @location(8) inst_data: vec4f
) -> Out {
  let instMatrix = mat4x4f(inst_col0, inst_col1, inst_col2, inst_col3);`;
          },
        );

        // Replace obj.model with (obj.model * instMatrix)
        code = code.replace(/obj\.model/g, "(obj.model * instMatrix)");

        code = code.replace(/return\s+o;/g, "o.texIndex = inst_data.x;\n    return o;");
      } else {
        code = code.replace(/return\s+o;/g, "o.texIndex = 0.0;\n    return o;");
      }

      sm = this._device!.createShaderModule({ code });

      // Async compile check to surface WGSL errors
      sm.getCompilationInfo().then((info) => {
        const errors = info.messages.filter((m) => m.type === "error");
        if (errors.length > 0) {
          console.error("[WebGPU] WGSL Compilation Failed. Source:\n", code);
          for (const err of errors) {
            console.error(`[WebGPU] Line ${err.lineNum}, Pos ${err.linePos}: ${err.message}`);
          }
        }
      });

      this._shaderModules.set(key, sm);
    }
    return sm;
  }

  protected _getGeoCache(obj: Object3D, geo: GeometryDataInterface): WebGPUGeoCache {
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
        this._acquireGeoCache(obj, geo, c);
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
        refCount: 0,
      };
      this._geoCache.set(geo, c);
      geo.needsUpdate = false;
    }
    this._acquireGeoCache(obj, geo, c);
    return c;
  }

  /**
   * Tracks per-object geometry references so `_releaseGeometryFor` can correctly
   * free buffers once nothing references them anymore -- even when geometry is shared
   * across many objects (see showcases/19) or swapped on a live object at runtime.
   */
  private _acquireGeoCache(obj: Object3D, geo: GeometryDataInterface, c: WebGPUGeoCache): void {
    const lastGeo = this._lastKnownGeometry.get(obj);
    if (lastGeo !== geo) {
      if (lastGeo) this._releaseGeometryFor(obj);
      c.refCount++;
      this._lastKnownGeometry.set(obj, geo);
    }
  }

  /**
   * Releases the GPU geometry buffers this object was referencing, if its refCount
   * drops to zero. Called once per removed object per frame.
   */
  private _releaseGeometryFor(obj: Object3D): void {
    const geo = this._lastKnownGeometry.get(obj);
    if (!geo) return;
    this._lastKnownGeometry.delete(obj);

    const c = this._geoCache.get(geo);
    if (!c) return;
    c.refCount--;
    if (c.refCount <= 0) {
      c.vb.destroy();
      c.nb?.destroy();
      c.uvb?.destroy();
      c.tb?.destroy();
      c.ib?.destroy();
      c.wib?.destroy();
      this._geoCache.delete(geo);
    }
  }

  private _releaseObjectResources(obj: Object3D): void {
    this._releaseGeometryFor(obj);
    this._releasePipelineFor(obj);
    this._releaseObjectTextures(obj);
  }

  /**
   * Tracks that `obj` currently depends on the textures in `textures` (typically
   * `material.getRenderManifest().textures`). Called once per object per frame from
   * the render loop. `textures` is diffed key-by-key against `obj`'s last-known
   * snapshot rather than by container reference, since a material's manifest object
   * is created once and mutated in place on every `getRenderManifest()` call.
   */
  private _acquireTextures(
    obj: Object3D,
    textures: Record<string, Texture | CubeTexture | undefined>,
  ): void {
    const lastTextures = this._lastKnownTextures.get(obj);
    const snapshot: Record<string, Texture | CubeTexture | undefined> = {};

    for (const key of Object.keys(textures)) {
      const current = textures[key];
      const last = lastTextures?.[key];
      if (current !== last) {
        if (last) this._releaseTexture(last);
        if (current) this._acquireTexture(current);
      }
      snapshot[key] = current;
    }

    this._lastKnownTextures.set(obj, snapshot);
  }

  private _acquireTexture(tex: Texture | CubeTexture): void {
    if (tex instanceof CubeTexture) {
      this._texCubeRefCounts.set(tex, (this._texCubeRefCounts.get(tex) ?? 0) + 1);
    } else {
      this._texRefCounts.set(tex, (this._texRefCounts.get(tex) ?? 0) + 1);
    }
  }

  private _releaseTexture(tex: Texture | CubeTexture): void {
    // Render targets are backed by the same Texture/CubeTexture base classes (so they
    // can be assigned directly to a material, e.g. for portals/mirrors/reflection
    // probes) but are re-rendered into and reused across frames independently of any
    // one object's material reference -- their lifecycle belongs to whoever owns the
    // render target, not to this per-object refcount. Only untrack our reference to
    // it, never destroy the underlying GPUTexture here.
    if (tex instanceof RenderTarget || tex instanceof RenderTargetCube) return;

    if (tex instanceof CubeTexture) {
      const count = (this._texCubeRefCounts.get(tex) ?? 1) - 1;
      if (count <= 0) {
        this._cubeTextureViewCache.get(tex)?.texture.destroy();
        this._cubeTextureViewCache.delete(tex);
        this._texCubeRefCounts.delete(tex);
      } else {
        this._texCubeRefCounts.set(tex, count);
      }
    } else {
      const count = (this._texRefCounts.get(tex) ?? 1) - 1;
      if (count <= 0) {
        this._textureViewCache.get(tex)?.texture.destroy();
        this._textureViewCache.delete(tex);
        this._texRefCounts.delete(tex);
      } else {
        this._texRefCounts.set(tex, count);
      }
    }
  }

  private _releaseObjectTextures(obj: Object3D): void {
    const textures = this._lastKnownTextures.get(obj);
    if (!textures) return;
    this._lastKnownTextures.delete(obj);
    for (const tex of Object.values(textures)) {
      if (tex) this._releaseTexture(tex);
    }
  }

  public render(
    scene: Scene,
    vp: Float32Array,
    camPos: Vector3D = Vector3D.ZERO,
    vMat?: Float32Array,
    near: number = 0.1,
    far: number = 1000,
  ): void {
    if (!this._device) return;

    for (const obj of scene.consumeRemovedObjects()) {
      this._releaseObjectResources(obj);
    }

    this._frameCount++;
    const lights = this.extractLights(scene);
    this._updateGlobalBuffers(vp, camPos, lights, scene, near, far);
    const ce = this._device.createCommandEncoder();

    if (
      this.postProcessing.enabled &&
      !this._hdrTexture &&
      this._context.canvas.width > 0 &&
      this._context.canvas.height > 0
    ) {
      // Guarded the same way as setSize() -- if this fires before the canvas has its real size
      // (e.g. the first frame, before the ResizeObserver's initial callback lands), creating a
      // degenerate 0/1px _hdrTexture here would make BloomPassGPU build an invalid mip chain on
      // it. Skipping keeps postProcessing off for that one frame; the next frame retries once
      // the canvas has a real size.
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
    let renderTargetView =
      this.postProcessing.enabled && this._hdrTextureView ? this._hdrTextureView : screenView;
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
              format: "depth32float",
              usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
            });
            depthView = depth.createView();
          }

          data = { tex, cubeView, faceViews };
          if (depth !== undefined) data.depth = depth;
          if (depthView !== undefined) data.depthView = depthView;
          this._renderTargetCubeTextures.set(this._activeRenderTarget, data);
          this._cubeTextureViewCache.set(this._activeRenderTarget, {
            texture: tex,
            view: cubeView,
          });
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
              format: "depth32float",
              usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
            });
            depthView = depth.createView();
          }

          data = { tex, view };
          if (depth !== undefined) data.depth = depth;
          if (depthView !== undefined) data.depthView = depthView;
          this._renderTargetTextures.set(this._activeRenderTarget, data);
          this._textureViewCache.set(this._activeRenderTarget, { texture: tex, view });
          this._activeRenderTarget.isLoaded = true;
        }
        renderTargetView = data.view;
      }
    }

    const bloomNode = this.postProcessing.get<import("../post/index.js").BloomElement>(
      PostProcessingEffectType.BLOOM,
    );

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

  public _opaqueDepthTexture?: GPUTexture;
  public _opaqueDepthTextureView?: GPUTextureView;

  public captureOpaqueDepth(ce: GPUCommandEncoder): void {
    const srcTex = this._activeRenderTarget
      ? (this._activeRenderTarget instanceof RenderTargetCube
          ? this._renderTargetCubeTextures.get(this._activeRenderTarget)?.depth
          : this._renderTargetTextures.get(this._activeRenderTarget)?.depth) || this._depthTexture
      : this._depthTexture;

    if (
      !this._opaqueDepthTexture ||
      this._opaqueDepthTexture.width !== srcTex.width ||
      this._opaqueDepthTexture.height !== srcTex.height
    ) {
      if (this._opaqueDepthTexture) this._opaqueDepthTexture.destroy();

      this._opaqueDepthTexture = this._device!.createTexture({
        size: [srcTex.width, srcTex.height, 1],
        format: srcTex.format,
        usage: GPUTextureUsage.COPY_DST | GPUTextureUsage.TEXTURE_BINDING,
      });
      this._opaqueDepthTextureView = this._opaqueDepthTexture.createView();
    }

    ce.copyTextureToTexture({ texture: srcTex }, { texture: this._opaqueDepthTexture }, [
      srcTex.width,
      srcTex.height,
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

  public _renderBatch(
    rp: GPURenderPassEncoder,
    batch: import("../../core/Scene.js").RenderBatch,
    vMat?: Float32Array,
  ): void {
    const objects = batch.objects;
    if (objects.length === 0) return;

    rp.setBindGroup(0, this._globalBindGroup);

    const instancedObjects: Object3D[] = [];
    const standardObjects: Object3D[] = [];

    for (let i = 0; i < objects.length; i++) {
      const o = objects[i];
      if (o instanceof InstancedMesh) {
        instancedObjects.push(o!);
      } else {
        standardObjects.push(o!);
      }
    }

    const mat = objects[0]?.material;
    if (!mat) return;
    const manifest = mat.getRenderManifest();

    let topologyStr: GPUPrimitiveTopology = Topology.DEFAULT;
    if (batch.topology === Topology.POINT_LIST) topologyStr = Topology.POINT_LIST;
    else if (batch.topology === Topology.LINE_LIST) topologyStr = Topology.LINE_LIST;
    else if (batch.topology === Topology.LINE_STRIP) topologyStr = Topology.LINE_STRIP;

    if (standardObjects.length > 0) {
      this._renderSubgroup(
        rp,
        standardObjects,
        false,
        batch.matUuid,
        manifest,
        vMat,
        topologyStr,
        batch.wireframeMode,
      );
    }

    if (instancedObjects.length > 0) {
      this._renderSubgroup(
        rp,
        instancedObjects,
        true,
        batch.matUuid,
        manifest,
        vMat,
        topologyStr,
        batch.wireframeMode,
      );
    }
  }

  public _renderSubgroup(
    rp: GPURenderPassEncoder,
    objects: Object3D[],
    isInstanced: boolean,
    matUuid: string,
    manifest: RenderManifest,
    vMat?: Float32Array,
    topology: GPUPrimitiveTopology = Topology.DEFAULT,
    wireframeMode?: "structural" | "triangles",
  ): void {
    const cache = this._getPipeline(manifest, topology, isInstanced);
    const pipelineKey = this._pipelineCacheKey(manifest, topology, isInstanced);
    rp.setPipeline(cache.pipeline);

    const matBindGroup = this._getMaterialBindGroup(matUuid, manifest, cache.bgLayouts[1]!);
    rp.setBindGroup(1, matBindGroup);

    for (const obj of objects) {
      if (!obj.geometry) continue;

      this._acquirePipeline(obj, pipelineKey);
      this._acquireTextures(obj, manifest.textures);

      const uBufferData = this._getObjUniformBufferData(obj);
      this._updateObjUniformBuffer(uBufferData.buffer, obj, manifest, vMat);
      const objBindGroup = this._getObjBindGroup(uBufferData, cache.bgLayouts[2]!);
      rp.setBindGroup(2, objBindGroup);

      const gCache = this._getGeoCache(obj, obj.geometry!);
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

        // Instance Data
        if (instMesh.instanceData) {
          let instanceDataBuf = this._gpuInstanceDataBuffers.get(instMesh);
          const dataByteLength = instMesh.instanceData.byteLength;

          if (!instanceDataBuf || instanceDataBuf.size < dataByteLength) {
            if (instanceDataBuf) instanceDataBuf.destroy();
            instanceDataBuf = this._device!.createBuffer({
              size: dataByteLength,
              usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
            });
            this._gpuInstanceDataBuffers.set(instMesh, instanceDataBuf);
            instMesh.instanceDataNeedsUpdate = true;
          }

          if (instMesh.instanceDataNeedsUpdate) {
            this._device!.queue.writeBuffer(instanceDataBuf, 0, instMesh.instanceData);
            instMesh.instanceDataNeedsUpdate = false;
          }
          rp.setVertexBuffer(5, instanceDataBuf);
        } else {
          this._ensureDummyBufferSize(16);
          rp.setVertexBuffer(5, this._dummyUvBuffer);
        }

        if (topology === Topology.LINE_LIST) {
          if (wireframeMode === "structural" && gCache.wib) {
            rp.setIndexBuffer(gCache.wib, gCache.format!);
            rp.drawIndexed(gCache.wireframeIndexCount, instMesh.instanceCount);
          } else if (gCache.ib) {
            rp.setIndexBuffer(gCache.ib, gCache.format!);
            rp.drawIndexed(gCache.indexCount, instMesh.instanceCount);
          } else {
            rp.draw(gCache.vertexCount, instMesh.instanceCount);
          }
        } else {
          if (gCache.ib) {
            rp.setIndexBuffer(gCache.ib, gCache.format!);
            rp.drawIndexed(gCache.indexCount, instMesh.instanceCount);
          } else {
            rp.draw(gCache.vertexCount, instMesh.instanceCount);
          }
        }
      } else {
        if (topology === Topology.LINE_LIST) {
          if (wireframeMode === "structural" && gCache.wib) {
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

  /** Resolves the GPU resource for one of `getOptionalMaterialTextureBindings()`'s texture names. */
  private _resolveOptionalMaterialTexture(name: string, m: RenderManifest): GPUBindingResource {
    if ("u_opaqueMap" === name) {
      return m.textures["u_opaqueMap"]
        ? this._getTextureView(m.textures["u_opaqueMap"] as Texture)
        : this._opaqueTextureView || this._whiteTexView;
    }
    if ("u_opaqueDepthMap" === name) {
      return m.textures["u_opaqueDepthMap"]
        ? this._getTextureView(m.textures["u_opaqueDepthMap"] as Texture)
        : this._opaqueDepthTextureView || this._dummyDepthTexView;
    }
    return this._getTextureView(m.textures[name] as Texture);
  }

  protected _getMaterialBindGroup(
    matUuid: string,
    m: RenderManifest,
    layout: GPUBindGroupLayout,
  ): GPUBindGroup {
    const envOrSkybox = m.textures["u_skybox"] || m.textures["u_envMap"];
    const bindings: number[] = [1, 3, 11, 12];
    const resources: GPUBindingResource[] = [
      this._getSampler(m.textures["u_diffuseMap"] as Texture),
      this._getNormalTextureView(m.textures["u_normalMap"] as Texture),
      this._getGPUCubeTextureView(envOrSkybox as CubeTexture),
      this._getTextureView(m.textures["u_emissiveMap"] as Texture),
    ];
    const bindingInfo = getOptionalMaterialTextureBindings();
    for (const name of this._getOptionalMaterialTextureNames(m.shaderId)) {
      bindings.push(bindingInfo[name]!.binding);
      resources.push(this._resolveOptionalMaterialTexture(name, m));
    }

    const cache = this._materialBindGroups.get(matUuid);
    if (
      cache &&
      cache.resources.length === resources.length &&
      cache.resources.every((r, i) => r === resources[i])
    ) {
      return cache.bg;
    }

    const bg = this._device!.createBindGroup({
      layout,
      entries: bindings.map((binding, i) => ({ binding, resource: resources[i]! })),
    });

    this._materialBindGroups.set(matUuid, { bg, resources });
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
    if (this._quality?.disableTextures) return this._whiteTexView;
    if (!tex || !tex.isLoaded || !tex.image) return this._whiteTexView;
    let entry = this._textureViewCache.get(tex);
    if (!entry) {
      let t: GPUTexture;
      let v: GPUTextureView;
      if ("isTextureArray" in tex && (tex as TextureArray).isTextureArray) {
        const texArray = tex as TextureArray;
        const width = texArray.image!.width;
        const height = texArray.image!.height;
        const depth = texArray.images.length;

        t = this._device!.createTexture({
          size: [width, height, depth],
          format: "rgba8unorm",
          usage:
            GPUTextureUsage.TEXTURE_BINDING |
            GPUTextureUsage.COPY_DST |
            GPUTextureUsage.RENDER_ATTACHMENT,
        });

        for (let i = 0; i < depth; i++) {
          this._device!.queue.copyExternalImageToTexture(
            {
              source: texArray.images[i] as
                ImageBitmap | HTMLImageElement | HTMLCanvasElement | OffscreenCanvas,
            },
            { texture: t, origin: [0, 0, i] },
            [width, height],
          );
        }
        v = t.createView({ dimension: "2d-array" });
      } else {
        t = this._device!.createTexture({
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
      }
      entry = { texture: t, view: v };
      this._textureViewCache.set(tex, entry);
    } else if (
      tex.needsUpdate &&
      !("isTextureArray" in tex && (tex as TextureArray).isTextureArray)
    ) {
      this._device!.queue.copyExternalImageToTexture(
        { source: tex.image },
        { texture: entry.texture },
        [tex.image.width, tex.image.height],
      );
      tex.needsUpdate = false;
    }
    return entry.view;
  }

  protected _getNormalTextureView(tex: Texture | undefined): GPUTextureView {
    if (!tex || !tex.isLoaded || !tex.image) return this._flatNormalTexView;
    return this._getTextureView(tex);
  }

  protected _getGPUCubeTextureView(tex: CubeTexture | undefined): GPUTextureView {
    if (this._quality?.disableTextures) return this._defaultCubeTexView;
    if (!tex || !tex.isLoaded) return this._defaultCubeTexView;
    if (tex instanceof RenderTargetCube) {
      const entry = this._cubeTextureViewCache.get(tex);
      return entry?.view || this._defaultCubeTexView;
    }
    if (tex.images.length !== 6 && tex.mipmaps.length === 0) return this._defaultCubeTexView;
    let entry = this._cubeTextureViewCache.get(tex);
    if (!entry) {
      const img = tex.mipmaps.length > 0 ? tex.mipmaps[0]![0]! : tex.images[0]!;
      const mipLevelCount = tex.mipmaps.length > 0 ? tex.mipmaps.length : 1;
      const t = this._device!.createTexture({
        size: [img.width, img.height, 6],
        format: "rgba8unorm",
        mipLevelCount,
        usage:
          GPUTextureUsage.TEXTURE_BINDING |
          GPUTextureUsage.COPY_DST |
          GPUTextureUsage.RENDER_ATTACHMENT,
      });

      const baseImages = tex.mipmaps.length > 0 ? tex.mipmaps[0]! : tex.images;
      for (let i = 0; i < 6; i++) {
        this._device!.queue.copyExternalImageToTexture(
          { source: baseImages[i]! },
          { texture: t, mipLevel: 0, origin: [0, 0, i] },
          [img.width, img.height],
        );
      }

      for (let m = 1; m < mipLevelCount; m++) {
        const mipImages = tex.mipmaps[m]!;
        const mipSize = Math.max(1, Math.floor(img.width / Math.pow(2, m)));
        for (let i = 0; i < 6; i++) {
          this._device!.queue.copyExternalImageToTexture(
            { source: mipImages[i]! },
            { texture: t, mipLevel: m, origin: [0, 0, i] },
            [mipSize, mipSize],
          );
        }
      }
      entry = { texture: t, view: t.createView({ dimension: "cube" }) };
      this._cubeTextureViewCache.set(tex, entry);
    }
    return entry.view;
  }

  public _updateGlobalBuffers(
    vp: Float32Array,
    camPos: Vector3D,
    lights: LightDataInterface,
    scene: Scene,
    near: number = 0.1,
    far: number = 1000,
  ): void {
    if (
      this._currentIrradianceMap !== scene.irradianceMap ||
      this._currentPrefilterMap !== scene.prefilterMap ||
      this._currentBrdfLUT !== scene.brdfLUT
    ) {
      this._currentIrradianceMap = scene.irradianceMap;
      this._currentPrefilterMap = scene.prefilterMap;
      this._currentBrdfLUT = scene.brdfLUT;
      this._globalBindGroup = this._createGlobalBindGroup(scene);
    }

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

    const fog = scene.fog;
    if (fog) {
      gData[37] = fog.mode;
      gData[38] = fog.density;
      gData[39] = fog.near;
      gData[40] = fog.far;
      gData[41] = fog.height;
      gData[42] = fog.heightFalloff;
      gData[43] = scene.environmentIntensity; // envIntensity instead of _pad
      gData.set([fog.color.r, fog.color.g, fog.color.b, 1.0], 44);
    } else {
      gData[37] = 0.0; // fogMode NONE
      gData[43] = scene.environmentIntensity; // envIntensity
    }

    // Default shadow values in case there are no shadows.
    // Struct order in structs.wgsl is cascadeMatrices (128-191) -> cascadeSplits
    // (192-195) -> dirShadowInfo (196-199); CascadedShadowPassGPU overwrites these
    // with real values (at these same, correct offsets) once a shadow-casting
    // directional light is actually rendered this frame.
    gData[192] = 0.0; // cascadeSplits.x
    gData[193] = 0.0;
    gData[194] = 0.0;
    gData[195] = 0.0;

    // dirShadowInfo (bias, normalBias, castShadow, numCascades)
    gData[196] = 0.001;
    gData[197] = 0.002;
    gData[198] = 0.0; // castShadow off by default
    gData[199] = 4.0;

    gData[200] = near;
    gData[201] = far;

    // Default spot shadow values
    for (let i = 0; i < 4; i++) {
      gData[112 + i * 4] = 0.001; // bias
      gData[112 + i * 4 + 1] = 0.002; // normalBias
      gData[112 + i * 4 + 2] = 0.0; // castShadow off
      gData[112 + i * 4 + 3] = -1.0; // layer index (-1 = no shadow)
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
    if (!this._device || width <= 0 || height <= 0) return;
    const maxRatio = this._quality.maxPixelRatio ?? 2;
    const d = Math.min(devicePixelRatio, maxRatio);
    this._context.canvas.width = width * d;
    this._context.canvas.height = height * d;
    this._depthTexture = this._device.createTexture({
      size: [this._context.canvas.width, this._context.canvas.height],
      format: "depth32float",
      usage:
        GPUTextureUsage.RENDER_ATTACHMENT |
        GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.COPY_SRC,
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

  /** @inheritdoc */
  public override destroy(): void {
    for (const data of this._objectUniformBuffers.values()) data.buffer.destroy();
    for (const geo of this._geoCache.values()) {
      geo.vb.destroy();
      geo.nb?.destroy();
      geo.uvb?.destroy();
      geo.tb?.destroy();
      geo.ib?.destroy();
      geo.wib?.destroy();
    }
    for (const tex of this._shadowMaps.values()) tex.destroy();
    for (const data of this._renderTargetTextures.values()) {
      data.tex.destroy();
      data.depth?.destroy();
    }
    for (const data of this._renderTargetCubeTextures.values()) {
      data.tex.destroy();
      data.depth?.destroy();
    }

    this._dummyNormalBuffer?.destroy();
    this._dummyUvBuffer?.destroy();
    this._dummyTangentBuffer?.destroy();
    this._globalUniformBuffer?.destroy();
    this._pointLightBuffer?.destroy();
    this._spotLightBuffer?.destroy();
    this._areaLightBuffer?.destroy();
    this._depthTexture?.destroy();
    this._hdrTexture?.destroy();
    this._bloomPassGPU?.destroy();

    this._objectUniformBuffers.clear();
    this._materialBindGroups.clear();
    for (const entry of this._textureViewCache.values()) entry.texture.destroy();
    this._textureViewCache.clear();
    this._geoCache.clear();
    this._materialBGLCache.clear();
    this._samplerCache.clear();
    for (const entry of this._cubeTextureViewCache.values()) entry.texture.destroy();
    this._cubeTextureViewCache.clear();
    this._shadowMaps.clear();
    this._renderTargetTextures.clear();
    this._renderTargetCubeTextures.clear();
    this._pipelines.clear();
    this._shaderModules.clear();

    this._hdrTexture = undefined;
    this._hdrTextureView = undefined;
    this._bloomPassGPU = undefined;

    // Tears down the whole GPU context; all buffers/textures/pipelines created
    // from this device become invalid, freeing their underlying GPU memory.
    this._device?.destroy();
    this._device = undefined;
  }
}

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
  MAX_CLUSTERED_LIGHTS_PER_TYPE,
} from "../../core/index.js";
import { FrustumCuller } from "../../core/FrustumCuller.js";
import { RenderTarget, RenderTargetCube } from "../../core/textures/index.js";
import {
  EngineOptions,
  GeometryDataInterface,
  LightDataInterface,
} from "../../interfaces/index.js";

import {
  MathPool,
  Vector3D,
  Matrix4,
  computeClusterCounts,
  ClusterGridDims,
  DEFAULT_CLUSTER_TILE_SIZE,
  DEFAULT_CLUSTER_Z_SLICES,
  DEFAULT_MAX_LIGHTS_PER_CLUSTER,
} from "../../math/index.js";
import clusterCullWGSL from "../../core/renderers/shaders/source/web_gpu/compute/cluster_cull.wgsl?raw";
import hzbCopyDepthWGSL from "../../core/renderers/shaders/source/web_gpu/compute/hzb_copy_depth.wgsl?raw";
import hzbDownsampleMaxWGSL from "../../core/renderers/shaders/source/web_gpu/compute/hzb_downsample_max.wgsl?raw";
import hzbVisibilityTestWGSL from "../../core/renderers/shaders/source/web_gpu/compute/hzb_visibility_test.wgsl?raw";
import mipDownsampleWGSL from "../../core/materials/shaders/MipDownsample.frag.wgsl?raw";
import fullscreenVertWGSL from "../../core/materials/shaders/PostProcess.vert.wgsl?raw";
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
  ClusterCullPassGPU,
  DepthPrePassGPU,
  HzbOcclusionPassGPU,
} from "../passes/index.js";
import { BloomPassGPU, AOPassGPU, HistoryBlendPassGPU } from "../post/passes/index.js";
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
      u_aoMap: {
        binding: 17,
        layoutEntry: {
          binding: 17,
          visibility: GPUShaderStage.FRAGMENT,
          texture: { viewDimension: "2d", sampleType: "float" },
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
 * Dynamic-offset slot layout for the per-draw view-projection uniform (group 3, `view.vp` in
 * structs.wgsl) -- one slot per camera that can be active mid-frame: the main camera, each
 * cascade of the (single, at most 4-cascade) directional shadow, and each of up to 4 shadow-
 * casting spot lights. Fixed capacity, no growth: hard-bounded by `cascadeMatrices`/
 * `spotShadowMatrices`'s `array<mat4x4f, 4>` sizes in structs.wgsl, same cap the existing code
 * already assumes. See `_setViewMatrix()`/`CascadedShadowPassGPU`/`SpotShadowPassGPU`.
 */
export const VIEW_SLOT_MAIN_CAMERA = 0;
export const VIEW_SLOT_CASCADE_BASE = 1;
export const VIEW_SLOT_SPOT_SHADOW_BASE = 5;
const VIEW_SLOT_COUNT = 9;

/**
 * Fixed capacity for the Hierarchical-Z occlusion visibility test's AABB/results buffers -- see
 * docs/adr/0008-hzb-occlusion-culling-webgpu-only.md. No dynamic regrowth or atomics, same
 * fixed-capacity-no-atomics reasoning ADR 0007 already uses for the cluster light buffers.
 * Objects beyond this cap (per frame, among those that passed frustum culling) are simply never
 * occlusion-tested -- they always draw, the same safe default as `occlusionCulled`'s initial
 * `false`.
 */
const MAX_HZB_TESTED_OBJECTS = 8192;

/**
 * Modern WebGPU implementation with dynamic vertex updates and memory management.
 */
export class WebGPURenderer extends AbstractRenderer {
  public override readonly type: RendererType = RendererType.WEB_GPU;
  protected _adapter: GPUAdapter | undefined = undefined;
  private _device: GPUDevice | undefined = undefined;
  private _isDeviceLost: boolean = false;
  private _isDestroyed: boolean = false;

  /** Satisfies Renderer interface */
  public override get isContextLost(): boolean {
    return this._isDeviceLost;
  }

  /** Satisfies Renderer interface */
  public get gpuDevice(): GPUDevice | undefined {
    return this._device;
  }

  private _context!: GPUCanvasContext;
  /** Satisfies `RenderPass`-consuming passes, which have no other way to reach this. */
  public get gpuCanvasContext(): GPUCanvasContext {
    return this._context;
  }

  private _format!: GPUTextureFormat;
  /** Satisfies `RenderPass`-consuming passes, which have no other way to reach this. */
  public get gpuFormat(): GPUTextureFormat {
    return this._format;
  }

  protected _pipelines: Map<string, WebGPUPipelineCache> = new Map();
  protected _shaderModules: Map<string, GPUShaderModule> = new Map();

  /** Shared ring buffer holding every object's `ObjectUniforms` slot for the current frame,
   * bound once via `hasDynamicOffset` instead of one `GPUBuffer`+`GPUBindGroup` per object. */
  protected _objectRingBuffer!: GPUBuffer;
  protected _objectRingBindGroup!: GPUBindGroup;
  protected _objectRingCapacity = 0;
  /** Byte stride between slots, aligned to `device.limits.minUniformBufferOffsetAlignment`. */
  protected _objectUniformStride = 256;
  /** Frame-local: `` `${obj.uuid}:${matUuid}` `` -> byte offset already written this frame. */
  protected _objectSlotMap = new Map<string, number>();
  /** Frame-local slot counter; becomes `_lastFrameObjectSlotCount` for next frame's capacity guess. */
  protected _objectSlotCount = 0;
  protected _lastFrameObjectSlotCount = 0;
  private _objectRingOverflowWarned = false;
  /** Set by `_ensureObjectRingCapacity` when it grows; destroyed post-submit in `render()` once
   * every draw that referenced the old buffer's slots has actually been recorded and submitted. */
  private _objectRingPendingDestroy?: GPUBuffer | undefined;

  /** Per-draw view-projection dynamic-offset buffer -- see `VIEW_SLOT_*`/`_setViewMatrix()`. */
  private _viewBGL!: GPUBindGroupLayout;
  private _viewUniformBuffer!: GPUBuffer;
  private _viewBindGroup!: GPUBindGroup;
  private _viewUniformStride = 256;

  protected _materialBindGroups = new Map<
    string,
    {
      bg: GPUBindGroup;
      resources: unknown[];
    }
  >();
  protected _textureViewCache = new Map<
    Texture,
    { texture: GPUTexture; view: GPUTextureView; mipLevelCount: number }
  >();
  /** GPU-side mip-chain generator for runtime 2D textures (WebGPU has no `generateMipmap()`
   * equivalent to WebGL2's) -- one bilinear blit per level, see `_generateMipmaps()`. */
  private _mipGenPipeline!: GPURenderPipeline;
  private _mipGenBGL!: GPUBindGroupLayout;
  private _mipGenSampler!: GPUSampler;
  private _texRefCounts: Map<Texture, number> = new Map();
  private _whiteTexView!: GPUTextureView;
  public get whiteTextureView(): GPUTextureView {
    return this._whiteTexView;
  }
  private _dummyDepthTexView!: GPUTextureView;
  protected _flatNormalTexView!: GPUTextureView;
  protected _defaultCubeTexView!: GPUTextureView;
  protected _blackCubeTexView!: GPUTextureView;
  protected _defaultBrdfTexView!: GPUTextureView;
  protected _dummyNormalBuffer!: GPUBuffer;
  protected _dummyUvBuffer!: GPUBuffer;
  protected _dummyTangentBuffer!: GPUBuffer;

  private _defaultDirShadowTexView!: GPUTextureView;
  private _dummyDirShadowTexView!: GPUTextureView;
  /** Read by the fragment shader's global bind group; reassigned once by
   * `CascadedShadowPassGPU` when a real cascaded shadow map first exists. */
  public get defaultDirShadowTextureView(): GPUTextureView {
    return this._defaultDirShadowTexView;
  }
  public set defaultDirShadowTextureView(view: GPUTextureView) {
    this._defaultDirShadowTexView = view;
  }
  public get dummyDirShadowTextureView(): GPUTextureView {
    return this._dummyDirShadowTexView;
  }

  private _defaultSpotShadowTexView!: GPUTextureView;
  private _dummySpotShadowTexView!: GPUTextureView;
  /** Read by the fragment shader's global bind group; reassigned once by
   * `SpotShadowPassGPU` when a real spot shadow map first exists. */
  public get defaultSpotShadowTextureView(): GPUTextureView {
    return this._defaultSpotShadowTexView;
  }
  public set defaultSpotShadowTextureView(view: GPUTextureView) {
    this._defaultSpotShadowTexView = view;
  }
  public get dummySpotShadowTextureView(): GPUTextureView {
    return this._dummySpotShadowTexView;
  }
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
  /** Buffers replaced by `_ensureDummyBufferSize`'s growth, held here instead of destroyed
   * immediately -- it's called mid-frame from `_renderSubgroup`, so an earlier object in the
   * same not-yet-submitted command encoder may already have recorded a `setVertexBuffer` call
   * referencing the old buffer. Drained (destroyed) in `render()` right after `queue.submit()`,
   * same pattern as `_objectRingPendingDestroy`. */
  private _dummyBuffersPendingDestroy: GPUBuffer[] = [];

  protected _cubeTextureViewCache: Map<CubeTexture, { texture: GPUTexture; view: GPUTextureView }> =
    new Map();
  private _texCubeRefCounts: Map<CubeTexture, number> = new Map();
  private _lastKnownTextures: WeakMap<Object3D, Record<string, Texture | CubeTexture | undefined>> =
    new WeakMap();

  // Reused across every _renderBatch() call (cleared via .length = 0) instead of allocating two
  // fresh arrays per batch -- same pattern as CascadedShadowPassGPU's _scratchInstanced/_scratchStandard.
  private _scratchInstancedObjects: Object3D[] = [];
  private _scratchStandardObjects: Object3D[] = [];

  // 212 floats: GlobalUniforms grew by 8 floats (resolution/projScale/tileSizePx/clusterDims)
  // for clustered light culling -- see docs/adr/0007-clustered-lighting-webgl2-webgpu-only.md.
  private _scratchGlobalBufferData = new Float32Array(212);
  /** Reused every frame (never reallocated) -- see `_updateGlobalBuffers()`. */
  public get scratchGlobalBufferData(): Float32Array {
    return this._scratchGlobalBufferData;
  }
  protected _scratchPointLightData = new Float32Array(32); // Max 4 lights
  protected _scratchSpotLightData = new Float32Array(64); // Max 4 lights
  protected _scratchAreaLightData = new Float32Array(96); // Max 4 lights
  protected _scratchObjBufferData = new Float32Array(256 / 4); // Max 256 bytes

  /** Clustered light grid dimensions for the current canvas size, see `setSize()`. */
  private _clusterDims: ClusterGridDims = { x: 1, y: 1, z: 1 };
  public get clusterDims(): ClusterGridDims {
    return this._clusterDims;
  }
  private _clusterMaxLightsPerCluster = 1;
  private _pointClusterGridBuffer!: GPUBuffer;
  private _pointClusterIndexBuffer!: GPUBuffer;
  private _spotClusterGridBuffer!: GPUBuffer;
  private _spotClusterIndexBuffer!: GPUBuffer;
  private _clusterCullPipeline!: GPUComputePipeline;
  public get clusterCullPipeline(): GPUComputePipeline {
    return this._clusterCullPipeline;
  }

  private _depthTexture!: GPUTexture;

  // Hierarchical-Z occlusion culling -- see docs/adr/0008-hzb-occlusion-culling-webgpu-only.md.
  // All of this stays unallocated (fields left undefined) unless `enableOcclusionCulling` was
  // set at init, so an app that never opts in pays nothing.
  private _occlusionCullingEnabled = false;
  private _hzbTexture?: GPUTexture;
  private _hzbSampledView?: GPUTextureView; // whole mip chain, for the visibility test's textureLoad
  private _hzbMipLevelCount = 1;
  private _hzbCopyPipeline?: GPUComputePipeline;
  private _hzbCopyBGL?: GPUBindGroupLayout;
  private _hzbDownsamplePipeline?: GPUComputePipeline;
  private _hzbDownsampleBGL?: GPUBindGroupLayout;
  private _hzbTestPipeline?: GPUComputePipeline;
  private _hzbTestBGL?: GPUBindGroupLayout;
  private _hzbAabbBuffer?: GPUBuffer;
  private _hzbResultsBuffer?: GPUBuffer;
  private _hzbTestParamsBuffer?: GPUBuffer;
  /** Ping-pong `MAP_READ` staging pair: while one slot's `mapAsync()` from a prior frame is
   * still pending, the other is always free to write into -- see `_dispatchHzbTest()`'s doc
   * comment for why a single buffer can't do this without stalling. */
  private _hzbStagingBuffers?: [GPUBuffer, GPUBuffer];
  private _hzbStagingSlot: 0 | 1 = 0;
  private _hzbStagingPending: [boolean, boolean] = [false, false];
  /** Snapshot of the exact `Object3D[]` dispatched into each staging slot, so
   * `applyPendingOcclusionResults()` can zip a resolved buffer's `u32`s back onto the right
   * objects without needing stable per-object IDs. */
  private _hzbSlotObjects: [Object3D[], Object3D[]] = [[], []];
  private _hzbCopyRecordedThisFrame = false;
  private _hzbResultsReady = false;
  private _hzbReadySlot: 0 | 1 | undefined = undefined;

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
  private _opaqueTextureView?: GPUTextureView;

  private _shadowMaps = new Map<
    import("../../core/index.js").DirectionalLight | import("../../core/index.js").SpotLight,
    GPUTexture
  >();
  /** Same Map instance every frame -- shadow passes `.get()`/`.set()` on it directly. */
  public get shadowMaps(): Map<
    import("../../core/index.js").DirectionalLight | import("../../core/index.js").SpotLight,
    GPUTexture
  > {
    return this._shadowMaps;
  }

  private _hdrTexture: GPUTexture | undefined = undefined;
  public get hdrTexture(): GPUTexture | undefined {
    return this._hdrTexture;
  }
  private _hdrTextureView: GPUTextureView | undefined = undefined;
  public get hdrTextureView(): GPUTextureView | undefined {
    return this._hdrTextureView;
  }
  private _bloomPassGPU: BloomPassGPU | undefined = undefined;
  private _bloomTextureView: GPUTextureView | undefined = undefined;
  public get bloomTextureView(): GPUTextureView | undefined {
    return this._bloomTextureView;
  }
  private _hbaoPassGPU: AOPassGPU | undefined = undefined;
  private _hbaoTextureView: GPUTextureView | undefined = undefined;
  public get hbaoTextureView(): GPUTextureView | undefined {
    return this._hbaoTextureView;
  }
  private _taaPassGPU: HistoryBlendPassGPU | undefined = undefined;
  /** This frame's TAA-resolved color view, if TAA is enabled -- read by PostProcessPass instead
   * of `_hdrTextureView` for its color input. Recomputed fresh every frame; `_hdrTextureView`
   * itself is never overwritten so TAA keeps reading the raw per-frame render as "current". */
  private _taaResolvedView: GPUTextureView | undefined = undefined;
  public get taaResolvedView(): GPUTextureView | undefined {
    return this._taaResolvedView;
  }
  /** Motion Trail's own history-blend instance -- a deliberate ghost/afterimage effect, not
   * anti-aliasing, chained after TAA (see PostProcessPass's color-view fallback chain). */
  private _motionTrailPassGPU: HistoryBlendPassGPU | undefined = undefined;
  private _motionTrailResolvedView: GPUTextureView | undefined = undefined;
  public get motionTrailResolvedView(): GPUTextureView | undefined {
    return this._motionTrailResolvedView;
  }

  private _activeRenderTarget:
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

  private _globalUniformBuffer!: GPUBuffer;
  public get globalUniformBuffer(): GPUBuffer {
    return this._globalUniformBuffer;
  }
  private _pointLightBuffer!: GPUBuffer;
  private _spotLightBuffer!: GPUBuffer;
  private _areaLightBuffer!: GPUBuffer;
  private _globalBindGroup!: GPUBindGroup;
  /** Rebuilt once (not per-frame) by a shadow pass, the first time a real shadow map for that
   * light type exists -- see `CascadedShadowPassGPU`/`SpotShadowPassGPU`. */
  public get globalBindGroup(): GPUBindGroup {
    return this._globalBindGroup;
  }
  public set globalBindGroup(bindGroup: GPUBindGroup) {
    this._globalBindGroup = bindGroup;
  }
  private _globalBGL!: GPUBindGroupLayout;
  private _objectBGL!: GPUBindGroupLayout;

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
    if (this._adapter.limits.maxStorageBufferBindingSize) {
      requiredLimits["maxStorageBufferBindingSize"] =
        this._adapter.limits.maxStorageBufferBindingSize;
    }
    if (this._adapter.limits.maxComputeWorkgroupStorageSize) {
      requiredLimits["maxComputeWorkgroupStorageSize"] =
        this._adapter.limits.maxComputeWorkgroupStorageSize;
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
    this._isDeviceLost = false;
    this._isDestroyed = false;

    // Listen for device lost (GPU hangs, driver resets, device destruction).
    this._device.lost.then((info: GPUDeviceLostInfo) => {
      this._isDeviceLost = true;
      if (!this._isDestroyed) {
        console.error(`[WebGPU Device Lost] Reason: ${info.reason}, Message: ${info.message}`);
        this.onContextLost?.({ reason: info.reason, message: info.message });
      }
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
      webgpuMaxStorageBufferBindingSize: this._device.limits.maxStorageBufferBindingSize,
      webgpuMaxComputeWorkgroupStorageSize: this._device.limits.maxComputeWorkgroupStorageSize,
      webgpuMaxTextureDimension2D: this._device.limits.maxTextureDimension2D,
    });

    // Object-uniform ring buffer slot stride must respect the device's dynamic-offset
    // alignment (commonly 256, but not guaranteed) -- 256 is the payload size (`ObjectUniforms`
    // packs into <= 256 bytes, see `_scratchObjBufferData`), rounded up to the alignment.
    const objAlignment = this._device.limits.minUniformBufferOffsetAlignment;
    this._objectUniformStride = Math.ceil(256 / objAlignment) * objAlignment;

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
    this._occlusionCullingEnabled = config?.enableOcclusionCulling === true;

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
      new ClusterCullPassGPU(),
      new CascadedShadowPassGPU(),
      new SpotShadowPassGPU(),
      new DepthPrePassGPU(),
      ...(this._occlusionCullingEnabled ? [new HzbOcclusionPassGPU()] : []),
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
    if (this._dummyNormalBuffer) this._dummyBuffersPendingDestroy.push(this._dummyNormalBuffer);
    if (this._dummyUvBuffer) this._dummyBuffersPendingDestroy.push(this._dummyUvBuffer);
    if (this._dummyTangentBuffer) this._dummyBuffersPendingDestroy.push(this._dummyTangentBuffer);
    const normalData = new Float32Array(newSize).fill(0);
    for (let i = 0; i < newSize; i += 3) normalData[i + 1] = 1.0;

    // Default dummy shadow textures (2D Arrays, Depth24Plus)
    const dummyDirShadow = this._device!.createTexture({
      size: [1, 1, 4],
      format: "depth32float",
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT,
    });
    this._dummyDirShadowTexView = dummyDirShadow.createView({ dimension: "2d-array" });
    this._defaultDirShadowTexView = this._dummyDirShadowTexView;

    const dummySpotShadow = this._device!.createTexture({
      size: [1, 1, 16],
      format: "depth32float",
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT,
    });
    this._dummySpotShadowTexView = dummySpotShadow.createView({ dimension: "2d-array" });
    this._defaultSpotShadowTexView = this._dummySpotShadowTexView;

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
      // 848 bytes: GlobalUniforms grew by 40 bytes (resolution/projScale/tileSizePx/clusterDims)
      // for clustered light culling -- see docs/adr/0007-clustered-lighting-webgl2-webgpu-only.md.
      size: 848,
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
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE,
          buffer: { type: "uniform" },
        },
        {
          binding: 1,
          visibility: GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE,
          buffer: { type: "read-only-storage" },
        },
        {
          binding: 2,
          visibility: GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE,
          buffer: { type: "read-only-storage" },
        },
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
        // Clustered light culling (see docs/adr/0007-clustered-lighting-webgl2-webgpu-only.md):
        // ClusterCullPassGPU (compute) writes these, the main fragment shader only reads them.
        {
          binding: 11,
          visibility: GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE,
          buffer: { type: "storage" },
        },
        {
          binding: 12,
          visibility: GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE,
          buffer: { type: "storage" },
        },
        {
          binding: 13,
          visibility: GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE,
          buffer: { type: "storage" },
        },
        {
          binding: 14,
          visibility: GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE,
          buffer: { type: "storage" },
        },
      ],
    });

    // _allocateClusterBuffers() below already creates the initial _globalBindGroup.
    this._allocateClusterBuffers({ x: 1, y: 1, z: 1 }, 1);

    const clusterCullModule = this._device!.createShaderModule({
      code:
        (ShaderRegistry.instance.getChunk("WGSL_STRUCTS", "wgsl") ?? "") + "\n" + clusterCullWGSL,
    });
    this._clusterCullPipeline = this._device!.createComputePipeline({
      layout: this._device!.createPipelineLayout({ bindGroupLayouts: [this._globalBGL] }),
      compute: { module: clusterCullModule, entryPoint: "cullLights" },
    });

    this._objectBGL = this._device!.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
          buffer: { type: "uniform", hasDynamicOffset: true },
        },
      ],
    });
    this._ensureObjectRingCapacity(1024);

    // Mip-chain generator for runtime 2D textures -- see `_generateMipmaps()`.
    this._mipGenBGL = this._device!.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.FRAGMENT, sampler: {} },
        { binding: 1, visibility: GPUShaderStage.FRAGMENT, texture: {} },
      ],
    });
    this._mipGenPipeline = this._device!.createRenderPipeline({
      layout: this._device!.createPipelineLayout({ bindGroupLayouts: [this._mipGenBGL] }),
      vertex: {
        module: this._device!.createShaderModule({ code: fullscreenVertWGSL }),
        entryPoint: "vs_main",
      },
      fragment: {
        module: this._device!.createShaderModule({ code: mipDownsampleWGSL }),
        entryPoint: "fs_main",
        targets: [{ format: "rgba8unorm" }],
      },
      primitive: { topology: Topology.TRIANGLE_LIST },
    });
    // Always clamp-to-edge, independent of the texture's own wrap mode -- prevents edge
    // bleeding while downsampling. Separate from `_getSampler`'s draw-time sampler cache.
    this._mipGenSampler = this._device!.createSampler({
      magFilter: TextureFilter.LINEAR,
      minFilter: TextureFilter.LINEAR,
      addressModeU: TextureWrap.CLAMP_TO_EDGE,
      addressModeV: TextureWrap.CLAMP_TO_EDGE,
    });

    // Per-draw view-projection dynamic-offset buffer -- vertex-stage only (position transform),
    // unlike `_objectBGL` which the fragment shader also reads.
    this._viewBGL = this._device!.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX,
          buffer: { type: "uniform", hasDynamicOffset: true },
        },
      ],
    });
    const viewAlignment = this._device!.limits.minUniformBufferOffsetAlignment;
    this._viewUniformStride = Math.ceil(64 / viewAlignment) * viewAlignment; // 64B = one mat4x4f
    this._viewUniformBuffer = this._device!.createBuffer({
      size: VIEW_SLOT_COUNT * this._viewUniformStride,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this._viewBindGroup = this._device!.createBindGroup({
      layout: this._viewBGL,
      entries: [
        {
          binding: 0,
          resource: { buffer: this._viewUniformBuffer, offset: 0, size: this._viewUniformStride },
        },
      ],
    });

    // Hierarchical-Z occlusion culling -- see docs/adr/0008-hzb-occlusion-culling-webgpu-only.md.
    // Everything here is opt-in: skipped entirely (zero pipelines/buffers created) unless
    // `enableOcclusionCulling` was set at init. `_hzbTexture` itself is allocated in `setSize()`,
    // once the canvas's real dimensions are known.
    if (this._occlusionCullingEnabled) {
      // Mip 0 seed: this frame's `_depthTexture` (depth32float, not storage-bindable) copied
      // into the HZB pyramid's own r32float storage texture.
      this._hzbCopyBGL = this._device!.createBindGroupLayout({
        entries: [
          { binding: 0, visibility: GPUShaderStage.COMPUTE, texture: { sampleType: "depth" } },
          {
            binding: 1,
            visibility: GPUShaderStage.COMPUTE,
            storageTexture: { access: "write-only", format: "r32float" },
          },
        ],
      });
      this._hzbCopyPipeline = this._device!.createComputePipeline({
        layout: this._device!.createPipelineLayout({ bindGroupLayouts: [this._hzbCopyBGL] }),
        compute: {
          module: this._device!.createShaderModule({ code: hzbCopyDepthWGSL }),
          entryPoint: "copyDepthToHzb",
        },
      });

      // Rest of the pyramid: max-reduce mip L-1 into mip L, one dispatch per level (see
      // `_buildHzbPyramid()`).
      this._hzbDownsampleBGL = this._device!.createBindGroupLayout({
        entries: [
          {
            binding: 0,
            visibility: GPUShaderStage.COMPUTE,
            texture: { sampleType: "unfilterable-float" },
          },
          {
            binding: 1,
            visibility: GPUShaderStage.COMPUTE,
            storageTexture: { access: "write-only", format: "r32float" },
          },
        ],
      });
      this._hzbDownsamplePipeline = this._device!.createComputePipeline({
        layout: this._device!.createPipelineLayout({ bindGroupLayouts: [this._hzbDownsampleBGL] }),
        compute: {
          module: this._device!.createShaderModule({ code: hzbDownsampleMaxWGSL }),
          entryPoint: "downsampleMax",
        },
      });

      // Visibility test: group 0 is the same shared `GlobalUniforms` bind group every material
      // shader uses (for `global.vp`/`global.viewPos`/`global.projScale`/`global.resolution`),
      // group 1 is this test's own AABB/HZB-texture/results/params bindings.
      this._hzbTestBGL = this._device!.createBindGroupLayout({
        entries: [
          { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },
          {
            binding: 1,
            visibility: GPUShaderStage.COMPUTE,
            texture: { sampleType: "unfilterable-float" },
          },
          { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
          { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: "uniform" } },
        ],
      });
      const hzbTestModule = this._device!.createShaderModule({
        code:
          (ShaderRegistry.instance.getChunk("WGSL_STRUCTS", "wgsl") ?? "") +
          "\n" +
          hzbVisibilityTestWGSL,
      });
      this._hzbTestPipeline = this._device!.createComputePipeline({
        layout: this._device!.createPipelineLayout({
          bindGroupLayouts: [this._globalBGL, this._hzbTestBGL],
        }),
        compute: { module: hzbTestModule, entryPoint: "testVisibility" },
      });

      this._hzbAabbBuffer = this._device!.createBuffer({
        size: MAX_HZB_TESTED_OBJECTS * 16, // vec4f (center.xyz, radius) per object
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      });
      this._hzbResultsBuffer = this._device!.createBuffer({
        size: MAX_HZB_TESTED_OBJECTS * 4, // one u32 per object
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
      });
      this._hzbTestParamsBuffer = this._device!.createBuffer({
        size: 16, // HzbTestParams: objectCount/mipCount/pad0/pad1, 4x u32
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      });
      this._hzbStagingBuffers = [
        this._device!.createBuffer({
          size: MAX_HZB_TESTED_OBJECTS * 4,
          usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
        }),
        this._device!.createBuffer({
          size: MAX_HZB_TESTED_OBJECTS * 4,
          usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
        }),
      ];
    }
  }

  /** Writes an already ZO-corrected view-projection matrix into `slot`'s bytes. */
  private _writeViewSlot(slot: number, correctedVpData: Float32Array): number {
    const offset = slot * this._viewUniformStride;
    this._device!.queue.writeBuffer(this._viewUniformBuffer, offset, correctedVpData);
    return offset;
  }

  /** Writes `rawVp` (a raw, not-yet-ZO-corrected view-projection matrix) into the per-draw view
   * buffer at `slot` and returns the byte offset to pass as `setBindGroup(3, viewBindGroup,
   * [offset])`. Used by `CascadedShadowPassGPU`/`SpotShadowPassGPU` for their shadow cameras --
   * the main camera's slot 0 is kept up to date by `_updateGlobalBuffers()` instead, once per
   * frame, since every draw needs it regardless of pass. */
  public _setViewMatrix(slot: number, rawVp: Float32Array): number {
    const raw = MathPool.acquireMatrix();
    const corrected = MathPool.acquireMatrix();
    raw.data.set(rawVp);
    Matrix4.multiply(Matrix4.ZO_CORRECTION, raw, corrected);
    const offset = this._writeViewSlot(slot, corrected.data);
    MathPool.releaseMatrix(raw);
    MathPool.releaseMatrix(corrected);
    return offset;
  }

  /** `1 + floor(log2(max(w, h)))` -- the standard (and WebGPU-max-valid) full mip chain length
   * down to a 1x1 level. Unlike `BloomPassGPU`'s capped chain (a performance choice for a
   * per-frame blur), texture minification wants the complete chain. */
  private _computeMipLevelCount(width: number, height: number): number {
    return 1 + Math.floor(Math.log2(Math.max(width, height)));
  }

  /** Renders `texture`'s mip chain (levels `1..mipLevelCount-1`) from the already-uploaded
   * level 0, one bilinear fullscreen blit per level -- WebGPU has no `generateMipmap()`
   * equivalent to WebGL2's `gl.generateMipmap()` (same technique as Toji's `webgpu-utils`
   * `generateMips`). Runs on its own throwaway `GPUCommandEncoder` with an immediate
   * `queue.submit()`, decoupled from the frame's main encoder: callers (`_getTextureView`) run
   * mid-frame, while the main render pass may already be open, and WebGPU only allows one open
   * render pass per encoder at a time. `queue` operations are ordered, so this submit is
   * guaranteed visible to the main pass's later sampling of this texture. */
  private _generateMipmaps(texture: GPUTexture, mipLevelCount: number): void {
    const ce = this._device!.createCommandEncoder();
    for (let level = 1; level < mipLevelCount; level++) {
      const srcView = texture.createView({ baseMipLevel: level - 1, mipLevelCount: 1 });
      const dstView = texture.createView({ baseMipLevel: level, mipLevelCount: 1 });
      const bg = this._device!.createBindGroup({
        layout: this._mipGenBGL,
        entries: [
          { binding: 0, resource: this._mipGenSampler },
          { binding: 1, resource: srcView },
        ],
      });
      const rp = ce.beginRenderPass({
        colorAttachments: [
          {
            view: dstView,
            loadOp: "clear",
            storeOp: "store",
            clearValue: { r: 0, g: 0, b: 0, a: 0 },
          },
        ],
      });
      rp.setPipeline(this._mipGenPipeline);
      rp.setBindGroup(0, bg);
      rp.draw(3);
      rp.end();
    }
    this._device!.queue.submit([ce.finish()]);
  }

  /** Reused every frame -- see `_dispatchHzbTest()`. */
  private _hzbAabbScratch = new Float32Array(MAX_HZB_TESTED_OBJECTS * 4);
  private _hzbParamsScratch = new Uint32Array(4);

  /**
   * Builds this frame's HZB pyramid: mip 0 seeded from `_depthTexture` (this frame's
   * just-finished opaque depth, already written by `DepthPrePassGPU` earlier in `_passes`), then
   * mips 1..N max-reduced from the level below, one dispatch per level -- see
   * hzb_copy_depth.wgsl/hzb_downsample_max.wgsl. Recorded into the frame's shared command
   * encoder: unlike `_generateMipmaps()` (which needs its own throwaway encoder+submit since
   * callers run it mid-frame while a render pass may already be open), this runs between two
   * whole passes, never inside one. No-ops for offscreen render targets -- see
   * docs/adr/0008-hzb-occlusion-culling-webgpu-only.md's main-canvas-only scope.
   */
  public _buildHzbPyramid(ce: GPUCommandEncoder): void {
    if (this._activeRenderTarget) return;
    if (!this._hzbTexture || !this._hzbCopyPipeline || !this._hzbCopyBGL) return;

    const mip0View = this._hzbTexture.createView({ baseMipLevel: 0, mipLevelCount: 1 });
    const copyBG = this._device!.createBindGroup({
      layout: this._hzbCopyBGL,
      entries: [
        { binding: 0, resource: this.activeDepthView },
        { binding: 1, resource: mip0View },
      ],
    });
    const w0 = this._context.canvas.width;
    const h0 = this._context.canvas.height;
    const copyPass = ce.beginComputePass({ label: "HzbCopyDepth" });
    copyPass.setPipeline(this._hzbCopyPipeline);
    copyPass.setBindGroup(0, copyBG);
    copyPass.dispatchWorkgroups(Math.ceil(w0 / 8), Math.ceil(h0 / 8));
    copyPass.end();

    if (!this._hzbDownsamplePipeline || !this._hzbDownsampleBGL) return;
    for (let level = 1; level < this._hzbMipLevelCount; level++) {
      const srcView = this._hzbTexture.createView({ baseMipLevel: level - 1, mipLevelCount: 1 });
      const dstView = this._hzbTexture.createView({ baseMipLevel: level, mipLevelCount: 1 });
      const bg = this._device!.createBindGroup({
        layout: this._hzbDownsampleBGL,
        entries: [
          { binding: 0, resource: srcView },
          { binding: 1, resource: dstView },
        ],
      });
      const w = Math.max(1, w0 >> level);
      const h = Math.max(1, h0 >> level);
      const pass = ce.beginComputePass({ label: `HzbDownsample_${level}` });
      pass.setPipeline(this._hzbDownsamplePipeline);
      pass.setBindGroup(0, bg);
      pass.dispatchWorkgroups(Math.ceil(w / 8), Math.ceil(h / 8));
      pass.end();
    }
  }

  /**
   * Packs this frame's frustum-visible objects (`FrustumCuller.lastVisibleObjects` -- already
   * computed before `render()` was even called, no extra scene walk) into `_hzbAabbBuffer` as
   * world-space bounding spheres, dispatches the visibility test compute shader against the
   * pyramid `_buildHzbPyramid()` just built, and copies the results into whichever staging
   * buffer slot isn't still waiting on a previous `mapAsync()`.
   *
   * Only one slot is ever in flight at a time (the two alternate every frame -- see
   * `_hzbStagingBuffers`'s doc comment); if THAT slot is still pending, this frame's test is
   * skipped entirely rather than stalling on it. Objects simply keep last frame's
   * `occlusionCulled` value one frame longer -- never blocking, matches the same "skip and
   * self-correct next frame" pattern `_getObjectSlotOffset()`'s ring-buffer overflow clamp uses.
   */
  public _dispatchHzbTest(ce: GPUCommandEncoder): void {
    if (this._activeRenderTarget) return;
    if (
      !this._hzbTestPipeline ||
      !this._hzbTestBGL ||
      !this._hzbAabbBuffer ||
      !this._hzbResultsBuffer ||
      !this._hzbTestParamsBuffer ||
      !this._hzbStagingBuffers ||
      !this._hzbSampledView
    ) {
      return;
    }

    const slot = this._hzbStagingSlot;
    if (this._hzbStagingPending[slot]) return;

    const candidates = FrustumCuller.lastVisibleObjects;
    const objects: Object3D[] = [];
    let count = 0;
    for (let i = 0; i < candidates.length && count < MAX_HZB_TESTED_OBJECTS; i++) {
      const obj = candidates[i]!;
      if (!obj.bounds) continue; // nothing to build a test sphere from -- always draws, safe default
      const c = obj.bounds.center;
      this._hzbAabbScratch[count * 4 + 0] = c.x;
      this._hzbAabbScratch[count * 4 + 1] = c.y;
      this._hzbAabbScratch[count * 4 + 2] = c.z;
      this._hzbAabbScratch[count * 4 + 3] = obj.bounds.getBroadRadius();
      objects.push(obj);
      count++;
    }
    if (count === 0) return;

    this._device!.queue.writeBuffer(this._hzbAabbBuffer, 0, this._hzbAabbScratch, 0, count * 4);
    this._hzbParamsScratch[0] = count;
    this._hzbParamsScratch[1] = this._hzbMipLevelCount;
    this._hzbParamsScratch[2] = 0;
    this._hzbParamsScratch[3] = 0;
    this._device!.queue.writeBuffer(this._hzbTestParamsBuffer, 0, this._hzbParamsScratch);

    const testBG = this._device!.createBindGroup({
      layout: this._hzbTestBGL,
      entries: [
        { binding: 0, resource: { buffer: this._hzbAabbBuffer } },
        { binding: 1, resource: this._hzbSampledView },
        { binding: 2, resource: { buffer: this._hzbResultsBuffer } },
        { binding: 3, resource: { buffer: this._hzbTestParamsBuffer } },
      ],
    });

    const pass = ce.beginComputePass({ label: "HzbVisibilityTest" });
    pass.setPipeline(this._hzbTestPipeline);
    pass.setBindGroup(0, this._globalBindGroup);
    pass.setBindGroup(1, testBG);
    pass.dispatchWorkgroups(Math.ceil(count / 64));
    pass.end();

    ce.copyBufferToBuffer(this._hzbResultsBuffer, 0, this._hzbStagingBuffers[slot], 0, count * 4);
    this._hzbSlotObjects[slot] = objects;
    this._hzbCopyRecordedThisFrame = true;
  }

  /** Fires off `mapAsync()` on whichever staging slot this frame's `_dispatchHzbTest()` just
   * copied into, then flips to the other slot for next frame. Fire-and-forget -- the promise is
   * never awaited here; `applyPendingOcclusionResults()` picks up the result once it resolves,
   * at the start of some later frame. Called once, right after `queue.submit()`, so the copy is
   * guaranteed to have actually happened before mapping is requested. */
  private _kickoffHzbMapAsync(): void {
    if (!this._hzbCopyRecordedThisFrame || !this._hzbStagingBuffers) return;
    this._hzbCopyRecordedThisFrame = false;

    const slot = this._hzbStagingSlot;
    this._hzbStagingPending[slot] = true;
    const buffer = this._hzbStagingBuffers[slot];
    buffer
      .mapAsync(GPUMapMode.READ)
      .then(() => {
        this._hzbResultsReady = true;
        this._hzbReadySlot = slot;
      })
      .catch(() => {
        // Device lost / buffer destroyed mid-map -- drop this slot's pending state instead of
        // leaving the ping-pong stuck forever; occlusionCulled flags just keep their last value.
        this._hzbStagingPending[slot] = false;
      });

    this._hzbStagingSlot = slot === 0 ? 1 : 0;
  }

  /** @inheritdoc */
  public override applyPendingOcclusionResults(_scene: Scene): void {
    if (
      !this._occlusionCullingEnabled ||
      !this._hzbResultsReady ||
      undefined === this._hzbReadySlot
    ) {
      return;
    }
    const slot = this._hzbReadySlot;
    const buffer = this._hzbStagingBuffers![slot];
    const mapped = new Uint32Array(buffer.getMappedRange());
    const objects = this._hzbSlotObjects[slot];
    for (let i = 0; i < objects.length; i++) {
      objects[i]!.occlusionCulled = 0 === mapped[i];
    }
    buffer.unmap();

    this._hzbStagingPending[slot] = false;
    this._hzbResultsReady = false;
    this._hzbReadySlot = undefined;
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
        { binding: 11, resource: { buffer: this._pointClusterGridBuffer } },
        { binding: 12, resource: { buffer: this._pointClusterIndexBuffer } },
        { binding: 13, resource: { buffer: this._spotClusterGridBuffer } },
        { binding: 14, resource: { buffer: this._spotClusterIndexBuffer } },
      ],
    });
  }

  /**
   * (Re)allocates the clustered-light-culling storage buffers for the given grid size and
   * rebuilds the global bind group to reference them -- see
   * docs/adr/0007-clustered-lighting-webgl2-webgpu-only.md. Resetting `_currentIrradianceMap`
   * etc. forces `_updateGlobalBuffers()` to rebuild the bind group again on the next frame with
   * the scene's real IBL textures (this method has no `Scene` to pull them from itself).
   * @param dims Cluster grid dimensions.
   * @param maxLightsPerCluster Maximum number of lights a single cluster cell can reference.
   */
  private _allocateClusterBuffers(dims: ClusterGridDims, maxLightsPerCluster: number): void {
    const numClusters = Math.max(1, dims.x * dims.y * dims.z);
    let safeMaxLights = Math.max(1, maxLightsPerCluster);

    // Guard against driver storage buffer limits (e.g. on mobile/integrated GPUs).
    const maxStorageSize = this._device?.limits.maxStorageBufferBindingSize ?? 134217728;
    let gridByteLength = numClusters * 8; // vec2u
    let indexByteLength = numClusters * safeMaxLights * 4; // u32

    if (indexByteLength > maxStorageSize && numClusters > 0) {
      safeMaxLights = Math.max(1, Math.floor(maxStorageSize / (numClusters * 4)));
      indexByteLength = numClusters * safeMaxLights * 4;
      console.warn(
        `[WebGPURenderer] Clustered lights buffer exceeded maxStorageBufferBindingSize. Clamped maxLightsPerCluster to ${safeMaxLights}.`,
      );
    }

    if (gridByteLength > maxStorageSize) {
      gridByteLength = maxStorageSize;
      console.warn(
        `[WebGPURenderer] Clustered grid buffer exceeded maxStorageBufferBindingSize. Clamping buffer size.`,
      );
    }

    this._pointClusterGridBuffer?.destroy();
    this._pointClusterIndexBuffer?.destroy();
    this._spotClusterGridBuffer?.destroy();
    this._spotClusterIndexBuffer?.destroy();

    this._pointClusterGridBuffer = this._device!.createBuffer({
      size: gridByteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    this._pointClusterIndexBuffer = this._device!.createBuffer({
      size: indexByteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    this._spotClusterGridBuffer = this._device!.createBuffer({
      size: gridByteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    this._spotClusterIndexBuffer = this._device!.createBuffer({
      size: indexByteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    this._clusterDims = dims;
    this._clusterMaxLightsPerCluster = safeMaxLights;

    if (this._globalBGL) {
      this._globalBindGroup = this._createGlobalBindGroup();
      this._currentIrradianceMap = undefined;
      this._currentPrefilterMap = undefined;
      this._currentBrdfLUT = undefined;
    }
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
        bindGroupLayouts: [this._globalBGL, materialBGL, this._objectBGL, this._viewBGL],
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
        bgLayouts: [this._globalBGL, materialBGL, this._objectBGL, this._viewBGL],
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
      if (!def || !def.sources.wgsl) {
        throw new Error(
          `[WebGPURenderer] Shader definition for ${shaderId} not found or missing WGSL source.`,
        );
      }

      let code = ShaderRegistry.instance.assemble(def.sources.wgsl, "wgsl");

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
    projMatrix?: Float32Array,
  ): void {
    if (!this._device || this._isDeviceLost) return;

    for (const obj of scene.consumeRemovedObjects()) {
      this._releaseObjectResources(obj);
    }

    this._frameCount++;

    // Object-uniform ring buffer: reset per-frame dedup/slot state, then size for this frame
    // from last frame's actual usage (with 50% headroom) so growth is the rare case, not the norm.
    this._objectSlotMap.clear();
    this._objectSlotCount = 0;
    this._objectRingOverflowWarned = false;
    this._ensureObjectRingCapacity(Math.max(1024, Math.ceil(this._lastFrameObjectSlotCount * 1.5)));

    const lights = this.extractLights(scene);
    this._updateGlobalBuffers(vp, camPos, lights, scene, near, far, projMatrix);
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
          this._textureViewCache.set(this._activeRenderTarget, {
            texture: tex,
            view,
            mipLevelCount: 1,
          });
          this._activeRenderTarget.isLoaded = true;
        }
        renderTargetView = data.view;
      }
    }

    const bloomNode = this.postProcessing.get<import("../post/index.js").BloomElement>(
      PostProcessingEffectType.BLOOM,
    );
    const hbaoNode = this.postProcessing.get<import("../post/index.js").HbaoElement>(
      PostProcessingEffectType.HBAO,
    );
    const taaNode = this.postProcessing.get<import("../post/index.js").TaaElement>(
      PostProcessingEffectType.TAA,
    );
    const motionTrailNode = this.postProcessing.get<import("../post/index.js").MotionTrailElement>(
      PostProcessingEffectType.MOTION_TRAIL,
    );

    for (const pass of this._passes) {
      const isPostProcessPass = pass instanceof PostProcessPass;

      // TAA resolves first, if enabled: Bloom and the final uber pass should react to the
      // temporally-smoothed color, not the raw per-frame jittered one. `_hdrTextureView` itself
      // is never reassigned, so this pass keeps reading fresh input every subsequent frame.
      if (isPostProcessPass && taaNode && taaNode.enabled && this._hdrTextureView) {
        this._taaPassGPU ??= new HistoryBlendPassGPU(this._device);
        this._taaResolvedView =
          this._taaPassGPU.execute(
            ce,
            this._hdrTextureView,
            this._context.canvas.width,
            this._context.canvas.height,
            taaNode,
          ) ?? undefined;
      } else if (isPostProcessPass) {
        this._taaResolvedView = undefined;
      }

      // Motion Trail: a deliberate ghost/afterimage look, not anti-aliasing -- reuses the same
      // history-blend pass as TAA (its own separate instance/history buffer), chained after TAA.
      const taaOrRawView = this._taaResolvedView ?? this._hdrTextureView;
      if (isPostProcessPass && motionTrailNode && motionTrailNode.enabled && taaOrRawView) {
        this._motionTrailPassGPU ??= new HistoryBlendPassGPU(this._device);
        this._motionTrailResolvedView =
          this._motionTrailPassGPU.execute(
            ce,
            taaOrRawView,
            this._context.canvas.width,
            this._context.canvas.height,
            motionTrailNode,
          ) ?? undefined;
      } else if (isPostProcessPass) {
        this._motionTrailResolvedView = undefined;
      }

      const colorTextureView = this._motionTrailResolvedView ?? taaOrRawView;

      if (
        isPostProcessPass &&
        bloomNode &&
        bloomNode.enabled &&
        this._hdrTexture &&
        colorTextureView
      ) {
        this._bloomPassGPU ??= new BloomPassGPU(this._device);
        this._bloomTextureView =
          this._bloomPassGPU.execute(ce, this._hdrTexture, colorTextureView, bloomNode) ??
          undefined;
      } else if (isPostProcessPass) {
        this._bloomTextureView = undefined;
      }

      if (
        isPostProcessPass &&
        hbaoNode &&
        hbaoNode.enabled &&
        this._opaqueDepthTextureView &&
        projMatrix
      ) {
        this._hbaoPassGPU ??= new AOPassGPU(this._device);
        this._hbaoTextureView =
          this._hbaoPassGPU.execute(
            ce,
            this._opaqueDepthTextureView,
            this._context.canvas.width,
            this._context.canvas.height,
            near,
            far,
            projMatrix,
            hbaoNode,
          ) ?? undefined;
      } else if (isPostProcessPass) {
        this._hbaoTextureView = undefined;
      }

      if (isPostProcessPass && isOffscreen) {
        continue;
      }

      // Re-widen to the RenderPass interface: TS's control-flow analysis narrows `pass` towards
      // `PostProcessPass` from the `isPostProcessPass` checks above, which would otherwise
      // resolve this call against PostProcessPass's own (shorter, vMat-less) execute() overload
      // instead of the interface's.
      const nextPass: RenderPass = pass;
      nextPass.execute(this, scene, ce, renderTargetView, vp, camPos, vMat);
    }

    this._device.queue.submit([ce.finish()]);

    this._lastFrameObjectSlotCount = this._objectSlotCount;
    if (this._objectRingPendingDestroy) {
      this._objectRingPendingDestroy.destroy();
      this._objectRingPendingDestroy = undefined;
    }
    if (this._dummyBuffersPendingDestroy.length > 0) {
      for (const b of this._dummyBuffersPendingDestroy) b.destroy();
      this._dummyBuffersPendingDestroy.length = 0;
    }
    if (this._occlusionCullingEnabled) this._kickoffHzbMapAsync();
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

  private _opaqueDepthTexture?: GPUTexture;
  private _opaqueDepthTextureView?: GPUTextureView;

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

  public _renderBatch(
    rp: GPURenderPassEncoder,
    batch: import("../../core/Scene.js").RenderBatch,
    vMat?: Float32Array,
  ): void {
    const objects = batch.objects;
    if (objects.length === 0) return;

    rp.setBindGroup(0, this._globalBindGroup);

    const instancedObjects = this._scratchInstancedObjects;
    const standardObjects = this._scratchStandardObjects;
    instancedObjects.length = 0;
    standardObjects.length = 0;

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

    // Slot 0 = main camera, always offset 0 -- see VIEW_SLOT_MAIN_CAMERA.
    const viewOffset = VIEW_SLOT_MAIN_CAMERA * this._viewUniformStride;

    if (standardObjects.length > 0) {
      this._renderSubgroup(
        rp,
        standardObjects,
        false,
        batch.matUuid,
        manifest,
        viewOffset,
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
        viewOffset,
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
    viewOffset: number,
    vMat?: Float32Array,
    topology: GPUPrimitiveTopology = Topology.DEFAULT,
    wireframeMode?: "structural" | "triangles",
  ): void {
    const cache = this._getPipeline(manifest, topology, isInstanced);
    const pipelineKey = this._pipelineCacheKey(manifest, topology, isInstanced);
    rp.setPipeline(cache.pipeline);

    const matBindGroup = this._getMaterialBindGroup(matUuid, manifest, cache.bgLayouts[1]!);
    rp.setBindGroup(1, matBindGroup);
    rp.setBindGroup(3, this._viewBindGroup, [viewOffset]);

    for (const obj of objects) {
      if (!obj.geometry) continue;

      this._acquirePipeline(obj, pipelineKey);
      this._acquireTextures(obj, manifest.textures);

      const objOffset = this._getObjectSlotOffset(obj, manifest, matUuid, vMat);
      rp.setBindGroup(2, this._objectRingBindGroup, [objOffset]);

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

  /** Grows the shared object-uniform ring buffer (+ its single dynamic-offset bind group) to
   * hold at least `neededSlots`. Never shrinks. Called once at init and once per frame in
   * `render()` based on the previous frame's usage -- never mid-frame (see `_getObjectSlotOffset`'s
   * overflow clamp for why: swapping the bound `GPUBuffer` while a render pass is being recorded
   * would need a second bind group + risks stale offsets in already-encoded draws). */
  protected _ensureObjectRingCapacity(neededSlots: number): void {
    if (this._objectRingBuffer && this._objectRingCapacity >= neededSlots) return;

    const newCapacity = Math.max(neededSlots, this._objectRingCapacity * 2, 1);
    const newBuffer = this._device!.createBuffer({
      size: newCapacity * this._objectUniformStride,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    const newBindGroup = this._device!.createBindGroup({
      layout: this._objectBGL,
      entries: [
        { binding: 0, resource: { buffer: newBuffer, offset: 0, size: this._objectUniformStride } },
      ],
    });

    // Destroying immediately after this frame's queue.submit() is spec-safe (the driver keeps the
    // underlying resource alive, ref-counted, until in-flight GPU work finishes) -- but growth
    // happens *before* this frame's draws are recorded, so the old buffer is still what those
    // draws' already-taken slot offsets refer to until we submit. Deferred to `render()`'s
    // post-submit cleanup instead of destroying it here.
    this._objectRingPendingDestroy = this._objectRingBuffer;
    this._objectRingBuffer = newBuffer;
    this._objectRingBindGroup = newBindGroup;
    this._objectRingCapacity = newCapacity;
  }

  /** Returns the byte offset into `_objectRingBuffer` holding `obj`'s `ObjectUniforms` for this
   * draw. Packs + uploads at most once per (object, material) per frame -- e.g. the same shadow
   * caster drawn across 4 CSM cascades (all sharing one `DepthMaterial` `matUuid`) reuses the same
   * slot instead of repacking. Sprites are excluded: their model matrix is billboarded towards
   * `vMat` (camera vs. light view differ per pass), so they always get a fresh slot. */
  protected _getObjectSlotOffset(
    obj: Object3D,
    m: RenderManifest,
    matUuid: string,
    vMat?: Float32Array,
  ): number {
    const isSprite = m.state?.isSprite === true;
    const key = isSprite ? undefined : `${obj.uuid}:${matUuid}`;
    if (key !== undefined) {
      const cached = this._objectSlotMap.get(key);
      if (cached !== undefined) return cached;
    }

    let slot = this._objectSlotCount;
    if (slot >= this._objectRingCapacity) {
      // Rare mid-frame spike beyond what last frame's usage predicted -- clamp instead of
      // resizing mid-encode (see `_ensureObjectRingCapacity`'s doc comment). Self-corrects next
      // frame once `_lastFrameObjectSlotCount` reflects the higher demand.
      if (!this._objectRingOverflowWarned) {
        console.warn(
          `[WebGPURenderer] Object uniform ring buffer exceeded its ${this._objectRingCapacity}-slot capacity mid-frame; reusing the last slot for the overflow this frame. Capacity grows for the next frame.`,
        );
        this._objectRingOverflowWarned = true;
      }
      slot = this._objectRingCapacity - 1;
    } else {
      this._objectSlotCount++;
    }

    const offset = slot * this._objectUniformStride;
    if (this._packObjectUniforms(obj, m, vMat)) {
      this._device!.queue.writeBuffer(this._objectRingBuffer, offset, this._scratchObjBufferData);
    }
    if (key !== undefined) this._objectSlotMap.set(key, offset);
    return offset;
  }

  /** Packs `obj`'s `ObjectUniforms` into `_scratchObjBufferData`. Returns false (leaving the
   * scratch buffer untouched) if `m.shaderId` isn't registered -- caller then skips the upload,
   * matching the previous per-object-buffer behavior of leaving the slot's prior contents alone. */
  protected _packObjectUniforms(o: Object3D, m: RenderManifest, vMat?: Float32Array): boolean {
    const shaderDef = ShaderRegistry.instance.get(m.shaderId);
    if (!shaderDef) return false;

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
    return true;
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

  protected _getTextureView(tex: Texture | undefined): GPUTextureView {
    if (this._quality?.disableTextures) return this._whiteTexView;
    if (!tex || !tex.isLoaded) return this._whiteTexView;
    // A `RenderTarget` (e.g. `PlanarReflectionNode.renderTarget`, or a `bakeImposter()` output)
    // has no `.image` -- its GPU texture already exists from being rendered into (populated in
    // `setRenderTarget()`'s offscreen branch), so it's looked up instead of uploaded. Mirrors
    // `_getGPUCubeTextureView()`'s identical `RenderTargetCube` branch just below.
    if (tex instanceof RenderTarget) {
      const rtEntry = this._textureViewCache.get(tex);
      return rtEntry?.view || this._whiteTexView;
    }
    if (!tex.image) return this._whiteTexView;
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
        entry = { texture: t, view: v, mipLevelCount: 1 };
      } else {
        const mipLevelCount =
          this._quality?.mipmapping && tex.generateMipmaps
            ? this._computeMipLevelCount(tex.image.width, tex.image.height)
            : 1;
        t = this._device!.createTexture({
          size: [tex.image.width, tex.image.height],
          format: "rgba8unorm",
          mipLevelCount,
          usage:
            GPUTextureUsage.TEXTURE_BINDING |
            GPUTextureUsage.COPY_DST |
            GPUTextureUsage.RENDER_ATTACHMENT,
        });
        this._device!.queue.copyExternalImageToTexture({ source: tex.image }, { texture: t }, [
          tex.image.width,
          tex.image.height,
        ]);
        if (mipLevelCount > 1) this._generateMipmaps(t, mipLevelCount);
        v = t.createView();
        entry = { texture: t, view: v, mipLevelCount };
      }
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
      if (entry.mipLevelCount > 1) this._generateMipmaps(entry.texture, entry.mipLevelCount);
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
    projMatrix?: Float32Array,
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
    // Slot 0 = main camera in the per-draw view buffer (group 3) -- kept correct here, once per
    // frame, independent of whatever CascadedShadowPassGPU/SpotShadowPassGPU write into their own
    // slots afterward. See VIEW_SLOT_MAIN_CAMERA.
    this._writeViewSlot(VIEW_SLOT_MAIN_CAMERA, correctedVp.data);

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

    // Clustered light culling metadata (see docs/adr/0007-clustered-lighting-webgl2-webgpu-only.md).
    // resolution/tileSizePx/clusterDims must exactly match what ClusterCullPassGPU used to build
    // pointClusterGrid/spotClusterGrid this frame -- see setSize()/_allocateClusterBuffers().
    gData[202] = this._context.canvas.width;
    gData[203] = this._context.canvas.height;
    gData[204] = projMatrix?.[0] ?? 1.0;
    gData[205] = projMatrix?.[5] ?? 1.0;
    const tileSizePx = this._quality.clusteredLighting?.tileSize ?? DEFAULT_CLUSTER_TILE_SIZE;
    gData[206] = tileSizePx[0];
    gData[207] = tileSizePx[1];
    gData[208] = this._clusterDims.x;
    gData[209] = this._clusterDims.y;
    gData[210] = this._clusterDims.z;
    gData[211] = this._clusterMaxLightsPerCluster;

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

    if (this._occlusionCullingEnabled) {
      if (this._hzbTexture) this._hzbTexture.destroy();
      this._hzbMipLevelCount = this._computeMipLevelCount(
        this._context.canvas.width,
        this._context.canvas.height,
      );
      this._hzbTexture = this._device.createTexture({
        size: [this._context.canvas.width, this._context.canvas.height],
        format: "r32float",
        mipLevelCount: this._hzbMipLevelCount,
        // STORAGE_BINDING: each mip is written once, individually, by _buildHzbPyramid().
        // TEXTURE_BINDING: the whole chain is then read back (any mip) by the visibility test.
        usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING,
      });
      this._hzbSampledView = this._hzbTexture.createView();
    }

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

    // Clustered light culling grid depends on canvas resolution -- see
    // docs/adr/0007-clustered-lighting-webgl2-webgpu-only.md. `enabled: false` collapses the
    // grid to a single cluster covering the whole frustum, which is equivalent to the old
    // unclustered "iterate every light" behavior without needing a separate shader code path.
    const clusterConfig = this._quality.clusteredLighting;
    const dims =
      clusterConfig?.enabled === false
        ? { x: 1, y: 1, z: 1 }
        : computeClusterCounts(
            this._context.canvas.width,
            this._context.canvas.height,
            clusterConfig?.tileSize ?? DEFAULT_CLUSTER_TILE_SIZE,
            clusterConfig?.zSlices ?? DEFAULT_CLUSTER_Z_SLICES,
          );
    const maxLightsPerCluster =
      clusterConfig?.enabled === false
        ? MAX_CLUSTERED_LIGHTS_PER_TYPE
        : (clusterConfig?.maxLightsPerCluster ?? DEFAULT_MAX_LIGHTS_PER_CLUSTER);
    if (
      dims.x !== this._clusterDims.x ||
      dims.y !== this._clusterDims.y ||
      dims.z !== this._clusterDims.z ||
      maxLightsPerCluster !== this._clusterMaxLightsPerCluster
    ) {
      this._allocateClusterBuffers(dims, maxLightsPerCluster);
    }
  }

  /** @inheritdoc */
  public override destroy(): void {
    this._objectRingBuffer?.destroy();
    this._objectRingPendingDestroy?.destroy();
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
    for (const b of this._dummyBuffersPendingDestroy) b.destroy();
    this._dummyBuffersPendingDestroy.length = 0;
    this._globalUniformBuffer?.destroy();
    this._pointLightBuffer?.destroy();
    this._spotLightBuffer?.destroy();
    this._areaLightBuffer?.destroy();
    this._depthTexture?.destroy();
    this._hdrTexture?.destroy();
    this._hzbTexture?.destroy();
    this._hzbAabbBuffer?.destroy();
    this._hzbResultsBuffer?.destroy();
    this._hzbTestParamsBuffer?.destroy();
    if (this._hzbStagingBuffers) {
      // destroy() implicitly unmaps a still-mapped buffer per spec -- safe even if a
      // mapAsync() from a not-yet-applied readback is still pending on one of these.
      this._hzbStagingBuffers[0].destroy();
      this._hzbStagingBuffers[1].destroy();
    }
    this._bloomPassGPU?.destroy();
    this._hbaoPassGPU?.destroy();
    this._taaPassGPU?.destroy();
    this._motionTrailPassGPU?.destroy();

    this._objectSlotMap.clear();
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
    this._isDestroyed = true;
    this._isDeviceLost = true;
    this._device?.destroy();
    this._device = undefined;
  }
}

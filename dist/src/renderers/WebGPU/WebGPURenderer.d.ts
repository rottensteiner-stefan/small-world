import { CubeTexture, RenderManifest, InstancedMesh, Object3D, Scene, Texture } from '../../core/index.js';
import { RenderTarget, RenderTargetCube } from '../../core/textures/index.js';
import { EngineOptions, GeometryDataInterface, LightDataInterface } from '../../interfaces/index.js';
import { Vector3D } from '../../math/index.js';
import { RendererType } from '../../enums/index.js';
import { AbstractRenderer } from '../AbstractRenderer.js';
import { RenderPass } from '../RenderPass.js';
import { BloomPassGPU } from '../post/passes/index.js';
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
export declare class WebGPURenderer extends AbstractRenderer {
    readonly type: RendererType;
    protected _adapter: GPUAdapter | undefined;
    _device: GPUDevice | undefined;
    /** Satisfies Renderer interface */
    get gpuDevice(): GPUDevice | undefined;
    _context: GPUCanvasContext;
    _format: GPUTextureFormat;
    protected _pipelines: Map<string, WebGPUPipelineCache>;
    protected _shaderModules: Map<string, GPUShaderModule>;
    protected _objectUniformBuffers: Map<string, {
        buffer: GPUBuffer;
        lastFrame: number;
        objBg?: GPUBindGroup;
    }>;
    protected _materialBindGroups: Map<string, {
        bg: GPUBindGroup;
        resources: unknown[];
    }>;
    protected _textureViewCache: Map<Texture, GPUTextureView>;
    _whiteTexView: GPUTextureView;
    _blackTexView: GPUTextureView;
    protected _flatNormalTexView: GPUTextureView;
    protected _defaultCubeTexView: GPUTextureView;
    protected _blackCubeTexView: GPUTextureView;
    protected _defaultBrdfTexView: GPUTextureView;
    protected _dummyNormalBuffer: GPUBuffer;
    protected _dummyUvBuffer: GPUBuffer;
    protected _dummyTangentBuffer: GPUBuffer;
    _defaultDirShadowTexView: GPUTextureView;
    _defaultSpotShadowTexView: GPUTextureView;
    protected _shadowSampler: GPUSampler;
    protected _geoCache: Map<GeometryDataInterface, WebGPUGeoCache>;
    protected _gpuInstanceBuffers: WeakMap<InstancedMesh, GPUBuffer>;
    protected _gpuInstanceDataBuffers: WeakMap<InstancedMesh, GPUBuffer>;
    protected _materialBGLCache: Map<string, GPUBindGroupLayout>;
    protected _frameCount: number;
    protected _scratchModelMatrix: Float32Array<ArrayBuffer>;
    protected _scratchColorArray: Float32Array<ArrayBuffer>;
    protected _scratchUniformValues: Record<string, unknown>;
    protected _samplerCache: Map<string, GPUSampler>;
    protected _dummyBufferSize: number;
    protected _cubeTextureViewCache: Map<CubeTexture, GPUTextureView>;
    _scratchGlobalBufferData: Float32Array<ArrayBuffer>;
    protected _scratchPointLightData: Float32Array<ArrayBuffer>;
    protected _scratchSpotLightData: Float32Array<ArrayBuffer>;
    protected _scratchAreaLightData: Float32Array<ArrayBuffer>;
    protected _scratchObjBufferData: Float32Array<ArrayBuffer>;
    _depthTexture: GPUTexture;
    protected _opaqueTextures: WeakMap<object, {
        tex: GPUTexture;
        view: GPUTextureView;
        width: number;
        height: number;
    }>;
    protected _screenOpaqueTexture?: {
        tex: GPUTexture;
        view: GPUTextureView;
        width: number;
        height: number;
    };
    _opaqueTextureView?: GPUTextureView;
    _shadowMaps: Map<import('../../index.js').DirectionalLight | import('../../index.js').SpotLight, GPUTexture>;
    _hdrTexture: GPUTexture | undefined;
    _hdrTextureView: GPUTextureView | undefined;
    _bloomPassGPU: BloomPassGPU | undefined;
    _bloomTextureView: GPUTextureView | undefined;
    _activeRenderTarget: import('../../core/index.js').RenderTarget | import('../../core/index.js').RenderTargetCube | null;
    protected _activeCubeFace: number;
    protected _renderTargetTextures: Map<RenderTarget, {
        tex: GPUTexture;
        view: GPUTextureView;
        depth?: GPUTexture;
        depthView?: GPUTextureView;
    }>;
    protected _renderTargetCubeTextures: Map<RenderTargetCube, {
        tex: GPUTexture;
        cubeView: GPUTextureView;
        faceViews: GPUTextureView[];
        depth?: GPUTexture;
        depthView?: GPUTextureView;
    }>;
    protected _passes: RenderPass[];
    _globalUniformBuffer: GPUBuffer;
    _pointLightBuffer: GPUBuffer;
    _spotLightBuffer: GPUBuffer;
    _areaLightBuffer: GPUBuffer;
    _globalBindGroup: GPUBindGroup;
    _globalBGL: GPUBindGroupLayout;
    _materialBGL: GPUBindGroupLayout;
    _objectBGL: GPUBindGroupLayout;
    /** @inheritdoc */
    setRenderTarget(target: RenderTarget | RenderTargetCube | null, activeCubeFace?: number): void;
    get activeDepthView(): GPUTextureView;
    /** @inheritdoc */
    initialize(canvas: HTMLCanvasElement, attributes?: Record<string, unknown>, config?: EngineOptions): Promise<void>;
    /**
     * Adds a render pass to the pipeline.
     * @param pass The pass to add.
     */
    addPass(pass: RenderPass): void;
    private _initDefaultResources;
    protected _getSampler(tex: Texture | undefined): GPUSampler;
    protected _ensureDummyBufferSize(vertexCount: number): void;
    private _initGlobalBuffers;
    private _currentIrradianceMap?;
    private _currentPrefilterMap?;
    private _currentBrdfLUT?;
    _createGlobalBindGroup(scene?: Scene): GPUBindGroup;
    protected _getMaterialBGL(flags: string[]): GPUBindGroupLayout;
    protected _getPipeline(manifest: RenderManifest, topology: GPUPrimitiveTopology, isInstanced?: boolean): WebGPUPipelineCache;
    protected _getShaderModule(shaderId: string, isInstanced?: boolean, flags?: string[]): GPUShaderModule;
    protected _getGeoCache(geo: GeometryDataInterface): WebGPUGeoCache;
    render(scene: Scene, vp: Float32Array, camPos?: Vector3D, vMat?: Float32Array): void;
    captureOpaqueTexture(ce: GPUCommandEncoder, targetTex: GPUTexture): void;
    protected _pruneObjectBuffers(): void;
    _renderBatch(rp: GPURenderPassEncoder, batch: import('../../core/Scene.js').RenderBatch, vMat?: Float32Array): void;
    _renderSubgroup(rp: GPURenderPassEncoder, objects: Object3D[], isInstanced: boolean, matUuid: string, manifest: RenderManifest, vMat?: Float32Array, topology?: GPUPrimitiveTopology, wireframeMode?: "structural" | "triangles"): void;
    protected _getObjUniformBufferData(obj: Object3D): {
        buffer: GPUBuffer;
        lastFrame: number;
        objBg?: GPUBindGroup;
    };
    protected _updateObjUniformBuffer(b: GPUBuffer, o: Object3D, m: RenderManifest, vMat?: Float32Array): void;
    protected _getMaterialBindGroup(matUuid: string, m: RenderManifest, layout: GPUBindGroupLayout): GPUBindGroup;
    protected _getObjBindGroup(objBufferData: {
        buffer: GPUBuffer;
        objBg?: GPUBindGroup;
    }, layout: GPUBindGroupLayout): GPUBindGroup;
    protected _getTextureView(tex: Texture | undefined): GPUTextureView;
    protected _getNormalTextureView(tex: Texture | undefined): GPUTextureView;
    protected _getGPUCubeTextureView(tex: CubeTexture | undefined): GPUTextureView;
    _updateGlobalBuffers(vp: Float32Array, camPos: Vector3D, lights: LightDataInterface, scene: Scene): void;
    setSize(width: number, height: number): void;
    /** @inheritdoc */
    destroy(): void;
}

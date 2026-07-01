import { CubeTexture, RenderManifest, Texture, InstancedMesh, RenderTarget, RenderTargetCube } from '../core/index.js';
import { EngineOptions, GeometryDataInterface } from '../interfaces/index.js';
import { Object3D } from '../core/Object3D.js';
import { Scene } from '../core/Scene.js';
import { Vector3D } from '../math/index.js';
import { RendererType } from '../enums/index.js';
import { AbstractRenderer } from './AbstractRenderer.js';
import { RenderPass } from './RenderPass.js';
import { BloomPassGPU } from './post/BloomPassGPU.js';
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
    _whiteTexView: GPUTextureView;
    protected _flatNormalTexView: GPUTextureView;
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
    protected _dummyNormalBuffer: GPUBuffer;
    protected _dummyUvBuffer: GPUBuffer;
    protected _dummyTangentBuffer: GPUBuffer;
    protected _geoCache: Map<GeometryDataInterface, WebGPUGeoCache>;
    protected _gpuInstanceBuffers: WeakMap<InstancedMesh, GPUBuffer>;
    protected _frameCount: number;
    protected _scratchModelMatrix: Float32Array<ArrayBuffer>;
    protected _scratchColorArray: Float32Array<ArrayBuffer>;
    protected _scratchUniformValues: Record<string, unknown>;
    protected _defaultCubeTexView: GPUTextureView;
    protected _samplerCache: Map<string, GPUSampler>;
    protected _dummyBufferSize: number;
    protected _cubeTextureViewCache: Map<CubeTexture, GPUTextureView>;
    protected _scratchGlobalBufferData: Float32Array<ArrayBuffer>;
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
    _hdrTexture: GPUTexture | undefined;
    _hdrTextureView: GPUTextureView | undefined;
    _bloomPassGPU: BloomPassGPU | undefined;
    _bloomTextureView: GPUTextureView | undefined;
    protected _activeRenderTarget: RenderTarget | RenderTargetCube | null;
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
    protected _getPipeline(manifest: RenderManifest, topology: GPUPrimitiveTopology, isInstanced?: boolean): WebGPUPipelineCache;
    protected _getShaderModule(shaderId: string, isInstanced?: boolean): GPUShaderModule;
    protected _getGeoCache(geo: GeometryDataInterface): WebGPUGeoCache;
    render(scene: Scene, vp: Float32Array, camPos?: Vector3D, vMat?: Float32Array): void;
    captureOpaqueTexture(ce: GPUCommandEncoder, targetTex: GPUTexture): void;
    protected _pruneObjectBuffers(): void;
    _renderGroup(rp: GPURenderPassEncoder, _shaderId: string, materialGroups: Map<string, Object3D[]>, vMat?: Float32Array, topology?: GPUPrimitiveTopology): void;
    private _renderSubgroup;
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
    private _updateGlobalBuffers;
    setSize(width: number, height: number): void;
}

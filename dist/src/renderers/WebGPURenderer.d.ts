import { CubeTexture, RenderManifest, Texture } from '../core/index.js';
import { EngineOptions, GeometryDataInterface } from '../interfaces/index.js';
import { Object3D } from '../core/Object3D.js';
import { Scene } from '../core/Scene.js';
import { Vector3D } from '../math/index.js';
import { RendererType } from '../enums/index.js';
import { AbstractRenderer } from './AbstractRenderer.js';
import { RenderPass } from './RenderPass.js';
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
    protected _whiteTexView: GPUTextureView;
    protected _flatNormalTexView: GPUTextureView;
    protected _objectUniformBuffers: Map<string, {
        buffer: GPUBuffer;
        lastFrame: number;
        texBg?: GPUBindGroup;
        texBgResources?: unknown[];
    }>;
    protected _textureViewCache: Map<Texture, GPUTextureView>;
    protected _dummyNormalBuffer: GPUBuffer;
    protected _dummyUvBuffer: GPUBuffer;
    protected _dummyTangentBuffer: GPUBuffer;
    protected _geoCache: Map<GeometryDataInterface, WebGPUGeoCache>;
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
    _opaqueTexture?: GPUTexture;
    _opaqueTextureView?: GPUTextureView;
    _hdrTexture: GPUTexture | undefined;
    _hdrTextureView: GPUTextureView | undefined;
    protected _passes: RenderPass[];
    _globalUniformBuffer: GPUBuffer;
    _pointLightBuffer: GPUBuffer;
    _spotLightBuffer: GPUBuffer;
    _areaLightBuffer: GPUBuffer;
    _globalBindGroup: GPUBindGroup;
    _globalBGL: GPUBindGroupLayout;
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
    protected _getPipeline(manifest: RenderManifest, topology: GPUPrimitiveTopology): WebGPUPipelineCache;
    protected _getShaderModule(shaderId: string): GPUShaderModule;
    protected _getGeoCache(geo: GeometryDataInterface): WebGPUGeoCache;
    render(scene: Scene, vp: Float32Array, camPos?: Vector3D, vMat?: Float32Array): void;
    captureOpaqueTexture(ce: GPUCommandEncoder, targetTex: GPUTexture): void;
    protected _pruneObjectBuffers(): void;
    _renderGroup(rp: GPURenderPassEncoder, _shaderId: string, materialGroups: Map<string, Object3D[]>, vMat?: Float32Array, topology?: GPUPrimitiveTopology): void;
    protected _getObjUniformBufferData(obj: Object3D): {
        buffer: GPUBuffer;
        lastFrame: number;
        texBg?: GPUBindGroup;
        texBgResources?: unknown[];
    };
    protected _updateObjUniformBuffer(b: GPUBuffer, o: Object3D, m: RenderManifest, vMat?: Float32Array): void;
    protected _getTexBindGroup(objBufferData: {
        buffer: GPUBuffer;
        texBg?: GPUBindGroup;
        texBgResources?: unknown[];
    }, m: RenderManifest, layout: GPUBindGroupLayout): GPUBindGroup;
    protected _getTextureView(tex: Texture | undefined): GPUTextureView;
    protected _getNormalTextureView(tex: Texture | undefined): GPUTextureView;
    protected _getGPUCubeTextureView(tex: CubeTexture | undefined): GPUTextureView;
    private _updateGlobalBuffers;
    setSize(width: number, height: number): void;
}

import { Scene } from '../core/Scene.js';
import { Vector3D } from '../math/index.js';
import { RendererType } from '../enums/index.js';
import { EngineConfig } from '../interfaces/EngineConfig.js';
import { AbstractRenderer } from './AbstractRenderer.js';
/**
 * Modern WebGPU implementation with dynamic vertex updates and memory management.
 */
export declare class WebGPURenderer extends AbstractRenderer {
    readonly type: RendererType;
    private _adapter;
    private _device;
    private _context;
    private _format;
    private _pipelines;
    private _shaderModules;
    private _whiteTexView;
    private _flatNormalTexView;
    private _defaultCubeTexView;
    private _samplerCache;
    private _dummyNormalBuffer;
    private _dummyUvBuffer;
    private _dummyTangentBuffer;
    private _dummyBufferSize;
    private _geoCache;
    private _textureViewCache;
    private _cubeTextureViewCache;
    private _depthTexture;
    private _globalUniformBuffer;
    private _pointLightBuffer;
    private _spotLightBuffer;
    private _areaLightBuffer;
    private _globalBindGroup;
    private _globalBGL;
    private _objectUniformBuffers;
    private _frameCount;
    private _scratchModelMatrix;
    /** @inheritdoc */
    initialize(canvas: HTMLCanvasElement, attributes?: Record<string, unknown>, config?: EngineConfig): Promise<void>;
    private _initDefaultResources;
    private _getSampler;
    private _ensureDummyBufferSize;
    private _initGlobalBuffers;
    private _getPipeline;
    private _getShaderModule;
    private _getGeoCache;
    render(scene: Scene, vp: Float32Array, camPos?: Vector3D, vMat?: Float32Array): void;
    private _pruneObjectBuffers;
    private _renderGroup;
    private _getObjUniformBuffer;
    private _updateObjUniformBuffer;
    private _getTexBindGroup;
    private _getTextureView;
    private _getNormalTextureView;
    private _getGPUCubeTextureView;
    private _updateGlobalBuffers;
    setSize(width: number, height: number): void;
}

import { Scene } from '../core/Scene.js';
import { Vector3D } from '../math/index.js';
import { RendererType } from '../enums/index.js';
import { EngineConfig } from '../interfaces/EngineConfig.js';
import { AbstractRenderer } from './AbstractRenderer.js';
/**
 * Modern WebGPU implementation with optimized Bind Groups.
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
    private _specularTexView;
    private _defaultCubeTexView;
    private _defaultSampler;
    private _geoCache;
    private _textureViewCache;
    private _cubeTextureViewCache;
    private _samplerCache;
    private _depthTexture;
    private _globalUniformBuffer;
    private _pointLightBuffer;
    private _spotLightBuffer;
    private _areaLightBuffer;
    private _globalBindGroup;
    private _globalBGL;
    private _objectUniformBuffers;
    private _materialBindGroups;
    private _scratchModelMatrix;
    /** @inheritdoc */
    initialize(canvas: HTMLCanvasElement, attributes?: Record<string, unknown>, config?: EngineConfig): Promise<void>;
    private _initDefaultResources;
    private _initGlobalBuffers;
    private _getPipeline;
    private _getShaderModule;
    private _getGeoCache;
    /** @inheritdoc */
    render(scene: Scene, vpMatrix: Float32Array, camPos?: Vector3D): void;
    private _renderGroup;
    private _getObjUniformBuffer;
    private _updateObjUniformBuffer;
    private _getTexBindGroup;
    private _getTextureView;
    private _getGPUCubeTextureView;
    private _updateGlobalBuffers;
    setSize(width: number, height: number): void;
}

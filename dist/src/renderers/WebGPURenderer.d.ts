import { Scene } from '../core/Scene.js';
import { Vector3D } from '../math/Vector3D.js';
import { RendererType } from '../enums/index.js';
import { EngineConfig } from '../interfaces/EngineConfig.js';
import { AbstractRenderer } from './AbstractRenderer.js';
/**
 * WebGPU implementation of the renderer.
 */
export declare class WebGPURenderer extends AbstractRenderer {
    /** @inheritdoc */
    readonly type: RendererType;
    private _adapter;
    private _device;
    private _context;
    private _format;
    private _pipelines;
    private _shaderModules;
    private _sampler;
    private _whiteTexView;
    private _flatNormalTexView;
    private _specularTexView;
    private _defaultCubeTexView;
    private _geoCache;
    private _textureViewCache;
    private _cubeTextureViewCache;
    private _samplerCache;
    private _depthTexture;
    private _objUniformBuffers;
    private _objLightBuffers;
    private _objBindGroups;
    /** @inheritdoc */
    initialize(canvas: HTMLCanvasElement, attributes?: Record<string, unknown>, config?: EngineConfig): Promise<void>;
    private _getShaderModule;
    private _getPipeline;
    private _getTextureView;
    private _getGPUCubeTextureView;
    private _getSampler;
    private _getGeoCache;
    private _getObjBuffers;
    private _getObjBindGroup;
    private _getTexBindGroup;
    /** @inheritdoc */
    render(scene: Scene, vpMatrix: Float32Array, camPos?: Vector3D): void;
    destroy(): void;
    /** @inheritdoc */
    setSize(width: number, height: number): void;
}

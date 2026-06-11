import { AbstractWebGLRenderer } from './AbstractWebGLRenderer.js';
import { EngineConfig } from '../interfaces/index.js';
import { RendererType } from '../enums/index.js';
import { Scene } from '../core/Scene.js';
import { Vector3D } from '../math/index.js';
/**
 * WebGL 2.0 implementation of the renderer.
 */
export declare class WebGL2Renderer extends AbstractWebGLRenderer {
    /** @inheritdoc */
    readonly type: RendererType;
    protected gl: WebGL2RenderingContext;
    private _programs;
    private _cache;
    private _texCache;
    private _texCubeCache;
    private _scratchModelMatrix;
    private _globalUBO;
    private _shadowMaps;
    /** @inheritdoc */
    initialize(canvas: HTMLCanvasElement, attributes?: Record<string, unknown>, config?: EngineConfig): Promise<void>;
    private _getProgram;
    private _getWebGLTexture;
    private _getWebGLCubeTexture;
    /** @inheritdoc */
    render(scene: Scene, vp: Float32Array, camPos?: Vector3D, vMat?: Float32Array): void;
    /**
     * Renders shadow maps for all shadow-casting lights.
     */
    private _renderShadowMaps;
    /**
     * Renders a group of objects sharing the same shader and topology.
     */
    private _renderGroup;
    private _updateGlobalUBO;
}

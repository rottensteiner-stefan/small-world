import { AbstractWebGLRenderer } from './AbstractWebGLRenderer.js';
import { RendererType } from '../enums/index.js';
import { Scene } from '../core/Scene.js';
import { Vector3D } from '../math/Vector3D.js';
import { EngineConfig } from '../interfaces/index.js';
/**
 * WebGL 1.0 implementation of the renderer.
 */
export declare class WebGL1Renderer extends AbstractWebGLRenderer {
    /** @inheritdoc */
    readonly type: RendererType;
    protected gl: WebGLRenderingContext;
    private _programs;
    private _cache;
    private _texCache;
    private _texCubeCache;
    /** @inheritdoc */
    initialize(canvas: HTMLCanvasElement, attributes?: Record<string, unknown>, config?: EngineConfig): Promise<void>;
    private _getProgram;
    private _getWebGLTexture;
    private _getWebGLCubeTexture;
    /** @inheritdoc */
    render(scene: Scene, vp: Float32Array, camPos?: Vector3D): void;
    private _drawObject;
}

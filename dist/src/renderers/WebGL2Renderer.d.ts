import { AbstractWebGLRenderer } from './AbstractWebGLRenderer.js';
import { RendererType } from '../enums/index.js';
import { Scene } from '../core/Scene.js';
import { Vector3D } from '../math/index.js';
import { EngineConfig } from '../interfaces/index.js';
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
    /** @inheritdoc */
    initialize(canvas: HTMLCanvasElement, attributes?: Record<string, unknown>, config?: EngineConfig): Promise<void>;
    private _getProgram;
    private _getWebGLTexture;
    private _getWebGLCubeTexture;
    /** @inheritdoc */
    render(scene: Scene, vp: Float32Array, camPos?: Vector3D): void;
    /**
     * Internal generic object draw function.
     */
    private _drawObject;
}

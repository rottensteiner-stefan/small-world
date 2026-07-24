import { AbstractWebGLRenderer } from '../AbstractWebGLRenderer.js';
import { PostProcessPassGL } from '../post/passes/index.js';
import { Texture, RenderTarget } from '../../core/textures/index.js';
import { Scene } from '../../core/index.js';
import { EngineOptions, LightDataInterface } from '../../interfaces/index.js';
import { RendererType } from '../../enums/index.js';
import { Vector3D } from '../../math/index.js';
/**
 * WebGL 1.0 implementation of the renderer.
 */
export declare class WebGL1Renderer extends AbstractWebGLRenderer {
    /** @inheritdoc */
    readonly type: RendererType;
    protected gl: WebGLRenderingContext;
    private _stateCullFaceEnabled;
    private _stateCullFaceMode;
    private _stateBlendEnabled;
    private _stateBlendSrc;
    private _stateBlendDst;
    private _stateDepthMask;
    private _stateDepthTest;
    /** Satisfies Renderer interface */
    get webglContext(): WebGLRenderingContext;
    private _programs;
    private _cache;
    private _texCache;
    private _texCubeCache;
    private _scratchTransparentMap;
    private readonly _samplerUnits;
    _opaqueTexture?: WebGLTexture;
    _opaqueTextureWrapper?: Texture;
    protected _hdrFbo: WebGLFramebuffer | undefined;
    protected _hdrTexture: WebGLTexture | undefined;
    protected _hdrRenderBuffer: WebGLRenderbuffer | undefined;
    protected _postPassGL: PostProcessPassGL | undefined;
    protected _activeRenderTarget: RenderTarget | null;
    private _renderTargetFbos;
    private _scratchModelMatrix;
    /** @inheritdoc */
    initialize(canvas: HTMLCanvasElement, attributes?: Record<string, unknown>, config?: EngineOptions): Promise<void>;
    private _getProgram;
    private _getWebGLTexture;
    private _getWebGLCubeTexture;
    /** @inheritdoc */
    setRenderTarget(target: RenderTarget | null): void;
    resetStateCache(): void;
    bindMainRenderTarget(): boolean;
    bindPostProcessRenderTarget(): void;
    copyToOpaqueTexture(): void;
    flushPostProcess(): void;
    renderBatch(batch: import('../../core/Scene.js').RenderBatch, vMat: Float32Array | undefined, vp: Float32Array, camPos: Vector3D, lights: LightDataInterface, scene: Scene): void;
    /** @inheritdoc */
    setSize(width: number, height: number): void;
    /** @inheritdoc */
    destroy(): void;
}

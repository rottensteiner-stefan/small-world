import { WebGL2FrameBuffer } from './WebGL2FrameBuffer.js';
import { AbstractWebGLRenderer } from '../AbstractWebGLRenderer.js';
import { PostProcessPassGL, BloomPassGL } from '../post/passes/index.js';
import { Texture, RenderTarget, RenderTargetCube } from '../../core/textures/index.js';
import { Scene } from '../../core/index.js';
import { EngineOptions } from '../../interfaces/index.js';
import { RendererType } from '../../enums/index.js';
import { Vector3D } from '../../math/index.js';
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
    private _instanceBuffers;
    private _instanceDataBuffers;
    private _scratchTransparentMap;
    private _scratchFloat4;
    private readonly _samplerUnits;
    _opaqueTexture?: WebGLTexture;
    _opaqueTextureWrapper?: Texture;
    protected _hdrFbo: WebGL2FrameBuffer | undefined;
    protected _postPassGL: PostProcessPassGL | undefined;
    protected _bloomPassGL: BloomPassGL | undefined;
    protected _activeRenderTarget: RenderTarget | RenderTargetCube | null;
    protected _activeCubeFace: number;
    private _renderTargetFbos;
    private _renderTargetCubeFbos;
    private _scratchModelMatrix;
    private _globalUBO;
    private _stateCullFaceEnabled;
    private _stateCullFaceMode;
    private _stateBlendEnabled;
    private _stateBlendSrc;
    private _stateBlendDst;
    private _stateDepthMask;
    private _stateDepthTest;
    private _shadowMaps;
    private _dummyShadowMap;
    /** @inheritdoc */
    initialize(canvas: HTMLCanvasElement, attributes?: Record<string, unknown>, config?: EngineOptions): Promise<void>;
    private _resetStateCache;
    private _getProgram;
    private _getWebGLTexture;
    private _getWebGLCubeTexture;
    /** @inheritdoc */
    setRenderTarget(target: RenderTarget | RenderTargetCube | null, activeCubeFace?: number): void;
    /** @inheritdoc */
    render(scene: Scene, vp: Float32Array, camPos?: Vector3D, vMat?: Float32Array): void;
    /**
     * Renders shadow maps for all shadow-casting lights.
     */
    private _renderShadowMaps;
    /**
     * Helper to render the actual geometry for a shadow pass.
     */
    private _renderShadowScene;
    /**
     * Binds dummy depth textures to shadow samplers to satisfy WebGL2 sampler2DShadow validation rules.
     */
    private _bindDummyShadowMaps;
    private _renderGroup;
    private _renderSubgroup;
    private _updateGlobalUBO;
    /** @inheritdoc */
    setSize(width: number, height: number): void;
    /** @inheritdoc */
    destroy(): void;
}

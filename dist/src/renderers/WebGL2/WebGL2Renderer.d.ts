import { WebGL2FrameBuffer } from './WebGL2FrameBuffer.js';
import { AbstractWebGLRenderer } from '../AbstractWebGLRenderer.js';
import { PostProcessPassGL, BloomPassGL } from '../post/passes/index.js';
import { Texture, RenderTarget, RenderTargetCube } from '../../core/textures/index.js';
import { Object3D, Scene } from '../../core/index.js';
import { EngineOptions, LightDataInterface } from '../../interfaces/index.js';
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
    resetStateCache(): void;
    private _getProgram;
    private _getWebGLTexture;
    private _getWebGLCubeTexture;
    /** @inheritdoc */
    setRenderTarget(target: RenderTarget | RenderTargetCube | null, activeCubeFace?: number): void;
    bindMainRenderTarget(): boolean;
    bindPostProcessRenderTarget(): void;
    copyToOpaqueTexture(): void;
    flushPostProcess(): void;
    /**
     * Renders shadow maps for all shadow-casting lights.
     */
    renderShadowMaps(lights: LightDataInterface, sortedGroups: Map<string, Map<string, Map<string, Object3D[]>>>): void;
    /**
     * Helper to render the actual geometry for a shadow pass.
     */
    private _renderShadowScene;
    /**
     * Binds dummy depth textures to shadow samplers to satisfy WebGL2 sampler2DShadow validation rules.
     */
    private _bindDummyShadowMaps;
    renderGroup(shaderId: string, materialGroups: Map<string, Object3D[]>, vMat: Float32Array | undefined, topology: string, _vp: Float32Array, _camPos: Vector3D, lights: LightDataInterface, scene: Scene): void;
    private _renderSubgroup;
    updateGlobalUBO(vp: Float32Array, camPos: Vector3D, lights: LightDataInterface): void;
    /** @inheritdoc */
    setSize(width: number, height: number): void;
    /** @inheritdoc */
    destroy(): void;
}

/**
 * Handles post-processing blit for WebGL1 and WebGL2.
 * Reads from the HDR framebuffer texture and writes tone-mapped,
 * gamma-corrected output to the default (canvas) framebuffer.
 */
export declare class PostProcessPassGL {
    private _prog?;
    private _vao?;
    private _vb?;
    private _uHdrTexture;
    private _uExposure;
    private _uGamma;
    private _uToneMappingMode;
    private _uVignetteEnabled;
    private _uVignetteOffset;
    private _uVignetteDarkness;
    private _uVignetteRoundness;
    private _uGrainEnabled;
    private _uGrainIntensity;
    private _uTime;
    private _uBloomTexture;
    private _uBloomEnabled;
    private _uBloomIntensity;
    private _aPos;
    private readonly _isWebGL2;
    constructor(gl: WebGLRenderingContext | WebGL2RenderingContext, isWebGL2: boolean);
    private _build;
    /**
     * Blits the HDR texture to the canvas framebuffer.
     */
    execute(gl: WebGLRenderingContext | WebGL2RenderingContext, hdrTexture: WebGLTexture, group: import('./PostProcessingGroup.js').PostProcessingGroup, bloomTexture?: WebGLTexture | null): void;
    /** Releases GPU resources. */
    destroy(gl: WebGLRenderingContext | WebGL2RenderingContext): void;
}

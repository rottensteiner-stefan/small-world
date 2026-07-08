/**
 * Handles post-processing blit for WebGL1 and WebGL2.
 * Reads from the HDR framebuffer texture and writes tone-mapped,
 * gamma-corrected output to the default (canvas) framebuffer.
 */
export declare class PostProcessPassGL {
    private _prog;
    private _vao;
    private _vb;
    private _uHdrTexture;
    private _uBloomTexture;
    private _uTime;
    private _aPos;
    private readonly _isWebGL2;
    private _compiledSignature?;
    constructor(_gl: WebGLRenderingContext | WebGL2RenderingContext, isWebGL2: boolean);
    private _getSignature;
    private _build;
    /**
     * Blits the HDR texture to the canvas framebuffer.
     */
    execute(gl: WebGLRenderingContext | WebGL2RenderingContext, hdrTexture: WebGLTexture, group: import('../index.js').PostProcessingGroup, bloomTexture?: WebGLTexture | null): void;
    /** Releases GPU resources. */
    destroy(gl: WebGLRenderingContext | WebGL2RenderingContext): void;
}

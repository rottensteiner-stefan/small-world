import { BloomElement } from '../elements/index.js';
/**
 * Handles the Bloom generation (Kawase Dual Filtering) for WebGL2.
 */
export declare class BloomPassGL {
    private _gl;
    private readonly _isWebGL2;
    private _downsampleProg?;
    private _upsampleProg?;
    private _uDownTexture;
    private _uDownParams;
    private _uDownThreshold;
    private _uUpTexture;
    private _uUpParams;
    private _vao?;
    private _mipChain;
    private _width;
    private _height;
    constructor(gl: WebGLRenderingContext | WebGL2RenderingContext, isWebGL2: boolean);
    private _compileShader;
    private _build;
    private _resizeMipChain;
    /**
     * Generates the Bloom texture from the HDR input texture.
     * Returns the final bloom texture.
     */
    execute(hdrTexture: WebGLTexture, width: number, height: number, bloomConfig: BloomElement): WebGLTexture | null;
    /**
     * Destroys the programs, VAO, and mip chain framebuffers.
     */
    destroy(): void;
}

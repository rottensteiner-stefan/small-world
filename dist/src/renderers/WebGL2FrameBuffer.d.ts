/** Configuration for WebGL2FrameBuffer. */
export interface WebGL2FrameBufferOptions {
    /** Width in pixels. */
    width: number;
    /** Height in pixels. */
    height: number;
    /** Internal storage format, e.g. gl.RGBA16F for HDR. Defaults to gl.RGBA. */
    internalFormat?: number;
    /** Pixel data format, e.g. gl.RGBA. Defaults to gl.RGBA. */
    format?: number;
    /** Pixel data type, e.g. gl.HALF_FLOAT. Defaults to gl.UNSIGNED_BYTE. */
    type?: number;
}
/**
 * Encapsulates a WebGL2 Framebuffer with a color texture and depth/stencil renderbuffer.
 */
export declare class WebGL2FrameBuffer {
    private _gl;
    private readonly _framebuffer;
    private readonly _renderbuffer;
    private readonly _texture;
    private _width;
    private _height;
    private readonly _internalFormat;
    private _format;
    private _type;
    /**
     * Creates a new WebGL2FrameBuffer.
     * @param gl The WebGL2 context.
     * @param options Width, height, and optional format overrides.
     */
    constructor(gl: WebGL2RenderingContext, options: WebGL2FrameBufferOptions);
    /**
     * Binds the framebuffer for rendering.
     */
    bind(): void;
    /**
     * Unbinds the framebuffer, reverting to the default screen buffer.
     */
    unbind(): void;
    /**
     * Resizes the framebuffer.
     * @param width The new width.
     * @param height The new height.
     */
    resize(width: number, height: number): void;
    /**
     * Gets the WebGL texture associated with this framebuffer.
     */
    get texture(): WebGLTexture;
    /**
     * Destroys the framebuffer and its resources.
     */
    destroy(): void;
}

/**
 * Encapsulates a WebGL2 Framebuffer with a color texture and depth/stencil renderbuffer.
 */
export declare class WebGL2FrameBuffer {
    private _gl;
    private _framebuffer;
    private _renderbuffer;
    private _texture;
    private _width;
    private _height;
    /**
     * Creates a new WebGL2FrameBuffer.
     * @param gl The WebGL2 context.
     * @param width The width of the buffer.
     * @param height The height of the buffer.
     */
    constructor(gl: WebGL2RenderingContext, width: number, height: number);
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

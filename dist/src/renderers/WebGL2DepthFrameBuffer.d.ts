/**
 * Encapsulates a WebGL2 Framebuffer configured specifically for depth rendering (Shadow Maps).
 * It has NO color attachment and a DEPTH_COMPONENT32F texture attachment.
 */
export declare class WebGL2DepthFrameBuffer {
    private _gl;
    private _framebuffer;
    private _depthTexture;
    private _width;
    private _height;
    /**
     * Creates a new WebGL2DepthFrameBuffer.
     * @param gl The WebGL2 context.
     * @param width The width of the buffer.
     * @param height The height of the buffer.
     */
    constructor(gl: WebGL2RenderingContext, width: number, height: number);
    /**
     * Binds the framebuffer for rendering depth.
     */
    bind(): void;
    /**
     * Unbinds the framebuffer, reverting to the default screen buffer.
     */
    unbind(): void;
    /**
     * Resizes the depth framebuffer.
     * @param width The new width.
     * @param height The new height.
     */
    resize(width: number, height: number): void;
    /**
     * Gets the WebGL depth texture associated with this framebuffer.
     */
    get texture(): WebGLTexture;
    /**
     * Destroys the framebuffer and its resources.
     */
    destroy(): void;
}

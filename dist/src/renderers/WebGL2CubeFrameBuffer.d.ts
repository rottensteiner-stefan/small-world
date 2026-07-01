import { WebGL2FrameBufferOptions } from './WebGL2FrameBuffer.js';
/**
 * Encapsulates a WebGL2 Framebuffer with a cube map color texture and depth/stencil renderbuffer.
 */
export declare class WebGL2CubeFrameBuffer {
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
     * Creates a new WebGL2CubeFrameBuffer.
     * @param gl The WebGL2 context.
     * @param options Width, height, and optional format overrides.
     */
    constructor(gl: WebGL2RenderingContext, options: WebGL2FrameBufferOptions);
    get width(): number;
    get height(): number;
    /**
     * Binds a specific face of the cube map to the framebuffer for rendering.
     * @param faceIndex 0-5 for Positive X to Negative Z.
     */
    bindFace(faceIndex: number): void;
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

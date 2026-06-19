/// src/renderers/WebGL2FrameBuffer.ts
/**
 * Encapsulates a WebGL2 Framebuffer with a color texture and depth/stencil renderbuffer.
 */
export class WebGL2FrameBuffer {
    _gl;
    _framebuffer;
    _renderbuffer;
    _texture;
    _width;
    _height;
    _internalFormat;
    _format;
    _type;
    /**
     * Creates a new WebGL2FrameBuffer.
     * @param gl The WebGL2 context.
     * @param options Width, height, and optional format overrides.
     */
    constructor(gl, options) {
        this._gl = gl;
        this._width = options.width;
        this._height = options.height;
        this._internalFormat = options.internalFormat ?? gl.RGBA;
        this._format = options.format ?? gl.RGBA;
        this._type = options.type ?? gl.UNSIGNED_BYTE;
        this._framebuffer = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, this._framebuffer);
        // Color texture
        this._texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this._texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, this._internalFormat, this._width, this._height, 0, this._format, this._type, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this._texture, 0);
        // Depth and stencil renderbuffer
        this._renderbuffer = gl.createRenderbuffer();
        gl.bindRenderbuffer(gl.RENDERBUFFER, this._renderbuffer);
        gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH24_STENCIL8, this._width, this._height);
        gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_STENCIL_ATTACHMENT, gl.RENDERBUFFER, this._renderbuffer);
        const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
        if (status !== gl.FRAMEBUFFER_COMPLETE) {
            throw new Error(`[WebGL2FrameBuffer] Framebuffer is incomplete: ${status}`);
        }
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.bindRenderbuffer(gl.RENDERBUFFER, null);
        gl.bindTexture(gl.TEXTURE_2D, null);
    }
    get width() {
        return this._width;
    }
    get height() {
        return this._height;
    }
    /**
     * Binds the framebuffer for rendering.
     */
    bind() {
        this._gl.bindFramebuffer(this._gl.FRAMEBUFFER, this._framebuffer);
        this._gl.viewport(0, 0, this._width, this._height);
    }
    /**
     * Unbinds the framebuffer, reverting to the default screen buffer.
     */
    unbind() {
        this._gl.bindFramebuffer(this._gl.FRAMEBUFFER, null);
    }
    /**
     * Resizes the framebuffer.
     * @param width The new width.
     * @param height The new height.
     */
    resize(width, height) {
        this._width = width;
        this._height = height;
        this._gl.bindTexture(this._gl.TEXTURE_2D, this._texture);
        this._gl.texImage2D(this._gl.TEXTURE_2D, 0, this._internalFormat, width, height, 0, this._format, this._type, null);
        this._gl.bindTexture(this._gl.TEXTURE_2D, null);
        this._gl.bindRenderbuffer(this._gl.RENDERBUFFER, this._renderbuffer);
        this._gl.renderbufferStorage(this._gl.RENDERBUFFER, this._gl.DEPTH24_STENCIL8, width, height);
    }
    /**
     * Gets the WebGL texture associated with this framebuffer.
     */
    get texture() {
        return this._texture;
    }
    /**
     * Destroys the framebuffer and its resources.
     */
    destroy() {
        this._gl.deleteFramebuffer(this._framebuffer);
        this._gl.deleteRenderbuffer(this._renderbuffer);
        this._gl.deleteTexture(this._texture);
    }
}
//# sourceMappingURL=WebGL2FrameBuffer.js.map
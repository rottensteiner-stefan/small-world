/// src/renderers/WebGL2FrameBuffer.ts

/**
 * Encapsulates a WebGL2 Framebuffer with a color texture and depth/stencil renderbuffer.
 */
export class WebGL2FrameBuffer {
  private _gl: WebGL2RenderingContext;
  private _framebuffer: WebGLFramebuffer;
  private _renderbuffer: WebGLRenderbuffer;
  private _texture: WebGLTexture;
  private _width: number;
  private _height: number;

  /**
   * Creates a new WebGL2FrameBuffer.
   * @param gl The WebGL2 context.
   * @param width The width of the buffer.
   * @param height The height of the buffer.
   */
  constructor(gl: WebGL2RenderingContext, width: number, height: number) {
    this._gl = gl;
    this._width = width;
    this._height = height;

    this._framebuffer = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this._framebuffer);

    // Color texture
    this._texture = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, this._texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this._texture, 0);

    // Depth and stencil renderbuffer
    this._renderbuffer = gl.createRenderbuffer()!;
    gl.bindRenderbuffer(gl.RENDERBUFFER, this._renderbuffer);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH24_STENCIL8, width, height);
    gl.framebufferRenderbuffer(
      gl.FRAMEBUFFER,
      gl.DEPTH_STENCIL_ATTACHMENT,
      gl.RENDERBUFFER,
      this._renderbuffer,
    );

    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (status !== gl.FRAMEBUFFER_COMPLETE) {
      throw new Error(`[WebGL2FrameBuffer] Framebuffer is incomplete: ${status}`);
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindRenderbuffer(gl.RENDERBUFFER, null);
  }

  /**
   * Binds the framebuffer for rendering.
   */
  public bind(): void {
    this._gl.bindFramebuffer(this._gl.FRAMEBUFFER, this._framebuffer);
    this._gl.viewport(0, 0, this._width, this._height);
  }

  /**
   * Unbinds the framebuffer, reverting to the default screen buffer.
   */
  public unbind(): void {
    this._gl.bindFramebuffer(this._gl.FRAMEBUFFER, null);
  }

  /**
   * Resizes the framebuffer.
   * @param width The new width.
   * @param height The new height.
   */
  public resize(width: number, height: number): void {
    this._width = width;
    this._height = height;

    this._gl.bindTexture(this._gl.TEXTURE_2D, this._texture);
    this._gl.texImage2D(
      this._gl.TEXTURE_2D,
      0,
      this._gl.RGBA,
      width,
      height,
      0,
      this._gl.RGBA,
      this._gl.UNSIGNED_BYTE,
      null,
    );
    this._gl.bindTexture(this._gl.TEXTURE_2D, null);

    this._gl.bindRenderbuffer(this._gl.RENDERBUFFER, this._renderbuffer);
    this._gl.renderbufferStorage(this._gl.RENDERBUFFER, this._gl.DEPTH24_STENCIL8, width, height);
  }

  /**
   * Gets the WebGL texture associated with this framebuffer.
   */
  public get texture(): WebGLTexture {
    return this._texture;
  }

  /**
   * Destroys the framebuffer and its resources.
   */
  public destroy(): void {
    this._gl.deleteFramebuffer(this._framebuffer);
    this._gl.deleteRenderbuffer(this._renderbuffer);
    this._gl.deleteTexture(this._texture);
  }
}

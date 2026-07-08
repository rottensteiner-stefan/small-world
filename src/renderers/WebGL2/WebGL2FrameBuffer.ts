/// src/renderers/WebGL2/WebGL2FrameBuffer.ts

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
export class WebGL2FrameBuffer {
  private _gl: WebGL2RenderingContext;
  private readonly _framebuffer: WebGLFramebuffer;
  private readonly _renderbuffer: WebGLRenderbuffer;
  private readonly _texture: WebGLTexture;
  private _width: number;
  private _height: number;
  private readonly _internalFormat: number;
  private _format: number;
  private _type: number;

  /**
   * Creates a new WebGL2FrameBuffer.
   * @param gl The WebGL2 context.
   * @param options Width, height, and optional format overrides.
   */
  constructor(gl: WebGL2RenderingContext, options: WebGL2FrameBufferOptions) {
    this._gl = gl;
    this._width = options.width;
    this._height = options.height;
    this._internalFormat = options.internalFormat ?? gl.RGBA;
    this._format = options.format ?? gl.RGBA;
    this._type = options.type ?? gl.UNSIGNED_BYTE;

    this._framebuffer = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this._framebuffer);

    // Color texture
    this._texture = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, this._texture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      this._internalFormat,
      this._width,
      this._height,
      0,
      this._format,
      this._type,
      null,
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this._texture, 0);

    // Depth and stencil renderbuffer
    this._renderbuffer = gl.createRenderbuffer()!;
    gl.bindRenderbuffer(gl.RENDERBUFFER, this._renderbuffer);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH24_STENCIL8, this._width, this._height);
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
    gl.bindRenderbuffer(gl.RENDERBUFFER, null);
    gl.bindTexture(gl.TEXTURE_2D, null);
  }

  public get width(): number {
    return this._width;
  }

  public get height(): number {
    return this._height;
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
      this._internalFormat,
      width,
      height,
      0,
      this._format,
      this._type,
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

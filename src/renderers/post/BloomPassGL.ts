/// src/renderers/post/BloomPassGL.ts

import FULLSCREEN_VERT_GLSL from "../../core/materials/shaders/PostProcess.vert.glsl?raw";

import BLOOM_DOWNSAMPLE_FRAG_GLSL from "../../core/materials/shaders/BloomDownsample.frag.glsl?raw";
import BLOOM_UPSAMPLE_FRAG_GLSL from "../../core/materials/shaders/BloomUpsample.frag.glsl?raw";

// Note: In a complete implementation we'd also need GLSL100 versions for WebGL1 fallback,
// but for now we'll focus on WebGL2 since we're using GLSL300 syntax.
// We'll throw an error or bypass nicely in WebGL1 if the shaders don't compile.

import { WebGL2FrameBuffer } from "../WebGL2FrameBuffer.js";
import { BloomElement } from "./PostProcessingElement.js";

const MIP_CHAIN_LENGTH = 5;

/**
 * Handles the Bloom generation (Kawase Dual Filtering) for WebGL2.
 */
export class BloomPassGL {
  private _gl: WebGL2RenderingContext;
  private readonly _isWebGL2: boolean;

  private _downsampleProg?: WebGLProgram;
  private _upsampleProg?: WebGLProgram;

  private _uDownTexture: WebGLUniformLocation | null = null;
  private _uDownParams: WebGLUniformLocation | null = null;
  private _uDownThreshold: WebGLUniformLocation | null = null;

  private _uUpTexture: WebGLUniformLocation | null = null;
  private _uUpParams: WebGLUniformLocation | null = null;

  private _vao?: WebGLVertexArrayObject;

  private _mipChain: WebGL2FrameBuffer[] = [];
  private _width: number = 0;
  private _height: number = 0;

  constructor(gl: WebGLRenderingContext | WebGL2RenderingContext, isWebGL2: boolean) {
    if (!isWebGL2) {
      console.warn("[BloomPassGL] Bloom requires WebGL2 currently.");
    }
    this._gl = gl as WebGL2RenderingContext;
    this._isWebGL2 = isWebGL2;
    if (this._isWebGL2) {
      this._build();
    }
  }

  private _compileShader(type: number, src: string): WebGLShader | null {
    const gl = this._gl;
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error("[BloomPassGL] Shader Compile Error:", gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  private _build(): void {
    const gl = this._gl;

    const vert = FULLSCREEN_VERT_GLSL;

    // Build Downsample Program
    const vDown = this._compileShader(gl.VERTEX_SHADER, vert);
    const fDown = this._compileShader(gl.FRAGMENT_SHADER, BLOOM_DOWNSAMPLE_FRAG_GLSL);
    if (vDown && fDown) {
      this._downsampleProg = gl.createProgram()!;
      gl.attachShader(this._downsampleProg, vDown);
      gl.attachShader(this._downsampleProg, fDown);
      gl.linkProgram(this._downsampleProg);
      this._uDownTexture = gl.getUniformLocation(this._downsampleProg, "u_texture");
      this._uDownParams = gl.getUniformLocation(this._downsampleProg, "u_params");
      this._uDownThreshold = gl.getUniformLocation(this._downsampleProg, "u_thresholdParams");
    }

    // Build Upsample Program
    const vUp = this._compileShader(gl.VERTEX_SHADER, vert);
    const fUp = this._compileShader(gl.FRAGMENT_SHADER, BLOOM_UPSAMPLE_FRAG_GLSL);
    if (vUp && fUp) {
      this._upsampleProg = gl.createProgram()!;
      gl.attachShader(this._upsampleProg, vUp);
      gl.attachShader(this._upsampleProg, fUp);
      gl.linkProgram(this._upsampleProg);
      this._uUpTexture = gl.getUniformLocation(this._upsampleProg, "u_texture");
      this._uUpParams = gl.getUniformLocation(this._upsampleProg, "u_params");
    }

    this._vao = gl.createVertexArray()!;
  }

  private _resizeMipChain(width: number, height: number): void {
    if (this._width === width && this._height === height && this._mipChain.length > 0) {
      return;
    }

    this._width = width;
    this._height = height;

    // Clean up old
    for (const fbo of this._mipChain) {
      fbo.destroy();
    }
    this._mipChain = [];

    const gl = this._gl;
    let mipWidth = Math.floor(width / 2);
    let mipHeight = Math.floor(height / 2);

    for (let i = 0; i < MIP_CHAIN_LENGTH; i++) {
      if (mipWidth < 2 || mipHeight < 2) break;

      const fbo = new WebGL2FrameBuffer(gl, {
        width: mipWidth,
        height: mipHeight,
        internalFormat: gl.RGBA16F, // Keep HDR precision for Bloom
        format: gl.RGBA,
        type: gl.HALF_FLOAT,
      });
      this._mipChain.push(fbo);

      mipWidth = Math.floor(mipWidth / 2);
      mipHeight = Math.floor(mipHeight / 2);
    }
  }

  /**
   * Generates the Bloom texture from the HDR input texture.
   * Returns the final bloom texture.
   */
  public execute(
    hdrTexture: WebGLTexture,
    width: number,
    height: number,
    bloomConfig: BloomElement,
  ): WebGLTexture | null {
    if (!this._isWebGL2 || !this._downsampleProg || !this._upsampleProg) {
      return null;
    }

    this._resizeMipChain(width, height);
    if (this._mipChain.length === 0) return null;

    const gl = this._gl;

    // Setup state for post-processing
    gl.disable(gl.DEPTH_TEST);
    gl.depthMask(false);
    gl.disable(gl.CULL_FACE);
    gl.disable(gl.BLEND); // We just overwrite the FBOs

    gl.bindVertexArray(this._vao!);

    // --- DOWNSAMPLE ---
    gl.useProgram(this._downsampleProg);

    // Set Thresholds
    const threshold = bloomConfig.threshold;
    const knee = bloomConfig.softThreshold * threshold + 0.0001;
    gl.uniform4f(this._uDownThreshold, threshold, threshold - knee, 2.0 * knee, 0.25 / knee);

    gl.activeTexture(gl.TEXTURE0);
    gl.uniform1i(this._uDownTexture, 0);

    let currentTexture = hdrTexture;
    let isFirstPass = 1.0;

    for (let i = 0; i < this._mipChain.length; i++) {
      const fbo = this._mipChain[i]!;
      fbo.bind();
      gl.viewport(0, 0, fbo.width, fbo.height);

      gl.bindTexture(gl.TEXTURE_2D, currentTexture);

      // Texel width/height of the SOURCE texture
      const srcWidth = i === 0 ? width : this._mipChain[i - 1]!.width;
      const srcHeight = i === 0 ? height : this._mipChain[i - 1]!.height;

      gl.uniform3f(this._uDownParams, 1.0 / srcWidth, 1.0 / srcHeight, isFirstPass);

      gl.drawArrays(gl.TRIANGLES, 0, 3);

      currentTexture = fbo.texture;
      isFirstPass = 0.0;
    }

    // --- UPSAMPLE ---
    gl.useProgram(this._upsampleProg);

    // Enable additive blending for upsampling
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.blendEquation(gl.FUNC_ADD);

    gl.uniform1i(this._uUpTexture, 0);

    for (let i = this._mipChain.length - 2; i >= 0; i--) {
      const destFbo = this._mipChain[i]!;
      const srcFbo = this._mipChain[i + 1]!;

      destFbo.bind();
      gl.viewport(0, 0, destFbo.width, destFbo.height);

      gl.bindTexture(gl.TEXTURE_2D, srcFbo.texture);

      gl.uniform3f(this._uUpParams, 1.0 / srcFbo.width, 1.0 / srcFbo.height, bloomConfig.radius);

      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    // Restore state
    gl.disable(gl.BLEND);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindVertexArray(null);

    // The final bloom texture is the largest Mip FBO (index 0)
    return this._mipChain[0]!.texture;
  }
}

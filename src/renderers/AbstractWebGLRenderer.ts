/// src/renderers/AbstractWebGLRenderer.ts

import { AbstractRenderer } from "./AbstractRenderer.js";
import { Color } from "../core/index.js";
export abstract class AbstractWebGLRenderer extends AbstractRenderer {
  // WebGL2 context inherits from WebGL1 context
  protected gl!: WebGLRenderingContext | WebGL2RenderingContext;

  protected defaultTexture!: WebGLTexture;
  protected defaultNormalMap!: WebGLTexture;
  protected defaultSpecularMap!: WebGLTexture;
  protected defaultCubeTexture!: WebGLTexture;

  public override destroy(): void {
    if (this.gl) {
      const ext: WEBGL_lose_context | null = this.gl.getExtension("WEBGL_lose_context");
      if (ext) {
        ext.loseContext();
      }
    }
  }

  public setSize(w: number, h: number): void {
    const d: number = devicePixelRatio;
    this.gl.canvas.width = w * d;
    this.gl.canvas.height = h * d;

    if ("style" in this.gl.canvas) {
      this.gl.canvas.style.width = `${w}px`;
      this.gl.canvas.style.height = `${h}px`;
    }

    this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
  }

  public override setClearColor(color: Color): void {
    super.setClearColor(color);
    this.gl.clearColor(color.r, color.g, color.b, color.a);
  }

  // Compiles and links a shader program
  protected createShaderProgram(vSrc: string, fSrc: string): WebGLProgram {
    if (!this.gl) {
      throw new Error("[WebGL] Cannot create shader program, context is undefined.");
    }
    const v: WebGLShader = this.gl.createShader(this.gl.VERTEX_SHADER)!;
    this.gl.shaderSource(v, vSrc);
    this.gl.compileShader(v);

    if (!this.gl.getShaderParameter(v, this.gl.COMPILE_STATUS)) {
      console.error("[WebGL] Vertex Shader Error:", this.gl.getShaderInfoLog(v));
    }

    const f: WebGLShader = this.gl.createShader(this.gl.FRAGMENT_SHADER)!;
    this.gl.shaderSource(f, fSrc);
    this.gl.compileShader(f);

    if (!this.gl.getShaderParameter(f, this.gl.COMPILE_STATUS)) {
      console.error("[WebGL] Fragment Shader Error:", this.gl.getShaderInfoLog(f));
    }

    const p: WebGLProgram = this.gl.createProgram()!;
    this.gl.attachShader(p, v);
    this.gl.attachShader(p, f);
    this.gl.linkProgram(p);

    // Free memory
    this.gl.deleteShader(v);
    this.gl.deleteShader(f);
    return p;
  }

  // Builds the white/blue fallback textures
  protected initDefaultTextures(): void {
    if (!this.gl) {
      throw new Error("[WebGL] Cannot init default textures, context is undefined.");
    }
    this.defaultTexture = this.gl.createTexture()!;
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.defaultTexture);
    this.gl.texImage2D(
      this.gl.TEXTURE_2D,
      0,
      this.gl.RGBA,
      1,
      1,
      0,
      this.gl.RGBA,
      this.gl.UNSIGNED_BYTE,
      new Uint8Array([255, 255, 255, 255]),
    );

    this.defaultNormalMap = this.gl.createTexture()!;
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.defaultNormalMap);
    this.gl.texImage2D(
      this.gl.TEXTURE_2D,
      0,
      this.gl.RGBA,
      1,
      1,
      0,
      this.gl.RGBA,
      this.gl.UNSIGNED_BYTE,
      new Uint8Array([128, 128, 255, 255]),
    );

    this.defaultSpecularMap = this.gl.createTexture()!;
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.defaultSpecularMap);
    this.gl.texImage2D(
      this.gl.TEXTURE_2D,
      0,
      this.gl.RGBA,
      1,
      1,
      0,
      this.gl.RGBA,
      this.gl.UNSIGNED_BYTE,
      new Uint8Array([255, 255, 255, 255]),
    );

    this.defaultCubeTexture = this.gl.createTexture()!;
    this.gl.bindTexture(this.gl.TEXTURE_CUBE_MAP, this.defaultCubeTexture);
    for (let i: number = 0; 6 > i; i++) {
      this.gl.texImage2D(
        this.gl.TEXTURE_CUBE_MAP_POSITIVE_X + i,
        0,
        this.gl.RGBA,
        1,
        1,
        0,
        this.gl.RGBA,
        this.gl.UNSIGNED_BYTE,
        new Uint8Array([50, 50, 100, 255]),
      );
    }
  }
}

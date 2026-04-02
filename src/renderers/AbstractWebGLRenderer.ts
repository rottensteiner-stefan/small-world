/// src/renderers/AbstractWebGLRenderer.ts

import { AbstractRenderer } from "./AbstractRenderer.js";
import { Color } from "../core/index.js";
export abstract class AbstractWebGLRenderer extends AbstractRenderer {
  // WebGL2 context erbt von WebGL1 context
  protected gl!: WebGLRenderingContext | WebGL2RenderingContext;

  protected defaultTexture!: WebGLTexture;
  protected defaultCubeTexture!: WebGLTexture;

  public override destroy(): void {
    if (this.gl) {
      const ext = this.gl.getExtension("WEBGL_lose_context");
      if (ext) {
        ext.loseContext();
      }
    }
  }

  public setSize(w: number, h: number): void {
    const d = devicePixelRatio;
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

  // Kompiliert und verlinkt einen Shader
  protected createShaderProgram(vSrc: string, fSrc: string): WebGLProgram {
    if (!this.gl) {
      throw new Error("[WebGL] Cannot create shader program, context is null.");
    }
    const v = this.gl.createShader(this.gl.VERTEX_SHADER)!;
    this.gl.shaderSource(v, vSrc);
    this.gl.compileShader(v);

    if (!this.gl.getShaderParameter(v, this.gl.COMPILE_STATUS)) {
      console.error("[WebGL] Vertex Shader Fehler:", this.gl.getShaderInfoLog(v));
    }

    const f = this.gl.createShader(this.gl.FRAGMENT_SHADER)!;
    this.gl.shaderSource(f, fSrc);
    this.gl.compileShader(f);

    if (!this.gl.getShaderParameter(f, this.gl.COMPILE_STATUS)) {
      console.error("[WebGL] Fragment Shader Fehler:", this.gl.getShaderInfoLog(f));
    }

    const p = this.gl.createProgram()!;
    this.gl.attachShader(p, v);
    this.gl.attachShader(p, f);
    this.gl.linkProgram(p);

    // RAM sparen
    this.gl.deleteShader(v);
    this.gl.deleteShader(f);
    return p;
  }

  // Baut die weißen/blauen Fallback-Texturen
  protected initDefaultTextures(): void {
    if (!this.gl) {
      throw new Error("[WebGL] Cannot init default textures, context is null.");
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

    this.defaultCubeTexture = this.gl.createTexture()!;
    this.gl.bindTexture(this.gl.TEXTURE_CUBE_MAP, this.defaultCubeTexture);
    for (let i = 0; i < 6; i++) {
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

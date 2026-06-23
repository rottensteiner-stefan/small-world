/// src/renderers/post/PostProcessPassGL.ts

import { PostProcessingEffectType } from "../../enums/index.js";
import { ShaderRegistry } from "../../core/renderers/shaders/ShaderRegistry.js";

import FULLSCREEN_VERT_GLSL from "../../core/materials/shaders/PostProcess.vert.glsl?raw";
import POST_PROCESS_FRAG_GLSL from "../../core/materials/shaders/PostProcess.frag.glsl?raw";

import FULLSCREEN_VERT_GLSL100 from "../../core/materials/shaders/PostProcess100.vert.glsl?raw";
import POST_PROCESS_FRAG_GLSL100 from "../../core/materials/shaders/PostProcess100.frag.glsl?raw";

/**
 * Handles post-processing blit for WebGL1 and WebGL2.
 * Reads from the HDR framebuffer texture and writes tone-mapped,
 * gamma-corrected output to the default (canvas) framebuffer.
 */
export class PostProcessPassGL {
  private _prog?: WebGLProgram;
  private _vao?: WebGLVertexArrayObject;
  private _vb?: WebGLBuffer;
  private _uHdrTexture: WebGLUniformLocation | null = null;
  private _uExposure: WebGLUniformLocation | null = null;
  private _uGamma: WebGLUniformLocation | null = null;
  private _uToneMappingMode: WebGLUniformLocation | null = null;
  private _uVignetteEnabled: WebGLUniformLocation | null = null;
  private _uVignetteOffset: WebGLUniformLocation | null = null;
  private _uVignetteDarkness: WebGLUniformLocation | null = null;
  private _uVignetteRoundness: WebGLUniformLocation | null = null;
  private _uGrainEnabled: WebGLUniformLocation | null = null;
  private _uGrainIntensity: WebGLUniformLocation | null = null;
  private _uTime: WebGLUniformLocation | null = null;
  private _uFilterMode: WebGLUniformLocation | null = null;

  // Bloom
  private _uBloomTexture: WebGLUniformLocation | null = null;
  private _uBloomEnabled: WebGLUniformLocation | null = null;
  private _uBloomIntensity: WebGLUniformLocation | null = null;
  private _uBloomColor: WebGLUniformLocation | null = null;

  private _aPos: number = -1;
  private readonly _isWebGL2: boolean;

  constructor(gl: WebGLRenderingContext | WebGL2RenderingContext, isWebGL2: boolean) {
    this._isWebGL2 = isWebGL2;
    this._build(gl);
  }

  private _build(gl: WebGLRenderingContext | WebGL2RenderingContext): void {
    const vert = this._isWebGL2 ? FULLSCREEN_VERT_GLSL : FULLSCREEN_VERT_GLSL100;
    const rawFrag = this._isWebGL2 ? POST_PROCESS_FRAG_GLSL : POST_PROCESS_FRAG_GLSL100;
    const frag = this._isWebGL2 ? ShaderRegistry.instance.assemble(rawFrag, "glsl300") : rawFrag;

    const v = gl.createShader(gl.VERTEX_SHADER)!;
    gl.shaderSource(v, vert);
    gl.compileShader(v);
    if (!gl.getShaderParameter(v, gl.COMPILE_STATUS)) {
      console.error("[PostProcessPassGL] Vertex Shader:", gl.getShaderInfoLog(v));
    }

    const f = gl.createShader(gl.FRAGMENT_SHADER)!;
    gl.shaderSource(f, frag);
    gl.compileShader(f);
    if (!gl.getShaderParameter(f, gl.COMPILE_STATUS)) {
      console.error("[PostProcessPassGL] Fragment Shader:", gl.getShaderInfoLog(f));
    }

    const p = gl.createProgram()!;
    gl.attachShader(p, v);
    gl.attachShader(p, f);
    gl.linkProgram(p);
    gl.deleteShader(v);
    gl.deleteShader(f);

    this._prog = p;
    this._uHdrTexture = gl.getUniformLocation(p, "u_hdrTexture");
    this._uExposure = gl.getUniformLocation(p, "u_exposure");
    this._uGamma = gl.getUniformLocation(p, "u_inverseGamma");
    this._uToneMappingMode = gl.getUniformLocation(p, "u_toneMappingMode");
    this._uVignetteEnabled = gl.getUniformLocation(p, "u_vignetteEnabled");
    this._uVignetteOffset = gl.getUniformLocation(p, "u_vignetteOffset");
    this._uVignetteDarkness = gl.getUniformLocation(p, "u_vignetteDarkness");
    this._uVignetteRoundness = gl.getUniformLocation(p, "u_vignetteRoundness");
    this._uGrainEnabled = gl.getUniformLocation(p, "u_grainEnabled");
    this._uGrainIntensity = gl.getUniformLocation(p, "u_grainIntensity");
    this._uTime = gl.getUniformLocation(p, "u_time");
    this._uFilterMode = gl.getUniformLocation(p, "u_filterMode");

    this._uBloomTexture = gl.getUniformLocation(p, "u_bloomTexture");
    this._uBloomEnabled = gl.getUniformLocation(p, "u_bloomEnabled");
    this._uBloomIntensity = gl.getUniformLocation(p, "u_bloomIntensity");
    this._uBloomColor = gl.getUniformLocation(p, "u_bloomColor");

    if (this._isWebGL2) {
      const gl2 = gl as WebGL2RenderingContext;
      this._vao = gl2.createVertexArray()!;
      // No geometry needed: fullscreen triangle driven by gl_VertexID in WebGL2
    } else {
      // WebGL1 needs a VBO with 3 clip-space positions
      this._aPos = gl.getAttribLocation(p, "a_pos");
      this._vb = gl.createBuffer()!;
      gl.bindBuffer(gl.ARRAY_BUFFER, this._vb);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER, null);
    }
  }

  /**
   * Blits the HDR texture to the canvas framebuffer.
   */
  public execute(
    gl: WebGLRenderingContext | WebGL2RenderingContext,
    hdrTexture: WebGLTexture,
    group: import("./PostProcessingGroup.js").PostProcessingGroup,
    bloomTexture: WebGLTexture | null = null,
  ): void {
    if (!this._prog) return;

    gl.useProgram(this._prog);

    // Disable depth testing and writing
    gl.disable(gl.DEPTH_TEST);
    gl.depthMask(false);
    gl.disable(gl.CULL_FACE);
    gl.disable(gl.BLEND);

    // HDR texture
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, hdrTexture);
    gl.uniform1i(this._uHdrTexture, 0);

    // Bloom
    if (
      bloomTexture &&
      group.get<import("./PostProcessingElement.js").BloomElement>(PostProcessingEffectType.BLOOM)
        ?.enabled
    ) {
      const bloom = group.get<import("./PostProcessingElement.js").BloomElement>(
        PostProcessingEffectType.BLOOM,
      )!;
      gl.uniform1i(this._uBloomEnabled, 1);
      gl.uniform1f(this._uBloomIntensity, bloom.intensity);
      if (this._uBloomColor !== null) {
        gl.uniform3f(this._uBloomColor, bloom.color.r, bloom.color.g, bloom.color.b);
      }
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, bloomTexture);
      gl.uniform1i(this._uBloomTexture, 1);
    } else {
      gl.uniform1i(this._uBloomEnabled, 0);
    }

    // Blit to the default (canvas) framebuffer
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    const tm = group.get<import("./PostProcessingElement.js").ToneMappingElement>(
      PostProcessingEffectType.TONE_MAPPING,
    );
    const vig = group.get<import("../post/PostProcessingElement.js").VignetteElement>(
      PostProcessingEffectType.VIGNETTE,
    );
    const grain = group.get<import("../post/PostProcessingElement.js").GrainElement>(
      PostProcessingEffectType.GRAIN,
    );

    if (this._uHdrTexture !== null) gl.uniform1i(this._uHdrTexture, 0);
    if (this._uExposure !== null)
      gl.uniform1f(this._uExposure, tm && tm.enabled ? tm.exposure : 1.0);
    if (this._uGamma !== null) gl.uniform1f(this._uGamma, tm && tm.enabled ? 1.0 / tm.gamma : 1.0);
    if (this._uToneMappingMode !== null)
      gl.uniform1i(this._uToneMappingMode, tm && tm.enabled ? tm.mode : 0);
    if (this._uVignetteEnabled !== null)
      gl.uniform1i(this._uVignetteEnabled, vig && vig.enabled ? 1 : 0);

    if (vig && vig.enabled) {
      if (this._uVignetteOffset) gl.uniform1f(this._uVignetteOffset, vig.offset);
      if (this._uVignetteDarkness) gl.uniform1f(this._uVignetteDarkness, vig.darkness);
      if (this._uVignetteRoundness) gl.uniform1f(this._uVignetteRoundness, vig.roundness);
    } else {
      if (this._uVignetteEnabled) gl.uniform1i(this._uVignetteEnabled, 0);
    }

    if (this._uGrainEnabled !== null)
      gl.uniform1i(this._uGrainEnabled, grain && grain.enabled ? 1 : 0);
    if (grain && grain.enabled) {
      if (this._uGrainIntensity) gl.uniform1f(this._uGrainIntensity, grain.intensity);
    }
    if (this._uTime !== null) gl.uniform1f(this._uTime, (performance.now() % 100000) / 1000.0);
    if (this._uFilterMode !== null) gl.uniform1i(this._uFilterMode, group.filterMode);

    if (this._isWebGL2) {
      const gl2 = gl as WebGL2RenderingContext;
      gl2.bindVertexArray(this._vao!);
      gl2.drawArrays(gl2.TRIANGLES, 0, 3);
      gl2.bindVertexArray(null);
    } else {
      gl.bindBuffer(gl.ARRAY_BUFFER, this._vb!);
      gl.enableVertexAttribArray(this._aPos);
      gl.vertexAttribPointer(this._aPos, 2, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.disableVertexAttribArray(this._aPos);
      gl.bindBuffer(gl.ARRAY_BUFFER, null);
    }

    // Restore state
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.useProgram(null);
  }

  /** Releases GPU resources. */
  public destroy(gl: WebGLRenderingContext | WebGL2RenderingContext): void {
    if (this._prog) gl.deleteProgram(this._prog);
    if (this._vb) gl.deleteBuffer(this._vb);
    if (this._isWebGL2 && this._vao) {
      (gl as WebGL2RenderingContext).deleteVertexArray(this._vao);
    }
  }
}

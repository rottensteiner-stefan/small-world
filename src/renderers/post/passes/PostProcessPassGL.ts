import FULLSCREEN_VERT_GLSL from "../../../core/materials/shaders/PostProcess.vert.glsl?raw";
import POST_PROCESS_FRAG_GLSL from "../../../core/materials/shaders/PostProcess.frag.glsl?raw";

import FULLSCREEN_VERT_GLSL100 from "../../../core/materials/shaders/PostProcess100.vert.glsl?raw";
import POST_PROCESS_FRAG_GLSL100 from "../../../core/materials/shaders/PostProcess100.frag.glsl?raw";
import { PostProcessingEffectType } from "../../../enums/index.js";
import { ShaderRegistry } from "../../../core/renderers/shaders/index.js";

/**
 * Handles post-processing blit for WebGL1 and WebGL2.
 * Reads from the HDR framebuffer texture and writes tone-mapped,
 * gamma-corrected output to the default (canvas) framebuffer.
 */
export class PostProcessPassGL {
  private _prog: WebGLProgram | undefined = undefined;
  private _vao: WebGLVertexArrayObject | undefined = undefined;
  private _vb: WebGLBuffer | undefined = undefined;
  private _uHdrTexture: WebGLUniformLocation | null = null;
  private _uBloomTexture: WebGLUniformLocation | null = null;
  private _uHbaoTexture: WebGLUniformLocation | null = null;
  private _uTime: WebGLUniformLocation | null = null;

  private _uBloomIntensity: WebGLUniformLocation | null = null;
  private _uBloomColor: WebGLUniformLocation | null = null;
  private _uExposure: WebGLUniformLocation | null = null;
  private _uGamma: WebGLUniformLocation | null = null;
  private _uInverseGamma: WebGLUniformLocation | null = null;
  private _uVignetteOffset: WebGLUniformLocation | null = null;
  private _uVignetteDarkness: WebGLUniformLocation | null = null;
  private _uVignetteRoundness: WebGLUniformLocation | null = null;
  private _uGrainIntensity: WebGLUniformLocation | null = null;
  private _uQuantizeSteps: WebGLUniformLocation | null = null;
  private _uOutlineThickness: WebGLUniformLocation | null = null;
  private _uOutlineSensitivity: WebGLUniformLocation | null = null;
  private _uOutlineColor: WebGLUniformLocation | null = null;

  private _aPos: number = -1;
  private readonly _isWebGL2: boolean;
  private _compiledSignature?: string;

  constructor(_gl: WebGLRenderingContext | WebGL2RenderingContext, isWebGL2: boolean) {
    this._isWebGL2 = isWebGL2;
  }

  private _getSignature(group: import("../index.js").PostProcessingGroup): string {
    const tm = group.get<import("../index.js").ToneMappingElement>(
      PostProcessingEffectType.TONE_MAPPING,
    );
    const vig = group.get<import("../index.js").VignetteElement>(PostProcessingEffectType.VIGNETTE);
    const grain = group.get<import("../index.js").GrainElement>(PostProcessingEffectType.GRAIN);
    const bloom = group.get<import("../index.js").BloomElement>(PostProcessingEffectType.BLOOM);
    const quant = group.get<import("../index.js").QuantizeElement>(
      PostProcessingEffectType.QUANTIZE,
    );
    const hbao = group.get<import("../index.js").HbaoElement>(PostProcessingEffectType.HBAO);
    const outline = group.get<import("../index.js").OutlineElement>(
      PostProcessingEffectType.OUTLINE,
    );

    // Only structural flags/modes trigger a shader rebuild (matching WebGPU).
    // Continuous tuning values (exposure, gamma, vignette darkness/offset, grain intensity,
    // bloom intensity/color, quantize steps, outline thickness/color) are set via uniforms per frame.
    return [
      group.filterMode,
      tm && tm.enabled ? 1 : 0,
      tm && tm.enabled ? tm.mode : 0,
      vig && vig.enabled ? 1 : 0,
      grain && grain.enabled ? 1 : 0,
      bloom && bloom.enabled ? 1 : 0,
      quant && quant.enabled ? 1 : 0,
      hbao && hbao.enabled ? 1 : 0,
      outline && outline.enabled ? 1 : 0,
    ].join("|");
  }

  private _build(
    gl: WebGLRenderingContext | WebGL2RenderingContext,
    group: import("../index.js").PostProcessingGroup,
  ): void {
    if (this._prog) {
      gl.deleteProgram(this._prog);
      this._prog = undefined;
    }
    if (this._vb) {
      gl.deleteBuffer(this._vb);
      this._vb = undefined;
    }
    if (this._isWebGL2 && this._vao) {
      (gl as WebGL2RenderingContext).deleteVertexArray(this._vao);
      this._vao = undefined;
    }

    const vert = this._isWebGL2 ? FULLSCREEN_VERT_GLSL : FULLSCREEN_VERT_GLSL100;
    const rawFrag = this._isWebGL2 ? POST_PROCESS_FRAG_GLSL : POST_PROCESS_FRAG_GLSL100;
    let frag = this._isWebGL2 ? ShaderRegistry.instance.assemble(rawFrag, "glsl300") : rawFrag;

    const tm = group.get<import("../index.js").ToneMappingElement>(
      PostProcessingEffectType.TONE_MAPPING,
    );
    const vig = group.get<import("../index.js").VignetteElement>(PostProcessingEffectType.VIGNETTE);
    const grain = group.get<import("../index.js").GrainElement>(PostProcessingEffectType.GRAIN);
    const bloom = group.get<import("../index.js").BloomElement>(PostProcessingEffectType.BLOOM);
    const quant = group.get<import("../index.js").QuantizeElement>(
      PostProcessingEffectType.QUANTIZE,
    );
    const hbao = group.get<import("../index.js").HbaoElement>(PostProcessingEffectType.HBAO);
    const outline = group.get<import("../index.js").OutlineElement>(
      PostProcessingEffectType.OUTLINE,
    );

    const tmEnabled = tm && tm.enabled;
    const vigEnabled = vig && vig.enabled;
    const grainEnabled = grain && grain.enabled;
    const bloomEnabled = bloom && bloom.enabled;
    const quantEnabled = quant && quant.enabled;
    const hbaoEnabled = hbao && hbao.enabled;
    const outlineEnabled = outline && outline.enabled;

    // Inject ONLY structural feature flags as compile-time macros
    frag = frag.replace(
      "uniform int u_bloomEnabled;",
      `#define u_bloomEnabled ${bloomEnabled ? 1 : 0}`,
    );
    frag = frag.replace(
      "uniform int u_toneMappingMode;",
      `#define u_toneMappingMode ${tmEnabled ? tm.mode : 0}`,
    );
    frag = frag.replace(
      "uniform int u_vignetteEnabled;",
      `#define u_vignetteEnabled ${vigEnabled ? 1 : 0}`,
    );
    frag = frag.replace(
      "uniform int u_grainEnabled;",
      `#define u_grainEnabled ${grainEnabled ? 1 : 0}`,
    );
    frag = frag.replace(
      "uniform int u_quantizeEnabled;",
      `#define u_quantizeEnabled ${quantEnabled ? 1 : 0}`,
    );
    frag = frag.replace(
      "uniform int u_hbaoEnabled;",
      `#define u_hbaoEnabled ${hbaoEnabled ? 1 : 0}`,
    );
    frag = frag.replace(
      "uniform int u_outlineEnabled;",
      `#define u_outlineEnabled ${outlineEnabled ? 1 : 0}`,
    );
    frag = frag.replace("uniform int u_filterMode;", `#define u_filterMode ${group.filterMode}`);

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
    this._uBloomTexture = gl.getUniformLocation(p, "u_bloomTexture");
    this._uHbaoTexture = gl.getUniformLocation(p, "u_hbaoTexture");
    this._uTime = gl.getUniformLocation(p, "u_time");

    this._uBloomIntensity = gl.getUniformLocation(p, "u_bloomIntensity");
    this._uBloomColor = gl.getUniformLocation(p, "u_bloomColor");
    this._uExposure = gl.getUniformLocation(p, "u_exposure");
    this._uGamma = gl.getUniformLocation(p, "u_gamma");
    this._uInverseGamma = gl.getUniformLocation(p, "u_inverseGamma");
    this._uVignetteOffset = gl.getUniformLocation(p, "u_vignetteOffset");
    this._uVignetteDarkness = gl.getUniformLocation(p, "u_vignetteDarkness");
    this._uVignetteRoundness = gl.getUniformLocation(p, "u_vignetteRoundness");
    this._uGrainIntensity = gl.getUniformLocation(p, "u_grainIntensity");
    this._uQuantizeSteps = gl.getUniformLocation(p, "u_quantizeSteps");
    this._uOutlineThickness = gl.getUniformLocation(p, "u_outlineThickness");
    this._uOutlineSensitivity = gl.getUniformLocation(p, "u_outlineSensitivity");
    this._uOutlineColor = gl.getUniformLocation(p, "u_outlineColor");

    if (this._isWebGL2) {
      const gl2 = gl as WebGL2RenderingContext;
      this._vao = gl2.createVertexArray()!;
    } else {
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
    group: import("../index.js").PostProcessingGroup,
    bloomTexture: WebGLTexture | null = null,
    hbaoTexture: WebGLTexture | null = null,
  ): void {
    const sig = this._getSignature(group);
    if (!this._prog || sig !== this._compiledSignature) {
      this._build(gl, group);
      this._compiledSignature = sig;
    }

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
    const bloom = group.get<import("../index.js").BloomElement>(PostProcessingEffectType.BLOOM);
    if (bloom && bloom.enabled && bloomTexture) {
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, bloomTexture);
      gl.uniform1i(this._uBloomTexture, 1);
    }

    // HBAO
    const hbao = group.get<import("../index.js").HbaoElement>(PostProcessingEffectType.HBAO);
    if (hbao && hbao.enabled && hbaoTexture) {
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, hbaoTexture);
      gl.uniform1i(this._uHbaoTexture, 2);
    }

    // Continuous Uniform Updates
    const tm = group.get<import("../index.js").ToneMappingElement>(
      PostProcessingEffectType.TONE_MAPPING,
    );
    const vig = group.get<import("../index.js").VignetteElement>(PostProcessingEffectType.VIGNETTE);
    const grain = group.get<import("../index.js").GrainElement>(PostProcessingEffectType.GRAIN);
    const quant = group.get<import("../index.js").QuantizeElement>(
      PostProcessingEffectType.QUANTIZE,
    );
    const outline = group.get<import("../index.js").OutlineElement>(
      PostProcessingEffectType.OUTLINE,
    );

    if (this._uBloomIntensity) gl.uniform1f(this._uBloomIntensity, bloom ? bloom.intensity : 0.0);
    if (this._uBloomColor) {
      if (bloom) gl.uniform3f(this._uBloomColor, bloom.color.r, bloom.color.g, bloom.color.b);
      else gl.uniform3f(this._uBloomColor, 1.0, 1.0, 1.0);
    }
    if (this._uExposure) gl.uniform1f(this._uExposure, tm && tm.enabled ? tm.exposure : 1.0);
    if (this._uGamma) gl.uniform1f(this._uGamma, tm && tm.enabled ? tm.gamma : 2.2);
    if (this._uInverseGamma) {
      gl.uniform1f(this._uInverseGamma, tm && tm.enabled ? 1.0 / tm.gamma : 1.0);
    }
    if (this._uVignetteOffset) gl.uniform1f(this._uVignetteOffset, vig ? vig.offset : 0.8);
    if (this._uVignetteDarkness) gl.uniform1f(this._uVignetteDarkness, vig ? vig.darkness : 0.5);
    if (this._uVignetteRoundness) gl.uniform1f(this._uVignetteRoundness, vig ? vig.roundness : 2.0);
    if (this._uGrainIntensity) gl.uniform1f(this._uGrainIntensity, grain ? grain.intensity : 0.05);
    if (this._uQuantizeSteps) gl.uniform1f(this._uQuantizeSteps, quant ? quant.steps : 8.0);
    if (this._uOutlineThickness) {
      gl.uniform1f(this._uOutlineThickness, outline ? outline.thickness : 1.0);
    }
    if (this._uOutlineSensitivity) {
      gl.uniform1f(this._uOutlineSensitivity, outline ? outline.sensitivity : 1.0);
    }
    if (this._uOutlineColor) {
      if (outline)
        gl.uniform3f(this._uOutlineColor, outline.color.r, outline.color.g, outline.color.b);
      else gl.uniform3f(this._uOutlineColor, 0.0, 0.0, 0.0);
    }

    // Blit to the default (canvas) framebuffer
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    if (this._uTime !== null) {
      gl.uniform1f(this._uTime, (performance.now() % 100000) / 1000.0);
    }

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

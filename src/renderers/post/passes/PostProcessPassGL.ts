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
  private _uTime: WebGLUniformLocation | null = null;

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

    return [
      group.filterMode,
      tm && tm.enabled ? 1 : 0,
      tm && tm.enabled ? tm.mode : 0,
      tm && tm.enabled ? tm.exposure : 1.0,
      tm && tm.enabled ? tm.gamma : 2.2,
      vig && vig.enabled ? 1 : 0,
      vig && vig.enabled ? vig.offset : 0.8,
      vig && vig.enabled ? vig.darkness : 0.5,
      vig && vig.enabled ? vig.roundness : 2.0,
      grain && grain.enabled ? 1 : 0,
      grain && grain.enabled ? grain.intensity : 0.05,
      bloom && bloom.enabled ? 1 : 0,
      bloom && bloom.enabled ? bloom.intensity : 1.0,
      bloom && bloom.enabled ? `${bloom.color.r},${bloom.color.g},${bloom.color.b}` : "1,1,1",
      quant && quant.enabled ? 1 : 0,
      quant && quant.enabled ? quant.steps : 8.0,
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

    const tmEnabled = tm && tm.enabled;
    const vigEnabled = vig && vig.enabled;
    const grainEnabled = grain && grain.enabled;
    const bloomEnabled = bloom && bloom.enabled;
    const quantEnabled = quant && quant.enabled;

    // Inject static parameters as macros, replacing uniform declarations
    frag = frag.replace(
      "uniform int u_bloomEnabled;",
      `#define u_bloomEnabled ${bloomEnabled ? 1 : 0}`,
    );
    frag = frag.replace(
      "uniform float u_bloomIntensity;",
      `#define u_bloomIntensity ${bloom ? bloom.intensity.toFixed(6) : "0.0"}`,
    );
    frag = frag.replace(
      "uniform vec3 u_bloomColor;",
      `#define u_bloomColor vec3(${bloom ? `${bloom.color.r.toFixed(6)}, ${bloom.color.g.toFixed(6)}, ${bloom.color.b.toFixed(6)}` : "1.0, 1.0, 1.0"})`,
    );
    frag = frag.replace(
      "uniform float u_exposure;",
      `#define u_exposure ${tmEnabled ? tm.exposure.toFixed(6) : "1.0"}`,
    );
    frag = frag.replace(
      "uniform float u_gamma;",
      `#define u_gamma ${tmEnabled ? tm.gamma.toFixed(6) : "2.2"}`,
    );
    frag = frag.replace(
      "uniform float u_inverseGamma;",
      `#define u_inverseGamma ${tmEnabled ? (1.0 / tm.gamma).toFixed(6) : "1.0"}`,
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
      "uniform float u_vignetteOffset;",
      `#define u_vignetteOffset ${vig ? vig.offset.toFixed(6) : "0.8"}`,
    );
    frag = frag.replace(
      "uniform float u_vignetteDarkness;",
      `#define u_vignetteDarkness ${vig ? vig.darkness.toFixed(6) : "0.5"}`,
    );
    frag = frag.replace(
      "uniform float u_vignetteRoundness;",
      `#define u_vignetteRoundness ${vig ? vig.roundness.toFixed(6) : "2.0"}`,
    );
    frag = frag.replace(
      "uniform int u_grainEnabled;",
      `#define u_grainEnabled ${grainEnabled ? 1 : 0}`,
    );
    frag = frag.replace(
      "uniform float u_grainIntensity;",
      `#define u_grainIntensity ${grain ? grain.intensity.toFixed(6) : "0.05"}`,
    );
    frag = frag.replace(
      "uniform int u_quantizeEnabled;",
      `#define u_quantizeEnabled ${quantEnabled ? 1 : 0}`,
    );
    frag = frag.replace(
      "uniform float u_quantizeSteps;",
      `#define u_quantizeSteps ${quant ? quant.steps.toFixed(6) : "8.0"}`,
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
    this._uTime = gl.getUniformLocation(p, "u_time");

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

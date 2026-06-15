/// src/renderers/post/PostProcessPassGL.ts

// language=GLSL
const FULLSCREEN_VERT_GLSL = /* glsl */ `#version 300 es
precision mediump float;

out vec2 v_uv;

void main() {
    // Generate a fullscreen triangle from gl_VertexID (no VBO required)
    float x = float((gl_VertexID << 1) & 2) * 2.0 - 1.0;
    float y = float(gl_VertexID & 2) * 2.0 - 1.0;
    v_uv = vec2(x * 0.5 + 0.5, y * 0.5 + 0.5);
    gl_Position = vec4(x, y, 0.0, 1.0);
}
`;

// language=GLSL
const POST_PROCESS_FRAG_GLSL = /* glsl */ `#version 300 es
precision mediump float;

in vec2 v_uv;
out vec4 fragColor;

uniform sampler2D u_hdrTexture;
uniform float u_exposure;
uniform float u_gamma;
uniform int u_toneMappingMode;
uniform int u_vignetteEnabled;
uniform float u_vignetteOffset;
uniform float u_vignetteDarkness;
uniform float u_vignetteRoundness;
uniform int u_grainEnabled;
uniform float u_grainIntensity;
uniform float u_time;

// Random noise
float random(vec2 st) {
    vec3 p3  = fract(vec3(st.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

// Reinhard tone mapping
vec3 toneMapReinhard(vec3 hdr, float exposure) {
    vec3 mapped = hdr * exposure;
    return mapped / (mapped + vec3(1.0));
}

// Cineon tone mapping
vec3 toneMapCineon(vec3 hdr, float exposure) {
    vec3 mapped = max(vec3(0.0), hdr * exposure - vec3(0.004));
    return (mapped * (6.2 * mapped + vec3(0.5))) / (mapped * (6.2 * mapped + vec3(1.7)) + vec3(0.06));
}

// ACES Filmic tone mapping
vec3 toneMapACESFilmic(vec3 hdr, float exposure) {
    vec3 mapped = hdr * exposure;
    float a = 2.51;
    float b = 0.03;
    float c = 2.43;
    float d = 0.59;
    float e = 0.14;
    return clamp((mapped * (a * mapped + b)) / (mapped * (c * mapped + d) + e), 0.0, 1.0);
}

// Linear -> sRGB gamma correction
vec3 linearToSRGB(vec3 linear, float gamma) {
    return pow(clamp(linear, 0.0, 1.0), vec3(1.0 / gamma));
}

void main() {
    // Flip Y: WebGL FBO is stored bottom-up, screen is top-down
    vec2 uv = vec2(v_uv.x, 1.0 - v_uv.y);
    vec3 hdr = texture(u_hdrTexture, uv).rgb;
    
    vec3 tonemapped = hdr * u_exposure;
    if (u_toneMappingMode == 1) {
        tonemapped = toneMapReinhard(hdr, u_exposure);
    } else if (u_toneMappingMode == 2) {
        tonemapped = toneMapCineon(hdr, u_exposure);
    } else if (u_toneMappingMode == 3) {
        tonemapped = toneMapACESFilmic(hdr, u_exposure);
    }

    vec3 srgb = linearToSRGB(tonemapped, u_gamma);

    // Apply Vignette
    if (u_vignetteEnabled == 1) {
        vec2 d_uv = abs(uv - vec2(0.5)) * 2.0;
        float d = pow(pow(d_uv.x, u_vignetteRoundness) + pow(d_uv.y, u_vignetteRoundness), 1.0 / u_vignetteRoundness);
        float d_old_scale = d * 0.5;
        float innerRadius = u_vignetteOffset * 0.5;
        float vignette = 1.0 - smoothstep(innerRadius, u_vignetteOffset, d_old_scale);
        srgb *= mix(1.0, vignette, clamp(u_vignetteDarkness, 0.0, 1.0));
    }

    // Apply Film Grain
    if (u_grainEnabled == 1) {
        // We don't have dims directly in WebGL unless passed, but we can just use uv with a large multiplier
        // gl_FragCoord.xy works well for screen pixel coordinates
        float noise = random(gl_FragCoord.xy + vec2(u_time, -u_time));
        float grain = (noise - 0.5) * u_grainIntensity;
        srgb += vec3(grain);
    }

    fragColor = vec4(srgb, 1.0);
}
`;

// language=GLSL
const FULLSCREEN_VERT_GLSL100 = /* glsl */ `
attribute vec2 a_pos;
varying vec2 v_uv;

void main() {
    v_uv = a_pos * 0.5 + 0.5;
    gl_Position = vec4(a_pos, 0.0, 1.0);
}
`;

// language=GLSL
const POST_PROCESS_FRAG_GLSL100 = /* glsl */ `
precision mediump float;

varying vec2 v_uv;
uniform sampler2D u_hdrTexture;
uniform float u_exposure;
uniform float u_inverseGamma;
uniform int u_toneMappingMode;
uniform int u_vignetteEnabled;
uniform float u_vignetteOffset;
uniform float u_vignetteDarkness;

vec3 toneMapReinhard(vec3 hdr, float exposure) {
    vec3 mapped = hdr * exposure;
    return mapped / (mapped + vec3(1.0));
}

vec3 toneMapCineon(vec3 hdr, float exposure) {
    vec3 mapped = max(vec3(0.0), hdr * exposure - vec3(0.004));
    return (mapped * (6.2 * mapped + vec3(0.5))) / (mapped * (6.2 * mapped + vec3(1.7)) + vec3(0.06));
}

vec3 toneMapACESFilmic(vec3 hdr, float exposure) {
    vec3 mapped = hdr * exposure;
    float a = 2.51;
    float b = 0.03;
    float c = 2.43;
    float d = 0.59;
    float e = 0.14;
    return clamp((mapped * (a * mapped + b)) / (mapped * (c * mapped + d) + e), 0.0, 1.0);
}

vec3 linearToSRGB(vec3 linear, float invGamma) {
    return pow(clamp(linear, 0.0, 1.0), vec3(invGamma));
}

void main() {
    // Flip Y: WebGL FBO is stored bottom-up, screen is top-down
    vec2 uv = vec2(v_uv.x, 1.0 - v_uv.y);
    vec3 hdr = texture2D(u_hdrTexture, uv).rgb;

    vec3 tonemapped = hdr * u_exposure;
    if (u_toneMappingMode == 1) {
        tonemapped = toneMapReinhard(hdr, u_exposure);
    } else if (u_toneMappingMode == 2) {
        tonemapped = toneMapCineon(hdr, u_exposure);
    } else if (u_toneMappingMode == 3) {
        tonemapped = toneMapACESFilmic(hdr, u_exposure);
    }

    vec3 srgb = linearToSRGB(tonemapped, u_inverseGamma);

    // Apply Vignette
    if (u_vignetteEnabled == 1) {
        float d = distance(uv, vec2(0.5));
        float v_edge0 = u_vignetteOffset - u_vignetteDarkness;
        float vignette = 1.0 - smoothstep(v_edge0, u_vignetteOffset, d);
        srgb *= mix(1.0, vignette, clamp(u_vignetteDarkness, 0.0, 1.0));
    }

    gl_FragColor = vec4(srgb, 1.0);
}
`;

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
  private _aPos: number = -1;
  private readonly _isWebGL2: boolean;

  constructor(gl: WebGLRenderingContext | WebGL2RenderingContext, isWebGL2: boolean) {
    this._isWebGL2 = isWebGL2;
    this._build(gl);
  }

  private _build(gl: WebGLRenderingContext | WebGL2RenderingContext): void {
    const vert = this._isWebGL2 ? FULLSCREEN_VERT_GLSL : FULLSCREEN_VERT_GLSL100;
    const frag = this._isWebGL2 ? POST_PROCESS_FRAG_GLSL : POST_PROCESS_FRAG_GLSL100;

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
  ): void {
    if (!this._prog) return;

    // Blit to the default (canvas) framebuffer
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);

    gl.useProgram(this._prog);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, hdrTexture);

    const tm = group.get<import("./PostProcessingElement.js").ToneMappingElement>("ToneMapping");
    const vig = group.get<import("../post/PostProcessingElement.js").VignetteElement>("Vignette");
    const grain = group.get<import("../post/PostProcessingElement.js").GrainElement>("Grain");

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

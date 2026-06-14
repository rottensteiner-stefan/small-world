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

// Reinhard tone mapping
vec3 toneMapReinhard(vec3 hdr, float exposure) {
    vec3 mapped = hdr * exposure;
    return mapped / (mapped + vec3(1.0));
}

// Linear -> sRGB gamma correction
vec3 linearToSRGB(vec3 linear, float gamma) {
    return pow(clamp(linear, 0.0, 1.0), vec3(1.0 / gamma));
}

void main() {
    // Flip Y: WebGL FBO is stored bottom-up, screen is top-down
    vec2 uv = vec2(v_uv.x, 1.0 - v_uv.y);
    vec3 hdr = texture(u_hdrTexture, uv).rgb;
    vec3 tonemapped = toneMapReinhard(hdr, u_exposure);
    vec3 srgb = linearToSRGB(tonemapped, u_gamma);
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
uniform float u_gamma;

vec3 toneMapReinhard(vec3 hdr, float exposure) {
    vec3 mapped = hdr * exposure;
    return mapped / (mapped + vec3(1.0));
}

vec3 linearToSRGB(vec3 linear, float gamma) {
    return pow(clamp(linear, 0.0, 1.0), vec3(1.0 / gamma));
}

void main() {
    // Flip Y: WebGL FBO is stored bottom-up, screen is top-down
    vec2 uv = vec2(v_uv.x, 1.0 - v_uv.y);
    vec3 hdr = texture2D(u_hdrTexture, uv).rgb;
    vec3 tonemapped = toneMapReinhard(hdr, u_exposure);
    vec3 srgb = linearToSRGB(tonemapped, u_gamma);
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
    this._uGamma = gl.getUniformLocation(p, "u_gamma");

    if (this._isWebGL2) {
      const gl2 = gl as WebGL2RenderingContext;
      this._vao = gl2.createVertexArray()!;
      // No geometry needed: fullscreen triangle driven by gl_VertexID in WebGL2
    } else {
      // WebGL1 needs a VBO with 3 clip-space positions
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
    exposure: number,
    gamma: number,
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
    if (this._uHdrTexture !== null) gl.uniform1i(this._uHdrTexture, 0);
    if (this._uExposure !== null) gl.uniform1f(this._uExposure, exposure);
    if (this._uGamma !== null) gl.uniform1f(this._uGamma, gamma);

    if (this._isWebGL2) {
      const gl2 = gl as WebGL2RenderingContext;
      gl2.bindVertexArray(this._vao!);
      gl2.drawArrays(gl2.TRIANGLES, 0, 3);
      gl2.bindVertexArray(null);
    } else {
      const posLoc = gl.getAttribLocation(this._prog, "a_pos");
      gl.bindBuffer(gl.ARRAY_BUFFER, this._vb!);
      gl.enableVertexAttribArray(posLoc);
      gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.disableVertexAttribArray(posLoc);
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

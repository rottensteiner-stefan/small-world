/// src/core/materials/importers/GLSLSandboxImporter.ts
import { ShaderImporter } from "./ShaderImporter.js";
import { CustomShaderMaterialOptions } from "../CustomShaderMaterial.js";
import { ShaderPropertyType } from "../../../enums/index.js";

/**
 * Importer for GLSLSandbox (GLSL).
 * Maps `uniform float time;` and `uniform vec2 resolution;` correctly.
 */
export class GLSLSandboxImporter implements ShaderImporter {
  public parse(sourceCode: string): CustomShaderMaterialOptions {
    const vsGLSL300 = `#version 300 es
layout(location = 0) in vec3 a_position;
layout(location = 1) in vec2 a_uv;

uniform mat4 u_model;
uniform mat4 u_viewProjection;

out vec2 v_uv;

void main() {
    v_uv = a_uv;
    gl_Position = u_viewProjection * u_model * vec4(a_position, 1.0);
}`;

    const fsGLSL300 = `#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 fragColor; // We replace gl_FragColor with fragColor for WebGL2

uniform vec2 resolution;
uniform float time;
uniform vec2 mouse;

// In WebGL2, we don't have gl_FragColor built-in.
// We provide a macro so that legacy GLSLSandbox code using gl_FragColor writes to fragColor instead.
#define gl_FragColor fragColor
// Also replace v_uv with gl_FragCoord equivalent for sandbox compatibility
vec2 gl_FragCoord_alias = v_uv * resolution;
#define gl_FragCoord vec4(gl_FragCoord_alias.x, gl_FragCoord_alias.y, 0.0, 1.0)

// --- GLSLSANDBOX SOURCE START ---
${sourceCode}
// --- GLSLSANDBOX SOURCE END ---
`;

    return {
      sources: {
        glsl300: { vs: vsGLSL300, fs: fsGLSL300 },
      },
      layout: {
        uniforms: {
          u_model: { type: ShaderPropertyType.MAT4 },
          u_viewProjection: { type: ShaderPropertyType.MAT4 },
          resolution: { type: ShaderPropertyType.VEC2 },
          time: { type: ShaderPropertyType.FLOAT },
          mouse: { type: ShaderPropertyType.VEC2 },
        },
        uniformLayout: ["u_model", "u_viewProjection", "resolution", "time", "mouse"],
        textures: {},
      },
      properties: {
        u_model: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
        u_viewProjection: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
        resolution: [800, 600],
        time: 0.0,
        mouse: [0, 0],
      },
    };
  }
}

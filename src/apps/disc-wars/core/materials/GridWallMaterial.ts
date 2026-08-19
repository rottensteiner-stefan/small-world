import { CustomShaderMaterial } from "../../../../core/materials/CustomShaderMaterial.js";
import { ShaderPropertyType } from "../../../../enums/index.js";

/** Neon-Virus grid line shader — flat emissive panels with pulsing grid seams.
 *  No PBR: depth + emissive only, keeping the flat-stylized aesthetic.
 *  u_impactTime: set to engine time on a Disc wall-hit, drives the shockwave ring. */
export class GridWallMaterial extends CustomShaderMaterial {
  constructor(
    gridColor: [number, number, number] = [0.224, 1.0, 0.078], // #39FF14
    baseColor: [number, number, number] = [0.102, 0.102, 0.18], // #1A1A2E
    lineThickness: number = 0.03,
  ) {
    super({
      sources: {
        glsl300: {
          vs: /* glsl */ `#version 300 es
precision highp float;

in vec3 position;
in vec2 uv;

uniform mat4 u_modelMatrix;
uniform mat4 u_viewMatrix;
uniform mat4 u_projectionMatrix;

out vec2 v_uv;

void main() {
  v_uv = uv;
  gl_Position = u_projectionMatrix * u_viewMatrix * u_modelMatrix * vec4(position, 1.0);
}`,
          fs: /* glsl */ `#version 300 es
precision highp float;

in vec2 v_uv;

uniform vec3 u_gridColor;
uniform vec3 u_baseColor;
uniform float u_lineThickness;
uniform float u_time;
uniform float u_impactTime;
uniform vec2 u_impactUV;

out vec4 fragColor;

void main() {
  vec2 grid = abs(fract(v_uv * 4.0) - 0.5);
  float line = step(0.5 - u_lineThickness, max(grid.x, grid.y));

  // Shockwave ring expanding from last impact point.
  float impactAge = u_time - u_impactTime;
  float ring = 0.0;
  if (impactAge < 1.2) {
    float dist = length(v_uv - u_impactUV);
    float radius = impactAge * 0.6;
    float ringWidth = 0.04;
    ring = smoothstep(ringWidth, 0.0, abs(dist - radius)) * (1.0 - impactAge / 1.2);
  }

  float emissiveBoost = 1.0 + ring * 3.0;
  vec3 color = mix(u_baseColor, u_gridColor * emissiveBoost, line + ring);
  fragColor = vec4(color, 1.0);
}`,
        },
      },
      layout: {
        uniforms: {
          u_gridColor: { type: ShaderPropertyType.VEC3 },
          u_baseColor: { type: ShaderPropertyType.VEC3 },
          u_lineThickness: { type: ShaderPropertyType.FLOAT },
          u_time: { type: ShaderPropertyType.FLOAT },
          u_impactTime: { type: ShaderPropertyType.FLOAT },
          u_impactUV: { type: ShaderPropertyType.VEC2 },
        },
        uniformLayout: [
          "u_gridColor",
          "u_baseColor",
          "u_lineThickness",
          "u_time",
          "u_impactTime",
          "u_impactUV",
        ],
      },
      properties: {
        u_gridColor: gridColor,
        u_baseColor: baseColor,
        u_lineThickness: lineThickness,
        u_time: 0.0,
        u_impactTime: -9999.0,
        u_impactUV: [0.0, 0.0],
      },
    });
  }

  public setTime(t: number): void {
    this.properties["u_time"] = t;
  }

  public triggerImpact(t: number, uv: [number, number]): void {
    this.properties["u_impactTime"] = t;
    this.properties["u_impactUV"] = uv;
  }
}

import { CustomShaderMaterial } from "../../../../core/materials/CustomShaderMaterial.js";
import { StandardWebGPULayout } from "../../../../core/renderers/shaders/index.js";

/** Neon-Virus grid line shader — flat emissive panels with pulsing grid seams.
 *  No PBR: depth + emissive only, keeping the flat-stylized aesthetic.
 *  Reuses the engine's standard vertex pipeline (model/view/projection) and
 *  ObjectUniforms slots (u_color, u_specColor, u_extraParams) instead of
 *  hand-rolled uniforms, so it renders correctly on WebGL1/WebGL2/WebGPU alike.
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
          vs: "[BASE_VERTEX_HEADER][BASE_VERTEX_MAIN]",
          fs: /* glsl */ `[BASE_FRAGMENT_HEADER]

uniform float u_time;

void main() {
  vec3 gridCol = u_color.rgb;
  vec3 baseCol = u_specColor.rgb;
  float thickness = u_extraParams.x;
  float impactTime = u_extraParams.y;
  vec2 impactUV = u_extraParams.zw;

  vec2 grid = abs(fract(v_uv * 4.0) - 0.5);
  float line = step(0.5 - thickness, max(grid.x, grid.y));

  // Shockwave ring expanding from last impact point.
  float impactAge = u_time - impactTime;
  float ring = 0.0;
  if (impactAge < 1.2) {
    float dist = length(v_uv - impactUV);
    float radius = impactAge * 0.6;
    float ringWidth = 0.04;
    ring = smoothstep(ringWidth, 0.0, abs(dist - radius)) * (1.0 - impactAge / 1.2);
  }

  float emissiveBoost = 1.0 + ring * 3.0;
  vec3 color = mix(baseCol, gridCol * emissiveBoost, line + ring);
  fragColor = vec4(color, 1.0);
}`,
        },
        glsl100: {
          vs: "[BASE_VS]",
          fs: /* glsl */ `[BASE_FS_HEADER]

uniform float u_time;

void main() {
  vec3 gridCol = u_color.rgb;
  vec3 baseCol = u_specColor.rgb;
  float thickness = u_extraParams.x;
  float impactTime = u_extraParams.y;
  vec2 impactUV = u_extraParams.zw;

  vec2 grid = abs(fract(v_uv * 4.0) - 0.5);
  float line = step(0.5 - thickness, max(grid.x, grid.y));

  float impactAge = u_time - impactTime;
  float ring = 0.0;
  if (impactAge < 1.2) {
    float dist = length(v_uv - impactUV);
    float radius = impactAge * 0.6;
    float ringWidth = 0.04;
    ring = smoothstep(ringWidth, 0.0, abs(dist - radius)) * (1.0 - impactAge / 1.2);
  }

  float emissiveBoost = 1.0 + ring * 3.0;
  vec3 color = mix(baseCol, gridCol * emissiveBoost, line + ring);
  gl_FragColor = vec4(color, 1.0);
}`,
        },
        wgsl: /* wgsl */ `[WGSL_STRUCTS]
[WGSL_VS]

@fragment fn fs(i: Out) -> @location(0) vec4f {
  let gridCol = obj.color.rgb;
  let baseCol = obj.specColor.rgb;
  let thickness = obj.extraParams.x;
  let impactTime = obj.extraParams.y;
  let impactUV = obj.extraParams.zw;

  let grid = abs(fract(i.uv * 4.0) - 0.5);
  let line = step(0.5 - thickness, max(grid.x, grid.y));

  let impactAge = obj.time - impactTime;
  var ring = 0.0;
  if (impactAge < 1.2) {
    let dist = length(i.uv - impactUV);
    let radius = impactAge * 0.6;
    let ringWidth = 0.04;
    ring = smoothstep(ringWidth, 0.0, abs(dist - radius)) * (1.0 - impactAge / 1.2);
  }

  let emissiveBoost = 1.0 + ring * 3.0;
  let color = mix(baseCol, gridCol * emissiveBoost, line + ring);
  return vec4f(color, 1.0);
}`,
      },
      layout: {
        ...StandardWebGPULayout,
        textures: {},
      },
      properties: {
        u_color: [gridColor[0], gridColor[1], gridColor[2], 1.0],
        u_specColor: [baseColor[0], baseColor[1], baseColor[2], 1.0],
        u_extraParams: [lineThickness, -9999.0, 0.0, 0.0],
        u_time: 0.0,
      },
    });
  }

  public setTime(t: number): void {
    this.properties["u_time"] = t;
  }

  public triggerImpact(t: number, uv: [number, number]): void {
    const extra = this.properties["u_extraParams"] as number[];
    extra[1] = t;
    extra[2] = uv[0];
    extra[3] = uv[1];
  }
}

/// src/core/materials/LavaMaterial.ts

import { AbstractMaterial } from "./AbstractMaterial.js";
import { Color } from "../colors/index.js";
import { MaterialType, ShaderPropertyType } from "../../enums/index.js";
import { Texture } from "../textures/index.js";
import { RenderManifest } from "../renderers/shaders/RenderManifest.js";
import { ShaderDefinition } from "../renderers/shaders/ShaderDefinition.js";

/**
 * Configuration options for LavaMaterial.
 */
export interface LavaMaterialOptions {
  /** The base glow color of the lava. Defaults to bright orange/yellow. */
  color?: Color;
  /** The color of the cooled crust. Defaults to dark grey. */
  crustColor?: Color;
  /** The speed of the lava flow animation. Defaults to 1.0. */
  flowSpeed?: number;
  /** The scale of the noise. Defaults to 2.0. */
  noiseScale?: number;
  /** A noise texture map used to generate the crust and flow. */
  noiseMap?: Texture | undefined;
}

/**
 * A highly specialized material for rendering animated, glowing lava.
 * Requires a noise map to generate the flowing crust effect on the GPU.
 */
export class LavaMaterial extends AbstractMaterial {
  /** @inheritdoc */
  public override readonly type: MaterialType = MaterialType.LAVA;

  /** The color of the cooled crust. */
  public crustColor: Color;
  /** The speed of the lava flow. */
  public flowSpeed: number;
  /** The scale of the noise pattern. */
  public noiseScale: number;
  /** The current time/frame for animation. */
  public time: number = 0.0;
  /** The noise texture. */
  public noiseMap: Texture | undefined;

  /**
   * Creates a new LavaMaterial.
   * @param options The configuration options.
   */
  constructor(options: LavaMaterialOptions = {}) {
    super();
    const {
      color = new Color(1.5, 0.5, 0.0), // Over-bright for pseudo-bloom
      crustColor = new Color(0.1, 0.1, 0.1),
      flowSpeed = 1.0,
      noiseScale = 2.0,
      noiseMap = undefined,
    } = options;
    
    this.color = color;
    this.crustColor = crustColor;
    this.flowSpeed = flowSpeed;
    this.noiseScale = noiseScale;
    this.noiseMap = noiseMap;
  }

  /** @inheritdoc */
  public override getRenderManifest(): RenderManifest {
    if (undefined === this._renderManifest) {
      this._renderManifest = {
        shaderId: this.type,
        properties: {
          u_color: this.color.toFloat32Array(),
          u_specColor: this.crustColor.toFloat32Array(), // Alias for crustColor in UBO
          u_time: this.time,
          u_flowSpeed: this.flowSpeed,
          u_noiseScale: this.noiseScale,
        },
        textures: {
          u_diffuseMap: this.noiseMap, // Base generic slot
        },
      };
    }

    const props = this._renderManifest.properties as Record<string, unknown>;
    const texs = this._renderManifest.textures as Record<string, unknown>;

    props["u_color"] = this.color.toFloat32Array();
    props["u_specColor"] = this.crustColor.toFloat32Array();
    props["u_time"] = this.time;
    props["u_flowSpeed"] = this.flowSpeed;
    props["u_noiseScale"] = this.noiseScale;

    texs["u_diffuseMap"] = this.noiseMap;

    this._renderManifest.state = {
      ...this._renderManifest.state,
      culling: this.cullMode,
    };

    return this._renderManifest;
  }

  /** @inheritdoc */
  public override getShaderDefinition(): ShaderDefinition {
    return {
      id: this.type,
      sources: {
        glsl300: {
          vs: `#version 300 es
in vec3 a_position;
in vec2 a_uv;
in vec3 a_normal;
uniform mat4 u_vp;
uniform mat4 u_model;
uniform float u_time;
uniform float u_flowSpeed;
out vec2 v_uv;
out vec3 v_worldPos;
void main() {
    v_uv = a_uv;
    vec3 pos = a_position;
    float displacementSpeed = u_time * u_flowSpeed * 0.5;
    pos.y += sin(pos.x * 5.0 + displacementSpeed) * cos(pos.z * 5.0 + displacementSpeed) * 0.15;
    vec4 worldPos = u_model * vec4(pos, 1.0);
    v_worldPos = worldPos.xyz;
    gl_Position = u_vp * worldPos;
}`,
          fs: `#version 300 es
precision highp float;
in vec2 v_uv;
in vec3 v_worldPos;
uniform vec4 u_color;
uniform vec4 u_specColor; // Used as crustColor
uniform float u_time;
uniform float u_flowSpeed;
uniform float u_noiseScale;
uniform sampler2D u_diffuseMap; // Used as noiseMap
out vec4 FragColor;
void main() {
    vec2 uv = v_uv * u_noiseScale;
    vec2 uv1 = uv + vec2(u_time * 0.05, u_time * 0.02) * u_flowSpeed;
    vec2 uv2 = uv + vec2(-u_time * 0.03, u_time * 0.04) * u_flowSpeed;
    float n1 = texture(u_diffuseMap, uv1).r;
    float n2 = texture(u_diffuseMap, uv2).r;
    float noise = (n1 + n2) * 0.5;
    noise += sin(v_worldPos.x * 2.0 + u_time) * 0.1;
    float blend = smoothstep(0.6, 0.8, noise);
    vec3 glow = u_color.rgb * (1.0 - smoothstep(0.0, 0.6, noise)) * 1.5;
    vec3 finalColor = mix(glow, u_specColor.rgb, blend);
    FragColor = vec4(finalColor, 1.0);
}`,
        },
        glsl100: {
          vs: `
attribute vec3 a_position;
attribute vec2 a_uv;
attribute vec3 a_normal;
uniform mat4 u_vp;
uniform mat4 u_model;
uniform float u_time;
uniform float u_flowSpeed;
varying vec2 v_uv;
varying vec3 v_worldPos;
void main() {
    v_uv = a_uv;
    vec3 pos = a_position;
    float displacementSpeed = u_time * u_flowSpeed * 0.5;
    pos.y += sin(pos.x * 5.0 + displacementSpeed) * cos(pos.z * 5.0 + displacementSpeed) * 0.15;
    vec4 worldPos = u_model * vec4(pos, 1.0);
    v_worldPos = worldPos.xyz;
    gl_Position = u_vp * worldPos;
}`,
          fs: `
precision highp float;
varying vec2 v_uv;
varying vec3 v_worldPos;
uniform vec4 u_color;
uniform vec4 u_specColor;
uniform float u_time;
uniform float u_flowSpeed;
uniform float u_noiseScale;
uniform sampler2D u_diffuseMap;
void main() {
    vec2 uv = v_uv * u_noiseScale;
    vec2 uv1 = uv + vec2(u_time * 0.05, u_time * 0.02) * u_flowSpeed;
    vec2 uv2 = uv + vec2(-u_time * 0.03, u_time * 0.04) * u_flowSpeed;
    float n1 = texture2D(u_diffuseMap, uv1).r;
    float n2 = texture2D(u_diffuseMap, uv2).r;
    float noise = (n1 + n2) * 0.5;
    noise += sin(v_worldPos.x * 2.0 + u_time) * 0.1;
    float blend = smoothstep(0.6, 0.8, noise);
    vec3 glow = u_color.rgb * (1.0 - smoothstep(0.0, 0.6, noise)) * 1.5;
    vec3 finalColor = mix(glow, u_specColor.rgb, blend);
    gl_FragColor = vec4(finalColor, 1.0);
}`,
        },
        wgsl: `[WGSL_STRUCTS]
struct VertexIn {
    @location(0) position: vec3<f32>,
    @location(1) normal: vec3<f32>,
    @location(2) uv: vec2<f32>,
};
struct VertexOut {
    @builtin(position) pos: vec4<f32>,
    @location(0) uv: vec2<f32>,
    @location(1) worldPos: vec3<f32>,
};
@vertex fn vs(in: VertexIn) -> VertexOut {
    var out: VertexOut;
    out.uv = in.uv;
    var p = in.position;
    let time = obj.extraParams.y;
    let flowSpeed = obj.extraParams.z;
    let displacementSpeed = time * flowSpeed * 0.5;
    p.y += sin(p.x * 5.0 + displacementSpeed) * cos(p.z * 5.0 + displacementSpeed) * 0.15;
    let worldPos = obj.model * vec4<f32>(p, 1.0);
    out.worldPos = worldPos.xyz;
    out.pos = global.vp * worldPos;
    return out;
}
@fragment fn fs(in: VertexOut) -> @location(0) vec4<f32> {
    let time = obj.extraParams.y;
    let flowSpeed = obj.extraParams.z;
    let noiseScale = obj.extraParams.w;
    let uv = in.uv * noiseScale;
    let uv1 = uv + vec2<f32>(time * 0.05, time * 0.02) * flowSpeed;
    let uv2 = uv + vec2<f32>(-time * 0.03, time * 0.04) * flowSpeed;
    let n1 = textureSample(u_diffuseMap, s, uv1).r;
    let n2 = textureSample(u_diffuseMap, s, uv2).r;
    var noise = (n1 + n2) * 0.5;
    noise += sin(in.worldPos.x * 2.0 + time) * 0.1;
    let blend = smoothstep(0.6, 0.8, noise);
    let glow = obj.color.rgb * (1.0 - smoothstep(0.0, 0.6, noise)) * 1.5;
    let crust = obj.specColor.rgb; 
    let finalColor = mix(glow, crust, blend);
    return vec4<f32>(finalColor, 1.0);
}`,
      },
      layout: {
        uniforms: {
          u_color: { type: ShaderPropertyType.COLOR },
          u_specColor: { type: ShaderPropertyType.COLOR },
          u_time: { type: ShaderPropertyType.FLOAT },
          u_flowSpeed: { type: ShaderPropertyType.FLOAT },
          u_noiseScale: { type: ShaderPropertyType.FLOAT },
        },
        textures: { u_diffuseMap: { type: ShaderPropertyType.TEXTURE } },
      },
    };
  }
}

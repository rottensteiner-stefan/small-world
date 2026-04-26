/// src/core/materials/FluidMaterial.ts

import { AbstractMaterial } from "./AbstractMaterial.js";
import { Color } from "../colors/index.js";
import { BlendingMode, MaterialType, ShaderPropertyType } from "../../enums/index.js";
import { RenderManifest } from "../renderers/shaders/RenderManifest.js";
import { ShaderDefinition } from "../renderers/shaders/ShaderDefinition.js";

/**
 * Material for rendering fluid particles.
 */
export class FluidMaterial extends AbstractMaterial {
  /** The color of the particles. */
  public particleColor: Color;
  /** The size of the particles in pixels (for point rendering). */
  public particleSize: number;

  constructor(color: Color = new Color(0.3, 0.5, 0.9, 0.8), size: number = 5.0) {
    super(MaterialType.FLUID);
    this.particleColor = color;
    this.particleSize = size;
  }

  /** @inheritdoc */
  public override getRenderManifest(): RenderManifest {
    if (undefined === this._renderManifest) {
      this._renderManifest = {
        shaderId: this.type,
        properties: {
          u_color: this.particleColor.toFloat32Array(),
          u_particleSize: this.particleSize,
        },
        textures: {},
        state: {
          culling: "none",
          blending: BlendingMode.ALPHA,
          depthWrite: true
        }
      };
    }
    return this._renderManifest!;
  }

  /** @inheritdoc */
  public override getShaderDefinition(): ShaderDefinition {
    return {
      id: this.type,
      sources: {
        wgsl: `
struct GlobalUniforms {
  viewProjection: mat4x4<f32>,
  cameraPosition: vec4<f32>,
};

struct ObjectUniforms {
  modelMatrix: mat4x4<f32>,
  color: vec4<f32>,
  particleSize: f32,
};

@group(0) @binding(0) var<uniform> global: GlobalUniforms;
@group(1) @binding(0) var<uniform> obj: ObjectUniforms;

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) color: vec4<f32>,
};

@vertex
fn vs(@location(0) pos: vec4<f32>) -> VertexOutput {
  var out: VertexOutput;
  out.position = global.viewProjection * obj.modelMatrix * vec4<f32>(pos.xyz, 1.0);
  out.color = obj.color;
  return out;
}

@fragment
fn fs(in: VertexOutput) -> @location(0) vec4<f32> {
  return in.color;
}
        `,
        glsl300: {
          vs: "#version 300 es\nvoid main() {}",
          fs: "#version 300 es\nvoid main() {}"
        }
      },
      layout: {
        uniforms: {
          u_color: { type: ShaderPropertyType.COLOR },
          u_particleSize: { type: ShaderPropertyType.FLOAT },
        },
        textures: {},
      },
    };
  }
}

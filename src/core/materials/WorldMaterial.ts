/// src/core/materials/WorldMaterial.ts

import { AbstractMaterial } from "./AbstractMaterial.js";
import { MaterialType, ShaderPropertyType } from "../../enums/index.js";
import { Color } from "../../core/index.js";
import { Texture } from "../textures/index.js";
import { RenderManifest } from "../renderers/shaders/RenderManifest.js";
import { ShaderDefinition } from "../renderers/shaders/ShaderDefinition.js";

export type WorldMaterialOptions = {
  color?: Color;
  diffuseMap?: Texture;
};

/**
 * A material that uses triplanar mapping to render seamless textures across world space coordinates.
 * Ideal for terrain, rocks, walls, and architectural structures.
 */
export class WorldMaterial extends AbstractMaterial {
  /** @inheritdoc */
  public override readonly type: MaterialType = MaterialType.WORLD;

  /** The diffuse texture map. */
  public diffuseMap: Texture | undefined;

  constructor(options?: WorldMaterialOptions) {
    super();
    if (options) {
      if (options.color) {
        this.color.copyFrom(options.color);
      }
      this.diffuseMap = options.diffuseMap;
    }
  }

  /** @inheritdoc */
  public override getRenderManifest(): RenderManifest {
    if (undefined === this._renderManifest) {
      this._renderManifest = {
        shaderId: this.type,
        properties: {
          u_color: this.color.toFloat32Array(),
          u_texRepeat: [1, 1],
        },
        textures: {
          u_diffuseMap: this.diffuseMap,
        },
      };
    }

    const props = this._renderManifest.properties as Record<string, unknown>;
    const texs = this._renderManifest.textures as Record<string, unknown>;

    props["u_color"] = this.color.toFloat32Array();

    if (this.diffuseMap) {
      (props["u_texRepeat"] as number[])[0] = this.diffuseMap.repeat.x;
      (props["u_texRepeat"] as number[])[1] = this.diffuseMap.repeat.y;
    } else {
      (props["u_texRepeat"] as number[])[0] = 1;
      (props["u_texRepeat"] as number[])[1] = 1;
    }

    texs["u_diffuseMap"] = this.diffuseMap;

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
          vs: "[BASE_VERTEX_HEADER][BASE_VERTEX_MAIN]",
          fs: `[BASE_FRAGMENT_HEADER]
uniform vec2 u_texRepeat;
void main() {
  vec3 blendWeights = abs(v_normal);
  blendWeights = pow(blendWeights, vec3(4.0));
  blendWeights /= (blendWeights.x + blendWeights.y + blendWeights.z);
  vec2 coordX = v_worldPos.zy * u_texRepeat;
  vec2 coordY = v_worldPos.xz * u_texRepeat;
  vec2 coordZ = v_worldPos.xy * u_texRepeat;
  if (v_normal.x < 0.0) coordX.x = -coordX.x;
  if (v_normal.y < 0.0) coordY.x = -coordY.x;
  if (v_normal.z >= 0.0) coordZ.x = -coordZ.x;
  vec4 colX = texture(u_diffuseMap, coordX);
  vec4 colY = texture(u_diffuseMap, coordY);
  vec4 colZ = texture(u_diffuseMap, coordZ);
  vec4 finalTexColor = colX * blendWeights.x + colY * blendWeights.y + colZ * blendWeights.z;
  fragColor = u_color * finalTexColor;
}`,
        },
        glsl100: {
          vs: "[BASE_VS]",
          fs: `[BASE_FS_HEADER]
uniform vec2 u_texRepeat;
void main() {
  vec3 blendWeights = abs(v_normal);
  blendWeights = max(blendWeights - 0.2, 0.0);
  blendWeights /= (blendWeights.x + blendWeights.y + blendWeights.z);
  vec2 coordX = v_worldPos.zy * u_texRepeat;
  vec2 coordY = v_worldPos.xz * u_texRepeat;
  vec2 coordZ = v_worldPos.xy * u_texRepeat;
  if (v_normal.x < 0.0) coordX.x = -coordX.x;
  if (v_normal.y < 0.0) coordY.x = -coordY.x;
  if (v_normal.z >= 0.0) coordZ.x = -coordZ.x;
  vec4 colX = texture2D(u_diffuseMap, coordX);
  vec4 colY = texture2D(u_diffuseMap, coordY);
  vec4 colZ = texture2D(u_diffuseMap, coordZ);
  vec4 finalTexColor = colX * blendWeights.x + colY * blendWeights.y + colZ * blendWeights.z;
  gl_FragColor = u_color * finalTexColor;
}`,
        },
        wgsl: `[WGSL_STRUCTS]
[WGSL_VS]
@fragment fn fs(i: VertexOut) -> @location(0) vec4f {
  var blendWeights = abs(i.worldNormal);
  blendWeights = pow(blendWeights, vec3f(4.0));
  let totalWeight = blendWeights.x + blendWeights.y + blendWeights.z;
  blendWeights = blendWeights / totalWeight;
  var coordX = i.worldPos.zy * obj.texRepeat;
  var coordY = i.worldPos.xz * obj.texRepeat;
  var coordZ = i.worldPos.xy * obj.texRepeat;
  if (i.worldNormal.x < 0.0) { coordX.x = -coordX.x; }
  if (i.worldNormal.y < 0.0) { coordY.x = -coordY.x; }
  if (i.worldNormal.z >= 0.0) { coordZ.x = -coordZ.x; }
  let colX = textureSample(u_diffuseMap, s, coordX);
  let colY = textureSample(u_diffuseMap, s, coordY);
  let colZ = textureSample(u_diffuseMap, s, coordZ);
  let finalTexColor = colX * blendWeights.x + colY * blendWeights.y + colZ * blendWeights.z;
  return obj.color * finalTexColor;
}`,
      },
      layout: {
        uniforms: {
          u_color: { type: ShaderPropertyType.COLOR },
          u_texRepeat: { type: ShaderPropertyType.VEC2 },
        },
        textures: { u_diffuseMap: { type: ShaderPropertyType.TEXTURE } },
      },
    };
  }
}

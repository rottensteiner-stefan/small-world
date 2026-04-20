import { AbstractMaterial } from "./AbstractMaterial.js";
import { MaterialType, ShaderPropertyType } from "../../enums/index.js";
import { Color } from "../colors/index.js";
import { Texture } from "../textures/index.js";
import { RenderManifest } from "../renderers/shaders/RenderManifest.js";
import { ShaderDefinition } from "../renderers/shaders/ShaderDefinition.js";

/**
 * Configuration options for Lambert material.
 */
export interface LambertMaterialOptions {
  /** The base color of the material. Defaults to white. */
  color?: Color;
  /** The diffuse texture map. Defaults to undefined. */
  diffuseMap?: Texture | undefined;
  /** The normal texture map. Defaults to undefined. */
  normalMap?: Texture | undefined;
}

/**
 * A material that uses the Lambertian reflectance model.
 */
export class LambertMaterial extends AbstractMaterial {
  /** The diffuse texture map. */
  public diffuseMap: Texture | undefined;
  /** The normal texture map. */
  public normalMap: Texture | undefined;

  constructor(options: LambertMaterialOptions = {}) {
    super(MaterialType.LAMBERT);
    const { color = Color.WHITE, diffuseMap = undefined, normalMap = undefined } = options;
    this.color = color;
    this.diffuseMap = diffuseMap;
    this.normalMap = normalMap;
  }

  /** @inheritdoc */
  public override getRenderManifest(): RenderManifest {
    if (undefined === this._renderManifest) {
      this._renderManifest = {
        shaderId: this.type,
        properties: {
          u_color: this.color.toFloat32Array(),
          u_texOffset: [0, 0],
          u_texRepeat: [1, 1],
        },
        textures: {
          u_diffuseMap: this.diffuseMap,
          u_normalMap: this.normalMap,
        },
      };
    }

    const props = this._renderManifest.properties as Record<string, unknown>;
    const texs = this._renderManifest.textures as Record<string, unknown>;

    props["u_color"] = this.color.toFloat32Array();

    if (this.diffuseMap) {
      (props["u_texOffset"] as number[])[0] = this.diffuseMap.offset.x;
      (props["u_texOffset"] as number[])[1] = this.diffuseMap.offset.y;
      (props["u_texRepeat"] as number[])[0] = this.diffuseMap.repeat.x;
      (props["u_texRepeat"] as number[])[1] = this.diffuseMap.repeat.y;
    } else {
      (props["u_texOffset"] as number[])[0] = 0;
      (props["u_texOffset"] as number[])[1] = 0;
      (props["u_texRepeat"] as number[])[0] = 1;
      (props["u_texRepeat"] as number[])[1] = 1;
    }

    texs["u_diffuseMap"] = this.diffuseMap;
    texs["u_normalMap"] = this.normalMap;

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
[LIGHT_DEFS]

void main() {
  vec4 texColor = texture(u_diffuseMap, v_uv);

  vec3 normalMap = texture(u_normalMap, v_uv).rgb;
  normalMap = normalize(normalMap * 2.0 - 1.0);
  vec3 N = normalize(v_tbn * normalMap);

  [LIGHT_CALC]
  fragColor = vec4(finalLight * u_color.rgb * texColor.rgb, u_color.a * texColor.a);
}`,
        },
        glsl100: {
          vs: "[BASE_VS]",
          fs: `[BASE_FS_HEADER]
[LIGHT_DEFS]

void main() {
  vec4 texColor = texture2D(u_diffuseMap, v_uv);
  float specMap = texture2D(u_specularMap, v_uv).r;

  vec3 normalMap = texture2D(u_normalMap, v_uv).rgb;
  vec3 N;
  if (normalMap.b > 0.9 && normalMap.r > 0.4 && normalMap.r < 0.6 && normalMap.g > 0.4 && normalMap.g < 0.6) {
    N = normalize(v_normal);
  } else {
    normalMap = normalize(normalMap * 2.0 - 1.0);
    N = normalize(v_tbn * normalMap);
  }

  [LIGHT_CALC]

  vec3 diffuseColor = texColor.rgb * u_color.rgb;
  vec3 ambientFinal = u_ambientColor * diffuseColor;
  if (length(ambientFinal) < 0.05) {
    ambientFinal = u_ambientColor * u_color.rgb * 0.5;
  }

  gl_FragColor = vec4(ambientFinal + (finalLight - u_ambientColor) * diffuseColor + (specular * u_specColor.rgb * specMap), u_color.a * texColor.a);
}`,
        },
        wgsl: `[WGSL_STRUCTS]
[WGSL_VS]
@fragment fn fs(i: Out) -> @location(0) vec4f {
  let texCol = textureSample(u_diffuseMap, s, i.uv);
  
  // Note: N is now defined inside WGSL_LIGHTING via normalize(i.n)
  [WGSL_LIGHTING]
  
  let diffuseColor = texCol.rgb * obj.color.rgb;
  let finalColor = fL * diffuseColor;

  return vec4f(finalColor, obj.color.a * texCol.a);
}`,
      },
      layout: {
        uniforms: {
          u_color: { type: ShaderPropertyType.COLOR },
          u_viewPos: { type: ShaderPropertyType.VEC3 },
          u_ambientColor: { type: ShaderPropertyType.VEC3 },
        },
        textures: {
          u_diffuseMap: { type: ShaderPropertyType.TEXTURE },
          u_normalMap: { type: ShaderPropertyType.TEXTURE },
        },
      },
    };
  }
}

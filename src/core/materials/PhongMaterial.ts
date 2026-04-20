/// src/core/materials/PhongMaterial.ts

import { AbstractMaterial } from "./AbstractMaterial.js";
import { Color } from "../colors/index.js";
import { MaterialType, ShaderPropertyType } from "../../enums/index.js";
import { Texture } from "../textures/index.js";
import { RenderManifest } from "../renderers/shaders/RenderManifest.js";
import { ShaderDefinition } from "../renderers/shaders/ShaderDefinition.js";

/**
 * Configuration options for Phong material.
 */
export interface PhongMaterialOptions {
  /** The base color of the material. Defaults to white. */
  color?: Color;
  /** The specular reflection color. Defaults to white. */
  specularColor?: Color;
  /** The shininess factor. Defaults to 32.0. */
  shininess?: number;
  /** The diffuse texture map. Defaults to undefined. */
  diffuseMap?: Texture | undefined;
  /** The normal map texture. Defaults to undefined. */
  normalMap?: Texture | undefined;
  /** The specular map texture. Defaults to undefined. */
  specularMap?: Texture | undefined;
}

/**
 * Material that implements the Phong reflection model.
 */
export class PhongMaterial extends AbstractMaterial {
  /** The specular reflection color. */
  public specularColor: Color;

  /** The shininess factor. */
  public shininess: number;

  /** The diffuse texture map. */
  public diffuseMap: Texture | undefined;

  /** The normal map texture. */
  public normalMap: Texture | undefined;

  /** The specular map texture. */
  public specularMap: Texture | undefined;

  /**
   * Creates a new PhongMaterial.
   * @param options The configuration options for the material.
   */
  constructor(options: PhongMaterialOptions = {}) {
    super(MaterialType.PHONG);
    const {
      color = Color.WHITE,
      specularColor = Color.WHITE,
      shininess = 32.0,
      diffuseMap = undefined,
      normalMap = undefined,
      specularMap = undefined,
    } = options;
    this.color = color;
    this.specularColor = specularColor;
    this.shininess = shininess;
    this.diffuseMap = diffuseMap;
    this.normalMap = normalMap;
    this.specularMap = specularMap;
  }

  /** @inheritdoc */
  public override getRenderManifest(): RenderManifest {
    if (undefined === this._renderManifest) {
      this._renderManifest = {
        shaderId: this.type,
        properties: {
          u_color: this.color.toFloat32Array(),
          u_specColor: this.specularColor.toFloat32Array(),
          u_shininess: this.shininess,
          u_texOffset: [0, 0],
          u_texRepeat: [1, 1],
        },
        textures: {
          u_diffuseMap: this.diffuseMap,
          u_normalMap: this.normalMap,
          u_specularMap: this.specularMap,
        },
      };
    }

    const props = this._renderManifest.properties as Record<string, unknown>;
    const texs = this._renderManifest.textures as Record<string, unknown>;

    props["u_color"] = this.color.toFloat32Array();
    props["u_specColor"] = this.specularColor.toFloat32Array();
    props["u_shininess"] = this.shininess;

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
    texs["u_specularMap"] = this.specularMap;

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
  float specMap = texture(u_specularMap, v_uv).r;
  vec3 normalMap = texture(u_normalMap, v_uv).rgb;
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
  fragColor = vec4(ambientFinal + (diff_dir * u_dirLightColor * diffuseColor) + (specular * u_specColor.rgb * specMap), 1.0);
}`,
        },
        glsl100: {
          vs: "[BASE_VS]",
          fs: `[BASE_FS_HEADER]
[LIGHT_DEFS]
void main() {
  vec4 texColor = texture2D(u_diffuseMap, v_uv);
  [LIGHT_CALC]
  vec3 diffuseColor = texColor.rgb * u_color.rgb;
  gl_FragColor = vec4((u_ambientColor * diffuseColor) + (diff_dir * u_dirLightColor * diffuseColor), 1.0);
}`,
        },
        wgsl: `[WGSL_STRUCTS]
[WGSL_VS]
@fragment fn fs(i: Out) -> @location(0) vec4f {
    let texCol = textureSample(u_diffuseMap, s, i.uv);
    // Basic lighting for now in WGSL
    return vec4f(texCol.rgb * obj.color.rgb, 1.0);
}`,
      },
      layout: {
        uniforms: {
          u_color: { type: ShaderPropertyType.COLOR },
          u_specColor: { type: ShaderPropertyType.COLOR },
          u_shininess: { type: ShaderPropertyType.FLOAT },
          u_viewPos: { type: ShaderPropertyType.VEC3 },
          u_ambientColor: { type: ShaderPropertyType.VEC3 },
        },
        textures: {
          u_diffuseMap: { type: ShaderPropertyType.TEXTURE },
          u_normalMap: { type: ShaderPropertyType.TEXTURE },
          u_specularMap: { type: ShaderPropertyType.TEXTURE },
        },
      },
    };
  }
}

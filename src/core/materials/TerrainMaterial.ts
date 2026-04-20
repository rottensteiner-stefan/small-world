import { AbstractMaterial } from "./AbstractMaterial.js";
import { MaterialType, ShaderPropertyType } from "../../enums/index.js";
import { Texture } from "../textures/Texture.js";
import { Color } from "../colors/Color.js";
import { RenderManifest } from "../renderers/shaders/RenderManifest.js";
import { ShaderDefinition } from "../renderers/shaders/ShaderDefinition.js";

/**
 * Configuration options for terrain material.
 */
export interface TerrainMaterialOptions {
  /** The base color. Defaults to white. */
  color?: Color;
  /** The shininess factor. Defaults to 10. */
  shininess?: number;
  /** Sand biome texture map. Defaults to undefined. */
  sandMap?: Texture | undefined;
  /** Grass biome texture map. Defaults to undefined. */
  grassMap?: Texture | undefined;
  /** Rock biome texture map. Defaults to undefined. */
  rockMap?: Texture | undefined;
  /** Snow biome texture map. Defaults to undefined. */
  snowMap?: Texture | undefined;
  /** Texture repetition factors. Defaults to [20.0, 20.0]. */
  texRepeat?: [number, number];
  /** Thresholds for biome transitions. Defaults to [2.0, 15.0, 25.0, 2.0]. */
  thresholds?: [number, number, number, number];
}

/**
 * Material specifically for terrain rendering with splatmapping.
 */
export class TerrainMaterial extends AbstractMaterial {
  /** The shininess factor. */
  public shininess: number;

  /** Sand biome texture map. */
  public sandMap: Texture | undefined;
  /** Grass biome texture map. */
  public grassMap: Texture | undefined;
  /** Rock biome texture map. */
  public rockMap: Texture | undefined;
  /** Snow biome texture map. */
  public snowMap: Texture | undefined;

  /** Texture repetition factors. */
  public texRepeat: [number, number];

  /** Thresholds for biome transitions: [SandToGrass, GrassToRock, RockToSnow, TransitionSoftness]. */
  public thresholds: [number, number, number, number];

  /**
   * Creates a new TerrainMaterial.
   * @param options The configuration options for the material.
   */
  constructor(options: TerrainMaterialOptions = {}) {
    super(MaterialType.TERRAIN);
    const {
      color = Color.WHITE,
      shininess = 10,
      sandMap = undefined,
      grassMap = undefined,
      rockMap = undefined,
      snowMap = undefined,
      texRepeat = [20.0, 20.0],
      thresholds = [2.0, 15.0, 25.0, 2.0],
    } = options;

    this.color = color;
    this.shininess = shininess;
    this.sandMap = sandMap;
    this.grassMap = grassMap;
    this.rockMap = rockMap;
    this.snowMap = snowMap;
    this.texRepeat = texRepeat;
    this.thresholds = thresholds;
  }

  /** @inheritdoc */
  public override getRenderManifest(): RenderManifest {
    if (undefined === this._renderManifest) {
      this._renderManifest = {
        shaderId: this.type,
        properties: {
          u_color: this.color.toFloat32Array(),
          u_shininess: this.shininess,
          u_texRepeat: this.texRepeat,
          u_thresholds: this.thresholds,
        },
        textures: {
          u_sandMap: this.sandMap,
          u_grassMap: this.grassMap,
          u_rockMap: this.rockMap,
          u_snowMap: this.snowMap,
        },
      };
    }

    const props = this._renderManifest.properties as Record<string, unknown>;
    const texs = this._renderManifest.textures as Record<string, unknown>;

    props["u_color"] = this.color.toFloat32Array();
    props["u_shininess"] = this.shininess;
    props["u_texRepeat"] = this.texRepeat;
    props["u_thresholds"] = new Float32Array(this.thresholds);

    texs["u_sandMap"] = this.sandMap;
    texs["u_grassMap"] = this.grassMap;
    texs["u_rockMap"] = this.rockMap;
    texs["u_snowMap"] = this.snowMap;

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

uniform sampler2D u_sandMap;
uniform sampler2D u_grassMap;
uniform sampler2D u_rockMap;
uniform sampler2D u_snowMap;
uniform vec4 u_thresholds;

void main() {
  vec3 N = normalize(v_normal);
  vec4 sand = texture(u_sandMap, v_uv);
  vec4 grass = texture(u_grassMap, v_uv);
  vec4 rock = texture(u_rockMap, v_uv);
  vec4 snow = texture(u_snowMap, v_uv);

  float h = v_worldPos.y;
  float b1 = smoothstep(u_thresholds.x - u_thresholds.w, u_thresholds.x + u_thresholds.w, h);
  float b2 = smoothstep(u_thresholds.y - u_thresholds.w, u_thresholds.y + u_thresholds.w, h);
  float b3 = smoothstep(u_thresholds.z - u_thresholds.w, u_thresholds.z + u_thresholds.w, h);

  vec4 texColor = mix(sand, grass, b1);
  texColor = mix(texColor, rock, b2);
  texColor = mix(texColor, snow, b3);

  float slope = 1.0 - N.y;
  float slopeBlend = smoothstep(0.25, 0.45, slope);
  texColor = mix(texColor, rock, slopeBlend);

  [LIGHT_CALC]

  fragColor = vec4((finalLight * u_color.rgb * texColor.rgb) + (specular * u_specColor.rgb), u_color.a * texColor.a);
}`,
        },
        glsl100: {
          vs: "[BASE_VS]",
          fs: `[BASE_FS_HEADER]
[LIGHT_DEFS]

void main() {
  vec3 N = normalize(v_normal);
  vec4 texColor = texture2D(u_diffuseMap, v_uv); // Fallback for WebGL1 terrain

  [LIGHT_CALC]

  gl_FragColor = vec4((finalLight * u_color.rgb * texColor.rgb) + (specular * u_specColor.rgb), u_color.a * texColor.a);
}`,
        },
        wgsl: `[WGSL_STRUCTS]
[WGSL_VS]
@fragment fn fs(i: Out) -> @location(0) vec4f {
    let sand = textureSample(u_sandMap, s, i.uv);
    let grass = textureSample(u_grassMap, s, i.uv);
    let rock = textureSample(u_rockMap, s, i.uv);
    let snow = textureSample(u_snowMap, s, i.uv);

    let h = i.wp.y;
    var texCol: vec4f;

    if (h < obj.thresholds.x) {
        texCol = sand;
    } else if (h < obj.thresholds.y) {
        let t = (h - obj.thresholds.x) / (obj.thresholds.y - obj.thresholds.x);
        texCol = mix(sand, grass, t);
    } else if (h < obj.thresholds.z) {
        let t = (h - obj.thresholds.y) / (obj.thresholds.z - obj.thresholds.y);
        texCol = mix(grass, rock, t);
    } else if (h < obj.thresholds.w) {
        let t = (h - obj.thresholds.z) / (obj.thresholds.w - obj.thresholds.z);
        texCol = mix(rock, snow, t);
    } else {
        texCol = snow;
    }

    // Note: N is now defined inside WGSL_LIGHTING via normalize(i.n)
    [WGSL_LIGHTING]

    let diffuseColor = texCol.rgb * obj.color.rgb;
    let finalColor = fL * diffuseColor;

    return vec4f(finalColor, obj.color.a);
}`,
      },
      layout: {
        uniforms: {
          u_color: { type: ShaderPropertyType.COLOR },
          u_thresholds: { type: ShaderPropertyType.VEC4 },
          u_texRepeat: { type: ShaderPropertyType.VEC2 },
        },
        textures: {
          u_sandMap: { type: ShaderPropertyType.TEXTURE },
          u_grassMap: { type: ShaderPropertyType.TEXTURE },
          u_rockMap: { type: ShaderPropertyType.TEXTURE },
          u_snowMap: { type: ShaderPropertyType.TEXTURE },
        },
      },
    };
  }
}

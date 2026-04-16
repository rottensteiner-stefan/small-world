/// src/core/materials/TerrainMaterial.ts

import { AbstractMaterial } from "./AbstractMaterial.js";
import { MaterialType } from "../../enums/index.js";
import { Texture } from "../textures/Texture.js";
import { Color } from "../colors/Color.js";
import { RenderManifest } from "../renderers/shaders/RenderManifest.js";

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
  /** @inheritdoc */
  public override readonly type: MaterialType = MaterialType.TERRAIN;

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
    super();
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
    props["u_thresholds"] = this.thresholds;

    texs["u_sandMap"] = this.sandMap;
    texs["u_grassMap"] = this.grassMap;
    texs["u_rockMap"] = this.rockMap;
    texs["u_snowMap"] = this.snowMap;

    return this._renderManifest;
  }
}

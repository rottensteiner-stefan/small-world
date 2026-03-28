/// src/core/materials/TerrainMaterial.ts

import { AbstractMaterial } from "./AbstractMaterial.js";
import { MaterialType } from "../../enums/MaterialType.js";
import { Texture } from "../textures/Texture.js";
import { Color } from "../colors/Color.js";

/**
 * Configuration options for terrain material.
 */
export interface TerrainMaterialOptions {
  /** The base color. Defaults to white. */
  color?: Color;
  /** The shininess factor. Defaults to 10. */
  shininess?: number;
  /** Sand biome texture map. Defaults to null. */
  sandMap?: Texture | null;
  /** Grass biome texture map. Defaults to null. */
  grassMap?: Texture | null;
  /** Rock biome texture map. Defaults to null. */
  rockMap?: Texture | null;
  /** Snow biome texture map. Defaults to null. */
  snowMap?: Texture | null;
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
  public sandMap: Texture | null;
  /** Grass biome texture map. */
  public grassMap: Texture | null;
  /** Rock biome texture map. */
  public rockMap: Texture | null;
  /** Snow biome texture map. */
  public snowMap: Texture | null;

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
      sandMap = null,
      grassMap = null,
      rockMap = null,
      snowMap = null,
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
}

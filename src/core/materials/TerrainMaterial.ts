/// src/core/materials/TerrainMaterial.ts

import { AbstractMaterial } from "./AbstractMaterial.js";
import { MaterialType } from "../../enums/MaterialType.js";
import { Texture } from "../textures/Texture.js";

/**
 * Material specifically for terrain rendering with splatmapping.
 */
export class TerrainMaterial extends AbstractMaterial {
  /** @inheritdoc */
  public override readonly type: MaterialType = MaterialType.TERRAIN;
  /** The shininess factor. */
  public shininess: number = 10;

  /** Sand biome texture map. */
  public sandMap: Texture | null = null;
  /** Grass biome texture map. */
  public grassMap: Texture | null = null;
  /** Rock biome texture map. */
  public rockMap: Texture | null = null;
  /** Snow biome texture map. */
  public snowMap: Texture | null = null;

  /** Texture repetition factors. */
  public texRepeat: [number, number] = [20.0, 20.0];

  /** Thresholds for biome transitions: [SandToGrass, GrassToRock, RockToSnow, TransitionSoftness]. */
  public thresholds: [number, number, number, number] = [2.0, 15.0, 25.0, 2.0];
}

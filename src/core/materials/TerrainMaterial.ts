/// src/core/materials/TerrainMaterial.ts

import { AbstractMaterial } from "./AbstractMaterial.js";
import { MaterialType } from "../../enums/MaterialType.js";
import { Texture } from "../textures/Texture.js";

export class TerrainMaterial extends AbstractMaterial {
  public readonly type = MaterialType.TERRAIN;
  public shininess: number = 10;

  // Unsere 4 Biome-Texturen
  public sandMap: Texture | null = null;
  public grassMap: Texture | null = null;
  public rockMap: Texture | null = null;
  public snowMap: Texture | null = null;

  // Textur-Wiederholung (Kachelung auf dem Terrain)
  public texRepeat: [number, number] = [20.0, 20.0];

  // Parameter für den Shader: [SandZuGras, GrasZuFels, FelsZuSchnee, WeichheitDesÜbergangs]
  // Beispiel: Gras startet bei Y=2.0, Fels bei Y=15.0, Schnee bei Y=25.0, Übergang ist 2.0 Einheiten weich
  public thresholds: [number, number, number, number] = [2.0, 15.0, 25.0, 2.0];
}

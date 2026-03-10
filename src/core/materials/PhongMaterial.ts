import { Color } from "../colors/Color.js";
import { Material } from "./Material.js";
import { Texture } from "../textures/Texture.js";

export class PhongMaterial extends Material {
  public readonly type = "PhongMaterial";

  // Basisfarbe (wird mit der Diffuse Map multipliziert, falls vorhanden)
  public specularColor: Color = Color.WHITE;
  public shininess: number = 32.0;

  // --- NEU: Textur-Slots ---
  public diffuseMap: Texture | null = null;
  // public normalMap: Texture | null = null;   // (Für später vorbereitet!)
  // public specularMap: Texture | null = null; // (Für später vorbereitet!)
}

import { AssetManager } from "./AssetManager.js";
import { Loader } from "./Loader.js";
import { EventType } from "../enums/EventType.js";
import { PhongMaterial } from "../core/materials/PhongMaterial.js";
import { Color } from "../core/colors/Color.js";

export class MtlLoader extends Loader<Map<string, PhongMaterial>> {
  public async load(url: string): Promise<Map<string, PhongMaterial>> {
    const fullUrl = this.basePath + url;
    this.dispatchEvent(EventType.LOADER_START, { url: fullUrl });

    try {
      // 1. Text über unseren AssetManager laden (inkl. Progress-Event)
      const text = await AssetManager.loadText(fullUrl, (loaded, total) => {
        this.dispatchEvent(EventType.LOADER_PROGRESS, { url: fullUrl, loaded, total });
      });

      // 2. Text in Materialien umwandeln
      const materials = this.parse(text);

      this.dispatchEvent(EventType.LOADER_END, { url: fullUrl, data: materials });
      return materials;
    } catch (error) {
      this.dispatchEvent(EventType.LOADER_ERROR, { url: fullUrl, error });
      throw error;
    }
  }

  private parse(text: string): Map<string, PhongMaterial> {
    const materials = new Map<string, PhongMaterial>();
    let currentMat: PhongMaterial | null = null;

    const lines = text.split("\n");
    for (let line of lines) {
      line = line.trim();

      // Leere Zeilen und Kommentare überspringen
      if (line.length === 0 || line.startsWith("#")) continue;

      const parts = line.split(/\s+/);
      const type = parts[0];

      if (type === "newmtl") {
        currentMat = new PhongMaterial();
        materials.set(parts[1], currentMat);
      } else if (type === "Kd" && currentMat) {
        // Diffuse Basisfarbe (RGB)
        currentMat.color = new Color(
          parseFloat(parts[1]),
          parseFloat(parts[2]),
          parseFloat(parts[3]),
        );
      } else if (type === "Ks" && currentMat) {
        // Spekuläre Farbe (Glanzlicht)
        currentMat.specularColor = new Color(
          parseFloat(parts[1]),
          parseFloat(parts[2]),
          parseFloat(parts[3]),
        );
      } else if (type === "Ns" && currentMat) {
        // Shininess (Glanzhärte)
        currentMat.shininess = parseFloat(parts[1]);
      }
    }

    return materials;
  }
}

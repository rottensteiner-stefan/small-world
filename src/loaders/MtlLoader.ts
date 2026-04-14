/// src/loaders/MtlLoader.ts

import { AbstractLoader } from "./AbstractLoader.js";
import { AssetManager } from "./AssetManager.js";
import { Color } from "../core/index.js";
import { EventType } from "../enums/index.js";
import { PhongMaterial } from "../core/index.js";
import { Texture } from "../core/index.js";

export class MtlLoader extends AbstractLoader<Map<string, PhongMaterial>> {
  public override async load(url: string): Promise<Map<string, PhongMaterial>> {
    const fullUrl: string = this.basePath + url;
    this.dispatchEvent(EventType.LOADER_START, { url: fullUrl });

    try {
      const text: string = await AssetManager.loadText(
        fullUrl,
        (loaded: number, total: number): void => {
          this.dispatchEvent(EventType.LOADER_PROGRESS, { url: fullUrl, loaded, total });
        },
      );

      const folderPath: string = fullUrl.substring(0, fullUrl.lastIndexOf("/") + 1);
      const materials: Map<string, PhongMaterial> = await this._parse(text, folderPath);

      this.dispatchEvent(EventType.LOADER_END, { url: fullUrl, data: materials });
      return materials;
    } catch (error: unknown) {
      this.dispatchEvent(EventType.LOADER_ERROR, { url: fullUrl, error });
      throw error;
    }
  }

  private async _parse(text: string, folderPath: string): Promise<Map<string, PhongMaterial>> {
    const materials: Map<string, PhongMaterial> = new Map<string, PhongMaterial>();
    let currentMat: PhongMaterial | undefined = undefined;

    const lines: string[] = text.split("\n");
    for (let line of lines) {
      line = line.trim();

      if (0 === line.length || line.startsWith("#")) {
        continue;
      }

      const parts: string[] = line.split(/\s+/);
      const type: string = parts[0]!;

      if ("newmtl" === type) {
        currentMat = new PhongMaterial();
        if (parts[1]) {
          materials.set(parts[1], currentMat);
        }
      } else if ("Kd" === type && currentMat) {
        currentMat.color = new Color(
          parseFloat(parts[1] ?? "1"),
          parseFloat(parts[2] ?? "1"),
          parseFloat(parts[3] ?? "1"),
        );
      } else if ("Ks" === type && currentMat) {
        currentMat.specularColor = new Color(
          parseFloat(parts[1] ?? "1"),
          parseFloat(parts[2] ?? "1"),
          parseFloat(parts[3] ?? "1"),
        );
      } else if ("Ns" === type && currentMat) {
        currentMat.shininess = parseFloat(parts[1] ?? "32");
      } else if ("map_Kd" === type && currentMat) {
        const texPath: string = line.substring(line.indexOf(" ") + 1).trim();
        const texUrl: string = folderPath + texPath;

        // --- THE FIX: We use the AssetManager with flipY = false ---
        // The renderer handles flipping during upload to GPU!
        try {
          const image: ImageBitmap | HTMLImageElement = await AssetManager.loadImage(
            texUrl,
            undefined,
            false,
          );
          currentMat.diffuseMap = Texture.fromImage(image);
        } catch (e) {
          console.error(`[MtlLoader] Failed to load texture: ${texUrl}`, e);
        }
      } else if (("map_Bump" === type || "bump" === type) && currentMat) {
        const texPath: string = line.substring(line.indexOf(" ") + 1).trim();
        const texUrl: string = folderPath + texPath;

        const image: ImageBitmap | HTMLImageElement = await AssetManager.loadImage(
          texUrl,
          undefined,
          false,
        );
        currentMat.normalMap = Texture.fromImage(image);
      }
    }

    return materials;
  }
}

/// src/loaders/MtlLoader.ts
import { AbstractLoader } from "./AbstractLoader.js";
import { AssetManager } from "./AssetManager.js";
import { EventType, TextureFilter } from "../enums/index.js";
import { PhongMaterial } from "../core/index.js";
import { Texture } from "../core/index.js";
export class MtlLoader extends AbstractLoader {
    /**
     * Creates a new MtlLoader.
     * @param options Optional configuration options.
     */
    constructor(options = {}) {
        super(options);
    }
    async load(url) {
        const fullUrl = this.basePath + url;
        this.dispatchEvent(EventType.LOADER_START, { url: fullUrl });
        try {
            const text = await AssetManager.loadText(fullUrl, (loaded, total) => {
                this.dispatchEvent(EventType.LOADER_PROGRESS, { url: fullUrl, loaded, total });
            });
            const folderPath = fullUrl.substring(0, fullUrl.lastIndexOf("/") + 1);
            const materials = await this._parse(text, folderPath);
            this.dispatchEvent(EventType.LOADER_END, { url: fullUrl, data: materials });
            return materials;
        }
        catch (error) {
            this.dispatchEvent(EventType.LOADER_ERROR, { url: fullUrl, error });
            throw error;
        }
    }
    async _parse(text, folderPath) {
        const materials = new Map();
        let currentMat = undefined;
        const lines = text.split("\n");
        for (let line of lines) {
            line = line.trim();
            if (0 === line.length || line.startsWith("#")) {
                continue;
            }
            const parts = line.split(/\s+/);
            const type = parts[0];
            if ("newmtl" === type) {
                currentMat = new PhongMaterial();
                const matName = parts[1];
                if (matName) {
                    materials.set(matName, currentMat);
                }
            }
            else if ("Kd" === type && currentMat) {
                currentMat.color.set(parseFloat(parts[1] ?? "1"), parseFloat(parts[2] ?? "1"), parseFloat(parts[3] ?? "1"));
            }
            else if ("Ks" === type && currentMat) {
                const r = parseFloat(parts[1] ?? "1");
                const g = parseFloat(parts[2] ?? "1");
                const b = parseFloat(parts[3] ?? "1");
                // Ensure some specularity if defined, but not zero
                currentMat.specularColor.set(Math.max(r, 0.05), Math.max(g, 0.05), Math.max(b, 0.05));
            }
            else if ("Ns" === type && currentMat) {
                currentMat.shininess = parseFloat(parts[1] ?? "32");
            }
            else if ("map_Kd" === type && currentMat) {
                const texPath = line.substring(line.indexOf(" ") + 1).trim();
                const texUrl = folderPath + texPath;
                // --- THE FIX: We use the AssetManager with flipY = true ---
                // The renderer NO LONGER handles flipping; it's done during image creation!
                try {
                    const image = await AssetManager.loadImage(texUrl, undefined, true);
                    currentMat.diffuseMap = Texture.fromImage(image, {
                        magFilter: TextureFilter.NEAREST,
                        minFilter: TextureFilter.NEAREST,
                    });
                }
                catch (e) {
                    console.error(`[MtlLoader] Failed to load texture: ${texUrl}`, e);
                }
            }
            else if (("map_Bump" === type || "bump" === type) && currentMat) {
                const texPath = line.substring(line.indexOf(" ") + 1).trim();
                const texUrl = folderPath + texPath;
                const image = await AssetManager.loadImage(texUrl, undefined, true);
                currentMat.normalMap = Texture.fromImage(image, {
                    magFilter: TextureFilter.NEAREST,
                    minFilter: TextureFilter.NEAREST,
                });
            }
        }
        return materials;
    }
}
//# sourceMappingURL=MtlLoader.js.map
/// src/loaders/MtlLoader.ts

import {AbstractLoader} from "./AbstractLoader.js";
import {AssetManager} from "./AssetManager.js";
import {Color} from "../core/colors/Color.js";
import {EventType} from "../enums/EventType.js";
import {PhongMaterial} from "../core/materials/PhongMaterial.js";
import {Texture} from "../core/textures/Texture.js";

export class MtlLoader extends AbstractLoader<Map<string, PhongMaterial>> {
    public async load(url: string): Promise<Map<string, PhongMaterial>> {
        const fullUrl = this.basePath + url;
        this.dispatchEvent(EventType.LOADER_START, {url: fullUrl});

        try {
            const text = await AssetManager.loadText(fullUrl, (loaded, total) => {
                this.dispatchEvent(EventType.LOADER_PROGRESS, {url: fullUrl, loaded, total});
            });

            const folderPath = fullUrl.substring(0, fullUrl.lastIndexOf("/") + 1);
            const materials = await this.parse(text, folderPath);

            this.dispatchEvent(EventType.LOADER_END, {url: fullUrl, data: materials});
            return materials;
        } catch (error) {
            this.dispatchEvent(EventType.LOADER_ERROR, {url: fullUrl, error});
            throw error;
        }
    }

    private async parse(text: string, folderPath: string): Promise<Map<string, PhongMaterial>> {
        const materials = new Map<string, PhongMaterial>();
        let currentMat: PhongMaterial | null = null;

        const lines = text.split("\n");
        for (let line of lines) {
            line = line.trim();

            if (line.length === 0 || line.startsWith("#")) continue;

            const parts = line.split(/\s+/);
            const type = parts[0];

            if (type === "newmtl") {
                currentMat = new PhongMaterial();
                materials.set(parts[1], currentMat);
            } else if (type === "Kd" && currentMat) {
                currentMat.color = new Color(
                    parseFloat(parts[1]),
                    parseFloat(parts[2]),
                    parseFloat(parts[3]),
                );
            } else if (type === "Ks" && currentMat) {
                currentMat.specularColor = new Color(
                    parseFloat(parts[1]),
                    parseFloat(parts[2]),
                    parseFloat(parts[3]),
                );
            } else if (type === "Ns" && currentMat) {
                currentMat.shininess = parseFloat(parts[1]);
            } else if (type === "map_Kd" && currentMat) {

                const texPath = line.substring(line.indexOf(" ") + 1).trim();
                const texUrl = folderPath + texPath;

                // --- DER FIX: Wir nutzen den AssetManager mit flipY = true ---
                // Das Bild wird beim Einlesen physisch gedreht, bevor es in die Textur wandert!
                const image = await AssetManager.loadImage(texUrl, undefined, true);
                currentMat.diffuseMap = Texture.fromImage(image);

            }
        }

        return materials;
    }
}
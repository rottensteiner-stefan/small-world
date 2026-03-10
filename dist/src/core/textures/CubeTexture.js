import { AssetManager } from "../AssetManager.js";
export class CubeTexture {
    uuid = crypto.randomUUID();
    images = [];
    isLoaded = false;
    constructor(urls) {
        if (urls && urls.length === 6) {
            this.load(urls);
        }
    }
    async load(urls) {
        try {
            // Lädt alle 6 Bilder parallel über unseren AssetManager
            this.images = await Promise.all(urls.map((url) => AssetManager.loadImage(url)));
            this.isLoaded = true;
        }
        catch (e) {
            console.error(`Fehler beim Laden der CubeTexture`, e);
        }
    }
}
//# sourceMappingURL=CubeTexture.js.map
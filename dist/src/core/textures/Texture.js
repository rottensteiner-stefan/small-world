import { AssetManager } from "../../loaders/AssetManager.js";
import { Vector2D } from "../../math/Vector2D.js";
export class Texture {
    uuid = crypto.randomUUID();
    image = null;
    isLoaded = false;
    // --- NEU: Sampler-Konfiguration ---
    // Wir nutzen Strings, die WebGPU direkt versteht ("repeat", "clamp-to-edge", "mirror-repeat")
    addressModeU = "repeat";
    addressModeV = "repeat";
    // Filter: "linear" (weich) oder "nearest" (pixelig/scharf)
    magFilter = "linear";
    minFilter = "linear";
    offset = new Vector2D(0, 0);
    repeat = new Vector2D(1, 1);
    constructor(url) {
        if (url) {
            this.load(url);
        }
    }
    /**
     * Hilfsmethode, um das Wrapping schnell umzustellen
     */
    setWrapMode(mode) {
        this.addressModeU = mode;
        this.addressModeV = mode;
    }
    /**
     * Hilfsmethode für den Filter-Modus
     */
    setFilterMode(mode) {
        this.magFilter = mode;
        this.minFilter = mode;
    }
    async load(url) {
        try {
            this.image = await AssetManager.loadImage(url);
            this.isLoaded = true;
        }
        catch (e) {
            console.error(`Fehler beim Laden der Textur: ${url}`, e);
        }
    }
}
//# sourceMappingURL=Texture.js.map
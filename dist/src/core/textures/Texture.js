import { AssetManager } from "../AssetManager.js";
export class Texture {
    uuid = crypto.randomUUID();
    image = null;
    isLoaded = false;
    // Sampler-Einstellungen (vorbereitet für die GPU)
    wrapS = "repeat"; // U-Achse Kachelung
    wrapT = "repeat"; // V-Achse Kachelung
    magFilter = "linear"; // Nah ranzoomen (nearest = Pixelart)
    minFilter = "linear"; // Weit weg
    constructor(url) {
        if (url) {
            this.load(url);
        }
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
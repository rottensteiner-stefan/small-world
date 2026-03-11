import { AssetManager } from "../../loaders/AssetManager";
import { Vector2D } from "../../math/Vector2D.js";
import { TextureWrap } from "../../enums/TextureWrap.js";
import { TextureFilter } from "../../enums/TextureFilter.js";
export class Texture {
    uuid = crypto.randomUUID();
    image = null;
    isLoaded = false;
    // Sampler-Einstellungen über Enums
    wrapS = TextureWrap.REPEAT;
    wrapT = TextureWrap.REPEAT;
    magFilter = TextureFilter.LINEAR;
    minFilter = TextureFilter.LINEAR;
    // --- NEU: Offset und Kachelung (Tiling) ---
    offset = new Vector2D(0, 0);
    repeat = new Vector2D(1, 1);
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
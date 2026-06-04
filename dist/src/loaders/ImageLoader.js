/// src/loaders/ImageLoader.ts
import { AbstractLoader } from "./AbstractLoader.js";
import { AssetManager } from "./AssetManager.js";
import { EventType } from "../enums/index.js";
/**
 * Loader for image assets.
 */
export class ImageLoader extends AbstractLoader {
    /** Whether the image should be flipped vertically during loading. */
    flipY = false;
    /**
     * Creates a new ImageLoader.
     * @param options Optional configuration options.
     */
    constructor(options = {}) {
        super(options);
        this.flipY = options.flipY ?? false;
    }
    /** @inheritdoc */
    async load(url) {
        const fullUrl = this.basePath + url;
        this.dispatchEvent(EventType.LOADER_START, { url: fullUrl });
        try {
            const image = await AssetManager.loadImage(fullUrl, (loaded, total) => {
                this.dispatchEvent(EventType.LOADER_PROGRESS, { url: fullUrl, loaded, total });
            }, this.flipY);
            this.dispatchEvent(EventType.LOADER_END, { url: fullUrl, data: image });
            return image;
        }
        catch (error) {
            this.dispatchEvent(EventType.LOADER_ERROR, { url: fullUrl, error });
            throw error;
        }
    }
}
//# sourceMappingURL=ImageLoader.js.map
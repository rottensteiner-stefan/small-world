import { Loader } from "./Loader.js";
import { AssetManager } from "./AssetManager.js";
import { EventType } from "../enums/EventType.js";
export class ImageLoader extends Loader {
    async load(url) {
        const fullUrl = this.basePath + url;
        this.dispatchEvent(EventType.LOADER_START, { url: fullUrl });
        try {
            const image = await AssetManager.loadImage(fullUrl, (loaded, total) => {
                this.dispatchEvent(EventType.LOADER_PROGRESS, { url: fullUrl, loaded, total });
            });
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
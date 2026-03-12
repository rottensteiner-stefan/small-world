import { Loader } from "./Loader.js";
import { AssetManager } from "./AssetManager.js";
import { EventType } from "../enums/EventType.js";
export class TextLoader extends Loader {
    async load(url) {
        const fullUrl = this.basePath + url;
        this.dispatchEvent(EventType.LOADER_START, { url: fullUrl });
        try {
            const text = await AssetManager.loadText(fullUrl, (loaded, total) => {
                this.dispatchEvent(EventType.LOADER_PROGRESS, { url: fullUrl, loaded, total });
            });
            this.dispatchEvent(EventType.LOADER_END, { url: fullUrl, data: text });
            return text;
        }
        catch (error) {
            this.dispatchEvent(EventType.LOADER_ERROR, { url: fullUrl, error });
            throw error;
        }
    }
}
//# sourceMappingURL=TextLoader.js.map
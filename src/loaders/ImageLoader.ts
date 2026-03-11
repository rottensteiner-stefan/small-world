import { Loader } from "./Loader.js";
import { AssetManager } from "./AssetManager.js";
import { EventType } from "../enums/EventType.js";

export class ImageLoader extends Loader<ImageBitmap | HTMLImageElement> {
  public async load(url: string): Promise<ImageBitmap | HTMLImageElement> {
    const fullUrl = this.basePath + url;
    this.dispatchEvent(EventType.LOAD_START, { url: fullUrl });

    try {
      const image = await AssetManager.loadImage(fullUrl, (loaded, total) => {
        this.dispatchEvent(EventType.PROGRESS, { url: fullUrl, loaded, total });
      });

      this.dispatchEvent(EventType.LOAD_END, { url: fullUrl, data: image });
      return image;
    } catch (error) {
      this.dispatchEvent(EventType.ERROR, { url: fullUrl, error });
      throw error;
    }
  }
}

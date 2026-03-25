/// src/loaders/ImageLoader.ts

import { AbstractLoader } from "./AbstractLoader.js";
import { AssetManager } from "./AssetManager.js";
import { EventType } from "../enums/EventType.js";

/**
 * Loader for image assets.
 */
export class ImageLoader extends AbstractLoader<ImageBitmap | HTMLImageElement> {
  /** @inheritdoc */
  public override async load(url: string): Promise<ImageBitmap | HTMLImageElement> {
    const fullUrl: string = this.basePath + url;
    this.dispatchEvent(EventType.LOADER_START, { url: fullUrl });

    try {
      const image: ImageBitmap | HTMLImageElement = await AssetManager.loadImage(
        fullUrl,
        (loaded: number, total: number) => {
          this.dispatchEvent(EventType.LOADER_PROGRESS, { url: fullUrl, loaded, total });
        },
      );

      this.dispatchEvent(EventType.LOADER_END, { url: fullUrl, data: image });
      return image;
    } catch (error: unknown) {
      this.dispatchEvent(EventType.LOADER_ERROR, { url: fullUrl, error });
      throw error;
    }
  }
}

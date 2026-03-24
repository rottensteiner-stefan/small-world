/// src/loaders/TextLoader.ts

import { AssetManager } from "./AssetManager.js";
import { EventType } from "../enums/EventType.js";
import { AbstractLoader } from "./AbstractLoader.js";
/**
 * Loader for text assets.
 */
export class TextLoader extends AbstractLoader<string> {
  /** @inheritdoc */
  public override async load(url: string): Promise<string> {
    const fullUrl: string = this.basePath + url;
    this.dispatchEvent(EventType.LOADER_START, { url: fullUrl });

    try {
      const text: string = await AssetManager.loadText(fullUrl, (loaded: number, total: number) => {
        this.dispatchEvent(EventType.LOADER_PROGRESS, { url: fullUrl, loaded, total });
      });

      this.dispatchEvent(EventType.LOADER_END, { url: fullUrl, data: text });
      return text;
    } catch (error: unknown) {
      this.dispatchEvent(EventType.LOADER_ERROR, { url: fullUrl, error });
      throw error;
    }
  }
}

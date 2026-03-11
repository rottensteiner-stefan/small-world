import { Loader } from "./Loader.js";
import { AssetManager } from "./AssetManager.js";
import { EventType } from "../enums/EventType.js";

export class TextLoader extends Loader<string> {
  public async load(url: string): Promise<string> {
    const fullUrl = this.basePath + url;
    this.dispatchEvent(EventType.LOAD_START, { url: fullUrl });

    try {
      const text = await AssetManager.loadText(fullUrl, (loaded, total) => {
        this.dispatchEvent(EventType.PROGRESS, { url: fullUrl, loaded, total });
      });

      this.dispatchEvent(EventType.LOAD_END, { url: fullUrl, data: text });
      return text;
    } catch (error) {
      this.dispatchEvent(EventType.ERROR, { url: fullUrl, error });
      throw error;
    }
  }
}

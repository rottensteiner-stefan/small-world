import { AssetManager } from "../AssetManager.js";

export class CubeTexture {
  public uuid: string = crypto.randomUUID();
  public images: (ImageBitmap | HTMLImageElement)[] = [];
  public isLoaded: boolean = false;

  constructor(urls?: string[]) {
    if (urls && urls.length === 6) {
      this.load(urls);
    }
  }

  public async load(urls: string[]): Promise<void> {
    try {
      // Lädt alle 6 Bilder parallel über unseren AssetManager
      this.images = await Promise.all(urls.map((url) => AssetManager.loadImage(url)));
      this.isLoaded = true;
    } catch (e) {
      console.error(`Fehler beim Laden der CubeTexture`, e);
    }
  }
}

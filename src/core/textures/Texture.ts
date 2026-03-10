import { AssetManager } from "../AssetManager.js";

export class Texture {
  public uuid: string = crypto.randomUUID();
  public image: ImageBitmap | HTMLImageElement | null = null;
  public isLoaded: boolean = false;

  // Sampler-Einstellungen (vorbereitet für die GPU)
  public wrapS: "repeat" | "clamp" | "mirror" = "repeat"; // U-Achse Kachelung
  public wrapT: "repeat" | "clamp" | "mirror" = "repeat"; // V-Achse Kachelung
  public magFilter: "linear" | "nearest" = "linear"; // Nah ranzoomen (nearest = Pixelart)
  public minFilter: "linear" | "nearest" = "linear"; // Weit weg

  constructor(url?: string) {
    if (url) {
      this.load(url);
    }
  }

  public async load(url: string): Promise<void> {
    try {
      this.image = await AssetManager.loadImage(url);
      this.isLoaded = true;
    } catch (e) {
      console.error(`Fehler beim Laden der Textur: ${url}`, e);
    }
  }
}

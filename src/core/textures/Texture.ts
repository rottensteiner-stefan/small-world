import { AssetManager } from "../../loaders/AssetManager";
import { Vector2D } from "../../math/Vector2D.js";
import { TextureWrap } from "../../enums/TextureWrap.js";
import { TextureFilter } from "../../enums/TextureFilter.js";

export class Texture {
  public uuid: string = crypto.randomUUID();
  public image: ImageBitmap | HTMLImageElement | null = null;
  public isLoaded: boolean = false;

  // Sampler-Einstellungen über Enums
  public wrapS: TextureWrap = TextureWrap.REPEAT;
  public wrapT: TextureWrap = TextureWrap.REPEAT;
  public magFilter: TextureFilter = TextureFilter.LINEAR;
  public minFilter: TextureFilter = TextureFilter.LINEAR;

  // --- NEU: Offset und Kachelung (Tiling) ---
  public offset: Vector2D = new Vector2D(0, 0);
  public repeat: Vector2D = new Vector2D(1, 1);

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

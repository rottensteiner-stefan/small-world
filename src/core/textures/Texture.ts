import { AssetManager } from "../../loaders/AssetManager.js";
import { Vector2D } from "../../math/Vector2D.js";

export class Texture {
  public uuid: string = crypto.randomUUID();
  public image: ImageBitmap | HTMLImageElement | null = null;
  public isLoaded: boolean = false;

  // --- NEU: Sampler-Konfiguration ---
  // Wir nutzen Strings, die WebGPU direkt versteht ("repeat", "clamp-to-edge", "mirror-repeat")
  public addressModeU: GPUAddressMode = "repeat";
  public addressModeV: GPUAddressMode = "repeat";

  // Filter: "linear" (weich) oder "nearest" (pixelig/scharf)
  public magFilter: GPUFilterMode = "linear";
  public minFilter: GPUFilterMode = "linear";

  public offset: Vector2D = new Vector2D(0, 0);
  public repeat: Vector2D = new Vector2D(1, 1);

  constructor(url?: string) {
    if (url) {
      this.load(url);
    }
  }

  /**
   * Hilfsmethode, um das Wrapping schnell umzustellen
   */
  public setWrapMode(mode: GPUAddressMode): void {
    this.addressModeU = mode;
    this.addressModeV = mode;
  }

  /**
   * Hilfsmethode für den Filter-Modus
   */
  public setFilterMode(mode: GPUFilterMode): void {
    this.magFilter = mode;
    this.minFilter = mode;
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
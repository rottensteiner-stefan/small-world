/// src/core/textures/CubeTexture.ts
import { AssetManager } from "../../loaders/AssetManager.js";

/**
 * Represents a cube map texture.
 */
export class CubeTexture {
  /** The unique identifier of the texture. */
  public uuid: string = crypto.randomUUID();
  /** The six images comprising the cube map. */
  public images: (ImageBitmap | HTMLImageElement)[] = [];
  /** Whether the texture is fully loaded. */
  public isLoaded: boolean = false;

  /**
   * Creates a new CubeTexture.
   * @param urls Optional array of 6 URLs for the cube faces.
   */
  constructor(urls?: string[]) {
    if (urls && urls.length === 6) {
      this.load(urls);
    }
  }

  /**
   * Loads the cube map images from the given URLs.
   * @param urls An array of 6 URLs.
   */
  public async load(urls: string[]): Promise<void> {
    try {
      this.images = await Promise.all(urls.map((url: string) => AssetManager.loadImage(url)));
      this.isLoaded = true;
    } catch (e: unknown) {
      console.error(`Fehler beim Laden der CubeTexture`, e);
    }
  }
}

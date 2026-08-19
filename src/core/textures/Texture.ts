import { TextureFilter, TextureWrap } from "../../enums/index.js";
import { AssetManager } from "../../loaders/AssetManager.js";
/**
 * Configuration options for creating a texture.
 */
export interface TextureOptions {
  /** The magnification filter. */
  magFilter?: TextureFilter;
  /** The minification filter. */
  minFilter?: TextureFilter;
  /** The wrapping mode for the U coordinate. */
  addressModeU?: TextureWrap;
  /** The wrapping mode for the V coordinate. */
  addressModeV?: TextureWrap;
  /** Whether to generate mipmaps. Defaults to true. */
  generateMipmaps?: boolean;
  /** Requested anisotropic filtering level. Defaults to 1. */
  anisotropy?: number;
  /** Whether the image should be flipped vertically during loading. Defaults to false. */
  flipY?: boolean;
}

/**
 * Represents a 2D texture.
 */
export class Texture {
  /** The underlying image, bitmap, or canvas data. */
  public image: HTMLImageElement | ImageBitmap | HTMLCanvasElement | undefined = undefined;
  /** Whether the texture is fully loaded and ready for use. */
  public isLoaded: boolean = false;
  /** Set to true after mutating `image` in place (e.g. redrawing a canvas) to force a GPU re-upload. */
  public needsUpdate: boolean = false;

  /** The magnification filter. */
  public magFilter: TextureFilter = TextureFilter.DEFAULT;
  /** The minification filter. */
  public minFilter: TextureFilter = TextureFilter.DEFAULT;
  /** The wrapping mode for the U coordinate. */
  public addressModeU: TextureWrap = TextureWrap.DEFAULT;
  /** The wrapping mode for the V coordinate. */
  public addressModeV: TextureWrap = TextureWrap.DEFAULT;
  /** Whether mipmaps should be generated for this texture. */
  public generateMipmaps: boolean = true;
  /** Desired anisotropic filtering level for this texture. */
  public anisotropy: number = 1;

  /** The UV offset. */
  public offset: { x: number; y: number } = { x: 0, y: 0 };
  /** The UV repeat factors. */
  public repeat: { x: number; y: number } = { x: 1, y: 1 };

  /**
   * Protected constructor. Use static factory methods to create instances.
   * @param image Optional initial image data.
   * @param options Optional configuration options.
   */
  protected constructor(
    image?: HTMLImageElement | ImageBitmap | HTMLCanvasElement,
    options: TextureOptions = {},
  ) {
    if (image) {
      this.image = image;
      this.isLoaded = true;
    }
    const {
      magFilter = TextureFilter.DEFAULT,
      minFilter = TextureFilter.DEFAULT,
      addressModeU = TextureWrap.DEFAULT,
      addressModeV = TextureWrap.DEFAULT,
      generateMipmaps = true,
      anisotropy = 1,
    } = options;

    this.magFilter = magFilter;
    this.minFilter = minFilter;
    this.addressModeU = addressModeU;
    this.addressModeV = addressModeV;
    this.generateMipmaps = generateMipmaps;
    this.anisotropy = anisotropy;
  }

  /**
   * Flips the texture horizontally by modifying the UV offset and repeat.
   * @returns This texture instance for chaining.
   */
  public flipX(): this {
    this.repeat.x *= -1;
    this.offset.x = this.repeat.x < 0 ? 1 : 0;
    return this;
  }

  /**
   * Flips the texture vertically by modifying the UV offset and repeat.
   * @returns This texture instance for chaining.
   */
  public flipY(): this {
    this.repeat.y *= -1;
    this.offset.y = this.repeat.y < 0 ? 1 : 0;
    return this;
  }

  /**
   * Creates a texture from an existing image or bitmap.
   * @param image The image or bitmap data.
   * @param options Optional configuration options.
   * @returns A new Texture instance.
   */
  public static fromImage(
    image: HTMLImageElement | ImageBitmap,
    options?: TextureOptions,
  ): Texture {
    return new Texture(image, options);
  }

  /**
   * Creates a texture backed directly by a canvas. Redraw the canvas and set `needsUpdate = true`
   * to push the new pixels to the GPU on the next frame.
   * @param canvas The canvas to use as the texture's pixel source.
   * @param options Optional configuration options.
   * @returns A new Texture instance.
   */
  public static fromCanvas(canvas: HTMLCanvasElement, options?: TextureOptions): Texture {
    return new Texture(canvas, options);
  }

  /**
   * Creates an empty texture placeholder.
   * @param options Optional configuration options.
   * @returns A new empty Texture instance.
   */
  public static empty(options?: TextureOptions): Texture {
    return new Texture(undefined, options);
  }

  /**
   * Loads a texture from a URL.
   * @param url The URL of the image.
   * @param options Optional configuration options.
   * @returns A promise that resolves to a new Texture instance.
   */
  public static async fromUrl(url: string, options?: TextureOptions): Promise<Texture> {
    const image = await AssetManager.loadImage(url, undefined, options?.flipY);
    return new Texture(image, options);
  }
}

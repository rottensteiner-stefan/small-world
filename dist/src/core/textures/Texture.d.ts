import {TextureFilter, TextureWrap} from '../../enums/index.js';

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
export declare class Texture {
    /** The underlying image or bitmap data. */
    image: HTMLImageElement | ImageBitmap | undefined;
    /** Whether the texture is fully loaded and ready for use. */
    isLoaded: boolean;
    /** The magnification filter. */
    magFilter: TextureFilter;
    /** The minification filter. */
    minFilter: TextureFilter;
    /** The wrapping mode for the U coordinate. */
    addressModeU: TextureWrap;
    /** The wrapping mode for the V coordinate. */
    addressModeV: TextureWrap;
    /** Whether mipmaps should be generated for this texture. */
    generateMipmaps: boolean;
    /** Desired anisotropic filtering level for this texture. */
    anisotropy: number;
    /** The UV offset. */
    offset: {
        x: number;
        y: number;
    };
    /** The UV repeat factors. */
    repeat: {
        x: number;
        y: number;
    };

    /**
     * Protected constructor. Use static factory methods to create instances.
     * @param image Optional initial image data.
     * @param options Optional configuration options.
     */
    protected constructor(image?: HTMLImageElement | ImageBitmap, options?: TextureOptions);

    /**
     * Flips the texture horizontally by modifying the UV offset and repeat.
     * @returns This texture instance for chaining.
     */
    flipX(): this;

    /**
     * Flips the texture vertically by modifying the UV offset and repeat.
     * @returns This texture instance for chaining.
     */
    flipY(): this;

    /**
     * Creates a texture from an existing image or bitmap.
     * @param image The image or bitmap data.
     * @param options Optional configuration options.
     * @returns A new Texture instance.
     */
    static fromImage(image: HTMLImageElement | ImageBitmap, options?: TextureOptions): Texture;

    /**
     * Creates an empty texture placeholder.
     * @param options Optional configuration options.
     * @returns A new empty Texture instance.
     */
    static empty(options?: TextureOptions): Texture;

    /**
     * Loads a texture from a URL.
     * @param url The URL of the image.
     * @param options Optional configuration options.
     * @returns A promise that resolves to a new Texture instance.
     */
    static fromUrl(url: string, options?: TextureOptions): Promise<Texture>;
}

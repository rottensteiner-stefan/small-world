import { Texture, TextureOptions } from './Texture.js';
/**
 * Represents a 2D Texture Array (`sampler2DArray` in WebGL2, `texture_2d_array` in WebGPU).
 * All images must have the exact same dimensions and format.
 */
export declare class TextureArray extends Texture {
    images: (HTMLImageElement | ImageBitmap)[];
    readonly isTextureArray: boolean;
    protected constructor(images: (HTMLImageElement | ImageBitmap)[], options?: TextureOptions);
    /**
     * Creates a TextureArray from an array of existing images or bitmaps.
     * @param images Array of image or bitmap data.
     * @param options Optional configuration options.
     */
    static fromImages(images: (HTMLImageElement | ImageBitmap)[], options?: TextureOptions): TextureArray;
    /**
     * Loads a TextureArray from an array of URLs.
     * @param urls Array of image URLs.
     * @param options Optional configuration options.
     */
    static fromUrls(urls: string[], options?: TextureOptions): Promise<TextureArray>;
}

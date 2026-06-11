import { CubeLayout } from '../../enums/index.js';
/**
 * Represents a cube map texture.
 */
export declare class CubeTexture {
    /** The unique identifier of the texture. */
    uuid: string;
    /** The six images comprising the cube map. */
    images: (ImageBitmap | HTMLImageElement)[];
    /** Whether the texture is fully loaded. */
    isLoaded: boolean;
    /**
     * Creates a new CubeTexture.
     * @param urls Optional array of 6 URLs for the cube faces or a single URL for a tiled texture.
     */
    constructor(urls?: string[]);
    /**
     * Loads the cube map from one or more URLs.
     * @param urls A single URL or an array of URLs.
     * @param layout Optional layout hint for single images (e.g. 6x1 strip, 3x2 grid, or crosses).
     */
    loadFrom(urls: string | string[], layout?: CubeLayout): Promise<void>;
}

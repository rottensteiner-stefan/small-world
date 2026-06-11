import { AbstractLoader } from './AbstractLoader.js';
import { ImageLoaderOptions } from '../interfaces/index.js';
/**
 * Loader for image assets.
 */
export declare class ImageLoader extends AbstractLoader<ImageBitmap | HTMLImageElement> {
    /** Whether the image should be flipped vertically during loading. */
    flipY: boolean;
    /**
     * Creates a new ImageLoader.
     * @param options Optional configuration options.
     */
    constructor(options?: ImageLoaderOptions);
    /** @inheritdoc */
    load(url: string): Promise<ImageBitmap | HTMLImageElement>;
}

import { AbstractLoader } from './AbstractLoader.js';
export declare class ImageLoader extends AbstractLoader<ImageBitmap | HTMLImageElement> {
    load(url: string): Promise<ImageBitmap | HTMLImageElement>;
}

export type ProgressCallback = (loaded: number, total: number) => void;
export declare class AssetManager {
    private static imageCache;
    private static textCache;
    private static fetchWithProgress;
    static loadImage(url: string, onProgress?: ProgressCallback, flipY?: boolean): Promise<ImageBitmap | HTMLImageElement>;
    static loadText(url: string, onProgress?: ProgressCallback): Promise<string>;
}

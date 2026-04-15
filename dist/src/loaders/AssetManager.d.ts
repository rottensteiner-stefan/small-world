export type ProgressCallback = (loaded: number, total: number) => void;
/**
 * Centralized manager for loading and caching assets (images, text, etc.).
 * Provides global progress tracking and loading state.
 */
export declare class AssetManager {
    private static _imageCache;
    private static _textCache;
    private static _activeLoaders;
    private static _onLoadedPromise;
    private static _resolveLoaded;
    private static _baseUrl;
    private static _headers;
    /**
     * Sets a base URL that will be prepended to all relative asset paths.
     * @param url The base URL (e.g. "https://cdn.example.com/assets/").
     */
    static setBaseUrl(url: string): void;
    /**
     * Sets a custom header to be sent with every asset request.
     * @param key The header name (e.g. "Authorization").
     * @param value The header value.
     */
    static setHeader(key: string, value: string): void;
    /**
     * Returns a promise that resolves when all currently active loading processes are finished.
     */
    static onLoaded(): Promise<void>;
    /**
     * Checks if all assets are currently loaded.
     */
    static get isLoaded(): boolean;
    /**
     * Returns the global loading progress (0.0 to 1.0).
     */
    static getGlobalProgress(): number;
    private static _fetchWithProgress;
    private static _checkCompletion;
    static loadImage(url: string, onProgress?: ProgressCallback, flipY?: boolean): Promise<ImageBitmap | HTMLImageElement>;
    static loadText(url: string, onProgress?: ProgressCallback): Promise<string>;
}

/**
 * Centralized class for hardware and browser feature detection.
 * Provides information about supported renderers and API features.
 */
export declare class DeviceCaps {
    private static _isInitialized;
    private static _hasWebGL1;
    private static _hasWebGL2;
    private static _hasWebGPU;
    private static _hasCanvasRoundRect;
    private static _maxTextureSize;
    /**
     * Initializes the feature detection.
     * This is called automatically by the Engine, but can be called manually.
     */
    static init(): void;
    static get hasWebGL1(): boolean;
    static get hasWebGL2(): boolean;
    static get hasWebGPU(): boolean;
    static get hasCanvasRoundRect(): boolean;
    static get maxTextureSize(): number;
}

/**
 * Utility to load and register all standard shader chunks used by the engine.
 */
export declare class CoreShaderChunks {
    private static _isInitialized;
    /**
     * Initializes the registry with all standard chunks for all supported languages.
     */
    static init(): Promise<void>;
}

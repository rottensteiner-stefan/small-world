/**
 * Modern Bootstrapper for the ShaderRegistry.
 * Handles global chunk initialization. Core materials register themselves automatically.
 */
export declare class ShaderBootstrap {
    private static _isInitialized;
    /**
     * Initializes the registry by loading standard chunks.
     */
    static init(): Promise<void>;
}

/**
 * Bootstraps the ShaderRegistry with default chunks and shader definitions by loading them from files.
 */
export declare class ShaderBootstrap {
    private static _isInitialized;
    /**
     * Initializes the registry with all standard shaders and chunks.
     */
    static init(): Promise<void>;
}

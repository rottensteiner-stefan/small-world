/**
 * Modern Bootstrapper for the ShaderRegistry.
 * Instead of hardcoding everything, it uses decentralized registration.
 */
export declare class ShaderBootstrap {
    private static _isInitialized;
    /**
     * Initializes the registry by loading standard chunks and registering core material providers.
     */
    static init(): Promise<void>;
}

/**
 * Supported boolean features for device capability detection.
 */
export declare enum DeviceFeature {
    WEBGL1 = "WEBGL1",
    WEBGL2 = "WEBGL2",
    WEBGPU = "WEBGPU",
    CANVAS_ROUND_RECT = "CANVAS_ROUND_RECT",
    OFFSCREEN_CANVAS = "OFFSCREEN_CANVAS",
    TOUCH = "TOUCH",
    GAMEPAD = "GAMEPAD",
    FLOAT_TEXTURES = "FLOAT_TEXTURES",
    COMPRESSED_TEXTURES = "COMPRESSED_TEXTURES"
}
/**
 * Supported numeric limits for hardware detection.
 */
export declare enum DeviceLimit {
    MAX_TEXTURE_SIZE = "MAX_TEXTURE_SIZE",
    MAX_ANISOTROPY = "MAX_ANISOTROPY",
    MAX_UNIFORM_BUFFER_SIZE = "MAX_UNIFORM_BUFFER_SIZE",
    MAX_MSAA_SAMPLES = "MAX_MSAA_SAMPLES",
    MAX_VERTEX_ATTRIBUTES = "MAX_VERTEX_ATTRIBUTES"
}
/**
 * Centralized class for hardware and browser feature detection.
 * Provides information about supported renderers, API features, and hardware limits.
 */
export declare class DeviceCaps {
    private static _isInitialized;
    private static _hasWebGL1;
    private static _hasWebGL2;
    private static _hasWebGPU;
    private static _hasCanvasRoundRect;
    private static _hasOffscreenCanvas;
    private static _hasTouch;
    private static _hasGamepad;
    private static _maxTextureSize;
    private static _maxAnisotropy;
    private static _maxUniformBufferSize;
    private static _maxMsaaSamples;
    private static _maxVertexAttributes;
    private static _hasFloatTextures;
    private static _hasCompressedTextures;
    /**
     * Initializes the feature detection.
     * This is called automatically by the Engine, but can be called manually.
     */
    static init(): void;
    /**
     * Updates hardware limits. Used by renderers to provide more precise values.
     */
    static updateLimits(limits: {
        maxTextureSize?: number;
        maxUniformBufferSize?: number;
        maxAnisotropy?: number;
        maxMsaaSamples?: number;
    }): void;
    /**
     * Returns whether a specific boolean feature is supported by the current device.
     * @param feature The feature to check.
     */
    static hasFeature(feature: DeviceFeature): boolean;
    /**
     * Returns a specific hardware limit for the current device.
     * @param limit The limit to query.
     */
    static getLimit(limit: DeviceLimit): number;
}

export declare enum PerformanceTier {
    LOW = "LOW",
    MEDIUM = "MEDIUM",
    HIGH = "HIGH"
}
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
    COMPRESSED_TEXTURES = "COMPRESSED_TEXTURES",
    ASYNC = "ASYNC",
    WASM = "WASM",
    WORKERS = "WORKERS",
    DEVICE_ORIENTATION = "DEVICE_ORIENTATION",
    DEVICE_MOTION = "DEVICE_MOTION",
    GENERIC_SENSORS = "GENERIC_SENSORS"
}
/**
 * Supported numeric limits for hardware detection.
 */
export declare enum DeviceLimit {
    MAX_TEXTURE_SIZE = "MAX_TEXTURE_SIZE",
    MAX_ANISOTROPY = "MAX_ANISOTROPY",
    MAX_UNIFORM_BUFFER_SIZE = "MAX_UNIFORM_BUFFER_SIZE",
    MAX_MSAA_SAMPLES = "MAX_MSAA_SAMPLES",
    MAX_VERTEX_ATTRIBUTES = "MAX_VERTEX_ATTRIBUTES",
    MAX_TEXTURE_IMAGE_UNITS = "MAX_TEXTURE_IMAGE_UNITS",
    MAX_VERTEX_UNIFORM_VECTORS = "MAX_VERTEX_UNIFORM_VECTORS",
    MAX_FRAGMENT_UNIFORM_VECTORS = "MAX_FRAGMENT_UNIFORM_VECTORS"
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
    private static _maxTextureImageUnits;
    private static _maxVertexUniformVectors;
    private static _maxFragmentUniformVectors;
    private static _hasFloatTextures;
    private static _hasCompressedTextures;
    private static _gpuModel;
    private static _hasAsync;
    private static _hasWasm;
    private static _hasWorkers;
    private static _hasDeviceOrientation;
    private static _hasDeviceMotion;
    private static _hasGenericSensors;
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
        maxTextureImageUnits?: number;
        maxVertexUniformVectors?: number;
        maxFragmentUniformVectors?: number;
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
    /**
     * Returns the unmasked GPU model if available.
     */
    static get gpuModel(): string;
    /**
     * Returns true if the application is running on a mobile device (phone or tablet).
     */
    static isMobile(): boolean;
    static get cores(): number;
    static get memoryGB(): number;
    static get pixelRatio(): number;
    static get screenWidth(): number;
    static get screenHeight(): number;
    /**
     * Uses experimental flags and hardware information to guess the device's performance capability.
     */
    static getPerformanceTier(): PerformanceTier;
}

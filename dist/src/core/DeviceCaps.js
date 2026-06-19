/// src/core/DeviceCaps.ts
/**
 * Supported boolean features for device capability detection.
 */
export var DeviceFeature;
(function (DeviceFeature) {
    DeviceFeature["WEBGL1"] = "WEBGL1";
    DeviceFeature["WEBGL2"] = "WEBGL2";
    DeviceFeature["WEBGPU"] = "WEBGPU";
    DeviceFeature["CANVAS_ROUND_RECT"] = "CANVAS_ROUND_RECT";
    DeviceFeature["OFFSCREEN_CANVAS"] = "OFFSCREEN_CANVAS";
    DeviceFeature["TOUCH"] = "TOUCH";
    DeviceFeature["GAMEPAD"] = "GAMEPAD";
    DeviceFeature["FLOAT_TEXTURES"] = "FLOAT_TEXTURES";
    DeviceFeature["COMPRESSED_TEXTURES"] = "COMPRESSED_TEXTURES";
})(DeviceFeature || (DeviceFeature = {}));
/**
 * Supported numeric limits for hardware detection.
 */
export var DeviceLimit;
(function (DeviceLimit) {
    DeviceLimit["MAX_TEXTURE_SIZE"] = "MAX_TEXTURE_SIZE";
    DeviceLimit["MAX_ANISOTROPY"] = "MAX_ANISOTROPY";
    DeviceLimit["MAX_UNIFORM_BUFFER_SIZE"] = "MAX_UNIFORM_BUFFER_SIZE";
    DeviceLimit["MAX_MSAA_SAMPLES"] = "MAX_MSAA_SAMPLES";
    DeviceLimit["MAX_VERTEX_ATTRIBUTES"] = "MAX_VERTEX_ATTRIBUTES";
    DeviceLimit["MAX_TEXTURE_IMAGE_UNITS"] = "MAX_TEXTURE_IMAGE_UNITS";
    DeviceLimit["MAX_VERTEX_UNIFORM_VECTORS"] = "MAX_VERTEX_UNIFORM_VECTORS";
    DeviceLimit["MAX_FRAGMENT_UNIFORM_VECTORS"] = "MAX_FRAGMENT_UNIFORM_VECTORS";
})(DeviceLimit || (DeviceLimit = {}));
/**
 * Centralized class for hardware and browser feature detection.
 * Provides information about supported renderers, API features, and hardware limits.
 */
export class DeviceCaps {
    static _isInitialized = false;
    // Renderers
    static _hasWebGL1 = false;
    static _hasWebGL2 = false;
    static _hasWebGPU = false;
    // Canvas & Browser Features
    static _hasCanvasRoundRect = false;
    static _hasOffscreenCanvas = false;
    static _hasTouch = false;
    static _hasGamepad = false;
    // Hardware Limits
    static _maxTextureSize = 0;
    static _maxAnisotropy = 1;
    static _maxUniformBufferSize = 0;
    static _maxMsaaSamples = 1;
    static _maxVertexAttributes = 0;
    static _maxTextureImageUnits = 0;
    static _maxVertexUniformVectors = 0;
    static _maxFragmentUniformVectors = 0;
    // Specialized Features
    static _hasFloatTextures = false;
    static _hasCompressedTextures = false;
    /**
     * Initializes the feature detection.
     * This is called automatically by the Engine, but can be called manually.
     */
    static init() {
        if (this._isInitialized)
            return;
        // 1. Basic Browser & Platform Checks
        this._hasCanvasRoundRect = typeof CanvasRenderingContext2D.prototype.roundRect === "function";
        this._hasOffscreenCanvas = typeof OffscreenCanvas !== "undefined";
        this._hasTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
        this._hasGamepad = !!navigator.getGamepads;
        // 2. Check WebGL support & limits
        // WebGL 1
        try {
            const gl1Canvas = document.createElement("canvas");
            const gl = (gl1Canvas.getContext("webgl") ||
                gl1Canvas.getContext("experimental-webgl"));
            this._hasWebGL1 = !!gl;
            if (gl) {
                this._maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
                this._maxVertexAttributes = gl.getParameter(gl.MAX_VERTEX_ATTRIBS);
                this._maxTextureImageUnits = gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS);
                this._maxVertexUniformVectors = gl.getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS);
                this._maxFragmentUniformVectors = gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS);
                // Check Anisotropy
                const extAni = gl.getExtension("EXT_texture_filter_anisotropic") ||
                    gl.getExtension("WEBKIT_EXT_texture_filter_anisotropic") ||
                    gl.getExtension("MOZ_EXT_texture_filter_anisotropic");
                if (extAni) {
                    this._maxAnisotropy = gl.getParameter(extAni.MAX_TEXTURE_MAX_ANISOTROPY_EXT);
                }
                // Check Float Textures
                this._hasFloatTextures = !!gl.getExtension("OES_texture_float");
                // Check Compressed Textures (Standard S3TC)
                this._hasCompressedTextures = !!gl.getExtension("WEBGL_compressed_texture_s3tc");
            }
        }
        catch {
            this._hasWebGL1 = false;
        }
        // WebGL 2
        try {
            const gl2Canvas = document.createElement("canvas");
            const gl2 = gl2Canvas.getContext("webgl2");
            this._hasWebGL2 = !!gl2;
            if (gl2) {
                this._maxTextureSize = Math.max(this._maxTextureSize, gl2.getParameter(gl2.MAX_TEXTURE_SIZE));
                this._maxUniformBufferSize = gl2.getParameter(gl2.MAX_UNIFORM_BLOCK_SIZE);
                this._maxMsaaSamples = gl2.getParameter(gl2.MAX_SAMPLES);
                this._maxTextureImageUnits = Math.max(this._maxTextureImageUnits, gl2.getParameter(gl2.MAX_TEXTURE_IMAGE_UNITS));
                this._maxVertexUniformVectors = Math.max(this._maxVertexUniformVectors, gl2.getParameter(gl2.MAX_VERTEX_UNIFORM_VECTORS));
                this._maxFragmentUniformVectors = Math.max(this._maxFragmentUniformVectors, gl2.getParameter(gl2.MAX_FRAGMENT_UNIFORM_VECTORS));
                this._hasFloatTextures = true; // Required by spec in WebGL2
            }
        }
        catch {
            this._hasWebGL2 = false;
        }
        // 3. Initial WebGPU check (Limits will be updated by Renderer asynchronously)
        this._hasWebGPU = !!navigator.gpu;
        this._isInitialized = true;
        console.log("[DeviceCaps] Initialized:", {
            renderers: { WebGL1: this._hasWebGL1, WebGL2: this._hasWebGL2, WebGPU: this._hasWebGPU },
            limits: {
                textureSize: this._maxTextureSize,
                anisotropy: this._maxAnisotropy,
                uniformBuffer: this._maxUniformBufferSize,
                msaa: this._maxMsaaSamples,
                textureUnits: this._maxTextureImageUnits,
                vertexUniforms: this._maxVertexUniformVectors,
                fragmentUniforms: this._maxFragmentUniformVectors,
            },
            features: {
                floatTex: this._hasFloatTextures,
                compressedTex: this._hasCompressedTextures,
                roundRect: this._hasCanvasRoundRect,
            },
            platform: {
                touch: this._hasTouch,
                gamepad: this._hasGamepad,
                offscreen: this._hasOffscreenCanvas,
            },
        });
    }
    /**
     * Updates hardware limits. Used by renderers to provide more precise values.
     */
    static updateLimits(limits) {
        if (limits.maxTextureSize)
            this._maxTextureSize = Math.max(this._maxTextureSize, limits.maxTextureSize);
        if (limits.maxUniformBufferSize)
            this._maxUniformBufferSize = Math.max(this._maxUniformBufferSize, limits.maxUniformBufferSize);
        if (limits.maxAnisotropy)
            this._maxAnisotropy = Math.max(this._maxAnisotropy, limits.maxAnisotropy);
        if (limits.maxMsaaSamples)
            this._maxMsaaSamples = Math.max(this._maxMsaaSamples, limits.maxMsaaSamples);
        if (limits.maxTextureImageUnits)
            this._maxTextureImageUnits = Math.max(this._maxTextureImageUnits, limits.maxTextureImageUnits);
        if (limits.maxVertexUniformVectors)
            this._maxVertexUniformVectors = Math.max(this._maxVertexUniformVectors, limits.maxVertexUniformVectors);
        if (limits.maxFragmentUniformVectors)
            this._maxFragmentUniformVectors = Math.max(this._maxFragmentUniformVectors, limits.maxFragmentUniformVectors);
    }
    /**
     * Returns whether a specific boolean feature is supported by the current device.
     * @param feature The feature to check.
     */
    static hasFeature(feature) {
        if (!this._isInitialized)
            this.init();
        switch (feature) {
            case DeviceFeature.WEBGL1:
                return this._hasWebGL1;
            case DeviceFeature.WEBGL2:
                return this._hasWebGL2;
            case DeviceFeature.WEBGPU:
                return this._hasWebGPU;
            case DeviceFeature.CANVAS_ROUND_RECT:
                return this._hasCanvasRoundRect;
            case DeviceFeature.OFFSCREEN_CANVAS:
                return this._hasOffscreenCanvas;
            case DeviceFeature.TOUCH:
                return this._hasTouch;
            case DeviceFeature.GAMEPAD:
                return this._hasGamepad;
            case DeviceFeature.FLOAT_TEXTURES:
                return this._hasFloatTextures;
            case DeviceFeature.COMPRESSED_TEXTURES:
                return this._hasCompressedTextures;
            default:
                return false;
        }
    }
    /**
     * Returns a specific hardware limit for the current device.
     * @param limit The limit to query.
     */
    static getLimit(limit) {
        if (!this._isInitialized)
            this.init();
        switch (limit) {
            case DeviceLimit.MAX_TEXTURE_SIZE:
                return this._maxTextureSize;
            case DeviceLimit.MAX_ANISOTROPY:
                return this._maxAnisotropy;
            case DeviceLimit.MAX_UNIFORM_BUFFER_SIZE:
                return this._maxUniformBufferSize;
            case DeviceLimit.MAX_MSAA_SAMPLES:
                return this._maxMsaaSamples;
            case DeviceLimit.MAX_VERTEX_ATTRIBUTES:
                return this._maxVertexAttributes;
            case DeviceLimit.MAX_TEXTURE_IMAGE_UNITS:
                return this._maxTextureImageUnits;
            case DeviceLimit.MAX_VERTEX_UNIFORM_VECTORS:
                return this._maxVertexUniformVectors;
            case DeviceLimit.MAX_FRAGMENT_UNIFORM_VECTORS:
                return this._maxFragmentUniformVectors;
            default:
                return 0;
        }
    }
}
//# sourceMappingURL=DeviceCaps.js.map
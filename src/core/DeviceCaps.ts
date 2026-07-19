/// src/core/DeviceCaps.ts

export enum PerformanceTier {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
}

/**
 * Supported boolean features for device capability detection.
 */
export enum DeviceFeature {
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
  GENERIC_SENSORS = "GENERIC_SENSORS",
}

/**
 * Supported numeric limits for hardware detection.
 */
export enum DeviceLimit {
  MAX_TEXTURE_SIZE = "MAX_TEXTURE_SIZE",
  MAX_ANISOTROPY = "MAX_ANISOTROPY",
  MAX_UNIFORM_BUFFER_SIZE = "MAX_UNIFORM_BUFFER_SIZE",
  MAX_MSAA_SAMPLES = "MAX_MSAA_SAMPLES",
  MAX_VERTEX_ATTRIBUTES = "MAX_VERTEX_ATTRIBUTES",
  MAX_TEXTURE_IMAGE_UNITS = "MAX_TEXTURE_IMAGE_UNITS",
  MAX_VERTEX_UNIFORM_VECTORS = "MAX_VERTEX_UNIFORM_VECTORS",
  MAX_FRAGMENT_UNIFORM_VECTORS = "MAX_FRAGMENT_UNIFORM_VECTORS",
}

/**
 * Centralized class for hardware and browser feature detection.
 * Provides information about supported renderers, API features, and hardware limits.
 */
export class DeviceCaps {
  private static _isInitialized: boolean = false;

  // Renderers
  private static _hasWebGL1: boolean = false;
  private static _hasWebGL2: boolean = false;
  private static _hasWebGPU: boolean = false;

  // Canvas & Browser Features
  private static _hasCanvasRoundRect: boolean = false;
  private static _hasOffscreenCanvas: boolean = false;
  private static _hasTouch: boolean = false;
  private static _hasGamepad: boolean = false;

  // Hardware Limits
  private static _maxTextureSize: number = 0;
  private static _maxAnisotropy: number = 1;
  private static _maxUniformBufferSize: number = 0;
  private static _maxMsaaSamples: number = 1;
  private static _maxVertexAttributes: number = 0;
  private static _maxTextureImageUnits: number = 0;
  private static _maxVertexUniformVectors: number = 0;
  private static _maxFragmentUniformVectors: number = 0;

  // Specialized Features
  private static _hasFloatTextures: boolean = false;
  private static _hasCompressedTextures: boolean = false;
  private static _gpuModel: string = "Unknown";
  private static _hasAsync: boolean = false;
  private static _hasWasm: boolean = false;
  private static _hasWorkers: boolean = false;
  private static _hasDeviceOrientation: boolean = false;
  private static _hasDeviceMotion: boolean = false;
  private static _hasGenericSensors: boolean = false;

  /**
   * Initializes the feature detection.
   * This is called automatically by the Engine, but can be called manually.
   */
  public static init(): void {
    if (this._isInitialized) return;

    // 1. Basic Browser & Platform Checks
    this._hasCanvasRoundRect = typeof CanvasRenderingContext2D.prototype.roundRect === "function";
    this._hasOffscreenCanvas = typeof OffscreenCanvas !== "undefined";
    this._hasTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    this._hasGamepad = !!navigator.getGamepads;

    try {
      this._hasAsync = typeof new Function("return async () => {}")() === "function";
    } catch {
      this._hasAsync = false;
    }
    this._hasWasm =
      typeof WebAssembly === "object" && typeof WebAssembly.instantiate === "function";
    this._hasWorkers = typeof Worker !== "undefined";
    this._hasDeviceOrientation =
      typeof window !== "undefined" && "DeviceOrientationEvent" in window;
    this._hasDeviceMotion = typeof window !== "undefined" && "DeviceMotionEvent" in window;
    this._hasGenericSensors = typeof window !== "undefined" && "Sensor" in window;

    // 2. Check WebGL support & limits
    // WebGL 1
    try {
      const gl1Canvas = document.createElement("canvas");
      const gl = (gl1Canvas.getContext("webgl") ||
        gl1Canvas.getContext("experimental-webgl")) as WebGLRenderingContext;
      this._hasWebGL1 = !!gl;
      if (gl) {
        this._maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
        this._maxVertexAttributes = gl.getParameter(gl.MAX_VERTEX_ATTRIBS);
        this._maxTextureImageUnits = gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS);
        this._maxVertexUniformVectors = gl.getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS);
        this._maxFragmentUniformVectors = gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS);

        // Check Anisotropy
        const extAni =
          gl.getExtension("EXT_texture_filter_anisotropic") ||
          gl.getExtension("WEBKIT_EXT_texture_filter_anisotropic") ||
          gl.getExtension("MOZ_EXT_texture_filter_anisotropic");
        if (extAni) {
          this._maxAnisotropy = gl.getParameter(extAni.MAX_TEXTURE_MAX_ANISOTROPY_EXT);
        }

        // Check Float Textures
        this._hasFloatTextures = !!gl.getExtension("OES_texture_float");

        // Check Compressed Textures (Standard S3TC)
        this._hasCompressedTextures = !!gl.getExtension("WEBGL_compressed_texture_s3tc");

        // Check GPU Model
        const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
        if (debugInfo) {
          this._gpuModel = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
        }
      }
    } catch {
      this._hasWebGL1 = false;
    }

    // WebGL 2
    try {
      const gl2Canvas = document.createElement("canvas");
      const gl2 = gl2Canvas.getContext("webgl2") as WebGL2RenderingContext;
      this._hasWebGL2 = !!gl2;
      if (gl2) {
        this._maxTextureSize = Math.max(
          this._maxTextureSize,
          gl2.getParameter(gl2.MAX_TEXTURE_SIZE),
        );
        this._maxUniformBufferSize = gl2.getParameter(gl2.MAX_UNIFORM_BLOCK_SIZE);
        this._maxMsaaSamples = gl2.getParameter(gl2.MAX_SAMPLES);
        this._maxTextureImageUnits = Math.max(
          this._maxTextureImageUnits,
          gl2.getParameter(gl2.MAX_TEXTURE_IMAGE_UNITS),
        );
        this._maxVertexUniformVectors = Math.max(
          this._maxVertexUniformVectors,
          gl2.getParameter(gl2.MAX_VERTEX_UNIFORM_VECTORS),
        );
        this._maxFragmentUniformVectors = Math.max(
          this._maxFragmentUniformVectors,
          gl2.getParameter(gl2.MAX_FRAGMENT_UNIFORM_VECTORS),
        );
        this._hasFloatTextures = true; // Required by spec in WebGL2
      }
    } catch {
      this._hasWebGL2 = false;
    }

    // 3. Initial WebGPU check (Limits will be updated by Renderer asynchronously)
    this._hasWebGPU = !!(navigator as unknown as { gpu: unknown }).gpu;

    this._isInitialized = true;
  }

  /**
   * Updates hardware limits. Used by renderers to provide more precise values.
   */
  public static updateLimits(limits: {
    maxTextureSize?: number;
    maxUniformBufferSize?: number;
    maxAnisotropy?: number;
    maxMsaaSamples?: number;
    maxTextureImageUnits?: number;
    maxVertexUniformVectors?: number;
    maxFragmentUniformVectors?: number;
  }): void {
    if (limits.maxTextureSize)
      this._maxTextureSize = Math.max(this._maxTextureSize, limits.maxTextureSize);
    if (limits.maxUniformBufferSize)
      this._maxUniformBufferSize = Math.max(
        this._maxUniformBufferSize,
        limits.maxUniformBufferSize,
      );
    if (limits.maxAnisotropy)
      this._maxAnisotropy = Math.max(this._maxAnisotropy, limits.maxAnisotropy);
    if (limits.maxMsaaSamples)
      this._maxMsaaSamples = Math.max(this._maxMsaaSamples, limits.maxMsaaSamples);
    if (limits.maxTextureImageUnits)
      this._maxTextureImageUnits = Math.max(
        this._maxTextureImageUnits,
        limits.maxTextureImageUnits,
      );
    if (limits.maxVertexUniformVectors)
      this._maxVertexUniformVectors = Math.max(
        this._maxVertexUniformVectors,
        limits.maxVertexUniformVectors,
      );
    if (limits.maxFragmentUniformVectors)
      this._maxFragmentUniformVectors = Math.max(
        this._maxFragmentUniformVectors,
        limits.maxFragmentUniformVectors,
      );
  }

  /**
   * Returns whether a specific boolean feature is supported by the current device.
   * @param feature The feature to check.
   */
  public static hasFeature(feature: DeviceFeature): boolean {
    if (!this._isInitialized) this.init();
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
      case DeviceFeature.ASYNC:
        return this._hasAsync;
      case DeviceFeature.WASM:
        return this._hasWasm;
      case DeviceFeature.WORKERS:
        return this._hasWorkers;
      case DeviceFeature.DEVICE_ORIENTATION:
        return this._hasDeviceOrientation;
      case DeviceFeature.DEVICE_MOTION:
        return this._hasDeviceMotion;
      case DeviceFeature.GENERIC_SENSORS:
        return this._hasGenericSensors;
      default:
        return false;
    }
  }

  /**
   * Returns a specific hardware limit for the current device.
   * @param limit The limit to query.
   */
  public static getLimit(limit: DeviceLimit): number {
    if (!this._isInitialized) this.init();
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

  /**
   * Returns the unmasked GPU model if available.
   */
  public static get gpuModel(): string {
    return this._gpuModel;
  }

  /**
   * Returns true if the application is running on a mobile device (phone or tablet).
   */
  public static isMobile(): boolean {
    if (typeof window === "undefined") {
      return false;
    }

    if (window.matchMedia && window.matchMedia("(pointer: coarse)").matches) {
      return true;
    }

    const hasTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    if (hasTouch && window.innerWidth <= 1024) {
      return true;
    }

    return false;
  }

  public static get cores(): number {
    if (typeof navigator === "undefined") return 4;
    return navigator.hardwareConcurrency || 4;
  }

  public static get memoryGB(): number {
    if (typeof navigator === "undefined") return 4;
    return (navigator as unknown as { deviceMemory?: number }).deviceMemory || 4;
  }

  public static get pixelRatio(): number {
    if (typeof window === "undefined") return 1;
    return window.devicePixelRatio || 1;
  }

  public static get screenWidth(): number {
    if (typeof window === "undefined") return 1920;
    return window.screen.width;
  }

  public static get screenHeight(): number {
    if (typeof window === "undefined") return 1080;
    return window.screen.height;
  }

  /**
   * Uses experimental flags and hardware information to guess the device's performance capability.
   */
  public static getPerformanceTier(): PerformanceTier {
    if (typeof navigator === "undefined") return PerformanceTier.MEDIUM;

    let score = 0;

    // 1. Hardware Concurrency (Logical CPU cores)
    const cores = this.cores;
    if (cores >= 8) score += 2;
    else if (cores > 4) score += 1;

    // 2. Device Memory (Experimental Web API - returns RAM in GB, capped usually at 8)
    const memory = this.memoryGB;
    if (memory >= 8) score += 2;
    else if (memory > 4) score += 1;

    // 3. Next-Gen API presence (WebGPU)
    if (navigator.gpu) score += 1;

    // 4. Form factor penalty (Mobile devices thermally throttle much faster)
    if (this.isMobile()) {
      score -= 2;
    }

    if (score >= 4) return PerformanceTier.HIGH;
    if (score >= 2) return PerformanceTier.MEDIUM;
    return PerformanceTier.LOW;
  }
}

/// src/core/DeviceCaps.ts

/**
 * Centralized class for hardware and browser feature detection.
 * Provides information about supported renderers and API features.
 */
export class DeviceCaps {
  private static _isInitialized: boolean = false;

  private static _hasWebGL1: boolean = false;
  private static _hasWebGL2: boolean = false;
  private static _hasWebGPU: boolean = false;
  private static _hasCanvasRoundRect: boolean = false;
  private static _maxTextureSize: number = 0;

  /**
   * Initializes the feature detection.
   * This is called automatically by the Engine, but can be called manually.
   */
  public static init(): void {
    if (this._isInitialized) return;

    // 1. Check Canvas features
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    this._hasCanvasRoundRect = !!ctx && typeof ctx.roundRect === "function";

    // 2. Check WebGL support
    try {
      const gl1 = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
      this._hasWebGL1 = !!gl1;
      if (gl1) {
        this._maxTextureSize = (gl1 as WebGLRenderingContext).getParameter(
          (gl1 as WebGLRenderingContext).MAX_TEXTURE_SIZE,
        );
      }

      const gl2 = canvas.getContext("webgl2");
      this._hasWebGL2 = !!gl2;
    } catch {
      this._hasWebGL1 = false;
      this._hasWebGL2 = false;
    }

    // 3. Check WebGPU support
    this._hasWebGPU = !!(navigator as unknown as { gpu: unknown }).gpu;

    this._isInitialized = true;
    console.log("[DeviceCaps] Initialized:", {
      webgl1: this._hasWebGL1,
      webgl2: this._hasWebGL2,
      webgpu: this._hasWebGPU,
      roundRect: this._hasCanvasRoundRect,
      maxTextureSize: this._maxTextureSize,
    });
  }

  public static get hasWebGL1(): boolean {
    if (!this._isInitialized) this.init();
    return this._hasWebGL1;
  }

  public static get hasWebGL2(): boolean {
    if (!this._isInitialized) this.init();
    return this._hasWebGL2;
  }

  public static get hasWebGPU(): boolean {
    if (!this._isInitialized) this.init();
    return this._hasWebGPU;
  }

  public static get hasCanvasRoundRect(): boolean {
    if (!this._isInitialized) this.init();
    return this._hasCanvasRoundRect;
  }

  public static get maxTextureSize(): number {
    if (!this._isInitialized) this.init();
    return this._maxTextureSize;
  }
}

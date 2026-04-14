/// src/math/MathUtils.ts

/**
 * Utility class for mathematical operations.
 */
export class MathUtils {
  public static readonly PI: number = Math.PI;
  public static readonly TWO_PI: number = Math.PI * 2.0;
  public static readonly HALF_PI: number = Math.PI / 2.0;
  public static readonly QUARTER_PI: number = Math.PI / 4.0;
  public static readonly DEG2RAD: number = Math.PI / 180.0;
  public static readonly RAD2DEG: number = 180.0 / Math.PI;

  private static _SIN_TABLE: Float32Array = new Float32Array(3600);
  private static _COS_TABLE: Float32Array = new Float32Array(3600);
  private static _isInit: boolean = false;

  /**
   * Initializes the sine and cosine lookup tables.
   */
  public static init(): void {
    if (this._isInit) {
      return;
    }

    for (let i: number = 0; 3600 > i; i++) {
      const rad: number = (i / 10) * MathUtils.DEG2RAD;
      this._SIN_TABLE[i] = Math.sin(rad);
      this._COS_TABLE[i] = Math.cos(rad);
    }

    this._isInit = true;
  }

  /**
   * Converts degrees to radians.
   * @param degrees The angle in degrees.
   * @returns The angle in radians.
   */
  public static degToRad(degrees: number): number {
    return degrees * MathUtils.DEG2RAD;
  }

  /**
   * Converts radians to degrees.
   * @param radians The angle in radians.
   * @returns The angle in degrees.
   */
  public static radToDeg(radians: number): number {
    return radians * MathUtils.RAD2DEG;
  }

  /**
   * Returns the sine of the given angle in radians using a lookup table.
   * @param rad The angle in radians.
   * @returns The sine of the angle.
   */
  public static fastSin(rad: number): number {
    let deg: number = (rad * 572.957) | 0;
    deg = ((deg % 3600) + 3600) % 3600;
    return this._SIN_TABLE[deg]!;
  }

  /**
   * Clamps a value between a minimum and maximum.
   * @param val The value to clamp.
   * @param min The minimum value.
   * @param max The maximum value.
   * @returns The clamped value.
   */
  public static clamp(val: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, val));
  }

  /**
   * Generates a unique identifier (UUID v4).
   * Uses crypto.randomUUID() if available, otherwise falls back to a simple random generator.
   * @returns A string representation of a UUID.
   */
  public static generateUUID(): string {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }

    // Fallback for insecure contexts or older browsers
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}

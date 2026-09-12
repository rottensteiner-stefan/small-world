/**
 * Utility class for mathematical operations and constants.
 */
export class MathUtils {
  /** Mathematical constant PI. */
  public static readonly PI: number = Math.PI;
  /** Mathematical constant 2 * PI. */
  public static readonly TWO_PI: number = Math.PI * 2.0;
  /** Mathematical constant PI / 2. */
  public static readonly HALF_PI: number = Math.PI / 2.0;
  /** Mathematical constant PI / 4. */
  public static readonly QUARTER_PI: number = Math.PI / 4.0;
  /** Constant to convert degrees to radians. */
  public static readonly DEG2RAD: number = Math.PI / 180.0;
  /** Constant to convert radians to degrees. */
  public static readonly RAD2DEG: number = 180.0 / Math.PI;

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
   * Returns the sine of the given angle in radians.
   * @param rad The angle in radians.
   * @returns The sine of the angle.
   */
  public static fastSin(rad: number): number {
    return Math.sin(rad);
  }

  /**
   * Returns the cosine of the given angle in radians.
   * @param rad The angle in radians.
   * @returns The cosine of the angle.
   */
  public static fastCos(rad: number): number {
    return Math.cos(rad);
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
   * Linearly interpolates between two numbers by a factor `t`.
   * @param a The start value (returned when t = 0).
   * @param b The end value (returned when t = 1).
   * @param t The interpolation factor, typically in [0, 1].
   * @returns The interpolated value.
   */
  public static lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  /**
   * Reads an element from a fixed-size array whose bounds are guaranteed
   * correct by construction (e.g. Float32Array components of a Matrix4/
   * Quaternion, or a small fixed axis list) — centralizes the
   * `noUncheckedIndexedAccess` trust boundary in one place instead of a raw
   * non-null assertion at every call site.
   * @param arr The array-like to read from.
   * @param index The index to read.
   * @returns The element at the given index.
   */
  public static at<T>(arr: ArrayLike<T>, index: number): T {
    return arr[index] as T;
  }

  /**
   * Generates a unique identifier (UUID v4).
   * Uses crypto.randomUUID() if available.
   * @returns A string representation of a UUID.
   */
  public static generateUUID(): string {
    if ("undefined" !== typeof crypto && "function" === typeof crypto.randomUUID) {
      return crypto.randomUUID();
    }

    // Fallback for insecure contexts or older browsers
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = "x" === c ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}

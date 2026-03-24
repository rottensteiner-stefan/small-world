/// src/math/MathUtils.ts
/**
 * Utility class for mathematical operations.
 */
export class MathUtils {
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

    for (let i = 0; i < 3600; i++) {
      const rad: number = (i / 10) * (Math.PI / 180);
      this._SIN_TABLE[i] = Math.sin(rad);
      this._COS_TABLE[i] = Math.cos(rad);
    }

    this._isInit = true;
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
}

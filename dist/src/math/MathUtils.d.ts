/**
 * Utility class for mathematical operations.
 */
export declare class MathUtils {
    static readonly PI: number;
    static readonly TWO_PI: number;
    static readonly HALF_PI: number;
    static readonly QUARTER_PI: number;
    static readonly DEG2RAD: number;
    static readonly RAD2DEG: number;
    private static _SIN_TABLE;
    private static _COS_TABLE;
    private static _isInit;
    /**
     * Initializes the sine and cosine lookup tables.
     */
    static init(): void;
    /**
     * Converts degrees to radians.
     * @param degrees The angle in degrees.
     * @returns The angle in radians.
     */
    static degToRad(degrees: number): number;
    /**
     * Converts radians to degrees.
     * @param radians The angle in radians.
     * @returns The angle in degrees.
     */
    static radToDeg(radians: number): number;
    /**
     * Returns the sine of the given angle in radians using a lookup table.
     * @param rad The angle in radians.
     * @returns The sine of the angle.
     */
    static fastSin(rad: number): number;
    /**
     * Clamps a value between a minimum and maximum.
     * @param val The value to clamp.
     * @param min The minimum value.
     * @param max The maximum value.
     * @returns The clamped value.
     */
    static clamp(val: number, min: number, max: number): number;
    /**
     * Generates a unique identifier (UUID v4).
     * Uses crypto.randomUUID() if available, otherwise falls back to a simple random generator.
     * @returns A string representation of a UUID.
     */
    static generateUUID(): string;
}

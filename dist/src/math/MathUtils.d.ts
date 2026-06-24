/**
 * Utility class for mathematical operations and constants.
 */
export declare class MathUtils {
    /** Mathematical constant PI. */
    static readonly PI: number;
    /** Mathematical constant 2 * PI. */
    static readonly TWO_PI: number;
    /** Mathematical constant PI / 2. */
    static readonly HALF_PI: number;
    /** Mathematical constant PI / 4. */
    static readonly QUARTER_PI: number;
    /** Constant to convert degrees to radians. */
    static readonly DEG2RAD: number;
    /** Constant to convert radians to degrees. */
    static readonly RAD2DEG: number;
    private static _SIN_TABLE;
    private static _COS_TABLE;
    private static _isInit;
    /**
     * Initializes the sine and cosine lookup tables for fast lookup.
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
     * Returns the cosine of the given angle in radians using a lookup table.
     * @param rad The angle in radians.
     * @returns The cosine of the angle.
     */
    static fastCos(rad: number): number;
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
     * Uses crypto.randomUUID() if available.
     * @returns A string representation of a UUID.
     */
    static generateUUID(): string;
}

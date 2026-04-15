import { Color } from '../core/index.js';
/**
 * Utility class for color conversions and manipulations.
 */
export declare class ColorUtils {
    private static _ctx;
    private static _getCtx;
    /**
     * Creates a Color instance from a CSS color string.
     * @param cssColor The CSS color string (e.g., "#ff0000", "rgb(255, 0, 0)", "red").
     * @returns A new Color instance.
     */
    static fromCSS(cssColor: string): Color;
}

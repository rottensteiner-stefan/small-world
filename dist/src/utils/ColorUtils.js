/// src/utils/ColorUtils.ts
import { Color } from "../core/index.js";
/**
 * Utility class for color conversions and manipulations.
 */
export class ColorUtils {
    static _ctx = undefined;
    static _getCtx() {
        if (undefined === this._ctx) {
            const canvas = document.createElement("canvas");
            canvas.width = 1;
            canvas.height = 1;
            this._ctx = canvas.getContext("2d", { willReadFrequently: true }) ?? undefined;
        }
        return this._ctx;
    }
    /**
     * Creates a Color instance from a CSS color string.
     * @param cssColor The CSS color string (e.g., "#ff0000", "rgb(255, 0, 0)", "red").
     * @returns A new Color instance.
     */
    static fromCSS(cssColor) {
        const ctx = this._getCtx();
        if (undefined === ctx) {
            return new Color(1, 1, 1, 1);
        }
        ctx.fillStyle = cssColor;
        ctx.fillRect(0, 0, 1, 1);
        const data = ctx.getImageData(0, 0, 1, 1).data;
        const r = data[0] ?? 255;
        const g = data[1] ?? 255;
        const b = data[2] ?? 255;
        const a = data[3] ?? 255;
        return new Color(r / 255, g / 255, b / 255, a / 255);
    }
}
//# sourceMappingURL=ColorUtils.js.map
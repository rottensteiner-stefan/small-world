import { Color } from "./Color.js";
export class ColorUtils {
    static _ctx = null;
    static getCtx() {
        if (!this._ctx) {
            const canvas = document.createElement("canvas");
            canvas.width = 1;
            canvas.height = 1;
            this._ctx = canvas.getContext("2d", { willReadFrequently: true });
        }
        return this._ctx;
    }
    static fromCSS(cssColor) {
        const ctx = this.getCtx();
        if (!ctx)
            return new Color(1, 1, 1, 1);
        ctx.fillStyle = cssColor;
        ctx.fillRect(0, 0, 1, 1);
        const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
        return new Color(r / 255, g / 255, b / 255, a / 255);
    }
}
//# sourceMappingURL=ColorUtils.js.map
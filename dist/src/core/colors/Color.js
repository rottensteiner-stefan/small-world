/// src/core/colors/Color.ts
import { Vector3D } from "../../math/index.js";
export class Color {
    r;
    g;
    b;
    a;
    /**
     * Creates a new Color.
     * @param r Red component (0-1).
     * @param g Green component (0-1).
     * @param b Blue component (0-1).
     * @param a Alpha component (0-1).
     */
    constructor(r = 0, g = 0, b = 0, a = 1.0) {
        this.r = r;
        this.g = g;
        this.b = b;
        this.a = a;
    }
    _cachedArray = new Float32Array(4);
    set(r = 0, g = 0, b = 0, a = 1.0) {
        this.r = r;
        this.g = g;
        this.b = b;
        this.a = a;
        return this;
    }
    copyFrom(color) {
        this.r = color.r;
        this.g = color.g;
        this.b = color.b;
        this.a = color.a;
        return this;
    }
    // --- CSS Level 1 / Basic Colors ---
    static get BLACK() {
        return new Color();
    }
    static get SILVER() {
        return new Color(0.753, 0.753, 0.753);
    }
    static get GRAY() {
        return new Color(0.5, 0.5, 0.5);
    }
    static get WHITE() {
        return new Color(1, 1, 1);
    }
    static get MAROON() {
        return new Color(0.502, 0, 0);
    }
    static get RED() {
        return new Color(1, 0, 0);
    }
    static get PURPLE() {
        return new Color(0.502, 0, 0.502);
    }
    static get FUCHSIA() {
        return new Color(1, 0, 1);
    }
    static get GREEN() {
        return new Color(0, 0.502, 0);
    }
    static get LIME() {
        return new Color(0, 1, 0);
    }
    static get OLIVE() {
        return new Color(0.502, 0.502, 0);
    }
    static get YELLOW() {
        return new Color(1, 1, 0);
    }
    static get NAVY() {
        return new Color(0, 0, 0.502);
    }
    static get BLUE() {
        return new Color(0, 0, 1);
    }
    static get TEAL() {
        return new Color(0, 0.502, 0.502);
    }
    static get AQUA() {
        return new Color(0, 1, 1);
    }
    // --- Extended Colors (CSS Level 2 & 3 / X11 Colors) ---
    static get ALICEBLUE() {
        return new Color(0.941, 0.973, 1);
    }
    static get ANTIQUEWHITE() {
        return new Color(0.98, 0.922, 0.843);
    }
    static get AQUAMARINE() {
        return new Color(0.498, 1, 0.831);
    }
    static get AZURE() {
        return new Color(0.941, 1, 1);
    }
    static get BEIGE() {
        return new Color(0.961, 0.961, 0.863);
    }
    static get BISQUE() {
        return new Color(1, 0.894, 0.769);
    }
    static get BLANCHEDALMOND() {
        return new Color(1, 0.922, 0.804);
    }
    static get BLUEVIOLET() {
        return new Color(0.541, 0.169, 0.886);
    }
    static get BROWN() {
        return new Color(0.647, 0.165, 0.165);
    }
    static get BURLYWOOD() {
        return new Color(0.871, 0.722, 0.529);
    }
    static get CADETBLUE() {
        return new Color(0.373, 0.62, 0.627);
    }
    static get CHARTREUSE() {
        return new Color(0.498, 1, 0);
    }
    static get CHOCOLATE() {
        return new Color(0.824, 0.412, 0.118);
    }
    static get CORAL() {
        return new Color(1, 0.498, 0.314);
    }
    static get CORNFLOWERBLUE() {
        return new Color(0.392, 0.584, 0.929);
    }
    static get CORNSILK() {
        return new Color(1, 0.973, 0.863);
    }
    static get CRIMSON() {
        return new Color(0.863, 0.078, 0.235);
    }
    static get CYAN() {
        return new Color(0, 1, 1);
    }
    static get DARKBLUE() {
        return new Color(0, 0, 0.545);
    }
    static get DARKCYAN() {
        return new Color(0, 0.545, 0.545);
    }
    static get DARKGOLDENROD() {
        return new Color(0.722, 0.525, 0.043);
    }
    static get DARKGRAY() {
        return new Color(0.663, 0.663, 0.663);
    }
    static get DARKGREEN() {
        return new Color(0, 0.392, 0);
    }
    static get DARKKHAKI() {
        return new Color(0.741, 0.718, 0.42);
    }
    static get DARKMAGENTA() {
        return new Color(0.545, 0, 0.545);
    }
    static get DARKOLIVEGREEN() {
        return new Color(0.333, 0.42, 0.184);
    }
    static get DARKORANGE() {
        return new Color(1, 0.549, 0);
    }
    static get DARKORCHID() {
        return new Color(0.6, 0.196, 0.8);
    }
    static get DARKRED() {
        return new Color(0.545, 0, 0);
    }
    static get DARKSALMON() {
        return new Color(0.914, 0.588, 0.478);
    }
    static get DARKSEAGREEN() {
        return new Color(0.561, 0.737, 0.561);
    }
    static get DARKSEAGREEN_X11() {
        return new Color(0.561, 0.737, 0.561);
    }
    static get DARKSLATEGRAY() {
        return new Color(0.184, 0.31, 0.31);
    }
    static get DARKTURQUOISE() {
        return new Color(0, 0.808, 0.82);
    }
    static get DARKVIOLET() {
        return new Color(0.58, 0, 0.827);
    }
    static get DEEPPINK() {
        return new Color(1, 0.078, 0.576);
    }
    static get DEEPSKYBLUE() {
        return new Color(0, 0.749, 1);
    }
    static get DIMGRAY() {
        return new Color(0.412, 0.412, 0.412);
    }
    static get DODGERBLUE() {
        return new Color(0.118, 0.565, 1);
    }
    static get FIREBRICK() {
        return new Color(0.698, 0.133, 0.133);
    }
    static get FLORALWHITE() {
        return new Color(1, 0.98, 0.941);
    }
    static get FORESTGREEN() {
        return new Color(0.133, 0.545, 0.133);
    }
    static get GAINSBORO() {
        return new Color(0.863, 0.863, 0.863);
    }
    static get GHOSTWHITE() {
        return new Color(0.973, 0.973, 1);
    }
    static get GOLD() {
        return new Color(1, 0.843, 0);
    }
    static get GOLDENROD() {
        return new Color(0.855, 0.647, 0.125);
    }
    static get GREENYELLOW() {
        return new Color(0.678, 1, 0.184);
    }
    static get HONEYDEW() {
        return new Color(0.941, 1, 0.941);
    }
    static get HOTPINK() {
        return new Color(1, 0.412, 0.706);
    }
    static get INDIANRED() {
        return new Color(0.804, 0.361, 0.361);
    }
    static get INDIGO() {
        return new Color(0.294, 0, 0.51);
    }
    static get IVORY() {
        return new Color(1, 1, 0.941);
    }
    static get KHAKI() {
        return new Color(0.941, 0.902, 0.549);
    }
    static get LAVENDER() {
        return new Color(0.902, 0.902, 0.98);
    }
    static get LAVENDERBLUSH() {
        return new Color(1, 0.941, 0.961);
    }
    static get LAWNGREEN() {
        return new Color(0.486, 0.988, 0);
    }
    static get LEMONCHIFFON() {
        return new Color(1, 0.98, 0.804);
    }
    static get LIGHTBLUE() {
        return new Color(0.678, 0.847, 0.902);
    }
    static get LIGHTCORAL() {
        return new Color(0.941, 0.502, 0.502);
    }
    static get LIGHTCYAN() {
        return new Color(0.878, 1, 1);
    }
    static get LIGHTGOLDENRODYELLOW() {
        return new Color(0.98, 0.98, 0.824);
    }
    static get LIGHTGRAY() {
        return new Color(0.827, 0.827, 0.827);
    }
    static get LIGHTGREEN() {
        return new Color(0.565, 0.933, 0.565);
    }
    static get LIGHTPINK() {
        return new Color(1, 0.714, 0.757);
    }
    static get LIGHTSALMON() {
        return new Color(1, 0.627, 0.478);
    }
    static get LIGHTSEAGREEN() {
        return new Color(0.125, 0.698, 0.667);
    }
    static get LIGHTSKYBLUE() {
        return new Color(0.529, 0.808, 0.98);
    }
    static get LIGHTSLATEGRAY() {
        return new Color(0.467, 0.533, 0.6);
    }
    static get LIGHTSTEELBLUE() {
        return new Color(0.69, 0.769, 0.871);
    }
    static get LIGHTYELLOW() {
        return new Color(1, 1, 0.878);
    }
    static get LIMEGREEN() {
        return new Color(0.196, 0.804, 0.196);
    }
    static get LINEN() {
        return new Color(0.98, 0.941, 0.902);
    }
    static get MAGENTA() {
        return new Color(1, 0, 1);
    }
    static get MEDIUMAQUAMARINE() {
        return new Color(0.4, 0.804, 0.667);
    }
    static get MEDIUMBLUE() {
        return new Color(0, 0, 0.804);
    }
    static get MEDIUMORCHID() {
        return new Color(0.729, 0.333, 0.827);
    }
    static get MEDIUMPURPLE() {
        return new Color(0.576, 0.439, 0.859);
    }
    static get MEDIUMSEAGREEN() {
        return new Color(0.235, 0.702, 0.443);
    }
    static get MEDIUMSLATEBLUE() {
        return new Color(0.482, 0.408, 0.933);
    }
    static get MEDIUMSPRINGGREEN() {
        return new Color(0, 0.98, 0.604);
    }
    static get MEDIUMTURQUOISE() {
        return new Color(0.282, 0.82, 0.8);
    }
    static get MEDIUMVIOLETRED() {
        return new Color(0.78, 0.082, 0.522);
    }
    static get MIDNIGHTBLUE() {
        return new Color(0.098, 0.098, 0.439);
    }
    static get MINTCREAM() {
        return new Color(0.961, 1, 0.98);
    }
    static get MISTYROSE() {
        return new Color(1, 0.894, 0.882);
    }
    static get MOCCASIN() {
        return new Color(1, 0.894, 0.71);
    }
    static get NAVAJOWHITE() {
        return new Color(1, 0.871, 0.678);
    }
    static get OLDLACE() {
        return new Color(0.992, 0.961, 0.902);
    }
    static get OLIVEDRAB() {
        return new Color(0.42, 0.557, 0.137);
    }
    static get ORANGE() {
        return new Color(1, 0.647, 0);
    }
    static get ORANGERED() {
        return new Color(1, 0.271, 0);
    }
    static get ORCHID() {
        return new Color(0.855, 0.439, 0.839);
    }
    static get PALEGOLDENROD() {
        return new Color(0.933, 0.91, 0.667);
    }
    static get PALEGREEN() {
        return new Color(0.596, 0.984, 0.596);
    }
    static get PALETURQUOISE() {
        return new Color(0.686, 0.933, 0.933);
    }
    static get PALEVIOLETRED() {
        return new Color(0.859, 0.439, 0.576);
    }
    static get PAPAYAWHIP() {
        return new Color(1, 0.937, 0.835);
    }
    static get PEACHPUFF() {
        return new Color(1, 0.855, 0.725);
    }
    static get PERU() {
        return new Color(0.804, 0.522, 0.247);
    }
    static get PINK() {
        return new Color(1, 0.753, 0.796);
    }
    static get PLUM() {
        return new Color(0.867, 0.627, 0.867);
    }
    static get POWDERBLUE() {
        return new Color(0.69, 0.878, 0.902);
    }
    static get ROSYBROWN() {
        return new Color(0.737, 0.561, 0.561);
    }
    static get ROYALBLUE() {
        return new Color(0.255, 0.412, 0.882);
    }
    static get SADDLEBROWN() {
        return new Color(0.545, 0.271, 0.075);
    }
    static get SALMON() {
        return new Color(0.98, 0.502, 0.447);
    }
    static get SANDYBROWN() {
        return new Color(0.957, 0.643, 0.376);
    }
    static get SEAGREEN() {
        return new Color(0.18, 0.545, 0.341);
    }
    static get SEASHELL() {
        return new Color(1, 0.961, 0.933);
    }
    static get SIENNA() {
        return new Color(0.627, 0.322, 0.176);
    }
    static get SKYBLUE() {
        return new Color(0.529, 0.808, 0.922);
    }
    static get SLATEBLUE() {
        return new Color(0.416, 0.353, 0.804);
    }
    static get SLATEGRAY() {
        return new Color(0.439, 0.502, 0.565);
    }
    static get SNOW() {
        return new Color(1, 0.98, 0.98);
    }
    static get SPRINGGREEN() {
        return new Color(0, 1, 0.498);
    }
    static get STEELBLUE() {
        return new Color(0.275, 0.51, 0.706);
    }
    static get TAN() {
        return new Color(0.824, 0.706, 0.549);
    }
    static get THISTLE() {
        return new Color(0.847, 0.749, 0.847);
    }
    static get TOMATO() {
        return new Color(1, 0.388, 0.278);
    }
    static get TURQUOISE() {
        return new Color(0.251, 0.878, 0.816);
    }
    static get VIOLET() {
        return new Color(0.933, 0.51, 0.933);
    }
    static get WHEAT() {
        return new Color(0.961, 0.871, 0.702);
    }
    static get WHITESMOKE() {
        return new Color(0.961, 0.961, 0.961);
    }
    static get YELLOWGREEN() {
        return new Color(0.604, 0.804, 0.196);
    }
    /**
     * Creates a Color from a hex string (e.g. "#FF0000" or "#F00").
     */
    static fromHex(hex) {
        // Remove '#' if present
        hex = hex.replace(/^#/, "");
        let r = 0, g = 0, b = 0, a = 1.0;
        if (hex.length === 3) {
            r = parseInt((hex[0] || "0") + (hex[0] || "0"), 16) / 255 || 0;
            g = parseInt((hex[1] || "0") + (hex[1] || "0"), 16) / 255 || 0;
            b = parseInt((hex[2] || "0") + (hex[2] || "0"), 16) / 255 || 0;
        }
        else if (hex.length === 4) {
            r = parseInt((hex[0] || "0") + (hex[0] || "0"), 16) / 255 || 0;
            g = parseInt((hex[1] || "0") + (hex[1] || "0"), 16) / 255 || 0;
            b = parseInt((hex[2] || "0") + (hex[2] || "0"), 16) / 255 || 0;
            a = parseInt((hex[3] || "F") + (hex[3] || "F"), 16) / 255 || 1.0;
        }
        else if (hex.length === 6) {
            r = parseInt(hex.substring(0, 2), 16) / 255 || 0;
            g = parseInt(hex.substring(2, 4), 16) / 255 || 0;
            b = parseInt(hex.substring(4, 6), 16) / 255 || 0;
        }
        else if (hex.length === 8) {
            r = parseInt(hex.substring(0, 2), 16) / 255 || 0;
            g = parseInt(hex.substring(2, 4), 16) / 255 || 0;
            b = parseInt(hex.substring(4, 6), 16) / 255 || 0;
            a = parseInt(hex.substring(6, 8), 16) / 255 || 1.0;
        }
        else {
            console.warn(`[Color] Invalid hex color string: ${hex}`);
        }
        return new Color(r, g, b, a);
    }
    /**
     * Creates a Color from HSL (Hue, Saturation, Lightness).
     * @param h Hue (0 - 360).
     * @param s Saturation (0.0 - 1.0).
     * @param l Lightness (0.0 - 1.0).
     * @param a Alpha (0.0 - 1.0). Default is 1.0.
     */
    static fromHSL(h, s, l, a = 1.0) {
        // Normalize h to 0-1
        h = (((h % 360) + 360) % 360) / 360;
        let r, g, b;
        if (s === 0) {
            r = g = b = l; // Achromatic
        }
        else {
            const hue2rgb = (p, q, t) => {
                if (t < 0)
                    t += 1;
                if (t > 1)
                    t -= 1;
                if (t < 1 / 6)
                    return p + (q - p) * 6 * t;
                if (t < 1 / 2)
                    return q;
                if (t < 2 / 3)
                    return p + (q - p) * (2 / 3 - t) * 6;
                return p;
            };
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = hue2rgb(p, q, h + 1 / 3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1 / 3);
        }
        return new Color(r, g, b, a);
    }
    /**
     * Creates a Color from HSV/HSB (Hue, Saturation, Value/Brightness).
     * @param h Hue (0 - 360).
     * @param s Saturation (0.0 - 1.0).
     * @param v Value/Brightness (0.0 - 1.0).
     * @param a Alpha (0.0 - 1.0). Default is 1.0.
     */
    static fromHSV(h, s, v, a = 1.0) {
        h = (((h % 360) + 360) % 360) / 360;
        let r = 0, g = 0, b = 0;
        const i = Math.floor(h * 6);
        const f = h * 6 - i;
        const p = v * (1 - s);
        const q = v * (1 - f * s);
        const t = v * (1 - (1 - f) * s);
        switch (i % 6) {
            case 0:
                r = v;
                g = t;
                b = p;
                break;
            case 1:
                r = q;
                g = v;
                b = p;
                break;
            case 2:
                r = p;
                g = v;
                b = t;
                break;
            case 3:
                r = p;
                g = q;
                b = v;
                break;
            case 4:
                r = t;
                g = p;
                b = v;
                break;
            case 5:
                r = v;
                g = p;
                b = q;
                break;
        }
        return new Color(r, g, b, a);
    }
    /**
     * Returns the color components as a hex string (e.g. "#FF0000").
     * @param includeAlpha Whether to include the alpha channel (e.g. "#FF0000FF").
     */
    toHex(includeAlpha = false) {
        const toHexStr = (c) => {
            const hex = Math.round(c * 255).toString(16);
            return hex.length === 1 ? "0" + hex : hex;
        };
        let hex = "#" + toHexStr(this.r) + toHexStr(this.g) + toHexStr(this.b);
        if (includeAlpha) {
            hex += toHexStr(this.a);
        }
        return hex.toUpperCase();
    }
    /**
     * Returns the color components as HSL.
     * @returns An object with { h: (0-360), s: (0-1), l: (0-1) }
     */
    toHSL() {
        const r = this.r, g = this.g, b = this.b;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h = 0, s = 0;
        const l = (max + min) / 2;
        if (max !== min) {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r:
                    h = (g - b) / d + (g < b ? 6 : 0);
                    break;
                case g:
                    h = (b - r) / d + 2;
                    break;
                case b:
                    h = (r - g) / d + 4;
                    break;
            }
            h /= 6;
        }
        return { h: h * 360, s, l };
    }
    /**
     * Returns the color components as HSV/HSB.
     * @returns An object with { h: (0-360), s: (0-1), v: (0-1) }
     */
    toHSV() {
        const r = this.r, g = this.g, b = this.b;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h = 0;
        const v = max;
        const d = max - min;
        const s = max === 0 ? 0 : d / max;
        if (max !== min) {
            switch (max) {
                case r:
                    h = (g - b) / d + (g < b ? 6 : 0);
                    break;
                case g:
                    h = (b - r) / d + 2;
                    break;
                case b:
                    h = (r - g) / d + 4;
                    break;
            }
            h /= 6;
        }
        return { h: h * 360, s, v };
    }
    /**
     * Returns the color components as an array.
     * @returns [r, g, b, a]
     */
    toArray() {
        return [this.r, this.g, this.b, this.a];
    }
    /**
     * Returns the color components as a Float32Array.
     * @returns Float32Array(4)
     */
    toFloat32Array() {
        this._cachedArray[0] = this.r;
        this._cachedArray[1] = this.g;
        this._cachedArray[2] = this.b;
        this._cachedArray[3] = this.a;
        return this._cachedArray;
    }
    /**
     * Returns the RGB components as a Vector3D.
     */
    toVector3() {
        return new Vector3D(this.r, this.g, this.b);
    }
}
//# sourceMappingURL=Color.js.map
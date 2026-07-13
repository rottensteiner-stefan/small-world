import { Vector3D } from '../../math/index.js';
export declare class Color {
    r: number;
    g: number;
    b: number;
    a: number;
    /**
     * Creates a new Color.
     * @param r Red component (0-1).
     * @param g Green component (0-1).
     * @param b Blue component (0-1).
     * @param a Alpha component (0-1).
     */
    constructor(r?: number, g?: number, b?: number, a?: number);
    private _cachedArray;
    set(r?: number, g?: number, b?: number, a?: number): this;
    copyFrom(color: Color): this;
    lerp(target: Color, t: number): this;
    static get BLACK(): Color;
    static get SILVER(): Color;
    static get GRAY(): Color;
    static get WHITE(): Color;
    static get MAROON(): Color;
    static get RED(): Color;
    static get PURPLE(): Color;
    static get FUCHSIA(): Color;
    static get GREEN(): Color;
    static get LIME(): Color;
    static get OLIVE(): Color;
    static get YELLOW(): Color;
    static get NAVY(): Color;
    static get BLUE(): Color;
    static get TEAL(): Color;
    static get AQUA(): Color;
    static get ALICEBLUE(): Color;
    static get ANTIQUEWHITE(): Color;
    static get AQUAMARINE(): Color;
    static get AZURE(): Color;
    static get BEIGE(): Color;
    static get BISQUE(): Color;
    static get BLANCHEDALMOND(): Color;
    static get BLUEVIOLET(): Color;
    static get BROWN(): Color;
    static get BURLYWOOD(): Color;
    static get CADETBLUE(): Color;
    static get CHARTREUSE(): Color;
    static get CHOCOLATE(): Color;
    static get CORAL(): Color;
    static get CORNFLOWERBLUE(): Color;
    static get CORNSILK(): Color;
    static get CRIMSON(): Color;
    static get CYAN(): Color;
    static get DARKBLUE(): Color;
    static get DARKCYAN(): Color;
    static get DARKGOLDENROD(): Color;
    static get DARKGRAY(): Color;
    static get DARKGREEN(): Color;
    static get DARKKHAKI(): Color;
    static get DARKMAGENTA(): Color;
    static get DARKOLIVEGREEN(): Color;
    static get DARKORANGE(): Color;
    static get DARKORCHID(): Color;
    static get DARKRED(): Color;
    static get DARKSALMON(): Color;
    static get DARKSEAGREEN(): Color;
    static get DARKSEAGREEN_X11(): Color;
    static get DARKSLATEGRAY(): Color;
    static get DARKTURQUOISE(): Color;
    static get DARKVIOLET(): Color;
    static get DEEPPINK(): Color;
    static get DEEPSKYBLUE(): Color;
    static get DIMGRAY(): Color;
    static get DODGERBLUE(): Color;
    static get FIREBRICK(): Color;
    static get FLORALWHITE(): Color;
    static get FORESTGREEN(): Color;
    static get GAINSBORO(): Color;
    static get GHOSTWHITE(): Color;
    static get GOLD(): Color;
    static get GOLDENROD(): Color;
    static get GREENYELLOW(): Color;
    static get HONEYDEW(): Color;
    static get HOTPINK(): Color;
    static get INDIANRED(): Color;
    static get INDIGO(): Color;
    static get IVORY(): Color;
    static get KHAKI(): Color;
    static get LAVENDER(): Color;
    static get LAVENDERBLUSH(): Color;
    static get LAWNGREEN(): Color;
    static get LEMONCHIFFON(): Color;
    static get LIGHTBLUE(): Color;
    static get LIGHTCORAL(): Color;
    static get LIGHTCYAN(): Color;
    static get LIGHTGOLDENRODYELLOW(): Color;
    static get LIGHTGRAY(): Color;
    static get LIGHTGREEN(): Color;
    static get LIGHTPINK(): Color;
    static get LIGHTSALMON(): Color;
    static get LIGHTSEAGREEN(): Color;
    static get LIGHTSKYBLUE(): Color;
    static get LIGHTSLATEGRAY(): Color;
    static get LIGHTSTEELBLUE(): Color;
    static get LIGHTYELLOW(): Color;
    static get LIMEGREEN(): Color;
    static get LINEN(): Color;
    static get MAGENTA(): Color;
    static get MEDIUMAQUAMARINE(): Color;
    static get MEDIUMBLUE(): Color;
    static get MEDIUMORCHID(): Color;
    static get MEDIUMPURPLE(): Color;
    static get MEDIUMSEAGREEN(): Color;
    static get MEDIUMSLATEBLUE(): Color;
    static get MEDIUMSPRINGGREEN(): Color;
    static get MEDIUMTURQUOISE(): Color;
    static get MEDIUMVIOLETRED(): Color;
    static get MIDNIGHTBLUE(): Color;
    static get MINTCREAM(): Color;
    static get MISTYROSE(): Color;
    static get MOCCASIN(): Color;
    static get NAVAJOWHITE(): Color;
    static get OLDLACE(): Color;
    static get OLIVEDRAB(): Color;
    static get ORANGE(): Color;
    static get ORANGERED(): Color;
    static get ORCHID(): Color;
    static get PALEGOLDENROD(): Color;
    static get PALEGREEN(): Color;
    static get PALETURQUOISE(): Color;
    static get PALEVIOLETRED(): Color;
    static get PAPAYAWHIP(): Color;
    static get PEACHPUFF(): Color;
    static get PERU(): Color;
    static get PINK(): Color;
    static get PLUM(): Color;
    static get POWDERBLUE(): Color;
    static get ROSYBROWN(): Color;
    static get ROYALBLUE(): Color;
    static get SADDLEBROWN(): Color;
    static get SALMON(): Color;
    static get SANDYBROWN(): Color;
    static get SEAGREEN(): Color;
    static get SEASHELL(): Color;
    static get SIENNA(): Color;
    static get SKYBLUE(): Color;
    static get SLATEBLUE(): Color;
    static get SLATEGRAY(): Color;
    static get SNOW(): Color;
    static get SPRINGGREEN(): Color;
    static get STEELBLUE(): Color;
    static get TAN(): Color;
    static get THISTLE(): Color;
    static get TOMATO(): Color;
    static get TURQUOISE(): Color;
    static get VIOLET(): Color;
    static get WHEAT(): Color;
    static get WHITESMOKE(): Color;
    static get YELLOWGREEN(): Color;
    /**
     * Creates a Color from a hex string (e.g. "#FF0000" or "#F00").
     */
    static fromHex(hex: string): Color;
    /**
     * Creates a Color from HSL (Hue, Saturation, Lightness).
     * @param h Hue (0 - 360).
     * @param s Saturation (0.0 - 1.0).
     * @param l Lightness (0.0 - 1.0).
     * @param a Alpha (0.0 - 1.0). Default is 1.0.
     */
    static fromHSL(h: number, s: number, l: number, a?: number): Color;
    /**
     * Creates a Color from HSV/HSB (Hue, Saturation, Value/Brightness).
     * @param h Hue (0 - 360).
     * @param s Saturation (0.0 - 1.0).
     * @param v Value/Brightness (0.0 - 1.0).
     * @param a Alpha (0.0 - 1.0). Default is 1.0.
     */
    static fromHSV(h: number, s: number, v: number, a?: number): Color;
    /**
     * Returns the color components as a hex string (e.g. "#FF0000").
     * @param includeAlpha Whether to include the alpha channel (e.g. "#FF0000FF").
     */
    toHex(includeAlpha?: boolean): string;
    /**
     * Returns the color components as HSL.
     * @returns An object with { h: (0-360), s: (0-1), l: (0-1) }
     */
    toHSL(): {
        h: number;
        s: number;
        l: number;
    };
    /**
     * Returns the color components as HSV/HSB.
     * @returns An object with { h: (0-360), s: (0-1), v: (0-1) }
     */
    toHSV(): {
        h: number;
        s: number;
        v: number;
    };
    /**
     * Returns the color components as an array.
     * @returns [r, g, b, a]
     */
    toArray(): number[];
    /**
     * Returns the color components as a Float32Array.
     * @returns Float32Array(4)
     */
    toFloat32Array(): Float32Array;
    /**
     * Returns the RGB components as a Vector3D.
     */
    toVector3(): Vector3D;
}

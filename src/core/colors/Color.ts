import { Vector3D } from "../../math/index.js";

/// src/core/colors/Color.ts

export class Color {
  /**
   * Creates a new Color.
   * @param r Red component (0-1).
   * @param g Green component (0-1).
   * @param b Blue component (0-1).
   * @param a Alpha component (0-1).
   */
  constructor(
    public r: number = 0,
    public g: number = 0,
    public b: number = 0,
    public a: number = 1.0,
  ) {}

  private _cachedArray = new Float32Array(4);

  public set(r: number = 0, g: number = 0, b: number = 0, a: number = 1.0): this {
    this.r = r;
    this.g = g;
    this.b = b;
    this.a = a;
    return this;
  }

  public copyFrom(color: Color): this {
    this.r = color.r;
    this.g = color.g;
    this.b = color.b;
    this.a = color.a;
    return this;
  }

  // --- CSS Level 1 / Basic Colors ---
  public static get BLACK(): Color {
    return new Color();
  }

  public static get SILVER(): Color {
    return new Color(0.753, 0.753, 0.753);
  }

  public static get GRAY(): Color {
    return new Color(0.5, 0.5, 0.5);
  }

  public static get WHITE(): Color {
    return new Color(1, 1, 1);
  }

  public static get MAROON(): Color {
    return new Color(0.502, 0, 0);
  }

  public static get RED(): Color {
    return new Color(1, 0, 0);
  }

  public static get PURPLE(): Color {
    return new Color(0.502, 0, 0.502);
  }

  public static get FUCHSIA(): Color {
    return new Color(1, 0, 1);
  }

  public static get GREEN(): Color {
    return new Color(0, 0.502, 0);
  }

  public static get LIME(): Color {
    return new Color(0, 1, 0);
  }

  public static get OLIVE(): Color {
    return new Color(0.502, 0.502, 0);
  }

  public static get YELLOW(): Color {
    return new Color(1, 1, 0);
  }

  public static get NAVY(): Color {
    return new Color(0, 0, 0.502);
  }

  public static get BLUE(): Color {
    return new Color(0, 0, 1);
  }

  public static get TEAL(): Color {
    return new Color(0, 0.502, 0.502);
  }

  public static get AQUA(): Color {
    return new Color(0, 1, 1);
  }

  // --- Extended Colors (CSS Level 2 & 3 / X11 Colors) ---
  public static get ALICEBLUE(): Color {
    return new Color(0.941, 0.973, 1);
  }

  public static get ANTIQUEWHITE(): Color {
    return new Color(0.98, 0.922, 0.843);
  }

  public static get AQUAMARINE(): Color {
    return new Color(0.498, 1, 0.831);
  }

  public static get AZURE(): Color {
    return new Color(0.941, 1, 1);
  }

  public static get BEIGE(): Color {
    return new Color(0.961, 0.961, 0.863);
  }

  public static get BISQUE(): Color {
    return new Color(1, 0.894, 0.769);
  }

  public static get BLANCHEDALMOND(): Color {
    return new Color(1, 0.922, 0.804);
  }

  public static get BLUEVIOLET(): Color {
    return new Color(0.541, 0.169, 0.886);
  }

  public static get BROWN(): Color {
    return new Color(0.647, 0.165, 0.165);
  }

  public static get BURLYWOOD(): Color {
    return new Color(0.871, 0.722, 0.529);
  }

  public static get CADETBLUE(): Color {
    return new Color(0.373, 0.62, 0.627);
  }

  public static get CHARTREUSE(): Color {
    return new Color(0.498, 1, 0);
  }

  public static get CHOCOLATE(): Color {
    return new Color(0.824, 0.412, 0.118);
  }

  public static get CORAL(): Color {
    return new Color(1, 0.498, 0.314);
  }

  public static get CORNFLOWERBLUE(): Color {
    return new Color(0.392, 0.584, 0.929);
  }

  public static get CORNSILK(): Color {
    return new Color(1, 0.973, 0.863);
  }

  public static get CRIMSON(): Color {
    return new Color(0.863, 0.078, 0.235);
  }

  public static get CYAN(): Color {
    return new Color(0, 1, 1);
  }

  public static get DARKBLUE(): Color {
    return new Color(0, 0, 0.545);
  }

  public static get DARKCYAN(): Color {
    return new Color(0, 0.545, 0.545);
  }

  public static get DARKGOLDENROD(): Color {
    return new Color(0.722, 0.525, 0.043);
  }

  public static get DARKGRAY(): Color {
    return new Color(0.663, 0.663, 0.663);
  }

  public static get DARKGREEN(): Color {
    return new Color(0, 0.392, 0);
  }

  public static get DARKKHAKI(): Color {
    return new Color(0.741, 0.718, 0.42);
  }

  public static get DARKMAGENTA(): Color {
    return new Color(0.545, 0, 0.545);
  }

  public static get DARKOLIVEGREEN(): Color {
    return new Color(0.333, 0.42, 0.184);
  }

  public static get DARKORANGE(): Color {
    return new Color(1, 0.549, 0);
  }

  public static get DARKORCHID(): Color {
    return new Color(0.6, 0.196, 0.8);
  }

  public static get DARKRED(): Color {
    return new Color(0.545, 0, 0);
  }

  public static get DARKSALMON(): Color {
    return new Color(0.914, 0.588, 0.478);
  }

  public static get DARKSEAGREEN(): Color {
    return new Color(0.561, 0.737, 0.561);
  }

  public static get DARKSEAGREEN_X11(): Color {
    return new Color(0.561, 0.737, 0.561);
  }

  public static get DARKSLATEGRAY(): Color {
    return new Color(0.184, 0.31, 0.31);
  }

  public static get DARKTURQUOISE(): Color {
    return new Color(0, 0.808, 0.82);
  }

  public static get DARKVIOLET(): Color {
    return new Color(0.58, 0, 0.827);
  }

  public static get DEEPPINK(): Color {
    return new Color(1, 0.078, 0.576);
  }

  public static get DEEPSKYBLUE(): Color {
    return new Color(0, 0.749, 1);
  }

  public static get DIMGRAY(): Color {
    return new Color(0.412, 0.412, 0.412);
  }

  public static get DODGERBLUE(): Color {
    return new Color(0.118, 0.565, 1);
  }

  public static get FIREBRICK(): Color {
    return new Color(0.698, 0.133, 0.133);
  }

  public static get FLORALWHITE(): Color {
    return new Color(1, 0.98, 0.941);
  }

  public static get FORESTGREEN(): Color {
    return new Color(0.133, 0.545, 0.133);
  }

  public static get GAINSBORO(): Color {
    return new Color(0.863, 0.863, 0.863);
  }

  public static get GHOSTWHITE(): Color {
    return new Color(0.973, 0.973, 1);
  }

  public static get GOLD(): Color {
    return new Color(1, 0.843, 0);
  }

  public static get GOLDENROD(): Color {
    return new Color(0.855, 0.647, 0.125);
  }

  public static get GREENYELLOW(): Color {
    return new Color(0.678, 1, 0.184);
  }

  public static get HONEYDEW(): Color {
    return new Color(0.941, 1, 0.941);
  }

  public static get HOTPINK(): Color {
    return new Color(1, 0.412, 0.706);
  }

  public static get INDIANRED(): Color {
    return new Color(0.804, 0.361, 0.361);
  }

  public static get INDIGO(): Color {
    return new Color(0.294, 0, 0.51);
  }

  public static get IVORY(): Color {
    return new Color(1, 1, 0.941);
  }

  public static get KHAKI(): Color {
    return new Color(0.941, 0.902, 0.549);
  }

  public static get LAVENDER(): Color {
    return new Color(0.902, 0.902, 0.98);
  }

  public static get LAVENDERBLUSH(): Color {
    return new Color(1, 0.941, 0.961);
  }

  public static get LAWNGREEN(): Color {
    return new Color(0.486, 0.988, 0);
  }

  public static get LEMONCHIFFON(): Color {
    return new Color(1, 0.98, 0.804);
  }

  public static get LIGHTBLUE(): Color {
    return new Color(0.678, 0.847, 0.902);
  }

  public static get LIGHTCORAL(): Color {
    return new Color(0.941, 0.502, 0.502);
  }

  public static get LIGHTCYAN(): Color {
    return new Color(0.878, 1, 1);
  }

  public static get LIGHTGOLDENRODYELLOW(): Color {
    return new Color(0.98, 0.98, 0.824);
  }

  public static get LIGHTGRAY(): Color {
    return new Color(0.827, 0.827, 0.827);
  }

  public static get LIGHTGREEN(): Color {
    return new Color(0.565, 0.933, 0.565);
  }

  public static get LIGHTPINK(): Color {
    return new Color(1, 0.714, 0.757);
  }

  public static get LIGHTSALMON(): Color {
    return new Color(1, 0.627, 0.478);
  }

  public static get LIGHTSEAGREEN(): Color {
    return new Color(0.125, 0.698, 0.667);
  }

  public static get LIGHTSKYBLUE(): Color {
    return new Color(0.529, 0.808, 0.98);
  }

  public static get LIGHTSLATEGRAY(): Color {
    return new Color(0.467, 0.533, 0.6);
  }

  public static get LIGHTSTEELBLUE(): Color {
    return new Color(0.69, 0.769, 0.871);
  }

  public static get LIGHTYELLOW(): Color {
    return new Color(1, 1, 0.878);
  }

  public static get LIMEGREEN(): Color {
    return new Color(0.196, 0.804, 0.196);
  }

  public static get LINEN(): Color {
    return new Color(0.98, 0.941, 0.902);
  }

  public static get MAGENTA(): Color {
    return new Color(1, 0, 1);
  }

  public static get MEDIUMAQUAMARINE(): Color {
    return new Color(0.4, 0.804, 0.667);
  }

  public static get MEDIUMBLUE(): Color {
    return new Color(0, 0, 0.804);
  }

  public static get MEDIUMORCHID(): Color {
    return new Color(0.729, 0.333, 0.827);
  }

  public static get MEDIUMPURPLE(): Color {
    return new Color(0.576, 0.439, 0.859);
  }

  public static get MEDIUMSEAGREEN(): Color {
    return new Color(0.235, 0.702, 0.443);
  }

  public static get MEDIUMSLATEBLUE(): Color {
    return new Color(0.482, 0.408, 0.933);
  }

  public static get MEDIUMSPRINGGREEN(): Color {
    return new Color(0, 0.98, 0.604);
  }

  public static get MEDIUMTURQUOISE(): Color {
    return new Color(0.282, 0.82, 0.8);
  }

  public static get MEDIUMVIOLETRED(): Color {
    return new Color(0.78, 0.082, 0.522);
  }

  public static get MIDNIGHTBLUE(): Color {
    return new Color(0.098, 0.098, 0.439);
  }

  public static get MINTCREAM(): Color {
    return new Color(0.961, 1, 0.98);
  }

  public static get MISTYROSE(): Color {
    return new Color(1, 0.894, 0.882);
  }

  public static get MOCCASIN(): Color {
    return new Color(1, 0.894, 0.71);
  }

  public static get NAVAJOWHITE(): Color {
    return new Color(1, 0.871, 0.678);
  }

  public static get OLDLACE(): Color {
    return new Color(0.992, 0.961, 0.902);
  }

  public static get OLIVEDRAB(): Color {
    return new Color(0.42, 0.557, 0.137);
  }

  public static get ORANGE(): Color {
    return new Color(1, 0.647, 0);
  }

  public static get ORANGERED(): Color {
    return new Color(1, 0.271, 0);
  }

  public static get ORCHID(): Color {
    return new Color(0.855, 0.439, 0.839);
  }

  public static get PALEGOLDENROD(): Color {
    return new Color(0.933, 0.91, 0.667);
  }

  public static get PALEGREEN(): Color {
    return new Color(0.596, 0.984, 0.596);
  }

  public static get PALETURQUOISE(): Color {
    return new Color(0.686, 0.933, 0.933);
  }

  public static get PALEVIOLETRED(): Color {
    return new Color(0.859, 0.439, 0.576);
  }

  public static get PAPAYAWHIP(): Color {
    return new Color(1, 0.937, 0.835);
  }

  public static get PEACHPUFF(): Color {
    return new Color(1, 0.855, 0.725);
  }

  public static get PERU(): Color {
    return new Color(0.804, 0.522, 0.247);
  }

  public static get PINK(): Color {
    return new Color(1, 0.753, 0.796);
  }

  public static get PLUM(): Color {
    return new Color(0.867, 0.627, 0.867);
  }

  public static get POWDERBLUE(): Color {
    return new Color(0.69, 0.878, 0.902);
  }

  public static get ROSYBROWN(): Color {
    return new Color(0.737, 0.561, 0.561);
  }

  public static get ROYALBLUE(): Color {
    return new Color(0.255, 0.412, 0.882);
  }

  public static get SADDLEBROWN(): Color {
    return new Color(0.545, 0.271, 0.075);
  }

  public static get SALMON(): Color {
    return new Color(0.98, 0.502, 0.447);
  }

  public static get SANDYBROWN(): Color {
    return new Color(0.957, 0.643, 0.376);
  }

  public static get SEAGREEN(): Color {
    return new Color(0.18, 0.545, 0.341);
  }

  public static get SEASHELL(): Color {
    return new Color(1, 0.961, 0.933);
  }

  public static get SIENNA(): Color {
    return new Color(0.627, 0.322, 0.176);
  }

  public static get SKYBLUE(): Color {
    return new Color(0.529, 0.808, 0.922);
  }

  public static get SLATEBLUE(): Color {
    return new Color(0.416, 0.353, 0.804);
  }

  public static get SLATEGRAY(): Color {
    return new Color(0.439, 0.502, 0.565);
  }

  public static get SNOW(): Color {
    return new Color(1, 0.98, 0.98);
  }

  public static get SPRINGGREEN(): Color {
    return new Color(0, 1, 0.498);
  }

  public static get STEELBLUE(): Color {
    return new Color(0.275, 0.51, 0.706);
  }

  public static get TAN(): Color {
    return new Color(0.824, 0.706, 0.549);
  }

  public static get THISTLE(): Color {
    return new Color(0.847, 0.749, 0.847);
  }

  public static get TOMATO(): Color {
    return new Color(1, 0.388, 0.278);
  }

  public static get TURQUOISE(): Color {
    return new Color(0.251, 0.878, 0.816);
  }

  public static get VIOLET(): Color {
    return new Color(0.933, 0.51, 0.933);
  }

  public static get WHEAT(): Color {
    return new Color(0.961, 0.871, 0.702);
  }

  public static get WHITESMOKE(): Color {
    return new Color(0.961, 0.961, 0.961);
  }

  public static get YELLOWGREEN(): Color {
    return new Color(0.604, 0.804, 0.196);
  }

  /**
   * Creates a Color from a hex string (e.g. "#FF0000" or "#F00").
   */
  public static fromHex(hex: string): Color {
    // Remove '#' if present
    hex = hex.replace(/^#/, "");

    let r = 0,
      g = 0,
      b = 0,
      a = 1.0;

    if (hex.length === 3) {
      r = parseInt((hex[0] || "0") + (hex[0] || "0"), 16) / 255 || 0;
      g = parseInt((hex[1] || "0") + (hex[1] || "0"), 16) / 255 || 0;
      b = parseInt((hex[2] || "0") + (hex[2] || "0"), 16) / 255 || 0;
    } else if (hex.length === 4) {
      r = parseInt((hex[0] || "0") + (hex[0] || "0"), 16) / 255 || 0;
      g = parseInt((hex[1] || "0") + (hex[1] || "0"), 16) / 255 || 0;
      b = parseInt((hex[2] || "0") + (hex[2] || "0"), 16) / 255 || 0;
      a = parseInt((hex[3] || "F") + (hex[3] || "F"), 16) / 255 || 1.0;
    } else if (hex.length === 6) {
      r = parseInt(hex.substring(0, 2), 16) / 255 || 0;
      g = parseInt(hex.substring(2, 4), 16) / 255 || 0;
      b = parseInt(hex.substring(4, 6), 16) / 255 || 0;
    } else if (hex.length === 8) {
      r = parseInt(hex.substring(0, 2), 16) / 255 || 0;
      g = parseInt(hex.substring(2, 4), 16) / 255 || 0;
      b = parseInt(hex.substring(4, 6), 16) / 255 || 0;
      a = parseInt(hex.substring(6, 8), 16) / 255 || 1.0;
    } else {
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
  public static fromHSL(h: number, s: number, l: number, a: number = 1.0): Color {
    // Normalize h to 0-1
    h = (((h % 360) + 360) % 360) / 360;

    let r: number, g: number, b: number;

    if (s === 0) {
      r = g = b = l; // Achromatic
    } else {
      const hue2rgb = (p: number, q: number, t: number): number => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
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
  public static fromHSV(h: number, s: number, v: number, a: number = 1.0): Color {
    h = (((h % 360) + 360) % 360) / 360;

    let r = 0,
      g = 0,
      b = 0;

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
  public toHex(includeAlpha: boolean = false): string {
    const toHexStr = (c: number): string => {
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
  public toHSL(): { h: number; s: number; l: number } {
    const r = this.r,
      g = this.g,
      b = this.b;
    const max = Math.max(r, g, b),
      min = Math.min(r, g, b);
    let h = 0,
      s = 0;
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
  public toHSV(): { h: number; s: number; v: number } {
    const r = this.r,
      g = this.g,
      b = this.b;
    const max = Math.max(r, g, b),
      min = Math.min(r, g, b);
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
  public toArray(): number[] {
    return [this.r, this.g, this.b, this.a];
  }

  /**
   * Returns the color components as a Float32Array.
   * @returns Float32Array(4)
   */
  public toFloat32Array(): Float32Array {
    this._cachedArray[0] = this.r;
    this._cachedArray[1] = this.g;
    this._cachedArray[2] = this.b;
    this._cachedArray[3] = this.a;
    return this._cachedArray;
  }

  /**
   * Returns the RGB components as a Vector3D.
   */
  public toVector3(): Vector3D {
    return new Vector3D(this.r, this.g, this.b);
  }
}

/// src/core/colors/Color.ts

/**
 * Represents an RGBA color.
 */
export class Color {
  /**
   * Creates a new Color.
   * @param r Red component (0-1).
   * @param g Green component (0-1).
   * @param b Blue component (0-1).
   * @param a Alpha component (0-1).
   */
  constructor(
    public r: number,
    public g: number,
    public b: number,
    public a: number = 1.0,
  ) {}

  public static get WHITE(): Color {
    return new Color(1, 1, 1);
  }
  public static get BLACK(): Color {
    return new Color(0, 0, 0);
  }
  public static get RED(): Color {
    return new Color(1, 0, 0);
  }
  public static get GREEN(): Color {
    return new Color(0, 1, 0);
  }
  public static get BLUE(): Color {
    return new Color(0, 0, 1);
  }
  public static get LIME(): Color {
    return new Color(0, 1, 0);
  }
  public static get ORANGE(): Color {
    return new Color(1, 0.5, 0);
  }
  public static get DODGERBLUE(): Color {
    return new Color(0.12, 0.56, 1);
  }
  public static get SKYBLUE(): Color {
    return new Color(0.53, 0.81, 0.92);
  }
  public static get LIGHTSTEELBLUE(): Color {
    return new Color(0.69, 0.77, 0.87);
  }
  public static get DARKSLATEGRAY(): Color {
    return new Color(0.18, 0.31, 0.31);
  }
  public static get GRAY(): Color {
    return new Color(0.5, 0.5, 0.5);
  }
  public static get YELLOW(): Color {
    return new Color(1, 1, 0);
  }

  /**
   * Returns the color components as an array.
   * @returns [r, g, b, a]
   */
  public toArray(): number[] {
    return [this.r, this.g, this.b, this.a];
  }
}

export class Color {
  constructor(
    public r: number,
    public g: number,
    public b: number,
    public a: number = 1.0,
  ) {}
  public static get WHITE() {
    return new Color(1, 1, 1);
  }
  public static get BLACK() {
    return new Color(0, 0, 0);
  }
  public static get RED() {
    return new Color(1, 0, 0);
  }
  public static get GREEN() {
    return new Color(0, 1, 0);
  }
  public static get BLUE() {
    return new Color(0, 0, 1);
  }
  public static get ORANGE() {
    return new Color(1, 0.5, 0);
  }
  public static get DODGERBLUE() {
    return new Color(0.12, 0.56, 1);
  }
  public static get SKYBLUE() {
    return new Color(0.53, 0.81, 0.92);
  }
  public static get LIGHTSTEELBLUE() {
    return new Color(0.69, 0.77, 0.87);
  }
  public static get DARKSLATEGRAY() {
    return new Color(0.18, 0.31, 0.31);
  }
  public static get GRAY() {
    return new Color(0.5, 0.5, 0.5);
  }
  public static get YELLOW() {
    return new Color(1, 1, 0);
  }
  public toArray(): number[] {
    return [this.r, this.g, this.b, this.a];
  }
}

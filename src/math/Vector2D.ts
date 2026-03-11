import { IVector } from "../interfaces/IVector";

export class Vector2D implements IVector {
  constructor(
    public x: number = 0,
    public y: number = 0,
  ) {}
  public set(x: number, y: number): this {
    this.x = x;
    this.y = y;
    return this;
  }
  public add(v: Vector2D): this {
    this.x += v.x;
    this.y += v.y;
    return this;
  }
  public sub(v: Vector2D): this {
    this.x -= v.x;
    this.y -= v.y;
    return this;
  }
  public scale(s: number): this {
    this.x *= s;
    this.y *= s;
    return this;
  }
  public dot(v: Vector2D): number {
    return this.x * v.x + this.y * v.y;
  }
  public lengthSq(): number {
    return this.x * this.x + this.y * this.y;
  }
  public length(): number {
    return Math.sqrt(this.lengthSq());
  }
  public distanceToSq(v: Vector2D): number {
    const dx = this.x - v.x;
    const dy = this.y - v.y;
    return dx * dx + dy * dy;
  }
  public distanceTo(v: Vector2D): number {
    return Math.sqrt(this.distanceToSq(v));
  }
  public clone(): Vector2D {
    return new Vector2D(this.x, this.y);
  }

  /**
   * Normalisiert den Vektor auf eine Länge von 1 (Einheitsvektor).
   * @returns this (für Method Chaining)
   */
  public normalize(): this {
    const len = this.length();

    // Prüfen, ob die Länge größer als 0 ist (mit einer kleinen Toleranz),
    // um eine Division durch Null zu vermeiden.
    if (len > 0.000001) {
      const invLen = 1 / len; // Multiplikation ist schneller als Division
      this.x *= invLen;
      this.y *= invLen;
    } else {
      this.x = 0;
      this.y = 0;
    }

    return this;
  }
}

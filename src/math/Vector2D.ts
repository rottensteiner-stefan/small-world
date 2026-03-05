export class Vector2D {
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

  /**
   * Berechnet das Quadrat der Distanz zwischen zwei 2D-Punkten.
   * Ideal für schnelle 2D-Kollisions- oder UI-Distanzchecks.
   */
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
}

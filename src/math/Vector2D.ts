export class Vector2D {
  constructor(
    public x: number = 0,
    public y: number = 0,
  ) {}

  public add(v: Vector2D): Vector2D {
    this.x += v.x;
    this.y += v.y;
    return this;
  }

  public multiply(v: Vector2D): Vector2D {
    this.x *= v.x;
    this.y *= v.y;
    return this;
  }

  public scale(s: number): Vector2D {
    this.x *= s;
    this.y *= s;
    return this;
  }

  public length(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  public clone(): Vector2D {
    return new Vector2D(this.x, this.y);
  }
}

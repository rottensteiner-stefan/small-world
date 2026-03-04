export class Vector3D {
  constructor(
    public x: number = 0,
    public y: number = 0,
    public z: number = 0,
  ) {}

  public add(v: Vector3D): Vector3D {
    this.x += v.x;
    this.y += v.y;
    this.z += v.z;
    return this;
  }

  public sub(v: Vector3D): Vector3D {
    this.x -= v.x;
    this.y -= v.y;
    this.z -= v.z;
    return this;
  }

  public multiply(v: Vector3D): Vector3D {
    this.x *= v.x;
    this.y *= v.y;
    this.z *= v.z;
    return this;
  }

  public scale(s: number): Vector3D {
    this.x *= s;
    this.y *= s;
    this.z *= s;
    return this;
  }

  public length(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
  }

  public dot(v: Vector3D): number {
    return this.x * v.x + this.y * v.y + this.z * v.z;
  }

  public clone(): Vector3D {
    return new Vector3D(this.x, this.y, this.z);
  }

  public toArray(): [number, number, number] {
    return [this.x, this.y, this.z];
  }
}

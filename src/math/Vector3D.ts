import { IVector } from "../interfaces/IVector";

export class Vector3D implements IVector {
  constructor(
    public x: number = 0,
    public y: number = 0,
    public z: number = 0,
  ) {}
  public set(x: number, y: number, z: number): this {
    this.x = x;
    this.y = y;
    this.z = z;
    return this;
  }
  public add(v: Vector3D): this {
    this.x += v.x;
    this.y += v.y;
    this.z += v.z;
    return this;
  }
  public sub(v: Vector3D): this {
    this.x -= v.x;
    this.y -= v.y;
    this.z -= v.z;
    return this;
  }
  public scale(s: number): this {
    this.x *= s;
    this.y *= s;
    this.z *= s;
    return this;
  }
  public dot(v: Vector3D): number {
    return this.x * v.x + this.y * v.y + this.z * v.z;
  }
  public lengthSq(): number {
    return this.x * this.x + this.y * this.y + this.z * this.z;
  }
  public length(): number {
    return Math.sqrt(this.lengthSq());
  }
  public distanceToSq(v: Vector3D): number {
    const dx = this.x - v.x;
    const dy = this.y - v.y;
    const dz = this.z - v.z;
    return dx * dx + dy * dy + dz * dz;
  }
  public distanceTo(v: Vector3D): number {
    return Math.sqrt(this.distanceToSq(v));
  }

  public copyFrom(v: Vector3D): this {
    this.x = v.x;
    this.y = v.y;
    this.z = v.z;
    return this;
  }

  public clone(): Vector3D {
    return new Vector3D(this.x, this.y, this.z);
  }

  /**
   * Normalisiert den Vektor auf eine Länge von 1 (Einheitsvektor).
   * @returns this (für Method Chaining)
   */
  public normalize(): this {
    const len = this.length();

    // Prüfen, ob die Länge größer als 0 ist, um Division durch Null zu vermeiden.
    if (len > 0.000001) {
      const invLen = 1 / len; // Multiplikation ist schneller als Division
      this.x *= invLen;
      this.y *= invLen;
      this.z *= invLen;
    } else {
      this.x = 0;
      this.y = 0;
      this.z = 0;
    }

    return this;
  }
}

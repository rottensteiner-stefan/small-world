/// src/math/Vector3D.ts
import { VectorInterface } from "../interfaces/VectorInterface.js";
import { Matrix4 } from "./Matrix4.js";

export class Vector3D implements VectorInterface {
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

  /**
   * Transformiert die Richtung dieses Vektors mit einer Matrix.
   * Dies ignoriert die Translationskomponente der Matrix.
   * @param m Die Transformationsmatrix.
   * @returns this (für Method Chaining)
   */
  public transformDirection(m: Matrix4): this {
    const d = m.data;
    const x = this.x,
      y = this.y,
      z = this.z;

    // @ts-expect-error Potentially undefined values
    this.x = d[0] * x + d[4] * y + d[8] * z;
    // @ts-expect-error Potentially undefined values
    this.y = d[1] * x + d[5] * y + d[9] * z;
    // @ts-expect-error Potentially undefined values
    this.z = d[2] * x + d[6] * y + d[10] * z;

    return this.normalize();
  }
}

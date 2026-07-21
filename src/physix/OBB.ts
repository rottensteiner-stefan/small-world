/// src/physix/OBB.ts
import { Vector3D, Matrix4 } from "../math/index.js";
import { BoundingVolume, FrustumInterface } from "../interfaces/index.js";
import { BoundingType } from "../enums/index.js";
import { Collision } from "./Collision.js";

/**
 * An Oriented Bounding Box (OBB).
 * Essential for the Separating Axis Theorem (SAT) and precise collisions of rotated objects.
 */
export class OBB implements BoundingVolume {
  public type: BoundingType = BoundingType.OBB;

  /** Center of the OBB in world space. */
  public center: Vector3D = new Vector3D();
  /** Half-extents of the OBB along its local axes. */
  public halfExtents: Vector3D = new Vector3D(0.5, 0.5, 0.5);

  /** The 3 orthogonal local axes of the OBB (X, Y, Z). */
  public axes: [Vector3D, Vector3D, Vector3D] = [
    new Vector3D(1, 0, 0),
    new Vector3D(0, 1, 0),
    new Vector3D(0, 0, 1),
  ];

  public getBroadRadius(): number {
    return this.halfExtents.length();
  }

  public intersectsFrustum(frustum: FrustumInterface): boolean {
    const c: Vector3D = this.center;
    const hx: number = this.halfExtents.x;
    const hy: number = this.halfExtents.y;
    const hz: number = this.halfExtents.z;
    const a0: Vector3D = this.axes[0];
    const a1: Vector3D = this.axes[1];
    const a2: Vector3D = this.axes[2];
    const p: Float32Array = frustum.planes;

    for (let i: number = 0; 6 > i; i++) {
      const idx: number = i * 4;
      const nx: number = p[idx]!;
      const ny: number = p[idx + 1]!;
      const nz: number = p[idx + 2]!;
      const dPlane: number = p[idx + 3]!;

      // Project the OBB's half-extents onto the frustum plane normal
      // This is mathematically equivalent to checking all 8 corners.
      const r: number =
        hx * Math.abs(nx * a0.x + ny * a0.y + nz * a0.z) +
        hy * Math.abs(nx * a1.x + ny * a1.y + nz * a1.z) +
        hz * Math.abs(nx * a2.x + ny * a2.y + nz * a2.z);

      // Distance from the OBB center to the plane
      const dist: number = nx * c.x + ny * c.y + nz * c.z + dPlane;

      if (-r > dist) {
        return false;
      }
    }
    return true;
  }

  public intersectsVolume(other: BoundingVolume): boolean {
    return Collision.test(this, other);
  }

  public containsVolume(_other: BoundingVolume): boolean {
    // Not implemented for broad phase yet
    return false;
  }

  /**
   * Transforms this OBB using a world matrix.
   * @param matrix The transformation matrix.
   */
  public transform(matrix: Matrix4): void {
    const e = matrix.data;

    // 1. Extract position
    this.center.set(e[12]!, e[13]!, e[14]!);

    // 2. Extract rotation (local axes)
    this.axes[0].set(e[0]!, e[1]!, e[2]!).normalize();
    this.axes[1].set(e[4]!, e[5]!, e[6]!).normalize();
    this.axes[2].set(e[8]!, e[9]!, e[10]!).normalize();

    // 3. Extract scale and apply to half extents
    // const sx = Math.hypot(e[0]!, e[1]!, e[2]!);
    // const sy = Math.hypot(e[4]!, e[5]!, e[6]!);
    // const sz = Math.hypot(e[8]!, e[9]!, e[10]!);
  }
}

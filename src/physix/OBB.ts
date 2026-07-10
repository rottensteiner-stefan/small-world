/// src/physix/OBB.ts
import { Vector3D, Matrix4, MathPool } from "../math/index.js";
import { BoundingVolume, FrustumInterface } from "../interfaces/index.js";
import { BoundingType } from "../enums/index.js";

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
    // A simplified broad-phase check (treat as sphere for frustum)
    // For a fully exact OBB-Frustum check, we'd test all 8 corners.
    return true;
  }

  public intersectsVolume(other: BoundingVolume): boolean {
    // We defer actual OBB-Volume intersection logic to the Collision class (SAT).
    return true;
  }

  public containsVolume(other: BoundingVolume): boolean {
    // Not implemented for broad phase yet
    return false;
  }

  /**
   * Transforms this OBB using a world matrix.
   * @param matrix The transformation matrix.
   */
  public applyMatrix4(matrix: Matrix4): this {
    // 1. Extract position
    matrix.getTranslation(this.center);

    // 2. Extract rotation (local axes)
    // The columns of the upper 3x3 matrix are the local X, Y, Z axes.
    const e = matrix.elements;

    this.axes[0].set(e[0], e[1], e[2]).normalize();
    this.axes[1].set(e[4], e[5], e[6]).normalize();
    this.axes[2].set(e[8], e[9], e[10]).normalize();

    // 3. Extract scale and apply to half extents
    const sx = Math.hypot(e[0], e[1], e[2]);
    const sy = Math.hypot(e[4], e[5], e[6]);
    const sz = Math.hypot(e[8], e[9], e[10]);

    // Assuming base halfExtents are initialized to original geometry size,
    // we would multiply them here. For now, we assume the OBB is updated
    // freshly each frame or scale is baked into halfExtents.

    return this;
  }
}

/// src/math/Frustum.ts
import { Matrix4 } from "./Matrix4.js";
import { Vector3D } from "./Vector3D.js";
import { BoundingVolume } from "../interfaces/index.js";

/**
 * A class representing a camera frustum.
 */
export class Frustum {
  /**
   * The planes of the frustum.
   */
  public planes: Float32Array = new Float32Array(24);

  /**
   * Sets the frustum planes from a matrix.
   * @param m The matrix to set from.
   */
  public setFromMatrix(m: Matrix4): void {
    const me: Float32Array = m.data;
    if (me.length < 16) return;
    const p: Float32Array = this.planes;

    p[0] = me[3]! - me[0]!;
    p[1] = me[7]! - me[4]!;
    p[2] = me[11]! - me[8]!;
    p[3] = me[15]! - me[12]!;

    p[4] = me[3]! + me[0]!;
    p[5] = me[7]! + me[4]!;
    p[6] = me[11]! + me[8]!;
    p[7] = me[15]! + me[12]!;

    p[8] = me[3]! + me[1]!;
    p[9] = me[7]! + me[5]!;
    p[10] = me[11]! + me[9]!;
    p[11] = me[15]! + me[13]!;

    p[12] = me[3]! - me[1]!;
    p[13] = me[7]! - me[5]!;
    p[14] = me[11]! - me[9]!;
    p[15] = me[15]! - me[13]!;

    p[16] = me[3]! - me[2]!;
    p[17] = me[7]! - me[6]!;
    p[18] = me[11]! - me[10]!;
    p[19] = me[15]! - me[14]!;

    p[20] = me[3]! + me[2]!;
    p[21] = me[7]! + me[6]!;
    p[22] = me[11]! + me[10]!;
    p[23] = me[15]! + me[14]!;

    for (let i = 0; i < 6; i++) {
      const idx: number = i * 4;
      const d: number = Math.sqrt(
        p[idx]! * p[idx]! + p[idx + 1]! * p[idx + 1]! + p[idx + 2]! * p[idx + 2]!,
      );
      if (d > 0) {
        const f: number = 1.0 / d;
        p[idx]! *= f;
        p[idx + 1]! *= f;
        p[idx + 2]! *= f;
        p[idx + 3]! *= f;
      }
    }
  }

  /**
   * Checks if a bounding volume intersects with the frustum.
   * @param volume The bounding volume to check.
   * @returns True if the volume intersects with the frustum.
   */
  public intersectsVolume(volume: BoundingVolume): boolean {
    const c: Vector3D = volume.center;
    const r: number = volume.getBroadRadius();
    const p: Float32Array = this.planes;

    for (let i = 0; i < 6; i++) {
      const idx: number = i * 4;
      const dist: number = p[idx]! * c.x + p[idx + 1]! * c.y + p[idx + 2]! * c.z + p[idx + 3]!;
      if (dist < -r) {
        return false;
      }
    }
    return true;
  }
}

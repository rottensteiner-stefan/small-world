/// src/math/Frustum.ts
import { Matrix4 } from "./Matrix4.js";
import { Vector3D } from "./Vector3D.js";
import { BoundingVolume } from "../interfaces/index.js";
import { BoundingType } from "../enums/index.js";
import { BoundingBox } from "../physics/index.js";

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
    if (16 > me.length) {
      return;
    }
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

    for (let i: number = 0; 6 > i; i++) {
      const idx: number = i * 4;
      const d: number = Math.sqrt(
        (p[idx] ?? 0) * (p[idx] ?? 0) +
          (p[idx + 1] ?? 0) * (p[idx + 1] ?? 0) +
          (p[idx + 2] ?? 0) * (p[idx + 2] ?? 0),
      );
      if (0 < d) {
        const f: number = 1.0 / d;
        p[idx] = (p[idx] ?? 0) * f;
        p[idx + 1] = (p[idx + 1] ?? 0) * f;
        p[idx + 2] = (p[idx + 2] ?? 0) * f;
        p[idx + 3] = (p[idx + 3] ?? 0) * f;
      }
    }
  }

  /**
   * Checks if a bounding volume intersects with the frustum.
   * @param volume The bounding volume to check.
   * @returns True if the volume intersects with the frustum.
   */
  public intersectsVolume(volume: BoundingVolume): boolean {
    if (BoundingType.BOX === volume.type) {
      return this.intersectsBox(volume as BoundingBox);
    }

    const c: Vector3D = volume.center;
    const r: number = volume.getBroadRadius();
    const p: Float32Array = this.planes;

    for (let i: number = 0; 6 > i; i++) {
      const idx: number = i * 4;
      const dist: number =
        (p[idx] ?? 0) * c.x + (p[idx + 1] ?? 0) * c.y + (p[idx + 2] ?? 0) * c.z + (p[idx + 3] ?? 0);
      if (-r > dist) {
        return false;
      }
    }
    return true;
  }

  /**
   * Checks if a bounding box intersects with the frustum.
   * @param box The bounding box to check.
   * @returns True if the box intersects with the frustum.
   */
  public intersectsBox(box: BoundingBox): boolean {
    const p: Float32Array = this.planes;

    for (let i: number = 0; 6 > i; i++) {
      const idx: number = i * 4;
      const px: number = 0 <= (p[idx] ?? 0) ? box.max.x : box.min.x;
      const py: number = 0 <= (p[idx + 1] ?? 0) ? box.max.y : box.min.y;
      const pz: number = 0 <= (p[idx + 2] ?? 0) ? box.max.z : box.min.z;

      const dist: number =
        (p[idx] ?? 0) * px + (p[idx + 1] ?? 0) * py + (p[idx + 2] ?? 0) * pz + (p[idx + 3] ?? 0);

      if (0 > dist) {
        return false;
      }
    }

    return true;
  }
}

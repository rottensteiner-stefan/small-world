/// src/physix/Raycaster.ts

import { Vector2D, Vector3D, MathPool, Matrix4 } from "../math/index.js";
import { CameraInterfaceData } from "../interfaces/index.js";
import { Object3D } from "../core/Object3D.js";
import { BoundingBox } from "./BoundingBox.js";
import { BoundingType } from "../enums/index.js";
import { Ray } from "./Ray.js";

/**
 * Represents an intersection result from a raycast.
 */
export interface Intersection {
  /** Distance from the ray origin to the intersection point. */
  distance: number;
  /** The intersected object. */
  object: Object3D;
}

/**
 * Casts rays into the scene to pick or select objects.
 */
export class Raycaster {
  /** The internal mathematical ray used for casting. */
  public ray: Ray = new Ray();

  /**
   * Sets the ray's origin and direction based on screen coordinates and the camera.
   * @param coords The 2D coordinates in Normalized Device Coordinates (NDC) [-1, 1].
   * @param camera The camera used to render the scene.
   */
  public setFromCamera(coords: Vector2D, camera: CameraInterfaceData): void {
    const invVP: Matrix4 = MathPool.acquireMatrix();
    if (false === camera.viewProjectionMatrix4.invert(invVP)) {
      MathPool.releaseMatrix(invVP);
      return;
    }

    // Determine the ray direction by unprojecting the point on the far plane
    const target: Vector3D = MathPool.acquireVector().set(coords.x, coords.y, 1.0);
    invVP.transformVector(target);

    // Origin is the camera position for perspective (simplification)
    this.ray.origin.copyFrom(camera.position);

    // Direction is target - origin
    this.ray.direction.copyFrom(target).sub(this.ray.origin).normalize();

    MathPool.releaseVector(target);
    MathPool.releaseMatrix(invVP);
  }

  /**
   * Tests the ray against a list of objects.
   * Currently uses fast AABB (BoundingBox) intersection.
   * @param objects The objects to test against.
   * @param sort If true, the results are sorted by distance (closest first).
   * @returns An array of intersections.
   */
  public intersectObjects(objects: Object3D[], sort: boolean = true): Intersection[] {
    const intersects: Intersection[] = [];

    for (const obj of objects) {
      if (!obj.isVisible || !obj.bounds || obj.bounds.type !== BoundingType.BOX) {
        continue;
      }

      const box: BoundingBox = obj.bounds as BoundingBox;
      const t: number = this.ray.intersectsBox(box);

      if (0 <= t) {
        intersects.push({
          distance: t,
          object: obj,
        });
      }
    }

    if (sort) {
      intersects.sort((a, b) => a.distance - b.distance);
    }

    return intersects;
  }
}

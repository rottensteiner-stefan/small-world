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
      const tBox: number = this.ray.intersectsBox(box);

      if (0 <= tBox) {
        if (obj.geometry) {
          const geoData = obj.geometry;
          if (geoData.vertices && geoData.indices) {
            let closestT = Infinity;
            const v0 = MathPool.acquireVector();
            const v1 = MathPool.acquireVector();
            const v2 = MathPool.acquireVector();

            for (let i = 0; i < geoData.indices.length; i += 3) {
              const i0 = (geoData.indices[i] ?? 0) * 3;
              const i1 = (geoData.indices[i + 1] ?? 0) * 3;
              const i2 = (geoData.indices[i + 2] ?? 0) * 3;

              v0.set(
                geoData.vertices[i0] ?? 0,
                geoData.vertices[i0 + 1] ?? 0,
                geoData.vertices[i0 + 2] ?? 0,
              );
              v1.set(
                geoData.vertices[i1] ?? 0,
                geoData.vertices[i1 + 1] ?? 0,
                geoData.vertices[i1 + 2] ?? 0,
              );
              v2.set(
                geoData.vertices[i2] ?? 0,
                geoData.vertices[i2 + 1] ?? 0,
                geoData.vertices[i2 + 2] ?? 0,
              );

              obj.worldMatrix.transformVector(v0);
              obj.worldMatrix.transformVector(v1);
              obj.worldMatrix.transformVector(v2);

              const tTri = this._intersectTriangle(v0, v1, v2, this.ray);
              if (tTri >= 0 && tTri < closestT) {
                closestT = tTri;
              }
            }

            MathPool.releaseVector(v0);
            MathPool.releaseVector(v1);
            MathPool.releaseVector(v2);

            if (closestT !== Infinity) {
              intersects.push({
                distance: closestT,
                object: obj,
              });
            }
          } else {
            intersects.push({
              distance: tBox,
              object: obj,
            });
          }
        } else {
          intersects.push({
            distance: tBox,
            object: obj,
          });
        }
      }
    }

    if (sort) {
      intersects.sort((a, b) => a.distance - b.distance);
    }

    return intersects;
  }

  /**
   * Möller-Trumbore intersection algorithm.
   */
  private _intersectTriangle(v0: Vector3D, v1: Vector3D, v2: Vector3D, ray: Ray): number {
    const EPSILON = 1e-6;

    const edge1X = v1.x - v0.x;
    const edge1Y = v1.y - v0.y;
    const edge1Z = v1.z - v0.z;

    const edge2X = v2.x - v0.x;
    const edge2Y = v2.y - v0.y;
    const edge2Z = v2.z - v0.z;

    const dir = ray.direction;
    const hX = dir.y * edge2Z - dir.z * edge2Y;
    const hY = dir.z * edge2X - dir.x * edge2Z;
    const hZ = dir.x * edge2Y - dir.y * edge2X;

    const a = edge1X * hX + edge1Y * hY + edge1Z * hZ;

    if (a > -EPSILON && a < EPSILON) {
      return -1;
    }

    const f = 1.0 / a;

    const sX = ray.origin.x - v0.x;
    const sY = ray.origin.y - v0.y;
    const sZ = ray.origin.z - v0.z;

    const u = f * (sX * hX + sY * hY + sZ * hZ);
    if (u < 0.0 || u > 1.0) {
      return -1;
    }

    const qX = sY * edge1Z - sZ * edge1Y;
    const qY = sZ * edge1X - sX * edge1Z;
    const qZ = sX * edge1Y - sY * edge1X;

    const v = f * (dir.x * qX + dir.y * qY + dir.z * qZ);
    if (v < 0.0 || u + v > 1.0) {
      return -1;
    }

    const t = f * (edge2X * qX + edge2Y * qY + edge2Z * qZ);
    if (t > EPSILON) {
      return t;
    }

    return -1;
  }
}

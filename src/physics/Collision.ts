/// src/physics/Collision.ts
import { BoundingBox, BoundingSphere } from "./index.js";
import { BoundingVolume } from "../interfaces/index.js";
import { Vector3D } from "../math/index.js";
import { BoundingType } from "../enums/index.js";

export class Collision {
  public static test(a: BoundingVolume, b: BoundingVolume): boolean {
    const distSq = a.center.distanceToSq(b.center);
    const sumRad = a.getBroadRadius() + b.getBroadRadius();
    if (distSq > sumRad * sumRad) return false;
    if (a.type === BoundingType.SPHERE && b.type === BoundingType.SPHERE)
      return this.sphereSphere(a as BoundingSphere, b as BoundingSphere);
    if (a.type === BoundingType.BOX && b.type === BoundingType.BOX)
      return this.boxBox(a as BoundingBox, b as BoundingBox);
    if (a.type === BoundingType.SPHERE && b.type === BoundingType.BOX)
      return this.sphereBox(a as BoundingSphere, b as BoundingBox);
    if (a.type === BoundingType.BOX && b.type === BoundingType.SPHERE)
      return this.sphereBox(b as BoundingSphere, a as BoundingBox);
    return false;
  }

  private static sphereSphere(s1: BoundingSphere, s2: BoundingSphere): boolean {
    const d2 = s1.center.distanceToSq(s2.center);
    const r2 = (s1.radius + s2.radius) * (s1.radius + s2.radius);
    return d2 <= r2;
  }

  private static boxBox(b1: BoundingBox, b2: BoundingBox): boolean {
    return (
      b1.min.x <= b2.max.x &&
      b1.max.x >= b2.min.x &&
      b1.min.y <= b2.max.y &&
      b1.max.y >= b2.min.y &&
      b1.min.z <= b2.max.z &&
      b1.max.z >= b2.min.z
    );
  }

  private static sphereBox(s: BoundingSphere, b: BoundingBox): boolean {
    const closest = new Vector3D(
      Math.max(b.min.x, Math.min(s.center.x, b.max.x)),
      Math.max(b.min.y, Math.min(s.center.y, b.max.y)),
      Math.max(b.min.z, Math.min(s.center.z, b.max.z)),
    );
    return closest.distanceToSq(s.center) <= s.radius * s.radius;
  }
}

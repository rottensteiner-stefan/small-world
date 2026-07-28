import { describe, it, expect } from "vitest";
import { Ray } from "../../src/physix/Ray.js";
import { BoundingBox } from "../../src/physix/BoundingBox.js";
import { BoundingSphere } from "../../src/physix/BoundingSphere.js";
import { Vector3D } from "../../src/math/index.js";

describe("Ray", () => {
  it("should find the intersection distance for a ray hitting a box", () => {
    const ray = new Ray(new Vector3D(0, 0, 0), new Vector3D(1, 0, 0));
    const box = new BoundingBox(new Vector3D(5, -1, -1), new Vector3D(7, 1, 1));
    expect(ray.intersectsBox(box)).toBeCloseTo(5);
  });

  it("should return -1 for a ray missing a box", () => {
    const ray = new Ray(new Vector3D(0, 0, 0), new Vector3D(1, 0, 0));
    const box = new BoundingBox(new Vector3D(5, 5, 5), new Vector3D(7, 7, 7));
    expect(ray.intersectsBox(box)).toBe(-1);
  });

  it("should find the nearest intersection distance for a ray hitting a sphere", () => {
    const ray = new Ray(new Vector3D(0, 0, 0), new Vector3D(1, 0, 0));
    const sphere = new BoundingSphere(new Vector3D(10, 0, 0), 1.0);
    // Ray enters the sphere at x=9 (10 units away, minus the radius).
    expect(ray.intersectsSphere(sphere)).toBeCloseTo(9);
  });

  it("should return -1 for a ray missing a sphere", () => {
    const ray = new Ray(new Vector3D(0, 0, 0), new Vector3D(1, 0, 0));
    const sphere = new BoundingSphere(new Vector3D(10, 5, 0), 1.0);
    expect(ray.intersectsSphere(sphere)).toBe(-1);
  });

  it("should return the exit-point distance when the ray origin starts inside a sphere", () => {
    const ray = new Ray(new Vector3D(0, 0, 0), new Vector3D(1, 0, 0));
    const sphere = new BoundingSphere(new Vector3D(0, 0, 0), 2.0);
    // Origin is inside the sphere, so the near root (t1) is negative -- the ray should
    // still report the far/exit root instead of claiming no intersection.
    expect(ray.intersectsSphere(sphere)).toBeCloseTo(2);
  });

  it("should return -1 for a sphere entirely behind the ray's origin", () => {
    const ray = new Ray(new Vector3D(0, 0, 0), new Vector3D(1, 0, 0));
    const sphere = new BoundingSphere(new Vector3D(-10, 0, 0), 1.0);
    expect(ray.intersectsSphere(sphere)).toBe(-1);
  });
});

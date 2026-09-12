import { describe, it, expect } from "vitest";
import { Raycaster } from "../../src/physix/Raycaster.js";
import { BoundingBox } from "../../src/physix/BoundingBox.js";
import { BoundingSphere } from "../../src/physix/BoundingSphere.js";
import { Object3D } from "../../src/core/Object3D.js";
import { Vector3D } from "../../src/math/index.js";

describe("Raycaster", () => {
  it("should pick a box-bounded object along the ray", () => {
    const raycaster = new Raycaster();
    raycaster.ray.set(new Vector3D(0, 0, 0), new Vector3D(1, 0, 0));

    const box = new Object3D("Box");
    box.bounds = new BoundingBox(new Vector3D(5, -1, -1), new Vector3D(7, 1, 1));

    const hits = raycaster.intersectObjects([box]);
    expect(hits).toHaveLength(1);
    expect(hits[0]!.object).toBe(box);
    expect(hits[0]!.distance).toBeCloseTo(5);
  });

  it("should pick a sphere-bounded object along the ray (Gadget Inspector regression)", () => {
    // Gadget Inspector's click-to-select, and anything else built on this raycaster,
    // used to silently skip every sphere-bounded object (Discs, Wisps, ...) -- only
    // BoundingType.BOX ever reached the hit list. This is exactly that case.
    const raycaster = new Raycaster();
    raycaster.ray.set(new Vector3D(0, 0, 0), new Vector3D(1, 0, 0));

    const sphere = new Object3D("Sphere");
    sphere.bounds = new BoundingSphere(new Vector3D(10, 0, 0), 1.0);

    const hits = raycaster.intersectObjects([sphere]);
    expect(hits).toHaveLength(1);
    expect(hits[0]!.object).toBe(sphere);
    expect(hits[0]!.distance).toBeCloseTo(9);
  });

  it("should sort mixed box/sphere hits by distance, closest first", () => {
    const raycaster = new Raycaster();
    raycaster.ray.set(new Vector3D(0, 0, 0), new Vector3D(1, 0, 0));

    const far = new Object3D("Far");
    far.bounds = new BoundingSphere(new Vector3D(20, 0, 0), 1.0);
    const near = new Object3D("Near");
    near.bounds = new BoundingBox(new Vector3D(3, -1, -1), new Vector3D(4, 1, 1));

    const hits = raycaster.intersectObjects([far, near]);
    expect(hits.map((h) => h.object.name)).toEqual(["Near", "Far"]);
  });

  it("should skip objects with isCollidable = false regardless of bounds type", () => {
    const raycaster = new Raycaster();
    raycaster.ray.set(new Vector3D(0, 0, 0), new Vector3D(1, 0, 0));

    const sphere = new Object3D("Sphere");
    sphere.bounds = new BoundingSphere(new Vector3D(10, 0, 0), 1.0);
    sphere.isCollidable = false;

    expect(raycaster.intersectObjects([sphere])).toHaveLength(0);
  });

  it("should skip objects with no bounds", () => {
    const raycaster = new Raycaster();
    raycaster.ray.set(new Vector3D(0, 0, 0), new Vector3D(1, 0, 0));

    const obj = new Object3D("NoBounds");
    expect(raycaster.intersectObjects([obj])).toHaveLength(0);
  });
});

import { describe, it, expect } from "vitest";
import { Octree } from "../../src/core/Octree.js";
import { Object3D } from "../../src/core/Object3D.js";
import { BoundingBox } from "../../src/physix/BoundingBox.js";
import { Vector3D } from "../../src/math/Vector3D.js";
import { Cube } from "../../src/geometry/Cube.js";
import { Sprite } from "../../src/core/Sprite.js";

describe("Octree", () => {
  it("should return true when inserting an object within bounds", () => {
    const octree = new Octree(
      new BoundingBox(new Vector3D(-10, -10, -10), new Vector3D(10, 10, 10)),
    );
    const obj = new Object3D("TestObj");
    obj.geometry = new Cube({ size: 1 }).getGeometryData();
    obj.position.set(0, 0, 0);
    obj.updateMatrixWorld();
    obj.computeBounds();

    const result = octree.insert(obj);
    expect(result).toBe(true);
  });

  it("should return true when inserting a Sprite within bounds", () => {
    const octree = new Octree(
      new BoundingBox(new Vector3D(-200, -50, -200), new Vector3D(200, 100, 200)),
    );
    const sprite = new Sprite();
    sprite.position.set(-14, 1.5, -5);
    sprite.updateMatrixWorld();
    sprite.computeBounds();

    const result = octree.insert(sprite);
    expect(result).toBe(true);
  });

  it("should grow the root bounds and succeed when inserting an object outside the initial bounds", () => {
    const octree = new Octree(
      new BoundingBox(new Vector3D(-10, -10, -10), new Vector3D(10, 10, 10)),
    );
    const obj = new Object3D("TestObj");
    obj.geometry = new Cube({ size: 1 }).getGeometryData();
    obj.position.set(20, 20, 20);
    obj.updateMatrixWorld();
    obj.computeBounds();

    // A dynamically spawned/teleported object outside the octree's fixed extent must still be
    // inserted -- otherwise it is never returned by query() and FrustumCuller leaves it
    // permanently culled. The root bounds grow to accommodate it instead of rejecting it.
    const result = octree.insert(obj);
    expect(result).toBe(true);
    expect(octree.root.bounds.containsVolume(obj.bounds!)).toBe(true);
  });

  it("should return false when inserting an object without bounds", () => {
    const octree = new Octree(
      new BoundingBox(new Vector3D(-10, -10, -10), new Vector3D(10, 10, 10)),
    );
    const obj = new Object3D("TestObj");
    // No geometry = no bounds

    const result = octree.insert(obj);
    expect(result).toBe(false);
  });
});

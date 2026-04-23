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
    obj.updateMatrixWorld(true);
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
    sprite.updateMatrixWorld(true);
    sprite.computeBounds();

    const result = octree.insert(sprite);
    expect(result).toBe(true);
  });

  it("should return false when inserting an object outside bounds", () => {
    const octree = new Octree(
      new BoundingBox(new Vector3D(-10, -10, -10), new Vector3D(10, 10, 10)),
    );
    const obj = new Object3D("TestObj");
    obj.geometry = new Cube({ size: 1 }).getGeometryData();
    obj.position.set(20, 20, 20);
    obj.updateMatrixWorld(true);
    obj.computeBounds();

    const result = octree.insert(obj);
    expect(result).toBe(false);
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

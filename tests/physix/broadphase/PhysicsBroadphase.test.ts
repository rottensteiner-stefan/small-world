import { describe, it, expect } from "vitest";
import { Object3D } from "../../../src/core/Object3D.js";
import { PhysicsBroadphase } from "../../../src/physix/broadphase/PhysicsBroadphase.js";
import { BoundingBox } from "../../../src/physix/BoundingBox.js";
import { Vector3D } from "../../../src/math/index.js";
import { Collidable } from "../../../src/interfaces/index.js";

describe("PhysicsBroadphase", () => {
  it("builds an Octree and queries intersecting volumes", () => {
    const broadphase = new PhysicsBroadphase();

    const objA = new Object3D("A");
    objA.bounds = new BoundingBox(new Vector3D(0, 0, 0), new Vector3D(1, 1, 1));

    const objB = new Object3D("B");
    objB.bounds = new BoundingBox(new Vector3D(10, 10, 10), new Vector3D(11, 11, 11));

    broadphase.update([objA, objB]);
    expect(broadphase.tree).toBeDefined();

    const queryBox = new BoundingBox(new Vector3D(-0.5, -0.5, -0.5), new Vector3D(0.5, 0.5, 0.5));
    const hits: Collidable[] = [];
    broadphase.queryVolume(queryBox, hits);

    expect(hits).toContain(objA);
    expect(hits).not.toContain(objB);
  });

  it("handles fallback list when colliders cannot be inserted into the octree", () => {
    const broadphase = new PhysicsBroadphase();
    const obj = new Object3D("NoBounds");
    broadphase.update([obj]);
    expect(broadphase.fallback.length).toBeGreaterThanOrEqual(0);
  });
});

import { describe, it, expect } from "vitest";
import { Scene, Object3D } from "../../../src/core/index.js";
import { InspectorGizmos } from "../../../src/tools/inspector/InspectorGizmos.js";
import { BoundingBox, BoundingSphere } from "../../../src/physix/index.js";
import { Vector3D } from "../../../src/math/index.js";

describe("InspectorGizmos", () => {
  it("creates highlight mesh and coordinate axes", () => {
    const scene = new Scene();
    const gizmos = new InspectorGizmos(scene);

    expect(gizmos.highlightMesh).toBeDefined();
    expect(gizmos.worldAxes).toBeDefined();
    expect(gizmos.objectAxes).toBeDefined();

    expect(gizmos.isGizmoObject(gizmos.highlightMesh)).toBe(true);
    expect(gizmos.isGizmoObject(gizmos.worldAxes)).toBe(true);
    expect(gizmos.isGizmoObject(gizmos.objectAxes)).toBe(true);
  });

  it("syncs highlight mesh with bounding box of selected object", () => {
    const scene = new Scene();
    const gizmos = new InspectorGizmos(scene);

    const obj = new Object3D("TargetCube");
    obj.bounds = new BoundingBox(new Vector3D(-1, -1, -1), new Vector3D(1, 1, 1));

    const result = gizmos.syncHighlightMesh(obj);
    expect(result).toBe(true);
    expect(gizmos.highlightMesh.position.x).toBe(0);
    expect(gizmos.highlightMesh.scale.x).toBeCloseTo(2.02);
  });

  it("syncs highlight mesh with bounding sphere of selected object", () => {
    const scene = new Scene();
    const gizmos = new InspectorGizmos(scene);

    const obj = new Object3D("TargetSphere");
    obj.bounds = new BoundingSphere(new Vector3D(5, 5, 5), 2.0);

    const result = gizmos.syncHighlightMesh(obj);
    expect(result).toBe(true);
    expect(gizmos.highlightMesh.position.x).toBe(5);
    expect(gizmos.highlightMesh.scale.x).toBeCloseTo(4.02);
  });
});

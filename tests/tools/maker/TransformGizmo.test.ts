import { describe, it, expect } from "vitest";
import { TransformGizmo } from "../../../src/tools/maker/TransformGizmo.js";
import { Object3D } from "../../../src/core/Object3D.js";
import { Vector3D } from "../../../src/math/index.js";
import { CameraInterfaceData } from "../../../src/interfaces/index.js";

/** Only the fields `TransformGizmo` actually reads: `update()`/`computeAxisDelta()` never touch
 * `viewProjectionMatrix4`, `behaviors`, or the camera-strategy fields -- unlike `pickAxis()`
 * (raycasting), which needs a real renderer/camera and is covered by live browser testing
 * instead (see docs/adr/0010-maker-editor-architecture.md Phase 2 notes). */
function fakeCamera(position: Vector3D, target: Vector3D): CameraInterfaceData {
  return {
    position,
    target,
    up: new Vector3D(0, 1, 0),
  } as unknown as CameraInterfaceData;
}

describe("TransformGizmo", () => {
  it("update() glues the gizmo root to the target's world position", () => {
    const gizmo = new TransformGizmo();
    const target = new Object3D("Target");
    target.position.set(3, 4, 5);
    target.updateMatrixWorld();
    gizmo.attachTo(target);

    gizmo.update(fakeCamera(new Vector3D(0, 0, 10), new Vector3D(0, 0, 0)));

    expect(gizmo.root.position.x).toBeCloseTo(3);
    expect(gizmo.root.position.y).toBeCloseTo(4);
    expect(gizmo.root.position.z).toBeCloseTo(5);
  });

  it("hides the root and stops tracking once detached", () => {
    const gizmo = new TransformGizmo();
    const target = new Object3D("Target");
    gizmo.attachTo(target);
    expect(gizmo.root.isVisible).toBe(true);

    gizmo.attachTo(undefined);
    expect(gizmo.root.isVisible).toBe(false);
  });

  describe("computeAxisDelta", () => {
    // Camera looking straight down -Z at the origin, world-up as camera-up -- the simplest case
    // where "right" = +X and "screen up" = +Y.
    const camera = fakeCamera(new Vector3D(0, 0, 10), new Vector3D(0, 0, 0));

    it("regression: rotate mode is driven by horizontal drag alone, for every axis", () => {
      // This is the exact bug found during Phase 2 live-testing: reusing the translate/scale
      // axis-projection formula for rotation made Y-axis rotation require a *vertical* drag
      // (since the Y axis projects mostly vertically on screen), which is unintuitive for a ring
      // you drag tangentially. Rotation must depend on dx only, identically across x/y/z.
      const gizmo = new TransformGizmo();
      gizmo.setMode("rotate");
      const target = new Object3D("Target");
      gizmo.attachTo(target);

      for (const axis of ["x", "y", "z"] as const) {
        const horizontal = gizmo.computeAxisDelta(axis, 20, 0, camera);
        const vertical = gizmo.computeAxisDelta(axis, 0, 20, camera);
        expect(horizontal).not.toBe(0);
        expect(vertical).toBe(0);
      }
    });

    it("translate mode scales the delta with distance to the target", () => {
      const gizmo = new TransformGizmo();
      gizmo.setMode("translate");
      const near = new Object3D("Near");
      near.position.set(0, 0, 5);
      near.updateMatrixWorld();
      const far = new Object3D("Far");
      far.position.set(0, 0, -95); // much farther from the camera at z=10
      far.updateMatrixWorld();

      gizmo.attachTo(near);
      const nearDelta = gizmo.computeAxisDelta("x", 20, 0, camera);
      gizmo.attachTo(far);
      const farDelta = gizmo.computeAxisDelta("x", 20, 0, camera);

      expect(Math.abs(farDelta)).toBeGreaterThan(Math.abs(nearDelta));
    });

    it("scale mode is a small, direction-consistent increment", () => {
      const gizmo = new TransformGizmo();
      gizmo.setMode("scale");
      const target = new Object3D("Target");
      gizmo.attachTo(target);

      const positive = gizmo.computeAxisDelta("x", 20, 0, camera);
      const negative = gizmo.computeAxisDelta("x", -20, 0, camera);
      expect(positive).toBeGreaterThan(0);
      expect(negative).toBeLessThan(0);
      expect(Math.abs(positive)).toBeCloseTo(Math.abs(negative));
    });
  });
});

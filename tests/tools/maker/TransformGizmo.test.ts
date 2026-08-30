import { describe, it, expect } from "vitest";
import { TransformGizmo } from "../../../src/tools/maker/TransformGizmo.js";
import { Object3D } from "../../../src/core/Object3D.js";
import { Camera } from "../../../src/core/Camera.js";
import { PerspectiveProjection } from "../../../src/math/projections/PerspectiveProjection.js";

describe("TransformGizmo (ADR 0010 Maker Phase 2)", () => {
  it("should initialize with default translate mode and hidden state", () => {
    const gizmo = new TransformGizmo();

    expect(gizmo.mode).toBe("translate");
    expect(gizmo.root.name).toBe("MakerGizmo");
    expect(gizmo.root.isVisible).toBe(false);
  });

  it("should switch modes and toggle mode group visibilities", () => {
    const gizmo = new TransformGizmo();
    const target = new Object3D("TargetObj");
    gizmo.attachTo(target);

    expect(gizmo.root.isVisible).toBe(true);

    gizmo.setMode("rotate");
    expect(gizmo.mode).toBe("rotate");

    gizmo.setMode("scale");
    expect(gizmo.mode).toBe("scale");

    gizmo.setMode("translate");
    expect(gizmo.mode).toBe("translate");
  });

  it("should follow attached target position and scale with camera distance", () => {
    const gizmo = new TransformGizmo();
    const target = new Object3D("TargetObj");
    target.position.set(5, 2, -3);
    target.updateMatrixWorld();

    gizmo.attachTo(target);

    const camera = new Camera(new PerspectiveProjection());
    camera.position.set(5, 2, 7); // 10 units away from target along Z
    camera.target.set(5, 2, -3);
    camera.update(camera.target, 0, 0);

    gizmo.update(camera);

    expect(gizmo.root.position.x).toBeCloseTo(5);
    expect(gizmo.root.position.y).toBeCloseTo(2);
    expect(gizmo.root.position.z).toBeCloseTo(-3);

    // Constant screen size scaling
    expect(gizmo.root.scale.x).toBeGreaterThan(0.5);
    expect(gizmo.root.scale.x).toBe(gizmo.root.scale.y);
    expect(gizmo.root.scale.y).toBe(gizmo.root.scale.z);
  });

  it("should compute accurate axis deltas from screen-space mouse movements", () => {
    const gizmo = new TransformGizmo();
    const target = new Object3D("TargetObj");
    target.position.set(0, 0, 0);
    gizmo.attachTo(target);

    const camera = new Camera(new PerspectiveProjection());
    camera.position.set(0, 0, 10);
    camera.target.set(0, 0, 0);
    camera.update(camera.target, 0, 0);

    // Translating along X when moving mouse right (dx > 0)
    gizmo.setMode("translate");
    const deltaX = gizmo.computeAxisDelta("x", 20, 0, camera);
    expect(deltaX).toBeGreaterThan(0);

    // Translating along Y when moving mouse up (dy < 0 in screen space, which is +Y in 3D)
    const deltaY = gizmo.computeAxisDelta("y", 0, -20, camera);
    expect(deltaY).toBeGreaterThan(0);

    // Scaling mode
    gizmo.setMode("scale");
    const scaleDelta = gizmo.computeAxisDelta("x", 15, 0, camera);
    expect(scaleDelta).toBeGreaterThan(0);

    // Rotating mode
    gizmo.setMode("rotate");
    const rotDelta = gizmo.computeAxisDelta("y", 15, 0, camera);
    expect(rotDelta).toBeDefined();
  });

  it("should hide when target is detached", () => {
    const gizmo = new TransformGizmo();
    const target = new Object3D("TargetObj");
    gizmo.attachTo(target);
    expect(gizmo.root.isVisible).toBe(true);

    gizmo.attachTo(undefined);
    expect(gizmo.root.isVisible).toBe(false);
  });
});

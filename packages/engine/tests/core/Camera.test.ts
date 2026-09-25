import { describe, expect, it } from "vitest";
import { Camera, PerspectiveProjection, Vector3D } from "../../src/index.js";

describe("Camera project & screenToWorld", () => {
  it("should project a centered point in front of camera to NDC (0, 0)", () => {
    const camera = new Camera(
      new PerspectiveProjection({ fov: Math.PI / 2, aspect: 1, near: 0.1, far: 100 }),
    );
    camera.position.set(0, 0, 10);
    camera.target.set(0, 0, 0);
    camera.updateViewMatrix();

    const ndc = camera.project(new Vector3D(0, 0, 0));
    expect(ndc.x).toBeCloseTo(0, 4);
    expect(ndc.y).toBeCloseTo(0, 4);
    expect(ndc.z).toBeGreaterThan(0); // in front of camera
  });

  it("should project an offset world position to correct NDC quadrant", () => {
    const camera = new Camera(
      new PerspectiveProjection({ fov: Math.PI / 2, aspect: 1, near: 0.1, far: 100 }),
    );
    camera.position.set(0, 0, 10);
    camera.target.set(0, 0, 0);
    camera.updateViewMatrix();

    // Top-right in front of camera
    const topRight = camera.project(new Vector3D(5, 5, 0));
    expect(topRight.x).toBeGreaterThan(0);
    expect(topRight.y).toBeGreaterThan(0);
    expect(topRight.z).toBeGreaterThan(0);

    // Bottom-left in front of camera
    const bottomLeft = camera.project(new Vector3D(-5, -5, 0));
    expect(bottomLeft.x).toBeLessThan(0);
    expect(bottomLeft.y).toBeLessThan(0);
    expect(bottomLeft.z).toBeGreaterThan(0);
  });

  it("should flag points behind the camera with negative z", () => {
    const camera = new Camera(
      new PerspectiveProjection({ fov: Math.PI / 2, aspect: 1, near: 0.1, far: 100 }),
    );
    camera.position.set(0, 0, 10);
    camera.target.set(0, 0, 0);
    camera.updateViewMatrix();

    // Point located behind camera (Z = 20 while camera is at Z = 10 looking at Z = 0)
    const behind = camera.project(new Vector3D(0, 0, 20));
    expect(behind.z).toBeLessThanOrEqual(0);
  });
});

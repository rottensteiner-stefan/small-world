import { Object3D, Vector3D } from "../../src/index.js";
import { describe, it, expect } from "vitest";

describe("Object3D", () => {
  it("should initialize with default shadow properties", () => {
    const obj = new Object3D();

    // By default, objects should not cast or receive shadows
    expect(obj.castShadow).toBe(false);
    expect(obj.receiveShadow).toBe(false);
  });

  it("should allow setting shadow properties", () => {
    const obj = new Object3D();

    obj.castShadow = true;
    obj.receiveShadow = true;

    expect(obj.castShadow).toBe(true);
    expect(obj.receiveShadow).toBe(true);
  });

  describe("lookAt", () => {
    it("should correctly rotate to look at a target on the -Z axis (forward)", () => {
      const obj = new Object3D();
      obj.position.set(0, 0, 0);

      obj.lookAt(new Vector3D(0, 0, -1));
      obj.updateMatrixWorld();

      const forward = new Vector3D(0, 0, -1).transformDirection(obj.worldMatrix);
      expect(forward.x).toBeCloseTo(0);
      expect(forward.y).toBeCloseTo(0);
      expect(forward.z).toBeCloseTo(-1);
    });

    it("should correctly calculate rotation when looking UP (+Y)", () => {
      const obj = new Object3D();
      obj.position.set(0, 0, 0);

      obj.lookAt(new Vector3D(0, 5, 0));
      obj.updateMatrixWorld();

      const forward = new Vector3D(0, 0, -1).transformDirection(obj.worldMatrix);
      expect(forward.x).toBeCloseTo(0);
      expect(forward.y).toBeCloseTo(1);
      expect(forward.z).toBeCloseTo(0);
    });

    it("should correctly calculate rotation when looking RIGHT (+X)", () => {
      const obj = new Object3D();
      obj.position.set(0, 0, 0);

      obj.lookAt(new Vector3D(5, 0, 0));
      obj.updateMatrixWorld();

      const forward = new Vector3D(0, 0, -1).transformDirection(obj.worldMatrix);
      expect(forward.x).toBeCloseTo(1);
      expect(forward.y).toBeCloseTo(0);
      expect(forward.z).toBeCloseTo(0);
    });
  });
});

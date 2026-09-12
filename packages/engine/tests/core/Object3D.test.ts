import { Object3D, Vector3D, Quaternion } from "../../src/index.js";
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

  describe("getWorldPosition", () => {
    it("matches position for a root object with no parent", () => {
      const obj = new Object3D();
      obj.position.set(3, 4, 5);
      obj.updateMatrixWorld();

      const world = obj.getWorldPosition();
      expect(world.x).toBeCloseTo(3);
      expect(world.y).toBeCloseTo(4);
      expect(world.z).toBeCloseTo(5);
    });

    it("resolves the full parent chain, unlike the local position", () => {
      const parent = new Object3D("parent");
      parent.position.set(10, 0, 0);
      const child = new Object3D("child");
      child.position.set(1, 2, 3); // Local offset from the parent.
      parent.add(child);
      parent.updateMatrixWorld();

      const world = child.getWorldPosition();
      expect(world.x).toBeCloseTo(11);
      expect(world.y).toBeCloseTo(2);
      expect(world.z).toBeCloseTo(3);

      // `position` itself stays local -- this is exactly the distinction the method exists for.
      expect(child.position.x).toBeCloseTo(1);
    });

    it("writes into the provided vector instead of allocating, when given one", () => {
      const obj = new Object3D();
      obj.position.set(7, 8, 9);
      obj.updateMatrixWorld();

      const out = new Vector3D();
      const result = obj.getWorldPosition(out);

      expect(result).toBe(out);
      expect(out.x).toBeCloseTo(7);
      expect(out.y).toBeCloseTo(8);
      expect(out.z).toBeCloseTo(9);
    });
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

    it("should update quaternion and worldMatrix when quaternion is set", () => {
      const obj = new Object3D();
      obj.position.set(0, 0, 0);
      obj.quaternion = new Quaternion(0, 0, 0, 1);

      obj.lookAt(new Vector3D(5, 0, 0));
      obj.updateMatrixWorld();

      const forward = new Vector3D(0, 0, -1).transformDirection(obj.worldMatrix);
      expect(forward.x).toBeCloseTo(1);
      expect(forward.y).toBeCloseTo(0);
      expect(forward.z).toBeCloseTo(0);
      expect(obj.quaternion.w).not.toBe(1); // Quaternion was actively updated from identity
    });
  });
});

import { describe, it, expect } from "vitest";
import { Object3D } from "../../../src/core/Object3D.js";
import { RigidBody } from "../../../src/physix/RigidBody.js";
import { FluidVolume } from "../../../src/physix/FluidVolume.js";
import { BuoyancySolver } from "../../../src/physix/fluids/BuoyancySolver.js";
import { BoundingBox } from "../../../src/physix/BoundingBox.js";
import { BoundingSphere } from "../../../src/physix/BoundingSphere.js";
import { Vector3D } from "../../../src/math/index.js";

describe("BuoyancySolver", () => {
  it("returns default drag multipliers and applies no forces when not submerged", () => {
    const obj = new Object3D("FloatingCube");
    obj.position.set(0, 10, 0);
    obj.rigidBody = new RigidBody(1.0);
    obj.bounds = new BoundingBox(new Vector3D(-0.5, 9.5, -0.5), new Vector3D(0.5, 10.5, 0.5));

    const fluid = new FluidVolume(
      new BoundingBox(new Vector3D(-10, -5, -10), new Vector3D(10, 0, 10)),
      1.0,
      0.9,
    );

    const gravity = new Vector3D(0, -9.81, 0);
    const result = BuoyancySolver.applyFluidForces(obj, [fluid], gravity);

    expect(result.linearDrag).toBe(1.0);
    expect(result.angularDrag).toBe(1.0);
    expect(obj.rigidBody.forces.y).toBe(0);
  });

  it("applies upward buoyant force proportional to submerged depth", () => {
    const obj = new Object3D("SubmergedSphere");
    obj.position.set(0, -1, 0);
    obj.rigidBody = new RigidBody(2.0); // mass = 2.0 kg
    obj.bounds = new BoundingSphere(new Vector3D(0, -1, 0), 1.0); // min.y = -2, max.y = 0

    const fluid = new FluidVolume(
      new BoundingBox(new Vector3D(-10, -10, -10), new Vector3D(10, 0, 10)),
      1.0,
      0.8,
    );

    const gravity = new Vector3D(0, -9.81, 0);
    const result = BuoyancySolver.applyFluidForces(obj, [fluid], gravity);

    // Fully submerged below waterTop=0
    expect(obj.rigidBody.forces.y).toBeCloseTo(9.81 * 2.0 * 1.0 * 1.0);
    expect(result.linearDrag).toBeCloseTo(0.8);
    expect(result.angularDrag).toBeCloseTo(0.8);
  });

  it("applies current flow velocity forces to submerged bodies", () => {
    const obj = new Object3D("FlowingObject");
    obj.position.set(0, -0.5, 0);
    obj.rigidBody = new RigidBody(1.0);
    obj.bounds = new BoundingBox(new Vector3D(-0.5, -1, -0.5), new Vector3D(0.5, 0, 0.5));

    const fluid = new FluidVolume(
      new BoundingBox(new Vector3D(-10, -5, -10), new Vector3D(10, 0, 10)),
      1.0,
      0.9,
      new Vector3D(5, 0, 2),
    );

    const gravity = new Vector3D(0, -9.81, 0);
    BuoyancySolver.applyFluidForces(obj, [fluid], gravity);

    expect(obj.rigidBody.forces.x).toBeGreaterThan(0);
    expect(obj.rigidBody.forces.z).toBeGreaterThan(0);
  });
});

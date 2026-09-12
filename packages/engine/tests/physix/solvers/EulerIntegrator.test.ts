import { describe, it, expect } from "vitest";
import { Object3D } from "../../../src/core/Object3D.js";
import { RigidBody } from "../../../src/physix/RigidBody.js";
import { EulerIntegrator } from "../../../src/physix/solvers/EulerIntegrator.js";
import { Vector3D } from "../../../src/math/index.js";

describe("EulerIntegrator", () => {
  it("integrates linear motion under gravity and external forces", () => {
    const obj = new Object3D("FallingApple");
    obj.rigidBody = new RigidBody(1.0); // 1kg
    const gravity = new Vector3D(0, -10, 0);
    const deltaP = new Vector3D();

    EulerIntegrator.integrateVelocity(obj, gravity, 1.0, 0.1, deltaP);
    EulerIntegrator.applyDisplacement(obj, deltaP);

    // v = 0 + (-10) * 0.1 * 0.98 = -0.98
    // deltaP = -0.98 * 0.1 = -0.098
    expect(obj.rigidBody.velocity.y).toBeCloseTo(-0.98);
    expect(obj.position.y).toBeCloseTo(-0.098);
    expect(deltaP.y).toBeCloseTo(-0.098);
  });

  it("integrates angular motion and damping", () => {
    const obj = new Object3D("SpinningTop");
    obj.rigidBody = new RigidBody(1.0);
    obj.rigidBody.torque.set(0, 10, 0); // Torque around Y

    EulerIntegrator.integrateAngular(obj, 1.0, 0.1);

    expect(obj.rigidBody.angularVelocity.y).toBeGreaterThan(0);
    expect(obj.rotation.y).toBeGreaterThan(0);
  });

  it("interpolates transform for smooth rendering", () => {
    const obj = new Object3D("InterpolatedEntity");
    obj.rigidBody = new RigidBody(1.0);
    obj.rigidBody.prevPosition.set(0, 0, 0);
    obj.position.set(10, 0, 0);

    const truePos = new Vector3D();
    const trueRot = new Vector3D();
    const blendPos = new Vector3D();
    const blendRot = new Vector3D();

    EulerIntegrator.interpolateTransform(obj, 0.5, truePos, trueRot, blendPos, blendRot);

    expect(truePos.x).toBe(10);
    // Position on object is restored to true position
    expect(obj.position.x).toBe(10);
  });
});

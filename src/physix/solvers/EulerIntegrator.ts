import { Object3D } from "../../core/Object3D.js";
import { Vector3D, MathPool, MathUtils } from "../../math/index.js";

/**
 * Shortest-path angular delta from `from` to `to` (radians, wrapped into (-PI, PI]).
 */
function shortestAngleDelta(from: number, to: number): number {
  let delta = (to - from) % MathUtils.TWO_PI;
  if (delta > MathUtils.PI) delta -= MathUtils.TWO_PI;
  else if (delta < -MathUtils.PI) delta += MathUtils.TWO_PI;
  return delta;
}

/**
 * Numerical integration solver implementing Semi-Implicit Euler equations for linear and angular dynamics.
 */
export class EulerIntegrator {
  /**
   * Integrates linear forces, acceleration, and velocity, returning the computed positional displacement.
   * @param obj Target Object3D.
   * @param gravity Global gravity vector.
   * @param fluidLinearDrag Damping multiplier from fluid submersion (1.0 = no fluid).
   * @param dt Substep delta time in seconds.
   * @param outDeltaP Output vector receiving the computed position displacement (v * dt).
   */
  public static integrateVelocity(
    obj: Object3D,
    gravity: Vector3D,
    fluidLinearDrag: number,
    dt: number,
    outDeltaP: Vector3D,
  ): void {
    const rb = obj.rigidBody!;

    // acceleration = (forces / mass) + gravity
    rb.acceleration.copyFrom(rb.forces).scale(rb.inverseMass).add(gravity);

    // v = v + a * dt
    const deltaV = MathPool.acquireVector().copyFrom(rb.acceleration).scale(dt);
    rb.velocity.add(deltaV);
    MathPool.releaseVector(deltaV);

    // Apply friction and fluid damping
    rb.velocity.scale(rb.friction * fluidLinearDrag);

    // deltaP = v * dt
    outDeltaP.copyFrom(rb.velocity).scale(dt);
  }

  /**
   * Applies positional displacement to the target Object3D.
   * @param obj Target Object3D.
   * @param deltaP Displacement vector.
   */
  public static applyDisplacement(obj: Object3D, deltaP: Vector3D): void {
    obj.position.add(deltaP);
  }

  /**
   * Integrates torque, angular acceleration, angular velocity, and updates object rotation.
   * @param obj Target Object3D.
   * @param fluidAngularDrag Damping multiplier from fluid submersion (1.0 = no fluid).
   * @param dt Substep delta time in seconds.
   */
  public static integrateAngular(obj: Object3D, fluidAngularDrag: number, dt: number): void {
    const rb = obj.rigidBody!;

    // angularAcceleration = torque / inertia
    rb.angularAcceleration.copyFrom(rb.torque).scale(rb.inverseInertia);

    // w = w + alpha * dt
    const deltaW = MathPool.acquireVector().copyFrom(rb.angularAcceleration).scale(dt);
    rb.angularVelocity.add(deltaW);
    MathPool.releaseVector(deltaW);

    // Apply angular damping
    rb.angularVelocity.scale(rb.angularDamping * fluidAngularDrag);

    const wLength = rb.angularVelocity.length();
    if (wLength > 0.000001) {
      const axis = MathPool.acquireVector()
        .copyFrom(rb.angularVelocity)
        .scale(1.0 / wLength);
      const deltaQ = MathPool.acquireQuaternion().setFromAxisAngle(axis, wLength * dt);

      const zeroPos = MathPool.acquireVector().set(0, 0, 0);
      const unitScale = MathPool.acquireVector().set(1, 1, 1);
      const currentMatrix = MathPool.acquireMatrix().compose(zeroPos, obj.rotation, unitScale);
      const currentQ = MathPool.acquireQuaternion().setFromRotationMatrix(currentMatrix);

      currentQ.premultiply(deltaQ).normalize();

      currentMatrix.setFromQuaternion(currentQ);
      const outPos = MathPool.acquireVector();
      const outScale = MathPool.acquireVector();
      currentMatrix.decompose(outPos, obj.rotation, outScale);

      MathPool.releaseVector(axis);
      MathPool.releaseVector(zeroPos);
      MathPool.releaseVector(unitScale);
      MathPool.releaseVector(outPos);
      MathPool.releaseVector(outScale);
      MathPool.releaseQuaternion(deltaQ);
      MathPool.releaseQuaternion(currentQ);
      MathPool.releaseMatrix(currentMatrix);
    }
  }

  /**
   * Applies render-interpolation between previous and current physics state.
   */
  public static interpolateTransform(
    obj: Object3D,
    alpha: number,
    truePos: Vector3D,
    trueRot: Vector3D,
    blendPos: Vector3D,
    blendRot: Vector3D,
  ): void {
    const rb = obj.rigidBody!;

    truePos.copyFrom(obj.position);
    trueRot.copyFrom(obj.rotation);

    blendPos.copyFrom(rb.prevPosition).lerp(truePos, alpha);
    blendRot.set(
      rb.prevRotation.x + shortestAngleDelta(rb.prevRotation.x, trueRot.x) * alpha,
      rb.prevRotation.y + shortestAngleDelta(rb.prevRotation.y, trueRot.y) * alpha,
      rb.prevRotation.z + shortestAngleDelta(rb.prevRotation.z, trueRot.z) * alpha,
    );

    obj.position.copyFrom(blendPos);
    obj.rotation.copyFrom(blendRot);
    obj.updateMatrixWorld();

    obj.position.copyFrom(truePos);
    obj.rotation.copyFrom(trueRot);
  }
}

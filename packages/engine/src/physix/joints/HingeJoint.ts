import { Joint, JointOptions } from "./Joint.js";
import { Vector3D } from "../../math/Vector3D.js";
import { MathPool } from "../../math/MathPool.js";

/**
 * Configuration options for HingeJoint.
 */
export interface HingeJointOptions extends JointOptions {
  /** Local hinge axis on bodyA (defaults to Y-axis (0, 1, 0)). */
  axisA?: Vector3D | undefined;
  /** Local hinge axis on bodyB (defaults to Y-axis (0, 1, 0)). */
  axisB?: Vector3D | undefined;
  /** Whether angular rotation limits are active. Defaults to false. */
  enableLimit?: boolean | undefined;
  /** Minimum allowable rotation angle in radians. */
  minAngle?: number | undefined;
  /** Maximum allowable rotation angle in radians. */
  maxAngle?: number | undefined;
  /** Whether an active motor applies torque to drive rotation. */
  enableMotor?: boolean | undefined;
  /** Target angular motor speed in radians per second. */
  motorSpeed?: number | undefined;
  /** Maximum torque the motor is permitted to exert (N*m). */
  maxMotorTorque?: number | undefined;
}

/**
 * Revolute / Pin joint restricting motion to 1 rotational degree of freedom around a designated hinge axis.
 */
export class HingeJoint extends Joint {
  /** Local hinge axis on bodyA. */
  public axisA: Vector3D;
  /** Local hinge axis on bodyB. */
  public axisB: Vector3D;
  /** Whether angular rotation limits are active. */
  public enableLimit: boolean;
  /** Lower limit angle in radians. */
  public minAngle: number;
  /** Upper limit angle in radians. */
  public maxAngle: number;
  /** Whether the angular motor is active. */
  public enableMotor: boolean;
  /** Target angular velocity in rad/s. */
  public motorSpeed: number;
  /** Maximum torque the motor may exert. */
  public maxMotorTorque: number;

  constructor(options: HingeJointOptions) {
    super(options);
    this.axisA = options.axisA ? options.axisA.clone().normalize() : new Vector3D(0, 1, 0);
    this.axisB = options.axisB ? options.axisB.clone().normalize() : new Vector3D(0, 1, 0);
    this.enableLimit = options.enableLimit ?? false;
    this.minAngle = options.minAngle ?? -Math.PI;
    this.maxAngle = options.maxAngle ?? Math.PI;
    this.enableMotor = options.enableMotor ?? false;
    this.motorSpeed = options.motorSpeed ?? 0;
    this.maxMotorTorque = options.maxMotorTorque ?? Infinity;
  }

  /**
   * Computes the world-space hinge axis of bodyA.
   */
  public getWorldAxisA(out: Vector3D): Vector3D {
    this.bodyA.worldMatrix.transformVector(this.axisA, out);
    out.sub(this.bodyA.position).normalize();
    return out;
  }

  /**
   * Computes the world-space hinge axis of bodyB.
   */
  public getWorldAxisB(out: Vector3D): Vector3D {
    if (this.bodyB) {
      this.bodyB.worldMatrix.transformVector(this.axisB, out);
      out.sub(this.bodyB.position).normalize();
    } else {
      out.copyFrom(this.axisB).normalize();
    }
    return out;
  }

  /** @inheritdoc */
  public solveVelocity(dt: number): void {
    if (!this.enabled || this.isBroken) return;

    const rbA = this.bodyA.rigidBody;
    const rbB = this.bodyB?.rigidBody;

    const invMassA = rbA && rbA.inverseMass > 0 ? rbA.inverseMass : 0;
    const invMassB = rbB && rbB.inverseMass > 0 ? rbB.inverseMass : 0;
    const totalInvMass = invMassA + invMassB;
    if (totalInvMass <= 0) return;

    const pA = MathPool.acquireVector();
    const pB = MathPool.acquireVector();
    this.getWorldAnchorA(pA);
    this.getWorldAnchorB(pB);

    const centerA = this.bodyA.position;
    const centerB = this.bodyB ? this.bodyB.position : pB;

    // 1. Solve point-to-point anchor alignment constraint (3 linear DOFs)
    const rAx = pA.x - centerA.x;
    const rAy = pA.y - centerA.y;
    const rAz = pA.z - centerA.z;

    const rBx = pB.x - centerB.x;
    const rBy = pB.y - centerB.y;
    const rBz = pB.z - centerB.z;

    const vAx = rbA && invMassA > 0 ? rbA.velocity.x : 0;
    const vAy = rbA && invMassA > 0 ? rbA.velocity.y : 0;
    const vAz = rbA && invMassA > 0 ? rbA.velocity.z : 0;

    const wAx = rbA && invMassA > 0 ? rbA.angularVelocity.x : 0;
    const wAy = rbA && invMassA > 0 ? rbA.angularVelocity.y : 0;
    const wAz = rbA && invMassA > 0 ? rbA.angularVelocity.z : 0;

    const vpAx = vAx + (wAy * rAz - wAz * rAy);
    const vpAy = vAy + (wAz * rAx - wAx * rAz);
    const vpAz = vAz + (wAx * rAy - wAy * rAx);

    const vBx = rbB && invMassB > 0 ? rbB.velocity.x : 0;
    const vBy = rbB && invMassB > 0 ? rbB.velocity.y : 0;
    const vBz = rbB && invMassB > 0 ? rbB.velocity.z : 0;

    const wBx = rbB && invMassB > 0 ? rbB.angularVelocity.x : 0;
    const wBy = rbB && invMassB > 0 ? rbB.angularVelocity.y : 0;
    const wBz = rbB && invMassB > 0 ? rbB.angularVelocity.z : 0;

    const vpBx = vBx + (wBy * rBz - wBz * rBy);
    const vpBy = vBy + (wBz * rBx - wBx * rBz);
    const vpBz = vBz + (wBx * rBy - wBy * rBx);

    const relVx = vpBx - vpAx;
    const relVy = vpBy - vpAy;
    const relVz = vpBz - vpAz;

    const errX = pB.x - pA.x;
    const errY = pB.y - pA.y;
    const errZ = pB.z - pA.z;
    const betaDt = 0.2 / dt;

    const axes = [
      { ux: 1, uy: 0, uz: 0, relV: relVx, err: errX },
      { ux: 0, uy: 1, uz: 0, relV: relVy, err: errY },
      { ux: 0, uy: 0, uz: 1, relV: relVz, err: errZ },
    ];

    const impulse = MathPool.acquireVector();

    for (let i = 0; i < 3; i++) {
      const axis = axes[i]!;
      let kRot = 0;

      if (invMassA > 0 && rbA) {
        const tauAx = rAy * axis.uz - rAz * axis.uy;
        const tauAy = rAz * axis.ux - rAx * axis.uz;
        const tauAz = rAx * axis.uy - rAy * axis.ux;

        const dWx = tauAx * rbA.inverseInertiaTensor.x;
        const dWy = tauAy * rbA.inverseInertiaTensor.y;
        const dWz = tauAz * rbA.inverseInertiaTensor.z;

        const dVx = dWy * rAz - dWz * rAy;
        const dVy = dWz * rAx - dWx * rAz;
        const dVz = dWx * rAy - dWy * rAx;

        kRot += dVx * axis.ux + dVy * axis.uy + dVz * axis.uz;
      }

      if (invMassB > 0 && rbB) {
        const tauBx = rBy * axis.uz - rBz * axis.uy;
        const tauBy = rBz * axis.ux - rBx * axis.uz;
        const tauBz = rBx * axis.uy - rBy * axis.ux;

        const dWx = tauBx * rbB.inverseInertiaTensor.x;
        const dWy = tauBy * rbB.inverseInertiaTensor.y;
        const dWz = tauBz * rbB.inverseInertiaTensor.z;

        const dVx = dWy * rBz - dWz * rBy;
        const dVy = dWz * rBx - dWx * rBz;
        const dVz = dWx * rBy - dWy * rBx;

        kRot += dVx * axis.ux + dVy * axis.uy + dVz * axis.uz;
      }

      const effInvMass = totalInvMass + kRot;
      if (effInvMass > 0) {
        const j = (axis.relV + betaDt * axis.err) / effInvMass;
        impulse.set(axis.ux * j, axis.uy * j, axis.uz * j);
        if (invMassA > 0 && rbA) {
          rbA.applyImpulseAtPoint(impulse, pA, centerA);
        }
        if (invMassB > 0 && rbB) {
          impulse.scale(-1);
          rbB.applyImpulseAtPoint(impulse, pB, centerB);
        }
      }
    }

    // 2. Solve Motor / Limit constraint along hinge axis
    const hingeAxis = MathPool.acquireVector();
    this.getWorldAxisA(hingeAxis);

    if (this.enableMotor) {
      const curAngVelA = rbA ? rbA.angularVelocity.dot(hingeAxis) : 0;
      const curAngVelB = rbB ? rbB.angularVelocity.dot(hingeAxis) : 0;
      const relAngVel = curAngVelA - curAngVelB;

      const deltaAngVel = this.motorSpeed - relAngVel;
      const invInertiaA = rbA ? rbA.inverseInertiaTensor.dot(hingeAxis) : 0;
      const invInertiaB = rbB ? rbB.inverseInertiaTensor.dot(hingeAxis) : 0;
      const totalInvInertia = invInertiaA + invInertiaB;

      if (totalInvInertia > 0) {
        let motorImpulse = deltaAngVel / totalInvInertia;
        const maxImpulse = this.maxMotorTorque * dt;
        motorImpulse = Math.max(-maxImpulse, Math.min(maxImpulse, motorImpulse));

        if (rbA && invMassA > 0) {
          rbA.angularVelocity.x += hingeAxis.x * motorImpulse * rbA.inverseInertiaTensor.x;
          rbA.angularVelocity.y += hingeAxis.y * motorImpulse * rbA.inverseInertiaTensor.y;
          rbA.angularVelocity.z += hingeAxis.z * motorImpulse * rbA.inverseInertiaTensor.z;
        }
        if (rbB && invMassB > 0) {
          rbB.angularVelocity.x -= hingeAxis.x * motorImpulse * rbB.inverseInertiaTensor.x;
          rbB.angularVelocity.y -= hingeAxis.y * motorImpulse * rbB.inverseInertiaTensor.y;
          rbB.angularVelocity.z -= hingeAxis.z * motorImpulse * rbB.inverseInertiaTensor.z;
        }
      }
    }

    MathPool.releaseVector(hingeAxis);
    MathPool.releaseVector(impulse);
    MathPool.releaseVector(pA);
    MathPool.releaseVector(pB);
  }

  /** @inheritdoc */
  public solvePosition(): void {
    if (!this.enabled || this.isBroken) return;

    const rbA = this.bodyA.rigidBody;
    const rbB = this.bodyB?.rigidBody;

    const invMassA = rbA && rbA.inverseMass > 0 ? rbA.inverseMass : 0;
    const invMassB = rbB && rbB.inverseMass > 0 ? rbB.inverseMass : 0;
    const totalInvMass = invMassA + invMassB;
    if (totalInvMass <= 0) return;

    const pA = MathPool.acquireVector();
    const pB = MathPool.acquireVector();
    this.getWorldAnchorA(pA);
    this.getWorldAnchorB(pB);

    const errX = pB.x - pA.x;
    const errY = pB.y - pA.y;
    const errZ = pB.z - pA.z;
    const errSq = errX * errX + errY * errY + errZ * errZ;

    if (errSq > 1e-6) {
      const factor = 0.8 / totalInvMass;
      const corrX = errX * factor;
      const corrY = errY * factor;
      const corrZ = errZ * factor;

      if (invMassA > 0) {
        this.bodyA.position.x += corrX * invMassA;
        this.bodyA.position.y += corrY * invMassA;
        this.bodyA.position.z += corrZ * invMassA;
        this.bodyA.updateMatrixWorld();
        this.bodyA.computeBounds();
      }

      if (invMassB > 0 && this.bodyB) {
        this.bodyB.position.x -= corrX * invMassB;
        this.bodyB.position.y -= corrY * invMassB;
        this.bodyB.position.z -= corrZ * invMassB;
        this.bodyB.updateMatrixWorld();
        this.bodyB.computeBounds();
      }
    }

    MathPool.releaseVector(pA);
    MathPool.releaseVector(pB);
  }
}

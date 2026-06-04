/// src/core/Camera.ts

import { AbstractProjection, MathPool } from "../math/index.js";
import { CameraEffectFactory, CameraStrategyFactory } from "./cameras/index.js";
import { CameraEffectType, CameraStrategyType } from "../enums/index.js";
import {
  CameraConstraints,
  CameraEffect,
  CameraInterfaceData,
  CameraStrategy,
} from "../interfaces/index.js";
import { Matrix4 } from "../math/Matrix4.js";
import { Vector3D } from "../math/Vector3D.js";

/**
 * Standard implementation of the CameraInterfaceData.
 */
export class Camera implements CameraInterfaceData {
  /** @inheritdoc */
  public position: Vector3D = new Vector3D(0, 10, 20);
  /** @inheritdoc */
  public target: Vector3D = new Vector3D(0, 0, 0);
  /** @inheritdoc */
  public up: Vector3D = new Vector3D(0, 1, 0);

  /** @inheritdoc */
  public theta: number = 0;
  /** @inheritdoc */
  public phi: number = 0;

  private _projection!: AbstractProjection;
  private _aspect: number = 1;

  private _strategy!: CameraStrategy;

  private _effects: CameraEffect[] = [];

  private _viewMatrix: Matrix4 = new Matrix4();
  private _viewProjMatrix: Matrix4 = new Matrix4();

  /**
   * Creates a new Camera.
   * @param projection The projection to use.
   */
  constructor(projection: AbstractProjection) {
    this.projection = projection;
    this.setStrategy(CameraStrategyType.MANUAL);
  }

  /** @inheritdoc */
  public get projection(): AbstractProjection {
    return this._projection;
  }

  /** @inheritdoc */
  public set projection(value: AbstractProjection) {
    this._projection = value;
    this._projection.setAspect(this._aspect);
  }

  /** @inheritdoc */
  public get viewProjectionMatrix(): Float32Array {
    return this._viewProjMatrix.data;
  }

  /** @inheritdoc */
  public get viewProjectionMatrix4(): Matrix4 {
    return this._viewProjMatrix;
  }

  /** @inheritdoc */
  public get viewMatrix(): Float32Array {
    return this._viewMatrix.data;
  }

  /** @inheritdoc */
  public get viewMatrix4(): Matrix4 {
    return this._viewMatrix;
  }

  /** @inheritdoc */
  public get aspect(): number {
    return this._aspect;
  }

  /** @inheritdoc */
  public set aspect(value: number) {
    this._aspect = value;
    this.projection.setAspect(value);
  }

  /** @inheritdoc */
  public zoom(delta: number): void {
    // 1. Try to let the strategy handle the zoom (e.g. radius adjustment)
    if (this._strategy.zoom?.(this, delta)) {
      return;
    }

    // 2. Delegate to projection (e.g. FOV or bounds scaling)
    this.projection.zoom(delta);
  }

  /** @inheritdoc */
  public updateProjectionMatrix(): void {
    this.projection.update();
  }

  /** @inheritdoc */
  public updateViewMatrix(): void {
    const finalPos = MathPool.acquireVector().copyFrom(this.position);
    const finalTarget = MathPool.acquireVector().copyFrom(this.target);

    for (const effect of this._effects) {
      finalPos.add(effect.offset);
      finalTarget.add(effect.targetOffset);
    }

    Matrix4.lookAt(finalPos, finalTarget, this.up, this._viewMatrix);
    Matrix4.multiply(this.projection.getMatrix(), this._viewMatrix, this._viewProjMatrix);

    MathPool.releaseVector(finalPos);
    MathPool.releaseVector(finalTarget);
  }

  /** @inheritdoc */
  public screenToWorld(screenX: number, screenY: number): Vector3D {
    const invVP: Matrix4 = MathPool.acquireMatrix();
    if (false === this._viewProjMatrix.invert(invVP)) {
      MathPool.releaseMatrix(invVP);
      return new Vector3D().copyFrom(this.target);
    }

    // Points in NDC space
    const pNear: Vector3D = MathPool.acquireVector().set(screenX, screenY, -1);
    const pFar: Vector3D = MathPool.acquireVector().set(screenX, screenY, 1);

    // Transform to world space
    invVP.transformVector(pNear);
    invVP.transformVector(pFar);

    const result: Vector3D = new Vector3D();
    const dy: number = pFar.y - pNear.y;

    if (0.0001 < Math.abs(dy)) {
      const t: number = -pNear.y / dy;
      // Linear interpolation between pNear and pFar at Y=0
      result.set(pNear.x + (pFar.x - pNear.x) * t, 0, pNear.z + (pFar.z - pNear.z) * t);
    } else {
      result.copyFrom(pNear);
      result.y = 0;
    }

    MathPool.releaseMatrix(invVP);
    MathPool.releaseVector(pNear);
    MathPool.releaseVector(pFar);

    return result;
  }

  /** @inheritdoc */
  public get strategy(): CameraStrategy {
    return this._strategy;
  }

  /** @inheritdoc */
  public setStrategy(type: CameraStrategyType): void {
    const oldConstraints: CameraConstraints | undefined = this._strategy?.constraints;
    this._strategy = CameraStrategyFactory.get(type);
    if (undefined !== oldConstraints) {
      this._strategy.constraints = oldConstraints;
    }
  }

  /** @inheritdoc */
  public setConstraints(constraints?: CameraConstraints): void {
    this._strategy.constraints = constraints;
  }

  /** @inheritdoc */
  public get activeStrategyType(): string {
    return this._strategy.type;
  }

  /** @inheritdoc */
  public update(targetPos: Vector3D, dx: number, dy: number, deltaTime: number = 0.016): void {
    this._strategy.update(this, targetPos, dx, dy);

    // Update effects
    for (let i: number = this._effects.length - 1; 0 <= i; i--) {
      const effect: CameraEffect = this._effects[i]!;
      effect.update(deltaTime);
      if (effect.isFinished) {
        this._effects.splice(i, 1);
      }
    }

    this.updateViewMatrix();
  }

  /**
   * Adds a new effect to the camera.
   * @param effect The effect to add.
   */
  public addEffect(effect: CameraEffect): void {
    this._effects.push(effect);
  }

  /**
   * Creates and adds a new effect by type.
   * @param type The type of effect.
   * @param intensity The intensity.
   * @param duration The duration in seconds.
   */
  public applyEffect(type: CameraEffectType, intensity?: number, duration?: number): void {
    this.addEffect(CameraEffectFactory.create(type, intensity, duration));
  }
}

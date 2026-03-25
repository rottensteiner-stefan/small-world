/// src/core/Camera.ts

import { AbstractProjection, PerspectiveProjection } from "../math/index.js";
import { CameraStrategyFactory } from "./cameras/CameraStrategyFactory.js";
import { CameraStrategyType } from "../enums/index.js";
import { CameraInterfaceData, CameraStrategy } from "../interfaces/index.js";
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
  public phi: number = 0.6;

  private _strategy!: CameraStrategy;

  private _viewMatrix: Matrix4 = new Matrix4();
  private _viewProjMatrix: Matrix4 = new Matrix4();

  /**
   * Creates a new Camera.
   * @param projection The projection to use.
   */
  constructor(public projection: AbstractProjection) {
    this.setStrategy(CameraStrategyType.SMOOTH);
  }

  /** @inheritdoc */
  public get viewProjectionMatrix(): Float32Array {
    return this._viewProjMatrix.data;
  }

  /** @inheritdoc */
  public get aspect(): number {
    if (this.projection instanceof PerspectiveProjection) {
      return this.projection.aspect;
    }
    return 1;
  }

  /** @inheritdoc */
  public set aspect(value: number) {
    if (this.projection instanceof PerspectiveProjection) {
      this.projection.aspect = value;
    }
  }

  /** @inheritdoc */
  public updateProjectionMatrix(): void {
    this.projection.update();
  }

  /** @inheritdoc */
  public updateViewMatrix(): void {
    Matrix4.lookAt(this.position, this.target, this.up, this._viewMatrix);
    Matrix4.multiply(this.projection.getMatrix(), this._viewMatrix, this._viewProjMatrix);
  }

  /** @inheritdoc */
  public get strategy(): CameraStrategy {
    return this._strategy;
  }

  /** @inheritdoc */
  public setStrategy(type: CameraStrategyType): void {
    this._strategy = CameraStrategyFactory.get(type);
  }

  /** @inheritdoc */
  public get activeStrategyType(): string {
    return this._strategy.type;
  }

  /** @inheritdoc */
  public update(targetPos: Vector3D, dx: number, dy: number): void {
    this._strategy.update(this, targetPos, dx, dy);
  }
}
